    -- ============================================
    -- FIX JOIN WORKSPACE INVITATION FLOW
    -- Run this in your Supabase SQL Editor
    -- ============================================

    -- STEP 1: Add invite_code column to workspaces table if missing
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'workspaces' AND column_name = 'invite_code') THEN
            ALTER TABLE public.workspaces ADD COLUMN invite_code TEXT;
            RAISE NOTICE 'Added invite_code column to workspaces table';
        END IF;
    END $$;

    -- STEP 2: Generate invite codes for existing workspaces that don't have one
    UPDATE public.workspaces 
    SET invite_code = 'invite-' || EXTRACT(EPOCH FROM created_at)::bigint || '-' || SUBSTRING(id::text, 1, 8)
    WHERE invite_code IS NULL;

    -- STEP 3: Drop existing functions to avoid conflicts
    DROP FUNCTION IF EXISTS public.get_workspace_by_invite_code(TEXT);
    DROP FUNCTION IF EXISTS public.join_workspace_by_invite_code(TEXT, UUID, TEXT, TEXT);

    -- STEP 4: Create the get_workspace_by_invite_code function
    CREATE OR REPLACE FUNCTION public.get_workspace_by_invite_code(p_invite_code TEXT)
    RETURNS TABLE (
        workspace_id UUID,
        workspace_name TEXT,
        workspace_description TEXT,
        member_count BIGINT,
        inviter_name TEXT,
        role TEXT,
        invite_code TEXT
    ) 
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        -- First, try to find in workspace_invitations table
        RETURN QUERY
        SELECT 
            wi.workspace_id,
            COALESCE(w.name, wi.workspace_name) as workspace_name,
            w.description as workspace_description,
            (SELECT COUNT(*)::bigint FROM public.workspace_members wm WHERE wm.workspace_id = wi.workspace_id) as member_count,
            wi.invited_by_name as inviter_name,
            wi.role,
            wi.invite_code
        FROM public.workspace_invitations wi
        LEFT JOIN public.workspaces w ON w.id = wi.workspace_id
        WHERE wi.invite_code = p_invite_code
        AND wi.status = 'pending'
        LIMIT 1;

        -- If no result from invitations, try workspaces table directly
        IF NOT FOUND THEN
            RETURN QUERY
            SELECT 
                w.id as workspace_id,
                w.name as workspace_name,
                w.description as workspace_description,
                (SELECT COUNT(*)::bigint FROM public.workspace_members wm WHERE wm.workspace_id = w.id) as member_count,
                COALESCE((SELECT u.name FROM public.users u WHERE u.id = w.owner_id), 'Workspace Owner') as inviter_name,
                'member'::text as role,
                w.invite_code
            FROM public.workspaces w
            WHERE w.invite_code = p_invite_code
            LIMIT 1;
        END IF;
    END;
    $$;

    -- STEP 4: Grant execute permission
    GRANT EXECUTE ON FUNCTION public.get_workspace_by_invite_code(TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_workspace_by_invite_code(TEXT) TO anon;

    -- STEP 5: Create a function to join workspace by invite code
    CREATE OR REPLACE FUNCTION public.join_workspace_by_invite_code(
        p_invite_code TEXT,
        p_user_id UUID,
        p_display_name TEXT DEFAULT NULL,
        p_email TEXT DEFAULT NULL
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_workspace_id UUID;
        v_role TEXT;
        v_invitation_id UUID;
    BEGIN
        -- First, try to find invitation
        SELECT wi.workspace_id, wi.role, wi.id INTO v_workspace_id, v_role, v_invitation_id
        FROM public.workspace_invitations wi
        WHERE wi.invite_code = p_invite_code
        AND wi.status = 'pending'
        LIMIT 1;

        -- If no invitation found, try workspace direct invite code
        IF v_workspace_id IS NULL THEN
            SELECT w.id INTO v_workspace_id
            FROM public.workspaces w
            WHERE w.invite_code = p_invite_code
            LIMIT 1;
            
            v_role := 'member';
        END IF;

        IF v_workspace_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
        END IF;

        -- Check if user is already a member
        IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = v_workspace_id AND user_id = p_user_id) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Already a member of this workspace');
        END IF;

        -- Add user as member
        INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at, display_name, email)
        VALUES (v_workspace_id, p_user_id, COALESCE(v_role, 'member'), NOW(), p_display_name, p_email);

        -- Update invitation status if exists
        IF v_invitation_id IS NOT NULL THEN
            UPDATE public.workspace_invitations
            SET status = 'accepted', accepted_at = NOW()
            WHERE id = v_invitation_id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'workspace_id', v_workspace_id,
            'role', COALESCE(v_role, 'member')
        );
    END;
    $$;

    -- STEP 6: Grant execute permission
    GRANT EXECUTE ON FUNCTION public.join_workspace_by_invite_code(TEXT, UUID, TEXT, TEXT) TO authenticated;

    -- STEP 7: Verify the setup
    SELECT 'Workspaces with invite codes:' as info;
    SELECT id, name, invite_code FROM public.workspaces LIMIT 5;

    SELECT 'Pending invitations:' as info;
    SELECT id, workspace_name, invite_code, status FROM public.workspace_invitations WHERE status = 'pending' LIMIT 5;
