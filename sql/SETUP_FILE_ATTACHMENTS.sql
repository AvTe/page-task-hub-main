-- =====================================================
-- SETUP FILE ATTACHMENTS SYSTEM
-- =====================================================
-- This script creates the file_attachments table and related policies.
-- 
-- IMPORTANT: You must ALSO create the Storage Bucket manually!
-- See instructions below.
-- =====================================================

-- =====================================================
-- STEP 1: CREATE FILE_ATTACHMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.file_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    comment_id UUID,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_attachments_workspace ON file_attachments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_task ON file_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_user ON file_attachments(uploaded_by);

SELECT '✅ file_attachments table created!' as status;

-- =====================================================
-- STEP 2: ENABLE RLS ON FILE_ATTACHMENTS
-- =====================================================

ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "file_attachments_select" ON file_attachments;
DROP POLICY IF EXISTS "file_attachments_insert" ON file_attachments;
DROP POLICY IF EXISTS "file_attachments_delete" ON file_attachments;

-- Users can view attachments in their workspaces
CREATE POLICY "file_attachments_select" ON file_attachments
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid())));

-- Users can upload attachments to their workspaces
CREATE POLICY "file_attachments_insert" ON file_attachments
FOR INSERT TO authenticated
WITH CHECK (
    uploaded_by = auth.uid()
    AND workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

-- Users can delete their own attachments or any in their workspace
CREATE POLICY "file_attachments_delete" ON file_attachments
FOR DELETE TO authenticated
USING (
    uploaded_by = auth.uid()
    OR workspace_id IN (SELECT public.get_user_workspace_ids(auth.uid()))
);

GRANT SELECT, INSERT, DELETE ON file_attachments TO authenticated;

SELECT '✅ file_attachments RLS policies created!' as status;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '📊 File Attachments Setup Complete!' as info;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'file_attachments'
ORDER BY ordinal_position;

-- =====================================================
-- ⚠️ IMPORTANT: STORAGE BUCKET SETUP REQUIRED!
-- =====================================================
-- 
-- The SQL script CANNOT create Storage Buckets.
-- You must manually create the bucket in Supabase Dashboard:
--
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to "Storage" in the left sidebar
-- 3. Click "New bucket"
-- 4. Enter these settings:
--    - Name: task-attachments
--    - Public: YES (check the box)
-- 5. Click "Create bucket"
-- 6. After creating, click on the bucket and go to "Policies"
-- 7. Create these policies:
--    
--    Policy 1 (SELECT - View files):
--    - Name: "Users can view workspace files"
--    - Operation: SELECT
--    - Target roles: authenticated
--    - Expression: (bucket_id = 'task-attachments')
--
--    Policy 2 (INSERT - Upload files):
--    - Name: "Users can upload files"
--    - Operation: INSERT
--    - Target roles: authenticated
--    - Expression: (bucket_id = 'task-attachments')
--
--    Policy 3 (DELETE - Delete files):
--    - Name: "Users can delete files"
--    - Operation: DELETE
--    - Target roles: authenticated
--    - Expression: (bucket_id = 'task-attachments')
--
-- =====================================================

SELECT '⚠️ REMEMBER: Create Storage Bucket "task-attachments" in Dashboard!' as next_step;
