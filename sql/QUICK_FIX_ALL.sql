-- =====================================================
-- QUICK FIX: RUN THIS FIRST!
-- =====================================================
-- This is a minimal script that fixes the most critical issues
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE HELPER FUNCTION (Required for RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids(UUID) TO authenticated;

-- =====================================================
-- 2. FIX WORKSPACES TABLE RLS
-- =====================================================
-- Drop ALL existing policies first
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspaces'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspaces', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Simple, working policies
CREATE POLICY "workspace_select" ON workspaces
FOR SELECT TO authenticated
USING (
    owner_id = auth.uid()
    OR id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

CREATE POLICY "workspace_insert" ON workspaces
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspace_update" ON workspaces
FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "workspace_delete" ON workspaces
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;

-- =====================================================
-- 3. FIX WORKSPACE_MEMBERS TABLE RLS
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_select" ON workspace_members
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

CREATE POLICY "member_insert" ON workspace_members
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);

CREATE POLICY "member_update" ON workspace_members
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid()));

CREATE POLICY "member_delete" ON workspace_members
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;

-- =====================================================
-- 4. CREATE AUTO-ADD OWNER TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.add_owner_as_member();

-- =====================================================
-- 5. FIX ANY ORPHANED WORKSPACES
-- =====================================================
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT w.id, w.owner_id, 'owner', COALESCE(w.created_at, NOW())
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
WHERE wm.workspace_id IS NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- =====================================================
-- 6. FIX WORKSPACE_INVITATIONS RLS
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_invitations'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_invitations', pol.policyname);
        END LOOP;
        
        ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "invitation_select" ON workspace_invitations
            FOR SELECT TO authenticated
            USING (
                invitee_email = (auth.jwt() ->> ''email'')
                OR invited_by = auth.uid()
            )';
        
        EXECUTE 'CREATE POLICY "invitation_insert" ON workspace_invitations
            FOR INSERT TO authenticated
            WITH CHECK (invited_by = auth.uid())';
        
        EXECUTE 'CREATE POLICY "invitation_update" ON workspace_invitations
            FOR UPDATE TO authenticated
            USING (invited_by = auth.uid() OR invitee_email = (auth.jwt() ->> ''email''))';
        
        EXECUTE 'CREATE POLICY "invitation_delete" ON workspace_invitations
            FOR DELETE TO authenticated
            USING (invited_by = auth.uid())';
        
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_invitations TO authenticated';
    END IF;
END $$;

-- =====================================================
-- 7. FIX USER_PRESENCE (Optional)
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_presence'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON user_presence', pol.policyname);
        END LOOP;
        
        ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
        
        EXECUTE 'CREATE POLICY "presence_select" ON user_presence
            FOR SELECT TO authenticated
            USING (user_id = auth.uid() OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())))';
        
        EXECUTE 'CREATE POLICY "presence_insert" ON user_presence
            FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid())';
        
        EXECUTE 'CREATE POLICY "presence_update" ON user_presence
            FOR UPDATE TO authenticated
            USING (user_id = auth.uid())';
        
        EXECUTE 'CREATE POLICY "presence_delete" ON user_presence
            FOR DELETE TO authenticated
            USING (user_id = auth.uid())';
        
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON user_presence TO authenticated';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT '✅ ALL FIXES APPLIED!' as status;

-- Show RLS status
SELECT tablename, 
       CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workspaces', 'workspace_members', 'workspace_invitations', 'user_presence');

-- Show orphaned workspaces (should be 0)
SELECT 'Orphaned workspaces: ' || 
       (SELECT COUNT(*) FROM workspaces w 
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
        WHERE wm.workspace_id IS NULL)::text as check;

SELECT '⚠️ REFRESH YOUR BROWSER NOW!' as next_step;
