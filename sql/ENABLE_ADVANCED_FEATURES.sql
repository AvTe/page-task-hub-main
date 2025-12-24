-- =====================================================
-- CLEAN INSTALL - ADVANCED FEATURES
-- =====================================================
-- This script cleans up any broken tables/policies first
-- Then creates everything fresh
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING BROKEN OBJECTS
-- =====================================================

-- Drop policies first (they depend on tables)
DO $$ 
BEGIN
  -- Subtasks policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subtasks') THEN
    DROP POLICY IF EXISTS "subtasks_all_policy" ON subtasks;
    DROP POLICY IF EXISTS "subtasks_select_policy" ON subtasks;
    DROP POLICY IF EXISTS "subtasks_insert_policy" ON subtasks;
    DROP POLICY IF EXISTS "subtasks_update_policy" ON subtasks;
    DROP POLICY IF EXISTS "subtasks_delete_policy" ON subtasks;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_dependencies') THEN
    DROP POLICY IF EXISTS "task_deps_all_policy" ON task_dependencies;
    DROP POLICY IF EXISTS "task_dependencies_select_policy" ON task_dependencies;
    DROP POLICY IF EXISTS "task_dependencies_insert_policy" ON task_dependencies;
    DROP POLICY IF EXISTS "task_dependencies_delete_policy" ON task_dependencies;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_time_entries') THEN
    DROP POLICY IF EXISTS "time_entries_all_policy" ON task_time_entries;
    DROP POLICY IF EXISTS "time_entries_select_policy" ON task_time_entries;
    DROP POLICY IF EXISTS "time_entries_insert_policy" ON task_time_entries;
    DROP POLICY IF EXISTS "time_entries_update_policy" ON task_time_entries;
    DROP POLICY IF EXISTS "time_entries_delete_policy" ON task_time_entries;
  END IF;
END $$;

-- Now drop the tables
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS task_time_entries CASCADE;

-- =====================================================
-- STEP 2: CREATE SUBTASKS TABLE
-- =====================================================
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key separately to avoid chicken-egg issues
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE subtasks ADD CONSTRAINT subtasks_task_id_fkey 
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);

-- Enable RLS with simple policy
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subtasks_all_policy" ON subtasks FOR ALL USING (true);

-- =====================================================
-- STEP 3: CREATE TASK DEPENDENCIES TABLE
-- =====================================================
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  depends_on_task_id UUID NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Add foreign keys separately
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE task_dependencies ADD CONSTRAINT task_deps_task_id_fkey 
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
    ALTER TABLE task_dependencies ADD CONSTRAINT task_deps_depends_on_fkey 
      FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX idx_task_deps_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends_on ON task_dependencies(depends_on_task_id);

-- Enable RLS with simple policy
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_deps_all_policy" ON task_dependencies FOR ALL USING (true);

-- =====================================================
-- STEP 4: CREATE TASK TIME ENTRIES TABLE
-- =====================================================
CREATE TABLE task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  description TEXT,
  billable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys separately
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE task_time_entries ADD CONSTRAINT time_entries_task_id_fkey 
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX idx_time_entries_task_id ON task_time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON task_time_entries(user_id);

-- Enable RLS with simple policy
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_entries_all_policy" ON task_time_entries FOR ALL USING (true);

-- =====================================================
-- STEP 5: Add columns to workspace_members if missing
-- =====================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_members') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_members' AND column_name = 'display_name') THEN
      ALTER TABLE workspace_members ADD COLUMN display_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_members' AND column_name = 'email') THEN
      ALTER TABLE workspace_members ADD COLUMN email TEXT;
    END IF;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION - Show what was created
-- =====================================================
SELECT '✅ Tables created successfully!' as status;

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('subtasks', 'task_dependencies', 'task_time_entries')
ORDER BY table_name, ordinal_position;
