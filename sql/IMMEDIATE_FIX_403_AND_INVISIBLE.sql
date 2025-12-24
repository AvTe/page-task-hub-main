-- =====================================================
-- IMMEDIATE FIX: 403 Invitations + Invisible Workspace
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes the specific issues reported:
-- 1. 403 on workspace_invitations queries
-- 2. Workspace created but doesn't appear in list
-- =====================================================

-- =====================================================
-- FIX A: 403 ON WORKSPACE_INVITATIONS
-- =====================================================
-- Problem: Users get 403 when trying to see their invitations
-- Cause: RLS policy doesn't allow users to see invitations for their email
-- Fix: Add policy allowing users to SELECT where invitee_email = their email

-- First, check if table exists and create if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
        CREATE TABLE public.workspace_invitations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            workspace_name TEXT NOT NULL,
            invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            invited_by_name TEXT,
            invitee_email TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            invite_code TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
            accepted_at TIMESTAMPTZ
        );
        
        CREATE INDEX IF NOT EXISTS idx_invitations_email ON workspace_invitations(invitee_email);
        CREATE INDEX IF NOT EXISTS idx_invitations_code ON workspace_invitations(invite_code);
    END IF;
END $$;

-- Drop ALL existing policies on workspace_invitations
DROP POLICY IF EXISTS "workspace_invitations_select_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_select_own" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_update_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "Invitees can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Anyone can view by code" ON workspace_invitations;

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- THE KEY FIX: Allow users to see invitations sent TO their email
-- This uses auth.jwt() -> email which works even if user isn't a workspace member yet
CREATE POLICY "invitations_select_for_invitee" ON workspace_invitations
FOR SELECT TO authenticated
USING (
    -- User can see invitations sent TO their email
    invitee_email = (auth.jwt() ->> 'email')
    -- OR invitations they created
    OR invited_by = auth.uid()
);

-- Allow workspace owners/admins to create invitations
CREATE POLICY "invitations_insert_by_owner" ON workspace_invitations
FOR INSERT TO authenticated
WITH CHECK (invited_by = auth.uid());

-- Allow update by inviter or invitee (to accept/decline)
CREATE POLICY "invitations_update_by_parties" ON workspace_invitations
FOR UPDATE TO authenticated
USING (
    invited_by = auth.uid()
    OR invitee_email = (auth.jwt() ->> 'email')
);

-- Allow delete by inviter only
CREATE POLICY "invitations_delete_by_inviter" ON workspace_invitations
FOR DELETE TO authenticated
USING (invited_by = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_invitations TO authenticated;

SELECT '✅ FIX A COMPLETE: Invitation RLS policies updated' as status;

-- =====================================================
-- FIX B: INVISIBLE WORKSPACE (Auto-add Owner as Member)
-- =====================================================
-- Problem: Workspace created but doesn't appear (owner not in members table)
-- Fix: Create trigger to auto-add owner + fallback function

-- Step 1: Create the SECURITY DEFINER helper functions
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

-- Step 2: Drop existing triggers
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
DROP TRIGGER IF EXISTS trigger_add_owner_as_member ON workspaces;

-- Step 3: Create the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert owner as member with role 'owner'
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO UPDATE 
    SET role = 'owner';
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'add_owner_as_member failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_owner_as_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_owner_as_member() TO service_role;

-- Step 4: Create the trigger
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.add_owner_as_member();

-- Step 5: Fix any existing orphaned workspaces (add missing owner memberships)
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT w.id, w.owner_id, 'owner', w.created_at
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
WHERE wm.workspace_id IS NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

SELECT '✅ FIX B COMPLETE: Owner auto-add trigger created' as status;

-- =====================================================
-- FIX C: WORKSPACE RLS POLICIES (Non-recursive)
-- =====================================================
-- Ensure workspace SELECT uses the SECURITY DEFINER function

-- Drop existing workspace policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- SELECT: User can see workspaces they own OR are members of
CREATE POLICY "workspaces_select_policy" ON workspaces
FOR SELECT TO authenticated
USING (
    owner_id = auth.uid()
    OR id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

-- INSERT: User can create workspace (must set themselves as owner)
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;

SELECT '✅ FIX C COMPLETE: Workspace RLS policies updated' as status;

-- =====================================================
-- FIX D: WORKSPACE_MEMBERS RLS (Non-recursive)
-- =====================================================

DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- SELECT: User can see members of workspaces they belong to
CREATE POLICY "workspace_members_select_policy" ON workspace_members
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

-- INSERT: User can add themselves OR workspace owner via function
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);

-- UPDATE: Only workspace owner can update
CREATE POLICY "workspace_members_update_policy" ON workspace_members
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid()));

-- DELETE: User can remove self OR owner can remove anyone
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
FOR DELETE TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;

SELECT '✅ FIX D COMPLETE: Workspace members RLS policies updated' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '📊 VERIFICATION RESULTS:' as info;

-- Check triggers
SELECT '🔧 Trigger Status:' as check;
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_workspace_created';

-- Check invitation policies
SELECT '📧 Invitation Policies:' as check;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'workspace_invitations'
ORDER BY policyname;

-- Check workspace policies
SELECT '🏢 Workspace Policies:' as check;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'workspaces'
ORDER BY policyname;

-- Check RLS status
SELECT '🔐 RLS Enabled Status:' as check;
SELECT tablename, 
       CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workspaces', 'workspace_members', 'workspace_invitations')
ORDER BY tablename;

-- Count orphaned workspaces
SELECT '👥 Orphaned Workspaces Check:' as check;
SELECT 
    COUNT(*) as total_workspaces,
    COUNT(wm.user_id) as with_owner_member,
    COUNT(*) - COUNT(wm.user_id) as orphaned
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id;

-- Final message
SELECT '🎉 ALL FIXES APPLIED SUCCESSFULLY!' as result;
SELECT 'Please refresh your browser to see the changes' as next_step;
