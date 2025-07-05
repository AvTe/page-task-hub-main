import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Archive, 
  Code, 
  Download, 
  Trash2, 
  Eye,
  X,
  Paperclip,
  AlertCircle
} from 'lucide-react';
import { fileUploadService, FileMetadata, FileUploadResult } from '../services/fileUploadService';
import FilePreviewModal from './FilePreviewModal';

interface FileAttachmentManagerProps {
  taskId?: string;
  commentId?: string;
  workspaceId: string;
  userId: string;
  attachments: FileMetadata[];
  onAttachmentsChange: (attachments: FileMetadata[]) => void;
  maxFiles?: number;
  showUploadArea?: boolean;
}

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const FileAttachmentManager: React.FC<FileAttachmentManagerProps> = ({
  taskId,
  commentId,
  workspaceId,
  userId,
  attachments,
  onAttachmentsChange,
  maxFiles = 10,
  showUploadArea = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimeType: string) => {
    const category = fileUploadService.getFileCategory(mimeType);
    switch (category) {
      case 'image': return <Image className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      case 'archive': return <Archive className="h-5 w-5" />;
      case 'code': return <Code className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const getFileColor = (mimeType: string) => {
    const category = fileUploadService.getFileCategory(mimeType);
    switch (category) {
      case 'image': return 'text-green-600';
      case 'document': return 'text-blue-600';
      case 'archive': return 'text-purple-600';
      case 'code': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (attachments.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError(null);
    const fileArray = Array.from(files);
    
    // Initialize upload progress
    const initialProgress: UploadProgress[] = fileArray.map(file => ({
      fileId: `temp_${Date.now()}_${Math.random()}`,
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const
    }));
    
    setUploadProgress(initialProgress);

    try {
      const results = await fileUploadService.uploadMultipleFiles(
        fileArray,
        workspaceId,
        userId,
        taskId,
        commentId
      );

      const newAttachments: FileMetadata[] = [];
      const updatedProgress = [...initialProgress];

      results.forEach((result, index) => {
        if (result.success && result.fileId) {
          updatedProgress[index] = {
            ...updatedProgress[index],
            progress: 100,
            status: 'success'
          };

          // Create file metadata from result
          const file = fileArray[index];
          const attachment: FileMetadata = {
            id: result.fileId,
            name: `${workspaceId}/${Date.now()}_${file.name}`,
            originalName: file.name,
            size: file.size,
            type: file.type,
            url: result.url!,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            taskId,
            commentId,
            workspaceId
          };
          
          newAttachments.push(attachment);
        } else {
          updatedProgress[index] = {
            ...updatedProgress[index],
            progress: 100,
            status: 'error',
            error: result.error || 'Upload failed'
          };
        }
      });

      setUploadProgress(updatedProgress);
      
      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
      }

      // Clear progress after 3 seconds
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload files');
      setUploadProgress([]);
    }
  }, [attachments, maxFiles, workspaceId, userId, taskId, commentId, onAttachmentsChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleRemoveAttachment = async (attachment: FileMetadata) => {
    try {
      const success = await fileUploadService.deleteFile(attachment.name, workspaceId);
      if (success) {
        onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
      } else {
        setError('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete file');
    }
  };

  const handleDownload = (attachment: FileMetadata) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment: FileMetadata) => {
    setPreviewFile(attachment);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {showUploadArea && (
        <Card className={`border-2 border-dashed transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}>
          <CardContent className="p-6">
            <div
              className="text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum {maxFiles} files, 10MB each
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,.rar,.7z,.js,.ts,.html,.css,.json,.xml"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uploading Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadProgress.map(progress => (
              <div key={progress.fileId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{progress.fileName}</span>
                  <span className={
                    progress.status === 'success' ? 'text-green-600' :
                    progress.status === 'error' ? 'text-red-600' :
                    'text-muted-foreground'
                  }>
                    {progress.status === 'success' ? 'Complete' :
                     progress.status === 'error' ? 'Failed' :
                     `${progress.progress}%`}
                  </span>
                </div>
                <Progress value={progress.progress} className="h-2" />
                {progress.error && (
                  <p className="text-xs text-red-600">{progress.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`${getFileColor(attachment.type)}`}>
                  {getFileIcon(attachment.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {attachment.originalName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {fileUploadService.getFileCategory(attachment.type)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {fileUploadService.formatFileSize(attachment.size)} • 
                    Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(attachment)}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttachment(attachment)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {attachments.length === 0 && !showUploadArea && (
        <div className="text-center py-8 text-muted-foreground">
          <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No attachments</p>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};

export default FileAttachmentManager;
