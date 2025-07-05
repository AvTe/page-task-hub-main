-- =====================================================
-- CRITICAL DATABASE FIXES - Run this immediately
-- This fixes the schema mismatches preventing the app from working
-- =====================================================

-- =====================================================
-- 1. FIX PAGES TABLE - Add missing fields
-- =====================================================
ALTER TABLE pages ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Set default values for existing pages
UPDATE pages SET category = 'General' WHERE category IS NULL;
UPDATE pages SET color = '#3B82F6' WHERE color IS NULL;

-- =====================================================
-- 2. VERIFY TASK STATUS ENUM (should already exist)
-- =====================================================
-- The database already has the correct task_status enum
-- Frontend needs to be updated to match database values

-- =====================================================
-- 3. VERIFY TASK PRIORITY ENUM (should already exist)  
-- =====================================================
-- The database already has the correct task_priority enum
-- Frontend needs to be updated to match database values

-- =====================================================
-- 4. VERIFICATION QUERIES
-- =====================================================

-- Check pages table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check task enums
SELECT enumlabel FROM pg_enum WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'task_status'
);

SELECT enumlabel FROM pg_enum WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'task_priority'
);

-- Test page creation (should work after fix)
-- This is just a test - don't run in production
-- INSERT INTO pages (workspace_id, title, description, category, color, created_by)
-- VALUES ('test-workspace-id', 'Test Page', 'Test Description', 'Work', '#FF6B6B', 'test-user-id');
