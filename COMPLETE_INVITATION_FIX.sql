-- =====================================================
-- COMPLETE WORKSPACE INVITATION FIX - ALL IN ONE
-- Run this entire script to fix workspace invitations
-- =====================================================

-- First, let's check what tables exist
SELECT 'Starting workspace invitation setup...' as status;

-- Create workspace_invitations table
DROP TABLE IF EXISTS workspace_invitations CASCADE;
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workspace_name TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_name TEXT NOT NULL,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'admin', 'owner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invite_code TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invitation', 'task_assignment', 'task_update', 'workspace_update', 'mention', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_preferences table
DROP TABLE IF EXISTS notification_preferences CASCADE;
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  task_assignments BOOLEAN DEFAULT true,
  task_updates BOOLEAN DEFAULT true,
  workspace_invitations BOOLEAN DEFAULT true,
  mentions BOOLEAN DEFAULT true,
  daily_digest BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- Create indexes
CREATE INDEX idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(invited_email);
CREATE INDEX idx_workspace_invitations_status ON workspace_invitations(status);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX idx_notifications_read ON notifications(read);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Add missing columns to workspace_members if needed
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies (without complex references)
CREATE POLICY "workspace_invitations_select" ON workspace_invitations FOR SELECT USING (true);
CREATE POLICY "workspace_invitations_insert" ON workspace_invitations FOR INSERT WITH CHECK (true);
CREATE POLICY "workspace_invitations_update" ON workspace_invitations FOR UPDATE USING (true);

CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_all" ON notification_preferences FOR ALL USING (user_id = auth.uid());

-- Insert default notification preferences for existing members
INSERT INTO notification_preferences (user_id, workspace_id)
SELECT DISTINCT user_id, workspace_id 
FROM workspace_members
ON CONFLICT (user_id, workspace_id) DO NOTHING;

-- Create function to handle workspace invitation acceptance
CREATE OR REPLACE FUNCTION accept_workspace_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record workspace_invitations%ROWTYPE;
  existing_member_count INTEGER;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record 
  FROM workspace_invitations 
  WHERE id = invitation_id 
  AND status = 'pending' 
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is already a member
  SELECT COUNT(*) INTO existing_member_count
  FROM workspace_members 
  WHERE workspace_id = invitation_record.workspace_id 
  AND user_id = auth.uid();
  
  IF existing_member_count > 0 THEN
    -- Update invitation status
    UPDATE workspace_invitations 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = invitation_id;
    RETURN TRUE;
  END IF;
  
  -- Add user to workspace
  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by, joined_at)
  VALUES (
    invitation_record.workspace_id, 
    auth.uid(), 
    invitation_record.role,
    invitation_record.invited_by,
    NOW()
  );
  
  -- Update invitation status
  UPDATE workspace_invitations 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'All tables created successfully!' as status;

-- Verify tables exist
SELECT 
  table_name,
  'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workspace_invitations', 'notifications', 'notification_preferences')
ORDER BY table_name;

-- Show table structures
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('workspace_invitations', 'notifications', 'notification_preferences')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
