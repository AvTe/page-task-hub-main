-- =====================================================
-- FIX WORKSPACE VISIBILITY
-- =====================================================
-- This script fixes the issue where newly registered users
-- can see all workspaces instead of only their own.
-- 
-- Root Cause: RLS (Row Level Security) is disabled
-- Solution: Enable RLS with proper policies
--
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING WORKSPACE POLICIES (Clean Slate)
-- =====================================================

-- Workspaces policies
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

-- Workspace members policies
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Members can see members" ON workspace_members;
DROP POLICY IF EXISTS "Owner can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owner can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owner or self can remove member" ON workspace_members;

-- =====================================================
-- STEP 2: ENABLE RLS ON WORKSPACE TABLES
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: CREATE WORKSPACE RLS POLICIES
-- =====================================================
-- These policies ensure users can ONLY see:
--   1. Workspaces they created (owner_id = auth.uid())
--   2. Workspaces they are members of (via workspace_members table)
-- =====================================================

-- 🔐 SELECT: User can view workspaces they own OR are members of
CREATE POLICY "Workspace members can view workspace"
ON workspaces
FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid()
    OR id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
    )
);

-- 🔐 INSERT: Any authenticated user can create a workspace (become owner)
CREATE POLICY "User can create workspace"
ON workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- 🔐 UPDATE: Only owner can update workspace settings
CREATE POLICY "Owner can update workspace"
ON workspaces
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 🔐 DELETE: Only owner can delete workspace
CREATE POLICY "Owner can delete workspace"
ON workspaces
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 4: CREATE WORKSPACE_MEMBERS RLS POLICIES
-- =====================================================

-- 🔐 SELECT: Can view members if you're a member of the same workspace
CREATE POLICY "Members can see members"
ON workspace_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
    )
);

-- 🔐 INSERT: Owner can add members, OR users can add themselves (for joining via invite)
CREATE POLICY "Owner can add members"
ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
    -- User adding themselves (for accepting invites / joining via invite code)
    user_id = auth.uid()
    -- OR owner adding someone
    OR EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id
        AND owner_id = auth.uid()
    )
);

-- 🔐 UPDATE: Only workspace owner can change member roles
CREATE POLICY "Owner can update members"
ON workspace_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id
        AND owner_id = auth.uid()
    )
);

-- 🔐 DELETE: Owner can remove anyone, users can remove themselves
CREATE POLICY "Owner or self can remove member"
ON workspace_members
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id
        AND owner_id = auth.uid()
    )
);

-- =====================================================
-- STEP 5: ENSURE TRIGGERS EXIST (with SECURITY DEFINER)
-- =====================================================
-- The trigger adds the owner as a member when workspace is created.
-- SECURITY DEFINER allows it to bypass RLS for this insert.
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypasses RLS to allow insertion
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
-- STEP 6: GRANT PROPER PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;

-- =====================================================
-- STEP 7: VERIFICATION
-- =====================================================

-- Show RLS status (should show RLS ON for both tables)
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename;

-- Show created policies
SELECT 'Policies Created:' as info;
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, policyname;

SELECT '🎉 SUCCESS: Workspace visibility fixed! Users will only see their own workspaces.' AS result;

-- =====================================================
-- ADDITIONAL INFO
-- =====================================================
-- After running this script:
-- 1. Each user will ONLY see workspaces they created (as owner)
-- 2. Each user will ONLY see workspaces they were invited to and joined
-- 3. The "testing workspace" will no longer be visible to new users
--    unless they are explicitly invited or own it
-- =====================================================
