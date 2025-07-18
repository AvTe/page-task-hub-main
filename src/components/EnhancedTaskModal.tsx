import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Flag, 
  Tag, 
  FileText,
  CheckSquare,
  GitBranch,
  MessageSquare,
  Paperclip,
  Save,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '../types';
import SubtaskManager from './SubtaskManager';
import TaskDependencyManager from './TaskDependencyManager';
import FileAttachmentManager from './FileAttachmentManager';
import TimeTracker from './TimeTracker';
import TaskComments from './TaskComments';
import { FileMetadata, fileUploadService } from '../services/fileUploadService';

interface EnhancedTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  allTasks: Task[];
  workspaceMembers?: Array<{ id: string; name: string; email: string }>;
  workspaceId: string;
  userId: string;
}

const EnhancedTaskModal: React.FC<EnhancedTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  allTasks,
  workspaceMembers = [],
  workspaceId,
  userId
}) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [attachments, setAttachments] = useState<FileMetadata[]>([]);

  React.useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      // Load attachments for the task
      loadTaskAttachments(task.id);
    }
  }, [task]);

  const loadTaskAttachments = async (taskId: string) => {
    try {
      const taskAttachments = await fileUploadService.getTaskFiles(taskId);
      setAttachments(taskAttachments);
    } catch (error) {
      console.error('Failed to load task attachments:', error);
      setAttachments([]);
    }
  };

  if (!task || !editedTask) return null;

  const handleSave = () => {
    onSave(task.id, editedTask);
    onClose();
  };

  const updateTask = (updates: Partial<Task>) => {
    setEditedTask(prev => prev ? { ...prev, ...updates } : null);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-200 text-red-900 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 w-[calc(100vw-2rem)] sm:w-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">
                <Input
                  value={editedTask.title}
                  onChange={(e) => updateTask({ title: e.target.value })}
                  className="text-xl font-semibold border-none p-0 h-auto focus-visible:ring-0"
                  placeholder="Task title..."
                />
              </DialogTitle>
              <DialogDescription className="mt-2">
                <Textarea
                  value={editedTask.description}
                  onChange={(e) => updateTask({ description: e.target.value })}
                  placeholder="Add a description..."
                  className="min-h-[60px] border-none p-0 resize-none focus-visible:ring-0"
                />
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge className={getStatusColor(editedTask.status)}>
                {editedTask.status}
              </Badge>
              {editedTask.priority && (
                <Badge className={getPriorityColor(editedTask.priority)}>
                  <Flag className="h-3 w-3 mr-1" />
                  {editedTask.priority}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="subtasks" className="flex items-center gap-1">
              <CheckSquare className="h-4 w-4" />
              Subtasks
            </TabsTrigger>
            <TabsTrigger value="dependencies" className="flex items-center gap-1">
              <GitBranch className="h-4 w-4" />
              Dependencies
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Time
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-1">
              <Paperclip className="h-4 w-4" />
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editedTask.status}
                    onValueChange={(value: any) => updateTask({ status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={editedTask.priority || ''}
                    onValueChange={(value) => updateTask({ priority: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select
                    value={editedTask.assignedTo || ''}
                    onValueChange={(value) => updateTask({ 
                      assignedTo: value || undefined,
                      assignedToName: workspaceMembers.find(m => m.id === value)?.name
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {workspaceMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedTask.dueDate 
                          ? format(new Date(editedTask.dueDate), 'PPP')
                          : 'No due date'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editedTask.dueDate ? new Date(editedTask.dueDate) : undefined}
                        onSelect={(date) => updateTask({ dueDate: date?.toISOString() })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedTask.startDate 
                          ? format(new Date(editedTask.startDate), 'PPP')
                          : 'No start date'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={editedTask.startDate ? new Date(editedTask.startDate) : undefined}
                        onSelect={(date) => updateTask({ startDate: date?.toISOString() })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="estimated-hours">Estimated Hours</Label>
                    <Input
                      id="estimated-hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={editedTask.estimatedHours || ''}
                      onChange={(e) => updateTask({ 
                        estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="actual-hours">Actual Hours</Label>
                    <Input
                      id="actual-hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={editedTask.actualHours || ''}
                      onChange={(e) => updateTask({ 
                        actualHours: e.target.value ? parseFloat(e.target.value) : undefined 
                      })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={editedTask.tags?.join(', ') || ''}
                onChange={(e) => updateTask({ 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                placeholder="Enter tags separated by commas"
              />
            </div>
          </TabsContent>

          <TabsContent value="subtasks" className="mt-6">
            <SubtaskManager
              task={editedTask}
              onUpdateTask={(taskId, updates) => updateTask(updates)}
              workspaceMembers={workspaceMembers}
            />
          </TabsContent>

          <TabsContent value="dependencies" className="mt-6">
            <TaskDependencyManager
              task={editedTask}
              allTasks={allTasks}
              onUpdateTask={(taskId, updates) => updateTask(updates)}
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <TaskComments
              taskId={task.id}
              taskTitle={task.title}
            />
          </TabsContent>

          <TabsContent value="time" className="mt-6">
            <TimeTracker
              taskId={task.id}
              taskTitle={task.title}
            />
          </TabsContent>

          <TabsContent value="attachments" className="mt-6">
            <FileAttachmentManager
              taskId={task.id}
              workspaceId={workspaceId}
              userId={userId}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              maxFiles={10}
              showUploadArea={true}
            />
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Created {format(new Date(editedTask.createdAt), 'PPP')}
            {editedTask.completedAt && (
              <span> • Completed {format(new Date(editedTask.completedAt), 'PPP')}</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedTaskModal;
