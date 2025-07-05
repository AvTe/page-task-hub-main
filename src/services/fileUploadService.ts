// File Upload Service for handling file attachments
// This uses Supabase Storage for file management

import { supabase } from '../lib/supabase';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileId?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  taskId?: string;
  commentId?: string;
  workspaceId: string;
}

class FileUploadService {
  private readonly BUCKET_NAME = 'task-attachments';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/rtf',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    // Code files
    'text/javascript', 'text/typescript', 'text/html', 'text/css', 'application/json',
    'text/xml', 'application/xml'
  ];

  // Validate file before upload
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit`
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported'
      };
    }

    return { valid: true };
  }

  // Generate unique file path
  private generateFilePath(workspaceId: string, fileName: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2);
    const extension = fileName.split('.').pop();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `${workspaceId}/${timestamp}_${randomId}_${sanitizedName}`;
  }

  // Upload file to Supabase Storage
  async uploadFile(
    file: File, 
    workspaceId: string, 
    userId: string,
    taskId?: string,
    commentId?: string
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Generate unique file path
      const filePath = this.generateFilePath(workspaceId, file.name);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return {
          success: false,
          error: 'Failed to upload file'
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        return {
          success: false,
          error: 'Failed to get file URL'
        };
      }

      // Save file metadata to database
      const fileMetadata: Omit<FileMetadata, 'id'> = {
        name: filePath,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        taskId,
        commentId,
        workspaceId
      };

      const { data: dbData, error: dbError } = await supabase
        .from('file_attachments')
        .insert(fileMetadata)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Try to clean up uploaded file
        await this.deleteFile(filePath, workspaceId);
        return {
          success: false,
          error: 'Failed to save file metadata'
        };
      }

      return {
        success: true,
        url: urlData.publicUrl,
        fileId: dbData.id
      };

    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: 'Unexpected error during upload'
      };
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(
    files: File[],
    workspaceId: string,
    userId: string,
    taskId?: string,
    commentId?: string
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];
    
    for (const file of files) {
      const result = await this.uploadFile(file, workspaceId, userId, taskId, commentId);
      results.push(result);
    }
    
    return results;
  }

  // Delete file
  async deleteFile(filePath: string, workspaceId: string): Promise<boolean> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        return false;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('file_attachments')
        .delete()
        .eq('name', filePath)
        .eq('workspace_id', workspaceId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  // Get file metadata by ID
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as FileMetadata;
    } catch (error) {
      console.error('Get file metadata error:', error);
      return null;
    }
  }

  // Get files for a task
  async getTaskFiles(taskId: string): Promise<FileMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Get task files error:', error);
        return [];
      }

      return data as FileMetadata[];
    } catch (error) {
      console.error('Get task files error:', error);
      return [];
    }
  }

  // Get files for a comment
  async getCommentFiles(commentId: string): Promise<FileMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('comment_id', commentId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Get comment files error:', error);
        return [];
      }

      return data as FileMetadata[];
    } catch (error) {
      console.error('Get comment files error:', error);
      return [];
    }
  }

  // Get file type category
  getFileCategory(mimeType: string): 'image' | 'document' | 'archive' | 'code' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    
    if ([
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/rtf'
    ].includes(mimeType)) {
      return 'document';
    }
    
    if ([
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
    ].includes(mimeType)) {
      return 'archive';
    }
    
    if ([
      'text/javascript', 'text/typescript', 'text/html', 'text/css', 'application/json',
      'text/xml', 'application/xml'
    ].includes(mimeType)) {
      return 'code';
    }
    
    return 'other';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check if file is an image
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  // Generate thumbnail URL for images (if supported by storage)
  getThumbnailUrl(url: string, width: number = 200, height: number = 200): string {
    // For Supabase, you might need to implement image transformation
    // For now, return the original URL
    return url;
  }
}

export const fileUploadService = new FileUploadService();
