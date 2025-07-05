
import React, { useState, useRef } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X, Image, Link, Calendar, Flag, Paperclip } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose }) => {
  const { addTask } = useTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [link, setLink] = useState('');
  const [tags, setTags] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      addTask({
        title: title.trim(),
        description: description.trim(),
        status: 'todo',
        dueDate: dueDate || undefined,
        priority: priority as 'low' | 'medium' | 'high',
        link: link.trim() || undefined,
        tags: tags.trim().split(',').filter(tag => tag.trim()).map(tag => tag.trim()),
        attachedImage: attachedImage || undefined
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
    setAttachedImage(null);
    setAttachedImageFile(null);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setAttachedImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            setAttachedImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
              setAttachedImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  };

  const removeImage = () => {
    setAttachedImage(null);
    setAttachedImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800">Add New Task</DialogTitle>
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
              placeholder="Add more details about this task... (Ctrl/Cmd + V to paste images)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePaste}
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
                  <SelectItem value="high">🔴 High</SelectItem>
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

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Attach Image
            </Label>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                Choose Image
              </Button>
              <p className="text-sm text-gray-500 flex items-center">
                or paste image with Ctrl/Cmd + V
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {attachedImage && (
              <div className="relative inline-block">
                <img
                  src={attachedImage}
                  alt="Attached"
                  className="max-w-xs max-h-32 rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          
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
