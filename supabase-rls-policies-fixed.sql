-- =====================================================
-- Page Task Hub - FIXED Row Level Security (RLS) Policies
-- This fixes the infinite recursion issue
-- =====================================================

-- First, drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON workspaces;

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Members can be removed by owners/admins or themselves" ON workspace_members;

DROP POLICY IF EXISTS "Users can view workspace pages" ON pages;
DROP POLICY IF EXISTS "Users can create pages" ON pages;
DROP POLICY IF EXISTS "Users can update their pages or workspace owners/admins" ON pages;
DROP POLICY IF EXISTS "Users can delete their pages or workspace owners/admins" ON pages;

DROP POLICY IF EXISTS "Users can view workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their tasks or workspace owners/admins" ON tasks;

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- WORKSPACES POLICIES (FIXED)
-- =====================================================

-- Users can view workspaces they own
CREATE POLICY "Users can view workspaces they own" ON workspaces
  FOR SELECT USING (owner_id = auth.uid());

-- Users can create workspaces
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Only workspace owners can update workspaces
CREATE POLICY "Workspace owners can update workspaces" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- Only workspace owners can delete workspaces
CREATE POLICY "Workspace owners can delete workspaces" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- =====================================================
-- WORKSPACE MEMBERS POLICIES (FIXED)
-- =====================================================

-- Users can view all workspace members (no recursion)
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (true);

-- Workspace owners can add members
CREATE POLICY "Workspace owners can add members" ON workspace_members
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Workspace owners can update member roles
CREATE POLICY "Workspace owners can update members" ON workspace_members
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Workspace owners can remove members, users can remove themselves
CREATE POLICY "Members can be removed by owners or themselves" ON workspace_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- =====================================================
-- PAGES POLICIES (FIXED)
-- =====================================================

-- Users can view pages in workspaces they own or are members of
CREATE POLICY "Users can view workspace pages" ON pages
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can create pages in workspaces they belong to
CREATE POLICY "Users can create pages" ON pages
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Users can update pages they created or if they're workspace owners
CREATE POLICY "Users can update their pages or workspace owners" ON pages
  FOR UPDATE USING (
    created_by = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Users can delete pages they created or if they're workspace owners
CREATE POLICY "Users can delete their pages or workspace owners" ON pages
  FOR DELETE USING (
    created_by = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- =====================================================
-- TASKS POLICIES (FIXED)
-- =====================================================

-- Users can view tasks in workspaces they belong to
CREATE POLICY "Users can view workspace tasks" ON tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can create tasks in workspaces they belong to
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Users can update tasks they created, are assigned to, or workspace owners
CREATE POLICY "Users can update relevant tasks" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Users can delete tasks they created or workspace owners
CREATE POLICY "Users can delete their tasks or workspace owners" ON tasks
  FOR DELETE USING (
    created_by = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
