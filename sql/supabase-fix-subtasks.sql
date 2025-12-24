-- =====================================================
-- EasTask - FIX SUBTASKS TABLE
-- Run this SQL to fix the subtasks table column name
-- =====================================================

-- Option 1: If subtasks table exists with wrong column name, rename it
DO $$ 
BEGIN
    -- Check if table exists with task_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'task_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'parent_task_id'
    ) THEN
        -- Rename task_id to parent_task_id
        ALTER TABLE subtasks RENAME COLUMN task_id TO parent_task_id;
        RAISE NOTICE 'Renamed task_id to parent_task_id in subtasks table';
    END IF;
    
    -- Check if position column exists but order_index doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'position'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subtasks' AND column_name = 'order_index'
    ) THEN
        -- Rename position to order_index
        ALTER TABLE subtasks RENAME COLUMN position TO order_index;
        RAISE NOTICE 'Renamed position to order_index in subtasks table';
    END IF;
END $$;

-- Option 2: If table doesn't exist at all, create it
CREATE TABLE IF NOT EXISTS subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create or replace index
DROP INDEX IF EXISTS idx_subtasks_task_id;
DROP INDEX IF EXISTS idx_subtasks_parent_task_id;
CREATE INDEX idx_subtasks_parent_task_id ON subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON subtasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_by ON subtasks(created_by);

-- Enable RLS
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Add policies
DROP POLICY IF EXISTS "Users can view subtasks" ON subtasks;
CREATE POLICY "Users can view subtasks" ON subtasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create subtasks" ON subtasks;
CREATE POLICY "Users can create subtasks" ON subtasks FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update subtasks" ON subtasks;
CREATE POLICY "Users can update subtasks" ON subtasks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete subtasks" ON subtasks;
CREATE POLICY "Users can delete subtasks" ON subtasks FOR DELETE USING (auth.uid() = created_by);

-- Grant permissions
GRANT ALL ON subtasks TO authenticated;
GRANT ALL ON subtasks TO service_role;

-- Verify the fix
SELECT 'Subtasks table fixed!' as result, 
       string_agg(column_name, ', ') as columns
FROM information_schema.columns 
WHERE table_name = 'subtasks';
