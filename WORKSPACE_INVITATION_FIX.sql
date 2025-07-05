-- =====================================================
-- WORKSPACE INVITATION SYSTEM FIX
-- Run this script to add workspace invitation functionality
-- =====================================================

-- 1. Create workspace_invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
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

-- 2. Create indexes for workspace_invitations
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON workspace_invitations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_invite_code ON workspace_invitations(invite_code);

-- 3. Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
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

-- 4. Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 5. Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
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

-- 6. Create indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_workspace_id ON notification_preferences(workspace_id);

-- 7. Enable Row Level Security (RLS) for all new tables
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for workspace_invitations
CREATE POLICY "Users can view invitations sent to their email" ON workspace_invitations
  FOR SELECT USING (invited_email = (auth.jwt() ->> 'email')::text);

CREATE POLICY "Workspace admins can manage invitations" ON workspace_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = workspace_invitations.workspace_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- 9. Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 10. Create RLS policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- 11. Create function to automatically create notification preferences for new workspace members
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, workspace_id)
  VALUES (NEW.user_id, NEW.workspace_id)
  ON CONFLICT (user_id, workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for automatic notification preferences creation
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON workspace_members;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- 13. Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE workspace_invitations 
  SET status = 'expired' 
  WHERE status = 'pending' 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 14. Insert default notification preferences for existing workspace members
INSERT INTO notification_preferences (user_id, workspace_id)
SELECT DISTINCT user_id, workspace_id 
FROM workspace_members
ON CONFLICT (user_id, workspace_id) DO NOTHING;

-- 15. Update workspace_members table to ensure proper structure
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- 16. Create function to handle workspace invitation acceptance
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

-- 17. Grant necessary permissions
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT 
  'workspace_invitations' as table_name,
  COUNT(*) as row_count
FROM workspace_invitations
UNION ALL
SELECT 
  'notifications' as table_name,
  COUNT(*) as row_count
FROM notifications
UNION ALL
SELECT 
  'notification_preferences' as table_name,
  COUNT(*) as row_count
FROM notification_preferences;

-- Check workspace invite codes
SELECT id, name, invite_code 
FROM workspaces 
WHERE invite_code IS NOT NULL
LIMIT 5;
