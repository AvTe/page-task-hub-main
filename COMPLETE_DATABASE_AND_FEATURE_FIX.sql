  -- =====================================================
  -- COMPLETE DATABASE AND FEATURE FIXES
  -- Run this entire script to fix ALL issues
  -- =====================================================

  -- 1. Add missing fields to pages table
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
  ALTER TABLE pages ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

  -- Update existing pages with default values
  UPDATE pages SET category = 'General' WHERE category IS NULL OR category = '';
  UPDATE pages SET color = '#3B82F6' WHERE color IS NULL OR color = '';

  -- 2. Add invite_code to workspaces if missing
  ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

  -- Generate invite codes for existing workspaces
  UPDATE workspaces 
  SET invite_code = LOWER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
  WHERE invite_code IS NULL OR invite_code = '';

  -- 3. Create user_activities table if it doesn't exist
  CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB DEFAULT '{}',
    target_id UUID,
    target_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- 4. Create user_presence table if it doesn't exist
  CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    current_page TEXT,
    cursor_x FLOAT,
    cursor_y FLOAT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
  );

  -- 5. Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_user_activities_workspace_id ON user_activities(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
  CREATE INDEX IF NOT EXISTS idx_user_presence_workspace_id ON user_presence(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
  CREATE INDEX IF NOT EXISTS idx_workspaces_invite_code ON workspaces(invite_code);

  -- 6. Enable RLS on new tables
  ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

  -- 7. Create RLS policies for user_activities
  DROP POLICY IF EXISTS "Users can view activities in their workspaces" ON user_activities;
  DROP POLICY IF EXISTS "Users can create activities in their workspaces" ON user_activities;

  CREATE POLICY "Users can view activities in their workspaces" ON user_activities
    FOR SELECT USING (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can create activities in their workspaces" ON user_activities
    FOR INSERT WITH CHECK (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    );

  -- 8. Create RLS policies for user_presence
  DROP POLICY IF EXISTS "Users can view presence in their workspaces" ON user_presence;
  DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;

  CREATE POLICY "Users can view presence in their workspaces" ON user_presence
    FOR SELECT USING (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update their own presence" ON user_presence
    FOR ALL USING (user_id = auth.uid());

  -- 9. Verify the fix worked
  SELECT 'All database fixes completed successfully!' as status;
  SELECT 'Pages table now has these columns:' as info;
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'pages' AND table_schema = 'public'
  ORDER BY ordinal_position;
