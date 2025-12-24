-- =====================================================
-- CREATE PUBLIC USERS TABLE (Required by the app)
-- =====================================================
-- The app code references a 'users' table which doesn't exist
-- This creates a public.users table that mirrors auth.users
-- =====================================================

-- =====================================================
-- STEP 1: Create public.users table
-- =====================================================

-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Enable RLS and create policies
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;

-- Allow everyone to read all users (needed for workspace member lookups)
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (true);

-- Allow users to insert their own record
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow users to update their own record
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- =====================================================
-- STEP 3: Create trigger to auto-create user record
-- =====================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 4: Populate existing users from auth.users
-- =====================================================

-- Insert all existing auth.users into public.users
INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = NOW();

-- =====================================================
-- STEP 5: Grant permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ Users table created and populated!' as result;

-- Show users in the table
SELECT id, email, full_name FROM public.users LIMIT 5;
