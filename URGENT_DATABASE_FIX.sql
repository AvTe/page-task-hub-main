-- =====================================================
-- URGENT DATABASE FIXES - Run this NOW
-- This fixes the 400 errors you're seeing
-- =====================================================

-- 1. Add missing fields to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- 2. Update existing pages with default values
UPDATE pages SET category = 'General' WHERE category IS NULL OR category = '';
UPDATE pages SET color = '#3B82F6' WHERE color IS NULL OR color = '';

-- 3. Check if user_activities table exists and has correct structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on user_activities if not already enabled
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policy for user_activities
DROP POLICY IF EXISTS "Users can view their own activities" ON user_activities;
CREATE POLICY "Users can view their own activities" ON user_activities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activities" ON user_activities;
CREATE POLICY "Users can insert their own activities" ON user_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Verify the pages table structure
SELECT 
  'Pages table structure:' as info,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pages' 
  AND table_schema = 'public'
  AND column_name IN ('category', 'color', 'title', 'description')
ORDER BY ordinal_position;
