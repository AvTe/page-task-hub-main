-- ============================================
-- FIX INVITATION AND ACTIVITY TABLES
-- Run this in your Supabase SQL Editor
-- ============================================

-- STEP 1: Create workspace_invitations table if not exists
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    workspace_name TEXT,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_by_name TEXT,
    invitee_email TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    invite_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ
);

-- STEP 2: Add ALL missing columns to workspace_invitations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'workspace_name') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN workspace_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'invited_by_name') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN invited_by_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'invite_code') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN invite_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'status') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'role') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN role TEXT DEFAULT 'member';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'invitee_email') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN invitee_email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'expires_at') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_invitations' AND column_name = 'accepted_at') THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN accepted_at TIMESTAMPTZ;
    END IF;
END $$;

-- STEP 3: Add email column to workspace_members if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'workspace_members' AND column_name = 'email') THEN
        ALTER TABLE public.workspace_members ADD COLUMN email TEXT;
    END IF;
END $$;

-- STEP 4: Create user_activities table (used by the app)
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    action TEXT,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    activity_data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Add missing columns to user_activities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_activities' AND column_name = 'activity_type') THEN
        ALTER TABLE public.user_activities ADD COLUMN activity_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_activities' AND column_name = 'activity_data') THEN
        ALTER TABLE public.user_activities ADD COLUMN activity_data JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_activities' AND column_name = 'details') THEN
        ALTER TABLE public.user_activities ADD COLUMN details JSONB;
    END IF;
END $$;

-- STEP 6: Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- STEP 7: Drop existing policies
DROP POLICY IF EXISTS "workspace_invitations_select" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_update" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete" ON public.workspace_invitations;
DROP POLICY IF EXISTS "user_activities_select" ON public.user_activities;
DROP POLICY IF EXISTS "user_activities_insert" ON public.user_activities;

-- STEP 8: Create permissive policies for workspace_invitations
CREATE POLICY "workspace_invitations_select" ON public.workspace_invitations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "workspace_invitations_insert" ON public.workspace_invitations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "workspace_invitations_update" ON public.workspace_invitations
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "workspace_invitations_delete" ON public.workspace_invitations
    FOR DELETE TO authenticated USING (true);

-- STEP 9: Create permissive policies for user_activities
CREATE POLICY "user_activities_select" ON public.user_activities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_activities_insert" ON public.user_activities
    FOR INSERT TO authenticated WITH CHECK (true);

-- STEP 10: Grant permissions
GRANT ALL ON public.workspace_invitations TO authenticated;
GRANT ALL ON public.user_activities TO authenticated;

-- STEP 11: Verify columns exist
SELECT 'workspace_invitations columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspace_invitations' AND table_schema = 'public';

SELECT 'workspace_members columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspace_members' AND table_schema = 'public';

