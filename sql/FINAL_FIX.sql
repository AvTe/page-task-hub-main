-- =====================================================
-- FINAL FIX FOR EASTASK - Users Table Issue
-- =====================================================
-- This script fixes the "permission denied for table users" error
-- Run this in the Supabase SQL Editor
-- =====================================================

-- STEP 1: Create the public.users table if it doesn't exist
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Drop existing policies on users table
-- =====================================================

DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "allow_select_users" ON public.users;
DROP POLICY IF EXISTS "allow_insert_users" ON public.users;
DROP POLICY IF EXISTS "allow_update_users" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;

-- STEP 3: Enable RLS and create permissive policies
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow ALL authenticated users to SELECT any user (needed for member lookups)
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT TO authenticated
    USING (true);

-- Allow users to INSERT their own record
CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to UPDATE their own record only
CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- STEP 4: Grant permissions to authenticated and anon roles
-- =====================================================

GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT INSERT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- STEP 5: Create trigger to sync auth.users to public.users
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to sync new auth users to public.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 6: Sync existing auth users to public.users
-- =====================================================

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
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

-- STEP 7: Ensure workspaces table has proper RLS
-- =====================================================

-- Drop existing workspace policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

-- Ensure RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies for workspaces
CREATE POLICY "workspaces_select_policy" ON workspaces
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid() 
        OR id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "workspaces_insert_policy" ON workspaces
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_policy" ON workspaces
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_policy" ON workspaces
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- STEP 8: Ensure workspace_members has proper RLS
-- =====================================================

DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own membership or other members in same workspace
CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Workspace owners can insert members, or users can insert themselves
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Workspace owners can update members
CREATE POLICY "workspace_members_update_policy" ON workspace_members
    FOR UPDATE TO authenticated
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Users can remove themselves, owners can remove anyone
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- STEP 9: Create trigger to auto-add owner as member
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.add_owner_as_member();

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'SUCCESS: Users table created and configured!' AS result;

-- Show current policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'workspaces', 'workspace_members')
ORDER BY tablename, policyname;
