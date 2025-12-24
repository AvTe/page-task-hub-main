-- =====================================================
-- FIX: Infinite Recursion in workspace_members RLS Policy
-- =====================================================
-- 
-- The issue: RLS policies on workspace_members reference workspace_members
-- in their conditions, causing infinite recursion when Postgres evaluates them.
--
-- The solution: Use SECURITY DEFINER functions that bypass RLS for the check,
-- combined with simple direct user checks.
--
-- Run this ENTIRE script in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Create helper functions (SECURITY DEFINER bypasses RLS)
-- =====================================================

-- Function to get workspace IDs where user is a member (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_workspace_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id;
$$;

-- Function to get workspace IDs where user is an owner
CREATE OR REPLACE FUNCTION get_owned_workspace_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM workspaces WHERE owner_id = p_user_id;
$$;

-- Function to check if user has admin role in workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_admin(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id 
    AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id 
    AND owner_id = p_user_id
  );
$$;

-- Function to check if user is a member of workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = p_workspace_id 
    AND owner_id = p_user_id
  );
$$;

-- =====================================================
-- STEP 2: Drop ALL existing workspace_members policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view other members in same workspace" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage all workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Members can be removed by owners/admins or themselves" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;

-- =====================================================
-- STEP 3: Create NEW non-recursive policies for workspace_members
-- =====================================================

-- SELECT: Users can view their own membership directly, 
-- OR view other members in workspaces they belong to (using helper function)
CREATE POLICY "workspace_members_select_policy" ON workspace_members
  FOR SELECT USING (
    user_id = auth.uid() 
    OR workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
  );

-- INSERT: Only workspace owners or admins can add members (using helper function)
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
  FOR INSERT WITH CHECK (
    is_workspace_admin(workspace_id, auth.uid())
    OR user_id = auth.uid() -- Allow users to add themselves (for accepting invites)
  );

-- UPDATE: Only workspace owners or admins can update member roles
CREATE POLICY "workspace_members_update_policy" ON workspace_members
  FOR UPDATE USING (
    is_workspace_admin(workspace_id, auth.uid())
  );

-- DELETE: Users can remove themselves, or admins/owners can remove anyone
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
  FOR DELETE USING (
    user_id = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- =====================================================
-- STEP 4: Fix workspaces policies (also had potential issues)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON workspaces;

CREATE POLICY "workspaces_select_policy" ON workspaces
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR id IN (SELECT get_user_workspace_ids(auth.uid()))
  );

CREATE POLICY "workspaces_insert_policy" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_policy" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_policy" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- =====================================================
-- STEP 5: Update tasks and pages policies to use helper functions
-- =====================================================

DROP POLICY IF EXISTS "Users can view workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their tasks or workspace owners/admins" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Creators can delete tasks" ON tasks;

CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
  );

CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT WITH CHECK (
    (workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid())))
    AND created_by = auth.uid()
  );

CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR assigned_to = auth.uid()
    OR is_workspace_admin(workspace_id, auth.uid())
  );

CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE USING (
    created_by = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- =====================================================
-- STEP 6: Update pages policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view workspace pages" ON pages;
DROP POLICY IF EXISTS "Users can create pages" ON pages;
DROP POLICY IF EXISTS "Users can update their pages or workspace owners/admins" ON pages;
DROP POLICY IF EXISTS "Users can delete their pages or workspace owners/admins" ON pages;
DROP POLICY IF EXISTS "Users can view pages in their workspaces" ON pages;
DROP POLICY IF EXISTS "Creators can delete pages" ON pages;

CREATE POLICY "pages_select_policy" ON pages
  FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
  );

CREATE POLICY "pages_insert_policy" ON pages
  FOR INSERT WITH CHECK (
    (workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid())))
    AND created_by = auth.uid()
  );

CREATE POLICY "pages_update_policy" ON pages
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

CREATE POLICY "pages_delete_policy" ON pages
  FOR DELETE USING (
    created_by = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- =====================================================
-- VERIFICATION: Check that policies are created correctly
-- =====================================================

SELECT 'RLS Infinite Recursion Fix Applied Successfully!' as result;

-- You can verify with:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
