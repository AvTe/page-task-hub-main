-- =====================================================
-- EasTask - DATABASE MIGRATION
-- Run this SQL to add missing columns to existing tables
-- Run AFTER supabase-complete-setup.sql
-- =====================================================

-- =====================================================
-- 1. ADD MISSING COLUMNS TO task_comments
-- =====================================================
DO $$ 
BEGIN
    -- Add parent_comment_id for threaded comments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'task_comments' AND column_name = 'parent_comment_id') THEN
        ALTER TABLE task_comments ADD COLUMN parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_comment_id);
    END IF;
    
    -- Add is_edited flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'task_comments' AND column_name = 'is_edited') THEN
        ALTER TABLE task_comments ADD COLUMN is_edited BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =====================================================
-- 2. CREATE LOG_USER_ACTIVITY RPC FUNCTION
-- (Used by TimeTracker and TaskComments components)
-- =====================================================
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_description TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activity (
        user_id,
        activity_type,
        activity_description,
        metadata,
        created_at
    )
    VALUES (
        p_user_id,
        p_activity_type,
        p_activity_description,
        p_metadata,
        NOW()
    )
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. ADD RLS POLICIES TO EXISTING TABLES
-- =====================================================

-- Enable RLS on task_comments if not already enabled
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policies for task_comments
DROP POLICY IF EXISTS "Users can view comments" ON task_comments;
CREATE POLICY "Users can view comments" ON task_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON task_comments;
CREATE POLICY "Users can create comments" ON task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
CREATE POLICY "Users can update their own comments" ON task_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON task_comments;
CREATE POLICY "Users can delete their own comments" ON task_comments FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. ADD RLS POLICIES FOR CORE TABLES
-- =====================================================

-- Workspaces policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
CREATE POLICY "Users can view workspaces they belong to" ON workspaces 
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces 
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
CREATE POLICY "Owners can update their workspaces" ON workspaces 
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;
CREATE POLICY "Owners can delete their workspaces" ON workspaces 
    FOR DELETE USING (auth.uid() = owner_id);

-- Workspace members policies
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members" ON workspace_members 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = workspace_id AND m.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;
CREATE POLICY "Admins can manage workspace members" ON workspace_members 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM workspace_members m 
                WHERE m.workspace_id = workspace_id 
                AND m.user_id = auth.uid() 
                AND m.role IN ('owner', 'admin'))
    );

-- Pages policies
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pages in their workspaces" ON pages;
CREATE POLICY "Users can view pages in their workspaces" ON pages 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = pages.workspace_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create pages" ON pages;
CREATE POLICY "Users can create pages" ON pages 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = pages.workspace_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update pages" ON pages;
CREATE POLICY "Users can update pages" ON pages 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = pages.workspace_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Creators can delete pages" ON pages;
CREATE POLICY "Creators can delete pages" ON pages 
    FOR DELETE USING (auth.uid() = created_by);

-- Tasks policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
CREATE POLICY "Users can view tasks in their workspaces" ON tasks 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks" ON tasks 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
CREATE POLICY "Users can update tasks" ON tasks 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Creators can delete tasks" ON tasks;
CREATE POLICY "Creators can delete tasks" ON tasks 
    FOR DELETE USING (auth.uid() = created_by);

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO service_role;

-- =====================================================
-- 6. CREATE STORAGE BUCKET FOR AVATARS (if using Supabase Storage)
-- =====================================================
-- Note: This needs to be run separately in Supabase Dashboard > Storage
-- or use the Supabase CLI

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Database migration completed successfully!' as result;
