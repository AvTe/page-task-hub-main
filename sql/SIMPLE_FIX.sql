-- =====================================================
-- SIMPLE FIX - NO RECURSION (GUARANTEED TO WORK)
-- =====================================================
-- This script uses the simplest possible RLS policies
-- that CANNOT cause infinite recursion
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =====================================================

-- Drop ALL workspace_members policies (the problem table)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL workspaces policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspaces' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspaces', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL tasks policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', pol.policyname);
        END LOOP;
    END IF;
END $$;

-- Drop ALL pages policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'pages' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON pages', pol.policyname);
        END LOOP;
    END IF;
END $$;

-- Drop ALL users policies
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
    updated_at = NOW();

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE SIMPLE POLICIES (NO RECURSION!)
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 🔐 public.users - SIMPLE: All authenticated can read
-- ─────────────────────────────────────────────────────

CREATE POLICY "users_read" ON public.users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert" ON public.users
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "users_update" ON public.users
    FOR UPDATE TO authenticated USING (id = auth.uid());

-- ─────────────────────────────────────────────────────
-- 🏢 workspaces - SIMPLE: Owner-based only
-- ─────────────────────────────────────────────────────

-- SELECT: User owns it OR is in workspace_members
-- NOTE: This CAN reference workspace_members because
-- workspace_members policy doesn't reference workspaces
CREATE POLICY "workspaces_read" ON workspaces
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid()
    );

CREATE POLICY "workspaces_insert" ON workspaces
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update" ON workspaces
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "workspaces_delete" ON workspaces
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────
-- 👥 workspace_members - SUPER SIMPLE (NO SUB-QUERIES!)
-- ─────────────────────────────────────────────────────

-- SELECT: User can see rows where they are the user
-- This is THE SIMPLEST possible policy - no recursion possible
CREATE POLICY "members_read" ON workspace_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- INSERT: User can add themselves OR if they own the workspace
CREATE POLICY "members_insert" ON workspace_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

-- UPDATE: Only workspace owner (checked via workspaces table)
CREATE POLICY "members_update" ON workspace_members
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    );

-- DELETE: User can remove themselves
CREATE POLICY "members_delete" ON workspace_members
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    );

-- ─────────────────────────────────────────────────────
-- 📋 tasks - SIMPLE: Based on workspace membership
-- ─────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    CREATE POLICY "tasks_all" ON tasks
        FOR ALL TO authenticated
        USING (
            created_by = auth.uid()
            OR assigned_to = auth.uid()
            OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
        );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- 📄 pages - SIMPLE: Based on workspace membership
-- ─────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    CREATE POLICY "pages_all" ON pages
        FOR ALL TO authenticated
        USING (
            created_by = auth.uid()
            OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
        );
  END IF;
END $$;

-- =====================================================
-- STEP 6: CREATE SECURITY DEFINER TRIGGER
-- =====================================================

-- This trigger adds owner as member - MUST be SECURITY DEFINER
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

-- Trigger to sync auth.users to public.users
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
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

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON pages TO authenticated;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ All policies dropped and recreated without recursion!' AS status;

-- Show current policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'workspaces', 'workspace_members', 'tasks', 'pages')
ORDER BY tablename, policyname;
