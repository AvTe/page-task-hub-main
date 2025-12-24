-- =====================================================
-- COMPLETE DATABASE FIX FOR EASTASK (v2 - Fixed)
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes ALL RLS and permission issues
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL POLICIES FIRST (before dropping functions)
-- =====================================================

-- Drop workspace policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON workspaces;

-- Drop workspace_members policies
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view other members in same workspace" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage all workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Members can be removed by owners/admins or themselves" ON workspace_members;

-- Drop tasks policies
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
DROP POLICY IF EXISTS "Users can view workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their tasks or workspace owners/admins" ON tasks;
DROP POLICY IF EXISTS "Creators can delete tasks" ON tasks;

-- Drop pages policies
DROP POLICY IF EXISTS "pages_select_policy" ON pages;
DROP POLICY IF EXISTS "pages_insert_policy" ON pages;
DROP POLICY IF EXISTS "pages_update_policy" ON pages;
DROP POLICY IF EXISTS "pages_delete_policy" ON pages;
DROP POLICY IF EXISTS "Users can view workspace pages" ON pages;
DROP POLICY IF EXISTS "Users can view pages in their workspaces" ON pages;
DROP POLICY IF EXISTS "Users can create pages" ON pages;
DROP POLICY IF EXISTS "Users can update their pages or workspace owners/admins" ON pages;
DROP POLICY IF EXISTS "Users can delete their pages or workspace owners/admins" ON pages;
DROP POLICY IF EXISTS "Creators can delete pages" ON pages;

-- Drop optional table policies safely
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
    DROP POLICY IF EXISTS "invitations_select_policy" ON workspace_invitations;
    DROP POLICY IF EXISTS "invitations_insert_policy" ON workspace_invitations;
    DROP POLICY IF EXISTS "invitations_update_policy" ON workspace_invitations;
    DROP POLICY IF EXISTS "Users can view relevant invitations" ON workspace_invitations;
    DROP POLICY IF EXISTS "Owners and admins can create invitations" ON workspace_invitations;
    DROP POLICY IF EXISTS "Users can update their invitations" ON workspace_invitations;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments') THEN
    DROP POLICY IF EXISTS "comments_select_policy" ON task_comments;
    DROP POLICY IF EXISTS "comments_insert_policy" ON task_comments;
    DROP POLICY IF EXISTS "comments_update_policy" ON task_comments;
    DROP POLICY IF EXISTS "comments_delete_policy" ON task_comments;
    DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
    DROP POLICY IF EXISTS "Users can create task comments" ON task_comments;
    DROP POLICY IF EXISTS "Users can update their comments" ON task_comments;
    DROP POLICY IF EXISTS "Users can delete their comments or workspace owners/admins" ON task_comments;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activities') THEN
    DROP POLICY IF EXISTS "activities_select_policy" ON user_activities;
    DROP POLICY IF EXISTS "activities_insert_policy" ON user_activities;
    DROP POLICY IF EXISTS "Users can view workspace activities" ON user_activities;
    DROP POLICY IF EXISTS "Users can create their activities" ON user_activities;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
    DROP POLICY IF EXISTS "presence_policy" ON user_presence;
    DROP POLICY IF EXISTS "Users can view workspace user presence" ON user_presence;
    DROP POLICY IF EXISTS "Users can update their presence" ON user_presence;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_attachments') THEN
    DROP POLICY IF EXISTS "attachments_select_policy" ON file_attachments;
    DROP POLICY IF EXISTS "attachments_insert_policy" ON file_attachments;
    DROP POLICY IF EXISTS "attachments_delete_policy" ON file_attachments;
    DROP POLICY IF EXISTS "Users can view file attachments in their workspaces" ON file_attachments;
    DROP POLICY IF EXISTS "Users can upload file attachments to their workspaces" ON file_attachments;
    DROP POLICY IF EXISTS "Users can delete file attachments" ON file_attachments;
  END IF;
END $$;

-- =====================================================
-- STEP 2: NOW DROP FUNCTIONS (after policies are gone)
-- =====================================================

DROP FUNCTION IF EXISTS get_user_workspace_ids(UUID);
DROP FUNCTION IF EXISTS get_owned_workspace_ids(UUID);
DROP FUNCTION IF EXISTS is_workspace_admin(UUID, UUID);
DROP FUNCTION IF EXISTS is_workspace_member(UUID, UUID);

-- =====================================================
-- STEP 3: Create SECURITY DEFINER helper functions
-- =====================================================

-- Function to get workspace IDs where user is a member
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

-- Function to check if user has admin role in workspace
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

-- Function to check if user is a member of workspace
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
-- STEP 4: Enable RLS on all tables
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Enable on optional tables if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
    ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments') THEN
    ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activities') THEN
    ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
    ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_attachments') THEN
    ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- STEP 5: Create WORKSPACES policies
-- =====================================================

-- SELECT: Users can view workspaces they own OR are members of
CREATE POLICY "workspaces_select_policy" ON workspaces
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR id IN (SELECT get_user_workspace_ids(auth.uid()))
  );

-- INSERT: Any authenticated user can create a workspace (they become owner)
CREATE POLICY "workspaces_insert_policy" ON workspaces
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND owner_id = auth.uid()
  );

-- UPDATE: Only owners can update their workspaces
CREATE POLICY "workspaces_update_policy" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- DELETE: Only owners can delete their workspaces
CREATE POLICY "workspaces_delete_policy" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- =====================================================
-- STEP 6: Create WORKSPACE_MEMBERS policies
-- =====================================================

-- SELECT: Users can view their own membership OR other members in workspaces they belong to
CREATE POLICY "workspace_members_select_policy" ON workspace_members
  FOR SELECT USING (
    user_id = auth.uid() 
    OR workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
  );

-- INSERT: Workspace owners/admins can add members, OR users can add themselves
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
  FOR INSERT WITH CHECK (
    is_workspace_admin(workspace_id, auth.uid())
    OR user_id = auth.uid()
  );

-- UPDATE: Only workspace owners/admins can update roles
CREATE POLICY "workspace_members_update_policy" ON workspace_members
  FOR UPDATE USING (
    is_workspace_admin(workspace_id, auth.uid())
  );

-- DELETE: Users can remove themselves, or admins can remove anyone
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
  FOR DELETE USING (
    user_id = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- =====================================================
-- STEP 7: Create TASKS policies
-- =====================================================

-- SELECT: Users can view tasks in workspaces they're members of
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
  );

-- INSERT: Users can create tasks in their workspaces
CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
      OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
    )
  );

-- UPDATE: Task creator, assignee, or workspace admin can update
CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR assigned_to = auth.uid()
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- DELETE: Task creator or workspace admin can delete
CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE USING (
    created_by = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- =====================================================
-- STEP 8: Create PAGES policies
-- =====================================================

-- SELECT: Users can view pages in their workspaces
CREATE POLICY "pages_select_policy" ON pages
  FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
  );

-- INSERT: Users can create pages in their workspaces
CREATE POLICY "pages_insert_policy" ON pages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
      OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
    )
  );

-- UPDATE: Page creator or workspace admin can update
CREATE POLICY "pages_update_policy" ON pages
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- DELETE: Page creator or workspace admin can delete
CREATE POLICY "pages_delete_policy" ON pages
  FOR DELETE USING (
    created_by = auth.uid() 
    OR is_workspace_admin(workspace_id, auth.uid())
  );

-- =====================================================
-- STEP 9: Create trigger to auto-add owner as member
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
DROP FUNCTION IF EXISTS add_owner_as_member();

-- Create function to add owner as member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();

-- =====================================================
-- STEP 10: Create policies for optional tables
-- =====================================================

-- Workspace Invitations
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
    CREATE POLICY "invitations_select_policy" ON workspace_invitations
      FOR SELECT USING (
        invited_by = auth.uid()
        OR is_workspace_admin(workspace_id, auth.uid())
      );
    
    CREATE POLICY "invitations_insert_policy" ON workspace_invitations
      FOR INSERT WITH CHECK (
        invited_by = auth.uid()
        AND is_workspace_admin(workspace_id, auth.uid())
      );
    
    CREATE POLICY "invitations_update_policy" ON workspace_invitations
      FOR UPDATE USING (
        invited_by = auth.uid()
        OR is_workspace_admin(workspace_id, auth.uid())
      );
  END IF;
END $$;

-- Task Comments
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments') THEN
    CREATE POLICY "comments_select_policy" ON task_comments
      FOR SELECT USING (true);
    
    CREATE POLICY "comments_insert_policy" ON task_comments
      FOR INSERT WITH CHECK (user_id = auth.uid());
    
    CREATE POLICY "comments_update_policy" ON task_comments
      FOR UPDATE USING (user_id = auth.uid());
    
    CREATE POLICY "comments_delete_policy" ON task_comments
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- User Activities
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activities') THEN
    CREATE POLICY "activities_select_policy" ON user_activities
      FOR SELECT USING (
        user_id = auth.uid()
        OR workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
        OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
      );
    
    CREATE POLICY "activities_insert_policy" ON user_activities
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- User Presence
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
    CREATE POLICY "presence_policy" ON user_presence
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- File Attachments
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_attachments') THEN
    CREATE POLICY "attachments_select_policy" ON file_attachments
      FOR SELECT USING (
        workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
        OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
      );
    
    CREATE POLICY "attachments_insert_policy" ON file_attachments
      FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND (
          workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
          OR workspace_id IN (SELECT get_owned_workspace_ids(auth.uid()))
        )
      );
    
    CREATE POLICY "attachments_delete_policy" ON file_attachments
      FOR DELETE USING (
        uploaded_by = auth.uid()
        OR is_workspace_admin(workspace_id, auth.uid())
      );
  END IF;
END $$;

-- =====================================================
-- STEP 11: Add display_name and email columns to workspace_members
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'display_name') THEN
    ALTER TABLE workspace_members ADD COLUMN display_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'email') THEN
    ALTER TABLE workspace_members ADD COLUMN email TEXT;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ SUCCESS: Database policies configured!' as result;

-- Show created policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
