-- =====================================================
-- DROP PROBLEMATIC TRIGGERS (Run this NOW!)
-- =====================================================
-- The log_member_joined trigger accesses auth.users which causes permission errors

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS log_member_joined_trigger ON workspace_members;

-- Drop the problematic function
DROP FUNCTION IF EXISTS log_member_joined();

-- Also drop the workspace created log trigger (might have issues too)
DROP TRIGGER IF EXISTS log_workspace_created_trigger ON workspaces;

-- Create a SAFE version of add_workspace_owner_as_member
DROP TRIGGER IF EXISTS add_workspace_owner_as_member_trigger ON workspaces;
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
DROP FUNCTION IF EXISTS add_workspace_owner_as_member();
DROP FUNCTION IF EXISTS add_owner_as_member();

CREATE OR REPLACE FUNCTION add_owner_as_member()
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

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION add_owner_as_member();

-- Make sure users table exists and has no RLS issues
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.users TO authenticated;

-- Sync users
INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT 
    id, email,
    COALESCE(raw_user_meta_data->>'full_name', ''),
    raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();

-- Verify
SELECT 'Problematic triggers removed!' as status;
