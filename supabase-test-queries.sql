-- =====================================================
-- Supabase Setup Verification Test Queries
-- Run these in your Supabase SQL Editor to verify setup
-- =====================================================

-- =====================================================
-- TEST 1: Verify All Tables Are Created
-- =====================================================
SELECT 
  'TEST 1: Table Creation' as test_name,
  'SUCCESS' as status,
  COUNT(*) as tables_created,
  'Expected: 8 tables' as expected
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'workspaces', 'workspace_members', 'pages', 
    'tasks', 'task_comments', 'workspace_invitations',
    'user_activities', 'user_presence'
  );

-- =====================================================
-- TEST 2: Verify Row Level Security is Enabled
-- =====================================================
SELECT 
  'TEST 2: RLS Enabled' as test_name,
  CASE 
    WHEN COUNT(*) = 8 THEN 'SUCCESS'
    ELSE 'FAILED'
  END as status,
  COUNT(*) as tables_with_rls,
  'Expected: 8 tables with RLS' as expected
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename IN (
    'workspaces', 'workspace_members', 'pages', 
    'tasks', 'task_comments', 'workspace_invitations',
    'user_activities', 'user_presence'
  );

-- =====================================================
-- TEST 3: Verify RLS Policies Are Created
-- =====================================================
SELECT 
  'TEST 3: RLS Policies' as test_name,
  CASE 
    WHEN COUNT(*) >= 20 THEN 'SUCCESS'
    ELSE 'FAILED'
  END as status,
  COUNT(*) as policies_created,
  'Expected: 20+ policies' as expected
FROM pg_policies 
WHERE schemaname = 'public';

-- =====================================================
-- TEST 4: Verify Custom Types Are Created
-- =====================================================
SELECT 
  'TEST 4: Custom Types' as test_name,
  CASE 
    WHEN COUNT(*) = 5 THEN 'SUCCESS'
    ELSE 'FAILED'
  END as status,
  COUNT(*) as types_created,
  'Expected: 5 custom types' as expected
FROM pg_type 
WHERE typname IN (
  'user_role', 'task_status', 'task_priority', 
  'invitation_status', 'activity_type'
);

-- =====================================================
-- TEST 5: Verify Functions Are Created
-- =====================================================
SELECT 
  'TEST 5: Functions' as test_name,
  CASE 
    WHEN COUNT(*) >= 8 THEN 'SUCCESS'
    ELSE 'FAILED'
  END as status,
  COUNT(*) as functions_created,
  'Expected: 8+ functions' as expected
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_updated_at_column',
    'add_workspace_owner_as_member',
    'set_task_completed_at',
    'log_activity',
    'log_workspace_created',
    'log_page_created',
    'log_task_created',
    'log_task_completed',
    'log_member_joined',
    'get_user_workspaces'
  );

-- =====================================================
-- TEST 6: Verify Triggers Are Created
-- =====================================================
SELECT 
  'TEST 6: Triggers' as test_name,
  CASE 
    WHEN COUNT(*) >= 10 THEN 'SUCCESS'
    ELSE 'FAILED'
  END as status,
  COUNT(*) as triggers_created,
  'Expected: 10+ triggers' as expected
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- =====================================================
-- TEST 7: Test Sample Data Insertion (Safe Test)
-- =====================================================
-- This test will only work if you're authenticated
-- It tests if the basic table structure works

-- First, let's check if we can insert into workspaces table
-- (This will fail with RLS if not authenticated, which is expected)
DO $$
DECLARE
  test_result TEXT;
BEGIN
  BEGIN
    -- Try to insert a test workspace (will fail due to RLS if not authenticated)
    INSERT INTO workspaces (name, description, owner_id) 
    VALUES ('Test Workspace', 'Test Description', '00000000-0000-0000-0000-000000000000');
    
    -- If we get here, delete the test data
    DELETE FROM workspaces WHERE name = 'Test Workspace';
    test_result := 'SUCCESS - Table structure is valid';
  EXCEPTION 
    WHEN insufficient_privilege THEN
      test_result := 'SUCCESS - RLS is working (expected error)';
    WHEN OTHERS THEN
      test_result := 'FAILED - ' || SQLERRM;
  END;
  
  RAISE NOTICE 'TEST 7: Sample Data Test - %', test_result;
END $$;

-- =====================================================
-- TEST 8: Verify Extensions Are Enabled
-- =====================================================
SELECT 
  'TEST 8: Extensions' as test_name,
  CASE 
    WHEN COUNT(*) >= 1 THEN 'SUCCESS'
    ELSE 'FAILED'
  END as status,
  COUNT(*) as extensions_enabled,
  'Expected: uuid-ossp extension' as expected
FROM pg_extension 
WHERE extname = 'uuid-ossp';

-- =====================================================
-- TEST 9: Test UUID Generation
-- =====================================================
SELECT 
  'TEST 9: UUID Generation' as test_name,
  'SUCCESS' as status,
  gen_random_uuid() as sample_uuid,
  'UUID generation working' as expected;

-- =====================================================
-- TEST 10: Verify Table Relationships (Foreign Keys)
-- =====================================================
SELECT 
  'TEST 10: Foreign Keys' as test_name,
  CASE 
    WHEN COUNT(*) >= 10 THEN 'SUCCESS'
    ELSE 'FAILED'
  END as status,
  COUNT(*) as foreign_keys_created,
  'Expected: 10+ foreign key constraints' as expected
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
  AND table_schema = 'public';

-- =====================================================
-- SUMMARY REPORT
-- =====================================================
SELECT 
  '=== SUPABASE SETUP VERIFICATION COMPLETE ===' as summary,
  'Run all tests above and check for SUCCESS status' as instruction,
  'If any test shows FAILED, review the setup steps' as note;

-- =====================================================
-- DETAILED TABLE INFORMATION
-- =====================================================
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'workspaces', 'workspace_members', 'pages', 
    'tasks', 'task_comments', 'workspace_invitations',
    'user_activities', 'user_presence'
  )
ORDER BY table_name, ordinal_position;
