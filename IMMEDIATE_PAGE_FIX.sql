-- =====================================================
-- IMMEDIATE PAGE CREATION FIX
-- Run this RIGHT NOW to fix page creation
-- =====================================================

-- Check current pages table structure
SELECT 'Current pages table columns:' as info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE pages ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Update any existing pages
UPDATE pages SET category = 'General' WHERE category IS NULL OR category = '';
UPDATE pages SET color = '#3B82F6' WHERE color IS NULL OR color = '';

-- Verify the fix
SELECT 'After fix - pages table columns:' as info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pages' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Fix completed! Try creating a page now.' as status;
