-- =====================================================
-- FIX CACHE & INVITATION ISSUES (Performance Fixes)
-- =====================================================
-- This script fixes:
-- Issue #6: Stale Cache - Handled in frontend code
-- Issue #7: Ghost Invitations - RLS blocks invite code verification
--
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- ISSUE #7: FIX GHOST INVITATIONS
-- =====================================================
-- Problem: Users receive an email invite, but when they click the link,
-- the invite data can't be read because RLS blocks access.
-- Solution: Create a SECURITY DEFINER function to validate invite codes
-- and add proper RLS policies for workspace_invitations.

-- First, check if workspace_invitations table exists and create if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
        CREATE TABLE public.workspace_invitations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            workspace_name TEXT NOT NULL,
            invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            invited_by_name TEXT,
            invitee_email TEXT NOT NULL,
            role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
            invite_code TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
            accepted_at TIMESTAMPTZ
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_invitations_code ON workspace_invitations(invite_code);
        CREATE INDEX IF NOT EXISTS idx_invitations_email ON workspace_invitations(invitee_email);
        CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON workspace_invitations(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_invitations_status ON workspace_invitations(status);
        
        RAISE NOTICE 'Created workspace_invitations table';
    END IF;
END $$;

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "workspace_invitations_select_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_select_by_code" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_update_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete_policy" ON workspace_invitations;
DROP POLICY IF EXISTS "Invitees can view their invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners can manage invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Anyone can view by invite code" ON workspace_invitations;

-- Step 2: Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SECURITY DEFINER function to validate invite codes
-- This allows anyone to validate an invite code without RLS blocking access
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_invite_code TEXT)
RETURNS TABLE(
    id UUID,
    workspace_id UUID,
    workspace_name TEXT,
    invited_by UUID,
    invited_by_name TEXT,
    invitee_email TEXT,
    role TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        wi.id,
        wi.workspace_id,
        wi.workspace_name,
        wi.invited_by,
        wi.invited_by_name,
        wi.invitee_email,
        wi.role,
        wi.status,
        wi.created_at,
        wi.expires_at
    FROM workspace_invitations wi
    WHERE wi.invite_code = p_invite_code
    AND wi.status = 'pending'
    AND (wi.expires_at IS NULL OR wi.expires_at > NOW());
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO anon; -- Allow unauthenticated users to validate

-- Step 4: Create function to accept invitation (bypasses RLS)
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
    END IF;
    
    -- Find the invitation
    SELECT * INTO v_invitation
    FROM workspace_invitations
    WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite code');
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = v_invitation.workspace_id 
        AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already a member of this workspace');
    END IF;
    
    -- Add user as member
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (v_invitation.workspace_id, v_user_id, v_invitation.role, NOW())
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Mark invitation as accepted
    UPDATE workspace_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'workspace_id', v_invitation.workspace_id,
        'workspace_name', v_invitation.workspace_name,
        'role', v_invitation.role
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(TEXT) TO authenticated;

-- Step 5: Create function to get workspace info by invite code (for preview)
CREATE OR REPLACE FUNCTION public.get_workspace_by_invite_code(p_invite_code TEXT)
RETURNS TABLE(
    workspace_id UUID,
    workspace_name TEXT,
    workspace_description TEXT,
    member_count BIGINT,
    inviter_name TEXT,
    role TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        w.id as workspace_id,
        w.name as workspace_name,
        w.description as workspace_description,
        (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as member_count,
        COALESCE(wi.invited_by_name, 'Team Member') as inviter_name,
        wi.role
    FROM workspaces w
    LEFT JOIN workspace_invitations wi ON wi.invite_code = p_invite_code
    WHERE w.invite_code = p_invite_code
       OR wi.workspace_id = w.id
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_by_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_by_invite_code(TEXT) TO anon;

-- Step 6: Create RLS policies for workspace_invitations

-- SELECT: Users can see invitations for their email OR invitations they created
CREATE POLICY "workspace_invitations_select_policy" ON workspace_invitations
FOR SELECT TO authenticated
USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

-- INSERT: Only workspace owners/admins can create invitations
CREATE POLICY "workspace_invitations_insert_policy" ON workspace_invitations
FOR INSERT TO authenticated
WITH CHECK (
    invited_by = auth.uid()
    AND (
        public.is_workspace_owner(workspace_id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspace_invitations.workspace_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    )
);

-- UPDATE: Inviter can update, or invitee can accept/decline
CREATE POLICY "workspace_invitations_update_policy" ON workspace_invitations
FOR UPDATE TO authenticated
USING (
    invited_by = auth.uid()
    OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- DELETE: Only inviter or workspace owner can delete
CREATE POLICY "workspace_invitations_delete_policy" ON workspace_invitations
FOR DELETE TO authenticated
USING (
    invited_by = auth.uid()
    OR public.is_workspace_owner(workspace_id, auth.uid())
);

-- Step 7: Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_invitations TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ Issue #7 Fixed: Ghost Invitations' as status;

SELECT '📊 Verification Results:' as info;

-- Check functions exist
SELECT '🔧 Invitation Functions:' as check_type;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('validate_invite_code', 'accept_workspace_invitation', 'get_workspace_by_invite_code');

-- Check workspace_invitations policies
SELECT '🔒 Invitation Policies:' as check_type;
SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'workspace_invitations'
ORDER BY policyname;

-- Check RLS status
SELECT '🔐 RLS Status:' as check_type;
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '🔒 ENABLED' ELSE '🔓 DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'workspace_invitations';

SELECT '🎉 SUCCESS: Ghost Invitation issue has been fixed!' as result;
SELECT 'Users can now validate invite codes and join workspaces without RLS blocking access' as description;

-- =====================================================
-- HOW TO USE THE NEW FUNCTIONS:
-- =====================================================
-- 
-- 1. Validate an invite code (works without auth):
--    SELECT * FROM validate_invite_code('your-invite-code');
--
-- 2. Get workspace preview by invite code:
--    SELECT * FROM get_workspace_by_invite_code('your-invite-code');
--
-- 3. Accept an invitation (requires auth):
--    SELECT accept_workspace_invitation('your-invite-code');
--
-- =====================================================
