-- =====================================================
-- EasTask - COMPLETE DATABASE SETUP
-- Run this SQL in Supabase SQL Editor
-- This contains ALL missing tables for the application
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    phone TEXT,
    location TEXT,
    website TEXT,
    job_title TEXT,
    company TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- =====================================================
-- 2. USER SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    task_reminders BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    compact_mode BOOLEAN DEFAULT false,
    default_view TEXT DEFAULT 'list',
    items_per_page INTEGER DEFAULT 20,
    settings_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =====================================================
-- 3. USER STATISTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_in_progress INTEGER DEFAULT 0,
    total_time_tracked INTEGER DEFAULT 0, -- in minutes
    comments_made INTEGER DEFAULT 0,
    workspaces_owned INTEGER DEFAULT 0,
    workspaces_joined INTEGER DEFAULT 0,
    pages_created INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);

-- =====================================================
-- 4. USER ACTIVITY TABLE (for detailed activity log)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_description TEXT,
    resource_type TEXT,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_workspace_id ON user_activity(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);

-- =====================================================
-- 5. TASK TIME ENTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_time_entries_task_id ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_user_id ON task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_workspace_id ON task_time_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_start_time ON task_time_entries(start_time);

-- =====================================================
-- 6. TASK DEPENDENCIES TABLE
-- =====================================================
DO $$ BEGIN
    CREATE TYPE dependency_type AS ENUM ('blocks', 'blocked_by', 'relates_to');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type dependency_type DEFAULT 'blocked_by',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_created_by ON task_dependencies(created_by);

-- =====================================================
-- 7. SUBTASKS TABLE
-- =====================================================
DO $$ BEGIN
    CREATE TYPE subtask_status AS ENUM ('todo', 'progress', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status subtask_status DEFAULT 'todo',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_by ON subtasks(created_by);

-- =====================================================
-- 8. NOTIFICATIONS TABLE (if not exists)
-- =====================================================
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'invitation', 
        'task_assignment', 
        'task_update', 
        'workspace_update', 
        'mention', 
        'system', 
        'task_comment', 
        'task_status_change', 
        'workspace_invitation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'system',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Settings Policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
CREATE POLICY "Users can view their own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
CREATE POLICY "Users can insert their own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Statistics Policies
DROP POLICY IF EXISTS "Users can view their own statistics" ON user_statistics;
CREATE POLICY "Users can view their own statistics" ON user_statistics FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own statistics" ON user_statistics;
CREATE POLICY "Users can update their own statistics" ON user_statistics FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own statistics" ON user_statistics;
CREATE POLICY "Users can insert their own statistics" ON user_statistics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Activity Policies
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
CREATE POLICY "Users can view their own activity" ON user_activity FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity" ON user_activity;
CREATE POLICY "Users can insert their own activity" ON user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Task Time Entries Policies
DROP POLICY IF EXISTS "Users can view their own time entries" ON task_time_entries;
CREATE POLICY "Users can view their own time entries" ON task_time_entries FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own time entries" ON task_time_entries;
CREATE POLICY "Users can insert their own time entries" ON task_time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own time entries" ON task_time_entries;
CREATE POLICY "Users can update their own time entries" ON task_time_entries FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own time entries" ON task_time_entries;
CREATE POLICY "Users can delete their own time entries" ON task_time_entries FOR DELETE USING (auth.uid() = user_id);

-- Task Dependencies Policies
DROP POLICY IF EXISTS "Users can view task dependencies" ON task_dependencies;
CREATE POLICY "Users can view task dependencies" ON task_dependencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create task dependencies" ON task_dependencies;
CREATE POLICY "Users can create task dependencies" ON task_dependencies FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their task dependencies" ON task_dependencies;
CREATE POLICY "Users can delete their task dependencies" ON task_dependencies FOR DELETE USING (auth.uid() = created_by);

-- Subtasks Policies
DROP POLICY IF EXISTS "Users can view subtasks" ON subtasks;
CREATE POLICY "Users can view subtasks" ON subtasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create subtasks" ON subtasks;
CREATE POLICY "Users can create subtasks" ON subtasks FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update subtasks" ON subtasks;
CREATE POLICY "Users can update subtasks" ON subtasks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete subtasks" ON subtasks;
CREATE POLICY "Users can delete subtasks" ON subtasks FOR DELETE USING (auth.uid() = created_by);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_statistics TO authenticated;
GRANT ALL ON user_activity TO authenticated;
GRANT ALL ON task_time_entries TO authenticated;
GRANT ALL ON task_dependencies TO authenticated;
GRANT ALL ON subtasks TO authenticated;
GRANT ALL ON notifications TO authenticated;

GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON user_settings TO service_role;
GRANT ALL ON user_statistics TO service_role;
GRANT ALL ON user_activity TO service_role;
GRANT ALL ON task_time_entries TO service_role;
GRANT ALL ON task_dependencies TO service_role;
GRANT ALL ON subtasks TO service_role;
GRANT ALL ON notifications TO service_role;

-- =====================================================
-- AUTO-CREATE USER PROFILE/SETTINGS/STATS ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO user_profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user settings
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user statistics
    INSERT INTO user_statistics (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update task time entry duration
CREATE OR REPLACE FUNCTION update_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_time_entry_duration ON task_time_entries;
CREATE TRIGGER calculate_time_entry_duration
    BEFORE INSERT OR UPDATE ON task_time_entries
    FOR EACH ROW EXECUTE FUNCTION update_time_entry_duration();

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_task_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_statistics 
        SET tasks_created = tasks_created + 1,
            updated_at = NOW()
        WHERE user_id = NEW.created_by;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
            UPDATE user_statistics 
            SET tasks_completed = tasks_completed + 1,
                tasks_in_progress = GREATEST(tasks_in_progress - 1, 0),
                updated_at = NOW()
            WHERE user_id = NEW.created_by;
        ELSIF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
            UPDATE user_statistics 
            SET tasks_in_progress = tasks_in_progress + 1,
                updated_at = NOW()
            WHERE user_id = NEW.created_by;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS track_task_stats ON tasks;
CREATE TRIGGER track_task_stats
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_user_task_stats();

-- =====================================================
-- CREATE INITIAL DATA FOR EXISTING USERS
-- =====================================================
-- This will create profile/settings/stats for users who already exist
INSERT INTO user_profiles (user_id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_statistics (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'All database tables created successfully!' as result,
       'Tables created: user_profiles, user_settings, user_statistics, user_activity, task_time_entries, task_dependencies, subtasks, notifications' as tables,
       'RLS policies and triggers have been set up' as security;
