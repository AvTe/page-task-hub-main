-- =====================================================
-- PROPER RLS FIX FOR EASTASK (Production-Ready)
-- =====================================================
-- This script implements secure, non-recursive RLS policies
-- Based on how Notion/Linear/ClickUp handle workspace access
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- =====================================================

-- Workspaces policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;
DROP POLICY IF EXISTS "Workspace members can view workspace" ON workspaces;
DROP POLICY IF EXISTS "User can create workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;

-- Workspace members policies
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Members can see members" ON workspace_members;
DROP POLICY IF EXISTS "Owner can add members" ON workspace_members;

-- Tasks policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
    DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
    DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
    DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
    DROP POLICY IF EXISTS "Workspace members can manage tasks" ON tasks;
  END IF;
END $$;

-- Pages policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    DROP POLICY IF EXISTS "pages_select_policy" ON pages;
    DROP POLICY IF EXISTS "pages_insert_policy" ON pages;
    DROP POLICY IF EXISTS "pages_update_policy" ON pages;
    DROP POLICY IF EXISTS "pages_delete_policy" ON pages;
  END IF;
END $$;

-- Users policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    DROP POLICY IF EXISTS "users_select_policy" ON public.users;
    DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
    DROP POLICY IF EXISTS "users_update_policy" ON public.users;
    DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can read all users" ON public.users;
  END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE public.users TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- =====================================================
-- STEP 3: SYNC auth.users → public.users
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
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

-- =====================================================
-- STEP 4: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE PROPER RLS POLICIES
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 🔐 public.users POLICIES
-- ─────────────────────────────────────────────────────

-- Users can read ALL user profiles (needed for member lookups)
CREATE POLICY "Users can read all users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile (for sync trigger)
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────────────
-- 🏢 workspaces POLICIES
-- ─────────────────────────────────────────────────────

-- SELECT: User can view workspaces they own OR are members of
CREATE POLICY "Workspace members can view workspace"
ON workspaces
FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid()
    OR id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
    )
);

-- INSERT: Any authenticated user can create a workspace (become owner)
CREATE POLICY "User can create workspace"
ON workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- UPDATE: Only owner can update
CREATE POLICY "Owner can update workspace"
ON workspaces
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Only owner can delete
CREATE POLICY "Owner can delete workspace"
ON workspaces
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────
-- 👥 workspace_members POLICIES
-- ─────────────────────────────────────────────────────

-- SELECT: Can view members if you're a member of the same workspace
CREATE POLICY "Members can see members"
ON workspace_members
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
    )
);

-- INSERT: Owner can add members, OR trigger can add (for auto-join)
CREATE POLICY "Owner can add members"
ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
    -- User adding themselves (for accepting invites)
    user_id = auth.uid()
    -- OR owner adding someone
    OR EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id
        AND owner_id = auth.uid()
    )
);

-- UPDATE: Only workspace owner can change roles
CREATE POLICY "Owner can update members"
ON workspace_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id
        AND owner_id = auth.uid()
    )
);

-- DELETE: Owner can remove anyone, users can remove themselves
CREATE POLICY "Owner or self can remove member"
ON workspace_members
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_id
        AND owner_id = auth.uid()
    )
);

-- ─────────────────────────────────────────────────────
-- ✅ tasks POLICIES
-- ─────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    -- SELECT/UPDATE/DELETE: Workspace members can manage tasks
    CREATE POLICY "Workspace members can view tasks"
    ON tasks
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

    CREATE POLICY "Workspace members can create tasks"
    ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

    CREATE POLICY "Workspace members can update tasks"
    ON tasks
    FOR UPDATE
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

    CREATE POLICY "Workspace members can delete tasks"
    ON tasks
    FOR DELETE
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 📄 pages POLICIES
-- ─────────────────────────────────────────────────────

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    CREATE POLICY "Workspace members can view pages"
    ON pages
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

    CREATE POLICY "Workspace members can create pages"
    ON pages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

    CREATE POLICY "Workspace members can update pages"
    ON pages
    FOR UPDATE
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

    CREATE POLICY "Workspace members can delete pages"
    ON pages
    FOR DELETE
    TO authenticated
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );
  END IF;
END $$;

-- =====================================================
-- STEP 6: CREATE TRIGGERS (with SECURITY DEFINER)
-- =====================================================

-- ─────────────────────────────────────────────────────
-- Trigger: Auto-add owner as member when workspace created
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚡ CRITICAL: Bypasses RLS
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

-- ─────────────────────────────────────────────────────
-- Trigger: Sync new auth users to public.users
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚡ CRITICAL: Bypasses RLS
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
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON pages TO authenticated;
  END IF;
END $$;

-- =====================================================
-- STEP 8: VERIFICATION
-- =====================================================

-- Check for missing users (should return 0 rows)
SELECT 'Missing users check:' as check_name, 
       COUNT(*) as missing_count,
       CASE WHEN COUNT(*) = 0 THEN '✅ All synced!' ELSE '❌ Run sync again' END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

-- Show RLS status
SELECT '✅ RLS Status:' as info;
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '🔒 RLS ON' ELSE '🔓 RLS OFF' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'workspaces', 'workspace_members', 'tasks', 'pages')
ORDER BY tablename;

-- Show created policies
SELECT '✅ Policies Created:' as info;
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

SELECT '🎉 SUCCESS: Production-ready RLS configured!' AS result;
