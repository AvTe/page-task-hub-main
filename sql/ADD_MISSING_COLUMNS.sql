-- =====================================================
-- ADD MISSING COLUMNS TO PAGES & USER_ACTIVITIES
-- =====================================================
-- This script adds missing columns that the frontend expects
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD MISSING COLUMNS TO PAGES TABLE
-- =====================================================
-- Error: Could not find the 'category' column of 'pages' in the schema cache

DO $$
BEGIN
    -- Add 'category' column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pages' AND column_name = 'category'
    ) THEN
        ALTER TABLE pages ADD COLUMN category TEXT DEFAULT 'General';
        RAISE NOTICE 'Added category column to pages';
    END IF;

    -- Add 'url' column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pages' AND column_name = 'url'
    ) THEN
        ALTER TABLE pages ADD COLUMN url TEXT;
        RAISE NOTICE 'Added url column to pages';
    END IF;

    -- Add 'color' column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pages' AND column_name = 'color'
    ) THEN
        ALTER TABLE pages ADD COLUMN color TEXT DEFAULT '#6366f1';
        RAISE NOTICE 'Added color column to pages';
    END IF;

    -- Add 'created_by' column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pages' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE pages ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to pages';
    END IF;
END $$;

SELECT '✅ Pages table columns updated!' as status;

-- =====================================================
-- 2. ENSURE USER_ACTIVITIES TABLE EXISTS
-- =====================================================
-- Error: POST https://.../user_activities 400 (Bad Request)

-- Check if user_activities table exists and create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activities') THEN
        CREATE TABLE public.user_activities (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            activity_type TEXT NOT NULL,
            activity_data JSONB DEFAULT '{}',
            resource_type TEXT,
            resource_id UUID,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX idx_user_activities_workspace ON user_activities(workspace_id);
        CREATE INDEX idx_user_activities_user ON user_activities(user_id);
        CREATE INDEX idx_user_activities_created ON user_activities(created_at DESC);
        
        RAISE NOTICE 'Created user_activities table';
    ELSE
        -- Add missing columns if table exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_activities' AND column_name = 'activity_type'
        ) THEN
            ALTER TABLE user_activities ADD COLUMN activity_type TEXT DEFAULT 'unknown';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_activities' AND column_name = 'activity_data'
        ) THEN
            ALTER TABLE user_activities ADD COLUMN activity_data JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_activities' AND column_name = 'resource_type'
        ) THEN
            ALTER TABLE user_activities ADD COLUMN resource_type TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_activities' AND column_name = 'resource_id'
        ) THEN
            ALTER TABLE user_activities ADD COLUMN resource_id UUID;
        END IF;
    END IF;
END $$;

-- Enable RLS on user_activities
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_activities_select" ON user_activities;
DROP POLICY IF EXISTS "user_activities_insert" ON user_activities;

-- Create RLS policies for user_activities
CREATE POLICY "user_activities_select" ON user_activities
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

CREATE POLICY "user_activities_insert" ON user_activities
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON user_activities TO authenticated;

SELECT '✅ User activities table updated!' as status;

-- =====================================================
-- 3. ENSURE PAGES TABLE HAS RLS
-- =====================================================

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "pages_select" ON pages;
DROP POLICY IF EXISTS "pages_insert" ON pages;
DROP POLICY IF EXISTS "pages_update" ON pages;
DROP POLICY IF EXISTS "pages_delete" ON pages;

-- Create RLS policies for pages
CREATE POLICY "pages_select" ON pages
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

CREATE POLICY "pages_insert" ON pages
FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

CREATE POLICY "pages_update" ON pages
FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

CREATE POLICY "pages_delete" ON pages
FOR DELETE TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON pages TO authenticated;

SELECT '✅ Pages RLS policies updated!' as status;

-- =====================================================
-- 4. ENSURE TASKS TABLE HAS ALL NEEDED COLUMNS
-- =====================================================

DO $$
BEGIN
    -- Add 'page_id' column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'page_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN page_id UUID REFERENCES pages(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added page_id column to tasks';
    END IF;

    -- Add 'created_by' column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE tasks ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to tasks';
    END IF;
    
    -- Add 'assigned_to' column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE tasks ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added assigned_to column to tasks';
    END IF;
END $$;

SELECT '✅ Tasks table columns updated!' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '📊 VERIFICATION:' as info;

-- Check pages columns
SELECT 'Pages table columns:' as check;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pages'
ORDER BY ordinal_position;

-- Check user_activities exists
SELECT 'User activities table:' as check;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_activities'
ORDER BY ordinal_position;

SELECT '🎉 SCHEMA UPDATE COMPLETE!' as result;
SELECT 'Refresh your browser and try creating a page again' as next_step;
