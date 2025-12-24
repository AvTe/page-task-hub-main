import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Link, Calendar, Flag } from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { toast } from '@/components/ui/sonner';
import FileAttachmentManager from './FileAttachmentManager';
import { TaskAttachment } from '../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: 'todo' | 'progress' | 'done';
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, defaultStatus = 'todo' }) => {
  const { addTask } = useTask();
  const { user } = useSupabaseAuth();
  const { currentWorkspace } = useSupabaseWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [link, setLink] = useState('');
  const [tags, setTags] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addTask({
        title: title.trim(),
        description: description.trim(),
        status: defaultStatus,
        dueDate: dueDate || undefined,
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        link: link.trim() || undefined,
        tags: tags.trim().split(',').filter(tag => tag.trim()).map(tag => tag.trim()),

        attachments: attachments
      });

      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setLink('');
    setTags('');
    setAttachments([]);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-2xl mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800">Add New Task</DialogTitle>
          <DialogDescription className="sr-only">
            Fill in the details below to create a new task
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Task Title *
            </Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Add more details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Link className="w-4 h-4" />
              Related Link
            </Label>
            <Input
              id="link"
              type="url"
              placeholder="https://example.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              placeholder="urgent, work, personal"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* File Attachments */}
          {user && currentWorkspace && (
            <FileAttachmentManager
              workspaceId={currentWorkspace.id}
              userId={user.id}
              attachments={attachments.map(att => ({
                id: att.id,
                name: att.fileName,
                originalName: att.originalName,
                size: att.fileSize,
                type: att.fileType,
                url: att.fileUrl,
                uploadedBy: att.uploadedBy,
                uploadedAt: att.createdAt,
                taskId: att.taskId,
                commentId: att.commentId,
                workspaceId: att.workspaceId
              }))}
              onAttachmentsChange={(newAttachments) => {
                const convertedAttachments: TaskAttachment[] = newAttachments.map(att => ({
                  id: att.id,
                  workspaceId: att.workspaceId,
                  taskId: att.taskId,
                  commentId: att.commentId,
                  fileName: att.name,
                  originalName: att.originalName,
                  fileSize: att.size,
                  fileType: att.type,
                  fileUrl: att.url,
                  filePath: att.url,
                  uploadedBy: att.uploadedBy,
                  createdAt: att.uploadedAt,
                  updatedAt: att.uploadedAt
                }));
                setAttachments(convertedAttachments);
              }}
              maxFiles={5}
              showUploadArea={true}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium"
            >
              Create Task
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="sm:w-24"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskModal;
