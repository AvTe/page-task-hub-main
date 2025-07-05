-- =====================================================
-- WORKSPACE INVITATION RLS POLICIES
-- Run this AFTER running WORKSPACE_INVITATION_FIX_SIMPLE.sql
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace admins can manage invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;

-- Create RLS policies for workspace_invitations
CREATE POLICY "Users can view invitations sent to their email" ON workspace_invitations
  FOR SELECT USING (invited_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Workspace admins can manage invitations" ON workspace_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = workspace_invitations.workspace_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Create function to automatically create notification preferences for new workspace members
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, workspace_id)
  VALUES (NEW.user_id, NEW.workspace_id)
  ON CONFLICT (user_id, workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic notification preferences creation
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON workspace_members;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION accept_workspace_invitation(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'RLS policies created successfully!' as status;

-- Test that tables exist and have proper structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('workspace_invitations', 'notifications', 'notification_preferences')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
