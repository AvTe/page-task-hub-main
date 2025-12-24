-- =====================================================
-- FIX WORKSPACE VISIBILITY V2 - NO RECURSION
-- =====================================================
-- This script fixes the infinite recursion issue in RLS policies
-- The key is to use SECURITY DEFINER functions that bypass RLS
-- 
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- =====================================================

-- Drop workspace policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;
DROP POLICY IF EXISTS "Workspace members can view workspace" ON workspaces;
DROP POLICY IF EXISTS "User can create workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owner can update workspace" ON workspaces;
DROP POLICY IF EXISTS "Owner can delete workspace" ON workspaces;

-- Drop workspace_members policies
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Members can see members" ON workspace_members;
DROP POLICY IF EXISTS "Owner can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owner can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owner or self can remove member" ON workspace_members;

-- Drop tasks policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
    DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
    DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
    DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
    DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
    DROP POLICY IF EXISTS "Workspace members can create tasks" ON tasks;
    DROP POLICY IF EXISTS "Workspace members can update tasks" ON tasks;
    DROP POLICY IF EXISTS "Workspace members can delete tasks" ON tasks;
  END IF;
END $$;

-- Drop pages policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    DROP POLICY IF EXISTS "pages_select_policy" ON pages;
    DROP POLICY IF EXISTS "pages_insert_policy" ON pages;
    DROP POLICY IF EXISTS "pages_update_policy" ON pages;
    DROP POLICY IF EXISTS "pages_delete_policy" ON pages;
    DROP POLICY IF EXISTS "Workspace members can view pages" ON pages;
    DROP POLICY IF EXISTS "Workspace members can create pages" ON pages;
    DROP POLICY IF EXISTS "Workspace members can update pages" ON pages;
    DROP POLICY IF EXISTS "Workspace members can delete pages" ON pages;
  END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE SECURITY DEFINER HELPER FUNCTION
-- =====================================================
-- This function checks membership WITHOUT triggering RLS
-- SECURITY DEFINER = runs with elevated permissions
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids(UUID) TO authenticated;

-- Also create a function to check if user is member of a specific workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;

-- Function to check if user is workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id AND owner_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_owner(UUID, UUID) TO authenticated;

-- =====================================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE NON-RECURSIVE RLS POLICIES
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 🏢 WORKSPACES POLICIES (No recursion!)
-- ─────────────────────────────────────────────────────

-- SELECT: Users can see workspaces they own OR are members of
CREATE POLICY "workspaces_select_policy" ON workspaces
FOR SELECT TO authenticated
USING (
    owner_id = auth.uid()
    OR id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

-- INSERT: Any authenticated user can create a workspace
CREATE POLICY "workspaces_insert_policy" ON workspaces
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Only owner can update
CREATE POLICY "workspaces_update_policy" ON workspaces
FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Only owner can delete
CREATE POLICY "workspaces_delete_policy" ON workspaces
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────
-- 👥 WORKSPACE_MEMBERS POLICIES (No recursion!)
-- ─────────────────────────────────────────────────────

-- SELECT: Users can see their own memberships and members of workspaces they belong to
CREATE POLICY "workspace_members_select_policy" ON workspace_members
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

-- INSERT: Users can add themselves OR workspace owner can add anyone
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR public.is_workspace_owner(workspace_id, auth.uid())
);

-- UPDATE: Only workspace owner can update member roles
CREATE POLICY "workspace_members_update_policy" ON workspace_members
FOR UPDATE TO authenticated
USING (public.is_workspace_owner(workspace_id, auth.uid()));

-- DELETE: Users can remove themselves OR workspace owner can remove anyone
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
FOR DELETE TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_workspace_owner(workspace_id, auth.uid())
);

-- ─────────────────────────────────────────────────────
-- 👁️ USER_PRESENCE POLICIES (if table exists)
-- ─────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "user_presence_select_policy" ON user_presence;
    DROP POLICY IF EXISTS "user_presence_insert_policy" ON user_presence;
    DROP POLICY IF EXISTS "user_presence_update_policy" ON user_presence;
    DROP POLICY IF EXISTS "user_presence_delete_policy" ON user_presence;
    DROP POLICY IF EXISTS "Users can view presence" ON user_presence;
    DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;
    
    -- Enable RLS
    ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
    
    -- SELECT: Users can see presence of users in their workspaces
    CREATE POLICY "user_presence_select_policy" ON user_presence
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    );
    
    -- INSERT: Users can insert their own presence
    CREATE POLICY "user_presence_insert_policy" ON user_presence
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
    
    -- UPDATE: Users can update their own presence
    CREATE POLICY "user_presence_update_policy" ON user_presence
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());
    
    -- DELETE: Users can delete their own presence
    CREATE POLICY "user_presence_delete_policy" ON user_presence
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());
    
    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_presence TO authenticated;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- ✅ TASKS POLICIES (if table exists)
-- ─────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    CREATE POLICY "tasks_select_policy" ON tasks
    FOR SELECT TO authenticated
    USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

    CREATE POLICY "tasks_insert_policy" ON tasks
    FOR INSERT TO authenticated
    WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

    CREATE POLICY "tasks_update_policy" ON tasks
    FOR UPDATE TO authenticated
    USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

    CREATE POLICY "tasks_delete_policy" ON tasks
    FOR DELETE TO authenticated
    USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 📄 PAGES POLICIES (if table exists)
-- ─────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    CREATE POLICY "pages_select_policy" ON pages
    FOR SELECT TO authenticated
    USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

    CREATE POLICY "pages_insert_policy" ON pages
    FOR INSERT TO authenticated
    WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

    CREATE POLICY "pages_update_policy" ON pages
    FOR UPDATE TO authenticated
    USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

    CREATE POLICY "pages_delete_policy" ON pages
    FOR DELETE TO authenticated
    USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));
  END IF;
END $$;

-- =====================================================
-- STEP 5: ENSURE TRIGGER EXISTS FOR AUTO-ADD OWNER
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.add_owner_as_member();

-- =====================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON pages TO authenticated;
  END IF;
END $$;

-- =====================================================
-- STEP 7: VERIFICATION
-- =====================================================

SELECT '✅ Helper Functions Created:' as info;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_workspace_ids', 'is_workspace_member', 'is_workspace_owner');

SELECT '✅ RLS Status:' as info;
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '🔒 RLS ON' ELSE '🔓 RLS OFF' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workspaces', 'workspace_members', 'user_presence', 'tasks', 'pages')
ORDER BY tablename;

SELECT '✅ Policies Created:' as info;
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_members', 'user_presence', 'tasks', 'pages')
ORDER BY tablename, policyname;

SELECT '🎉 SUCCESS: Workspace visibility fixed with non-recursive policies!' AS result;

-- =====================================================
-- HOW THIS FIXES THE RECURSION PROBLEM:
-- =====================================================
-- BEFORE (Recursive - causes 500 errors):
--   workspace_members SELECT policy checked: 
--     "workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())"
--   This queries workspace_members INSIDE the workspace_members policy = INFINITE LOOP!
--
-- AFTER (Non-recursive - works correctly):
--   We use SECURITY DEFINER functions like get_user_workspace_ids()
--   These functions BYPASS RLS, so they don't trigger the policy check again
--   Result: No infinite loop, no 500 errors!
-- =====================================================
