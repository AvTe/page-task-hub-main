-- =====================================================
-- RUN THIS SQL IN SUPABASE SQL EDITOR NOW
-- This will fix the page creation errors
-- =====================================================

-- Add missing fields to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Update existing pages with default values  
UPDATE pages SET category = 'General' WHERE category IS NULL OR category = '';
UPDATE pages SET color = '#3B82F6' WHERE color IS NULL OR color = '';

-- Verify the fix worked
SELECT 'Pages table now has these columns:' as info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pages' AND table_schema = 'public'
ORDER BY ordinal_position;
