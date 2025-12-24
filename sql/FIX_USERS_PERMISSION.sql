-- =====================================================
-- FIX FOR "permission denied for table users" ERROR
-- =====================================================
-- This error occurs when there's a public.users table
-- or when triggers/functions try to access auth.users
-- =====================================================

-- =====================================================
-- STEP 1: Check if public.users table exists and fix it
-- =====================================================

-- If public.users table exists, add RLS policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- Enable RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "users_select_policy" ON public.users;
    DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
    DROP POLICY IF EXISTS "users_update_policy" ON public.users;
    DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
    DROP POLICY IF EXISTS "Users can view all users" ON public.users;
    DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
    
    -- Create permissive policies
    CREATE POLICY "users_select_policy" ON public.users
      FOR SELECT USING (true);
    
    CREATE POLICY "users_insert_policy" ON public.users
      FOR INSERT WITH CHECK (id = auth.uid());
    
    CREATE POLICY "users_update_policy" ON public.users
      FOR UPDATE USING (id = auth.uid());
    
    RAISE NOTICE 'Fixed public.users table RLS policies';
  ELSE
    RAISE NOTICE 'No public.users table found';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Check if profiles table exists and fix it
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Enable RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    
    -- Create permissive policies
    CREATE POLICY "profiles_select_policy" ON public.profiles
      FOR SELECT USING (true);
    
    CREATE POLICY "profiles_insert_policy" ON public.profiles
      FOR INSERT WITH CHECK (id = auth.uid());
    
    CREATE POLICY "profiles_update_policy" ON public.profiles
      FOR UPDATE USING (id = auth.uid());
    
    RAISE NOTICE 'Fixed public.profiles table RLS policies';
  ELSE
    RAISE NOTICE 'No public.profiles table found';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Fix the add_owner_as_member trigger
-- This trigger should NOT access users table directly
-- =====================================================

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
DROP FUNCTION IF EXISTS add_owner_as_member();

-- Create function to add owner as member (without accessing users table)
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simply add the owner as a member with 'owner' role
  -- Do NOT try to access auth.users or public.users
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();

-- =====================================================
-- STEP 4: Grant necessary permissions
-- =====================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_workspace_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_owned_workspace_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_owner_as_member() TO authenticated;

-- =====================================================
-- STEP 5: Verify workspaces table structure
-- =====================================================

-- Ensure workspaces table has correct structure
DO $$
BEGIN
  -- Check if invite_code column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'invite_code') THEN
    ALTER TABLE workspaces ADD COLUMN invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'base64');
    RAISE NOTICE 'Added invite_code column to workspaces';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ Users table fix applied!' as result;

-- Check what tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_members', 'tasks', 'pages', 'users', 'profiles')
ORDER BY tablename;
