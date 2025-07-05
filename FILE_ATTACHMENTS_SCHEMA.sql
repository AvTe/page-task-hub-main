-- File Attachments Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- Storage path/name
    original_name TEXT NOT NULL, -- Original filename
    size BIGINT NOT NULL, -- File size in bytes
    type TEXT NOT NULL, -- MIME type
    url TEXT NOT NULL, -- Public URL
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    comment_id UUID, -- For future comment attachments
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_attachments_task_id ON file_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_comment_id ON file_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_workspace_id ON file_attachments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_at ON file_attachments(uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_attachments

-- Users can view attachments in workspaces they're members of
CREATE POLICY "Users can view attachments in their workspaces" ON file_attachments
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can upload attachments to workspaces they're members of
CREATE POLICY "Users can upload attachments to their workspaces" ON file_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can delete their own attachments or if they're workspace admin/owner
CREATE POLICY "Users can delete their own attachments or as workspace admin" ON file_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Create storage bucket for file attachments (if not exists)
-- Note: This needs to be run in the Supabase dashboard or via the API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('task-attachments', 'task-attachments', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
-- Note: These need to be created in the Supabase dashboard under Storage > Policies

-- Policy: Users can upload files to their workspace folders
-- CREATE POLICY "Users can upload to workspace folders" ON storage.objects
--     FOR INSERT WITH CHECK (
--         bucket_id = 'task-attachments' AND
--         (storage.foldername(name))[1] IN (
--             SELECT workspace_id::text 
--             FROM workspace_members 
--             WHERE user_id = auth.uid()
--         )
--     );

-- Policy: Users can view files from their workspaces
-- CREATE POLICY "Users can view workspace files" ON storage.objects
--     FOR SELECT USING (
--         bucket_id = 'task-attachments' AND
--         (storage.foldername(name))[1] IN (
--             SELECT workspace_id::text 
--             FROM workspace_members 
--             WHERE user_id = auth.uid()
--         )
--     );

-- Policy: Users can delete their own files or as workspace admin
-- CREATE POLICY "Users can delete workspace files" ON storage.objects
--     FOR DELETE USING (
--         bucket_id = 'task-attachments' AND
--         (
--             (storage.foldername(name))[1] IN (
--                 SELECT workspace_id::text 
--                 FROM workspace_members 
--                 WHERE user_id = auth.uid() 
--                 AND role IN ('owner', 'admin')
--             )
--             OR
--             name IN (
--                 SELECT name 
--                 FROM file_attachments 
--                 WHERE uploaded_by = auth.uid()
--             )
--         )
--     );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_file_attachments_updated_at 
    BEFORE UPDATE ON file_attachments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add attachment count to tasks (optional enhancement)
-- This could be used for displaying attachment counts without querying the attachments table

-- Add attachments column to tasks table (optional)
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

-- Function to update task attachment count
-- CREATE OR REPLACE FUNCTION update_task_attachment_count()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF TG_OP = 'INSERT' THEN
--         UPDATE tasks 
--         SET attachment_count = attachment_count + 1 
--         WHERE id = NEW.task_id AND NEW.task_id IS NOT NULL;
--         RETURN NEW;
--     ELSIF TG_OP = 'DELETE' THEN
--         UPDATE tasks 
--         SET attachment_count = GREATEST(attachment_count - 1, 0) 
--         WHERE id = OLD.task_id AND OLD.task_id IS NOT NULL;
--         RETURN OLD;
--     END IF;
--     RETURN NULL;
-- END;
-- $$ language 'plpgsql';

-- Trigger to update task attachment count
-- CREATE TRIGGER update_task_attachment_count_trigger
--     AFTER INSERT OR DELETE ON file_attachments
--     FOR EACH ROW
--     EXECUTE FUNCTION update_task_attachment_count();

-- Grant necessary permissions
GRANT ALL ON file_attachments TO authenticated;
GRANT ALL ON file_attachments TO service_role;

-- Sample query to test the setup
-- SELECT 
--     fa.*,
--     u.email as uploader_email,
--     w.name as workspace_name
-- FROM file_attachments fa
-- JOIN auth.users u ON fa.uploaded_by = u.id
-- JOIN workspaces w ON fa.workspace_id = w.id
-- WHERE fa.task_id IS NOT NULL
-- ORDER BY fa.uploaded_at DESC
-- LIMIT 10;
