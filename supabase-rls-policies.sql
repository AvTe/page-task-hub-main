-- =====================================================
-- Page Task Hub - Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- WORKSPACES POLICIES
-- =====================================================

-- Users can view workspaces they own or are members of
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

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
-- WORKSPACE MEMBERS POLICIES
-- =====================================================

-- Users can view members of workspaces they belong to
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace owners and admins can add members
CREATE POLICY "Owners and admins can add members" ON workspace_members
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Workspace owners and admins can update member roles
CREATE POLICY "Owners and admins can update members" ON workspace_members
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Workspace owners and admins can remove members, users can remove themselves
CREATE POLICY "Members can be removed by owners/admins or themselves" ON workspace_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- PAGES POLICIES
-- =====================================================

-- Users can view pages in workspaces they belong to
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

-- Users can update pages they created or if they're workspace owners/admins
CREATE POLICY "Users can update their pages or workspace owners/admins" ON pages
  FOR UPDATE USING (
    created_by = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Users can delete pages they created or if they're workspace owners/admins
CREATE POLICY "Users can delete their pages or workspace owners/admins" ON pages
  FOR DELETE USING (
    created_by = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- TASKS POLICIES
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

-- Users can update tasks they created, are assigned to, or workspace owners/admins
CREATE POLICY "Users can update relevant tasks" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Users can delete tasks they created or workspace owners/admins
CREATE POLICY "Users can delete their tasks or workspace owners/admins" ON tasks
  FOR DELETE USING (
    created_by = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- TASK COMMENTS POLICIES
-- =====================================================

-- Users can view comments on tasks in workspaces they belong to
CREATE POLICY "Users can view task comments" ON task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create comments on tasks in workspaces they belong to
CREATE POLICY "Users can create task comments" ON task_comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    ) AND user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "Users can update their comments" ON task_comments
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments or workspace owners/admins
CREATE POLICY "Users can delete their comments or workspace owners/admins" ON task_comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    task_id IN (
      SELECT id FROM tasks WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- =====================================================
-- WORKSPACE INVITATIONS POLICIES
-- =====================================================

-- Users can view invitations they sent or received
CREATE POLICY "Users can view relevant invitations" ON workspace_invitations
  FOR SELECT USING (
    invited_by = auth.uid() OR
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Workspace owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations" ON workspace_invitations
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) AND invited_by = auth.uid()
  );

-- Users can update invitations they received (accept/decline)
CREATE POLICY "Users can update their invitations" ON workspace_invitations
  FOR UPDATE USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    invited_by = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- USER ACTIVITIES POLICIES
-- =====================================================

-- Users can view activities in workspaces they belong to
CREATE POLICY "Users can view workspace activities" ON user_activities
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Users can create their own activities
CREATE POLICY "Users can create their activities" ON user_activities
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- USER PRESENCE POLICIES
-- =====================================================

-- Users can view presence of users in workspaces they belong to
CREATE POLICY "Users can view workspace user presence" ON user_presence
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Users can update their own presence
CREATE POLICY "Users can update their presence" ON user_presence
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- FILE ATTACHMENTS POLICIES
-- =====================================================

-- Enable RLS on file attachments
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view file attachments in workspaces they have access to
CREATE POLICY "Users can view file attachments in their workspaces" ON file_attachments
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Users can upload file attachments to workspaces they have access to
CREATE POLICY "Users can upload file attachments to their workspaces" ON file_attachments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) AND uploaded_by = auth.uid()
  );

-- Users can delete their own file attachments or workspace owners can delete any
CREATE POLICY "Users can delete file attachments" ON file_attachments
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );
