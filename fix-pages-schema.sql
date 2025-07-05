-- =====================================================
-- Fix Pages Table - Add Missing Fields
-- Run this to add category and color fields to pages table
-- =====================================================

-- Add missing fields to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Update existing pages to have default values if needed
UPDATE pages SET category = 'General' WHERE category IS NULL;
UPDATE pages SET color = '#3B82F6' WHERE color IS NULL;
