import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  ExternalLink,
  File,
  FileText,
  Image,
  Archive,
  Code,
  X
} from 'lucide-react';
import { FileMetadata, fileUploadService } from '../services/fileUploadService';

interface FilePreviewModalProps {
  file: FileMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose
}) => {
  if (!file) return null;

  const getFileIcon = (mimeType: string) => {
    const category = fileUploadService.getFileCategory(mimeType);
    switch (category) {
      case 'image': return <Image className="h-6 w-6" />;
      case 'document': return <FileText className="h-6 w-6" />;
      case 'archive': return <Archive className="h-6 w-6" />;
      case 'code': return <Code className="h-6 w-6" />;
      default: return <File className="h-6 w-6" />;
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(file.url, '_blank');
  };

  const renderPreview = () => {
    const category = fileUploadService.getFileCategory(file.type);

    switch (category) {
      case 'image':
        return (
          <div className="flex justify-center p-4">
            <img
              src={file.url}
              alt={file.originalName}
              className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        );

      case 'document':
        if (file.type === 'application/pdf') {
          return (
            <div className="h-96 border rounded-lg overflow-hidden">
              <iframe
                src={`${file.url}#toolbar=0`}
                className="w-full h-full"
                title={file.originalName}
              />
            </div>
          );
        }
        break;

      case 'code':
        if (file.size < 100000) { // Only preview small code files
          return (
            <div className="text-center py-8">
              <Code className="h-12 w-12 mx-auto mb-4 text-orange-500" />
              <p className="text-muted-foreground mb-4">
                Code file preview not available
              </p>
              <Button onClick={handleOpenInNewTab} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          );
        }
        break;
    }

    // Default preview for unsupported types
    return (
      <div className="text-center py-12">
        <div className={`${getFileColor(file.type)} mb-4`}>
          {getFileIcon(file.type)}
        </div>
        <h3 className="text-lg font-medium mb-2">Preview not available</h3>
        <p className="text-muted-foreground mb-6">
          This file type cannot be previewed in the browser
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleOpenInNewTab} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={getFileColor(file.type)}>
                {getFileIcon(file.type)}
              </div>
              <div>
                <DialogTitle className="text-lg">{file.originalName}</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {fileUploadService.getFileCategory(file.type)}
                    </Badge>
                    <span>{fileUploadService.formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto">
          {renderPreview()}
        </div>

        {/* File Details */}
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <p className="font-medium">{file.type}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Size:</span>
              <p className="font-medium">{fileUploadService.formatFileSize(file.size)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Uploaded:</span>
              <p className="font-medium">{new Date(file.uploadedAt).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Category:</span>
              <p className="font-medium capitalize">{fileUploadService.getFileCategory(file.type)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
