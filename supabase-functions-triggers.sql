-- =====================================================
-- Page Task Hub - Database Functions and Triggers
-- =====================================================

-- =====================================================
-- 1. UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_workspaces_updated_at 
  BEFORE UPDATE ON workspaces 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at 
  BEFORE UPDATE ON pages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at 
  BEFORE UPDATE ON task_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at 
  BEFORE UPDATE ON user_presence 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. WORKSPACE OWNER AS MEMBER FUNCTION
-- =====================================================
-- Automatically add workspace owner as a member when workspace is created
CREATE OR REPLACE FUNCTION add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER add_workspace_owner_as_member_trigger
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION add_workspace_owner_as_member();

-- =====================================================
-- 3. TASK COMPLETION TRIGGER
-- =====================================================
-- Automatically set completed_at when task status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_task_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- =====================================================
-- 4. ACTIVITY TRACKING FUNCTIONS
-- =====================================================
-- Function to create activity log entries
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_workspace_id UUID,
  p_activity_type activity_type,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO user_activities (
    user_id, workspace_id, activity_type, 
    resource_type, resource_id, details
  )
  VALUES (
    p_user_id, p_workspace_id, p_activity_type,
    p_resource_type, p_resource_id, p_details
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ language 'plpgsql';

-- =====================================================
-- 5. WORKSPACE ACTIVITY TRIGGERS
-- =====================================================
-- Log workspace creation
CREATE OR REPLACE FUNCTION log_workspace_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_activity(
    NEW.owner_id,
    NEW.id,
    'workspace_created',
    'workspace',
    NEW.id,
    jsonb_build_object('workspace_name', NEW.name)
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_workspace_created_trigger
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION log_workspace_created();

-- =====================================================
-- 6. PAGE ACTIVITY TRIGGERS
-- =====================================================
-- Log page creation
CREATE OR REPLACE FUNCTION log_page_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_activity(
    NEW.created_by,
    NEW.workspace_id,
    'page_created',
    'page',
    NEW.id,
    jsonb_build_object('page_title', NEW.title, 'page_url', NEW.url)
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_page_created_trigger
  AFTER INSERT ON pages
  FOR EACH ROW EXECUTE FUNCTION log_page_created();

-- =====================================================
-- 7. TASK ACTIVITY TRIGGERS
-- =====================================================
-- Log task creation
CREATE OR REPLACE FUNCTION log_task_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_activity(
    NEW.created_by,
    NEW.workspace_id,
    'task_created',
    'task',
    NEW.id,
    jsonb_build_object(
      'task_title', NEW.title,
      'task_status', NEW.status,
      'assigned_to', NEW.assigned_to
    )
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_task_created_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_created();

-- Log task completion
CREATE OR REPLACE FUNCTION log_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM log_activity(
      auth.uid(),
      NEW.workspace_id,
      'task_completed',
      'task',
      NEW.id,
      jsonb_build_object('task_title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_task_completed_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_completed();

-- =====================================================
-- 8. MEMBER ACTIVITY TRIGGERS
-- =====================================================
-- Log member joining
CREATE OR REPLACE FUNCTION log_member_joined()
RETURNS TRIGGER AS $$
DECLARE
  workspace_name TEXT;
  user_email TEXT;
BEGIN
  -- Get workspace name
  SELECT name INTO workspace_name FROM workspaces WHERE id = NEW.workspace_id;
  
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  PERFORM log_activity(
    NEW.user_id,
    NEW.workspace_id,
    'member_joined',
    'workspace',
    NEW.workspace_id,
    jsonb_build_object(
      'workspace_name', workspace_name,
      'user_email', user_email,
      'role', NEW.role
    )
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_member_joined_trigger
  AFTER INSERT ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION log_member_joined();

-- =====================================================
-- 9. UTILITY FUNCTIONS
-- =====================================================
-- Function to get user's workspaces
CREATE OR REPLACE FUNCTION get_user_workspaces(user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  owner_id UUID,
  settings JSONB,
  invite_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_role user_role
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id, w.name, w.description, w.owner_id, w.settings, 
    w.invite_code, w.created_at, w.updated_at,
    COALESCE(wm.role, 'owner'::user_role) as user_role
  FROM workspaces w
  LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = user_id
  WHERE w.owner_id = user_id OR wm.user_id = user_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;
