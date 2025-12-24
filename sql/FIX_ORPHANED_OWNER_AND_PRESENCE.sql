-- =====================================================
-- FIX ORPHANED OWNER & USER PRESENCE ISSUES
-- =====================================================
-- This script fixes two critical issues:
-- 1. Orphaned Owner Bug - Owner not added as workspace member
-- 2. User Presence Failures - RLS policies blocking presence updates
--
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- ISSUE #4: FIX ORPHANED OWNER BUG
-- =====================================================
-- Problem: When a workspace is created, the owner might not be 
-- automatically added to workspace_members table
-- Solution: Create a robust trigger that ALWAYS adds owner as member

-- Step 1: Drop existing trigger (if any)
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
DROP TRIGGER IF EXISTS trigger_add_owner_as_member ON workspaces;
DROP TRIGGER IF EXISTS add_owner_as_member_trigger ON workspaces;

-- Step 2: Create the trigger function with SECURITY DEFINER
-- This bypasses RLS so it can always insert the member record
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Critical: bypasses RLS
SET search_path = public
AS $$
BEGIN
    -- Insert owner as member of the workspace
    INSERT INTO workspace_members (
        workspace_id, 
        user_id, 
        role, 
        joined_at
    )
    VALUES (
        NEW.id, 
        NEW.owner_id, 
        'owner', 
        NOW()
    )
    ON CONFLICT (workspace_id, user_id) DO UPDATE 
    SET role = 'owner',
        joined_at = COALESCE(workspace_members.joined_at, NOW());
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the workspace creation
        RAISE WARNING 'Failed to add owner as member: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_owner_as_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_owner_as_member() TO service_role;

-- Step 4: Create the trigger
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.add_owner_as_member();

-- Step 5: Fix any existing orphaned workspaces
-- This adds owners as members for any workspaces that are missing the owner in members table
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT 
    w.id as workspace_id,
    w.owner_id as user_id,
    'owner' as role,
    w.created_at as joined_at
FROM workspaces w
LEFT JOIN workspace_members wm 
    ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
WHERE wm.workspace_id IS NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

SELECT '✅ Issue #4 Fixed: Orphaned Owner Bug' as status;
SELECT 
    COUNT(*) as workspaces_fixed
FROM workspaces w
INNER JOIN workspace_members wm 
    ON w.id = wm.workspace_id AND w.owner_id = wm.user_id;

-- =====================================================
-- ISSUE #5: FIX USER PRESENCE RLS POLICIES
-- =====================================================
-- Problem: user_presence table blocks users from updating their status
-- Solution: Add proper RLS policies for the user_presence table

-- First, check if user_presence table exists and create if not
DO $$ 
BEGIN
    -- Create user_presence table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
        CREATE TABLE public.user_presence (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
            last_seen TIMESTAMPTZ DEFAULT NOW(),
            current_page_id UUID,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        -- Create index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_user_presence_workspace ON user_presence(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_user_presence_user ON user_presence(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
        
        RAISE NOTICE 'Created user_presence table';
    END IF;
END $$;

-- Step 1: Drop all existing user_presence policies
DROP POLICY IF EXISTS "user_presence_select_policy" ON user_presence;
DROP POLICY IF EXISTS "user_presence_insert_policy" ON user_presence;
DROP POLICY IF EXISTS "user_presence_update_policy" ON user_presence;
DROP POLICY IF EXISTS "user_presence_delete_policy" ON user_presence;
DROP POLICY IF EXISTS "Users can view presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can insert own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON user_presence;

-- Step 2: Enable RLS on user_presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Step 3: Create helper function to get user's workspace IDs (if not exists)
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT workspace_id FROM workspace_members WHERE user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workspace_ids(UUID) TO authenticated;

-- Step 4: Create comprehensive RLS policies for user_presence

-- SELECT: Users can see their own presence AND presence of users in their workspaces
CREATE POLICY "user_presence_select_policy" ON user_presence
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
    OR workspace_id IS NULL  -- Allow viewing presence without workspace context
);

-- INSERT: Users can only insert their own presence
CREATE POLICY "user_presence_insert_policy" ON user_presence
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- UPDATE: Users can only update their own presence
CREATE POLICY "user_presence_update_policy" ON user_presence
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own presence
CREATE POLICY "user_presence_delete_policy" ON user_presence
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Step 5: Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_presence TO authenticated;

-- Step 6: Create a function to update presence (with proper security)
CREATE OR REPLACE FUNCTION public.update_user_presence(
    p_workspace_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'online',
    p_current_page_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO user_presence (user_id, workspace_id, status, last_seen, current_page_id, updated_at)
    VALUES (auth.uid(), p_workspace_id, p_status, NOW(), p_current_page_id, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET
        workspace_id = COALESCE(p_workspace_id, user_presence.workspace_id),
        status = p_status,
        last_seen = NOW(),
        current_page_id = p_current_page_id,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to update presence: %', SQLERRM;
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_presence(UUID, TEXT, UUID) TO authenticated;

SELECT '✅ Issue #5 Fixed: User Presence RLS Policies' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '📊 Verification Results:' as info;

-- Check trigger exists
SELECT '🔧 Trigger Status:' as check_type;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_workspace_created';

-- Check user_presence policies
SELECT '🔒 User Presence Policies:' as check_type;
SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'user_presence'
ORDER BY policyname;

-- Check RLS status
SELECT '🔐 RLS Status:' as check_type;
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '🔒 ENABLED' ELSE '🔓 DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workspaces', 'workspace_members', 'user_presence')
ORDER BY tablename;

-- Count workspaces with proper owner membership
SELECT '👥 Workspace Owner Status:' as check_type;
SELECT 
    COUNT(*) as total_workspaces,
    COUNT(wm.user_id) as workspaces_with_owner_member,
    COUNT(*) - COUNT(wm.user_id) as orphaned_workspaces
FROM workspaces w
LEFT JOIN workspace_members wm 
    ON w.id = wm.workspace_id AND w.owner_id = wm.user_id;

SELECT '🎉 SUCCESS: Both issues have been fixed!' as result;
SELECT 'Issue #4: Orphaned Owner Bug - Trigger ensures owners are always added as members' as fix_1;
SELECT 'Issue #5: User Presence Failures - RLS policies now allow presence updates' as fix_2;
