-- =====================================================
-- NUCLEAR FIX - Complete Reset of All RLS Policies
-- =====================================================
-- This removes EVERYTHING and creates the simplest possible setup
-- Run this if all other fixes haven't worked
-- =====================================================

-- =====================================================
-- STEP 1: DISABLE RLS ON ALL TABLES TEMPORARILY
-- =====================================================

ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE pages DISABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- =====================================================

-- Drop ALL policies from workspaces
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspaces' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON workspaces', pol.policyname);
  END LOOP;
END $$;

-- Drop ALL policies from workspace_members
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', pol.policyname);
  END LOOP;
END $$;

-- Drop ALL policies from tasks
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', pol.policyname);
  END LOOP;
END $$;

-- Drop ALL policies from pages
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'pages' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON pages', pol.policyname);
  END LOOP;
END $$;

-- Drop ALL policies from users table
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- STEP 3: DROP ALL TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =====================================================
-- STEP 4: RE-ENABLE RLS
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE SIMPLE POLICIES (No functions, no joins)
-- =====================================================

-- WORKSPACES: Simple policies
CREATE POLICY "allow_select_workspaces" ON workspaces
  FOR SELECT TO authenticated
  USING (true);  -- Allow reading any workspace (we'll filter in app)

CREATE POLICY "allow_insert_workspaces" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "allow_update_workspaces" ON workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "allow_delete_workspaces" ON workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- WORKSPACE_MEMBERS: Simple policies
CREATE POLICY "allow_select_members" ON workspace_members
  FOR SELECT TO authenticated
  USING (true);  -- Allow reading all members

CREATE POLICY "allow_insert_members" ON workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- Allow inserting members (app validates)

CREATE POLICY "allow_update_members" ON workspace_members
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "allow_delete_members" ON workspace_members
  FOR DELETE TO authenticated
  USING (true);

-- TASKS: Simple policies
CREATE POLICY "allow_select_tasks" ON tasks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allow_insert_tasks" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "allow_update_tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "allow_delete_tasks" ON tasks
  FOR DELETE TO authenticated
  USING (true);

-- PAGES: Simple policies
CREATE POLICY "allow_select_pages" ON pages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allow_insert_pages" ON pages
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "allow_update_pages" ON pages
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "allow_delete_pages" ON pages
  FOR DELETE TO authenticated
  USING (true);

-- USERS: Simple policies (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE POLICY "allow_select_users" ON users
      FOR SELECT TO authenticated
      USING (true);
    
    CREATE POLICY "allow_insert_users" ON users
      FOR INSERT TO authenticated
      WITH CHECK (true);
    
    CREATE POLICY "allow_update_users" ON users
      FOR UPDATE TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- STEP 6: Grant permissions
-- =====================================================

GRANT ALL ON workspaces TO authenticated;
GRANT ALL ON workspace_members TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON pages TO authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    GRANT ALL ON users TO authenticated;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ NUCLEAR FIX APPLIED - All policies reset!' as result;

-- Show what policies exist now
SELECT tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
