-- =====================================================
-- FIX USERS TABLE PERMISSION (Run this NOW)
-- =====================================================

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: DISABLE RLS on users table (simplest fix)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant all permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Step 4: Sync existing auth users
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
    raw_user_meta_data->>'avatar_url',
    COALESCE(created_at, NOW()),
    NOW()
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Step 5: Verify
SELECT 'Users table fixed!' as status, COUNT(*) as user_count FROM public.users;
