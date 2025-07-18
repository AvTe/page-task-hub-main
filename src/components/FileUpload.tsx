import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Video, 
  Music, 
  Archive, 
  X, 
  Download,
  Eye
} from 'lucide-react';
import { TaskAttachment } from '../types';
import { fileUploadService } from '../services/fileUploadService';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';

interface FileUploadProps {
  taskId?: string;
  commentId?: string;
  attachments?: TaskAttachment[];
  onAttachmentsChange?: (attachments: TaskAttachment[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  showPreview?: boolean;
  compact?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  taskId,
  commentId,
  attachments = [],
  onAttachmentsChange,
  maxFiles = 10,
  maxFileSize = 10,
  allowedTypes,
  showPreview = true,
  compact = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useSupabaseAuth();
  const { currentWorkspace } = useSupabaseWorkspace();

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="h-4 w-4" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !user || !currentWorkspace) return;

    const fileArray = Array.from(files);
    
    // Check file count limit
    if (attachments.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Upload files
    uploadFiles(fileArray);
  };

  const uploadFiles = async (files: File[]) => {
    if (!user || !currentWorkspace) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const newAttachments: TaskAttachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((i / files.length) * 100);

        const result = await fileUploadService.uploadFile(
          file,
          currentWorkspace.id,
          user.id,
          taskId,
          commentId
        );

        if (result.success && result.fileId) {
          // Get the file metadata from the service
          const metadata = await fileUploadService.getFileMetadata(result.fileId);
          if (metadata) {
            newAttachments.push(metadata);
          }
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`);
        }
      }

      setUploadProgress(100);
      
      if (newAttachments.length > 0) {
        const updatedAttachments = [...attachments, ...newAttachments];
        onAttachmentsChange?.(updatedAttachments);
        toast.success(`${newAttachments.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      await fileUploadService.deleteFile(attachmentId);
      const updatedAttachments = attachments.filter(att => att.id !== attachmentId);
      onAttachmentsChange?.(updatedAttachments);
      toast.success('File removed successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = (attachment: TaskAttachment) => {
    window.open(attachment.fileUrl, '_blank');
  };

  const handlePreview = (attachment: TaskAttachment) => {
    if (attachment.fileType.startsWith('image/')) {
      window.open(attachment.fileUrl, '_blank');
    } else {
      handleDownload(attachment);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${compact ? 'p-3' : 'p-6'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className={`text-center ${compact ? 'p-0' : 'p-0'}`}>
          <Upload className={`mx-auto text-muted-foreground mb-2 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`} />
          <p className={`text-muted-foreground ${compact ? 'text-sm' : ''}`}>
            {compact ? 'Click or drag files' : 'Click to upload or drag and drop files here'}
          </p>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1">
              Max {maxFiles} files, {maxFileSize}MB each
            </p>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={allowedTypes?.join(',') || '*/*'}
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading files...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Attachments ({attachments.length})</h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(attachment.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        <Badge variant="outline" className="text-xs">
                          {attachment.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {showPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(attachment)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
