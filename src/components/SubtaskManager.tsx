import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Calendar as CalendarIcon, 
  User, 
  CheckSquare,
  Square,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { SubTask, Task } from '../types';

interface SubtaskManagerProps {
  task: Task;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  workspaceMembers?: Array<{ id: string; name: string; email: string }>;
}

const SubtaskManager: React.FC<SubtaskManagerProps> = ({ 
  task, 
  onUpdateTask, 
  workspaceMembers = [] 
}) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(st => st.completed).length;
  const progressPercentage = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask: SubTask = {
      id: `subtask_${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      order: subtasks.length
    };

    const updatedSubtasks = [...subtasks, newSubtask];
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);
  };

  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  const updateSubtask = (subtaskId: string, updates: Partial<SubTask>) => {
    const updatedSubtasks = subtasks.map(st =>
      st.id === subtaskId ? { ...st, ...updates } : st
    );
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  const deleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = subtasks.filter(st => st.id !== subtaskId);
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  const reorderSubtasks = (fromIndex: number, toIndex: number) => {
    const reorderedSubtasks = [...subtasks];
    const [movedSubtask] = reorderedSubtasks.splice(fromIndex, 1);
    reorderedSubtasks.splice(toIndex, 0, movedSubtask);
    
    // Update order values
    const updatedSubtasks = reorderedSubtasks.map((st, index) => ({
      ...st,
      order: index
    }));
    
    onUpdateTask(task.id, { subtasks: updatedSubtasks });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Subtasks ({completedSubtasks}/{subtasks.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingSubtask(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Subtask
          </Button>
        </div>
        
        {subtasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add Subtask Form */}
        {isAddingSubtask && (
          <div className="flex gap-2 p-3 border rounded-lg bg-muted/50">
            <Input
              placeholder="Enter subtask title..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSubtask()}
              autoFocus
            />
            <Button size="sm" onClick={addSubtask}>
              Add
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setIsAddingSubtask(false);
                setNewSubtaskTitle('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Subtasks List */}
        <div className="space-y-2">
          {subtasks
            .sort((a, b) => a.order - b.order)
            .map((subtask, index) => (
              <div
                key={subtask.id}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  subtask.completed ? 'bg-green-50 border-green-200' : 'bg-background'
                }`}
              >
                {/* Drag Handle */}
                <div className="cursor-move text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Checkbox */}
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={() => toggleSubtask(subtask.id)}
                />

                {/* Subtask Content */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${
                    subtask.completed ? 'line-through text-muted-foreground' : ''
                  }`}>
                    {subtask.title}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1">
                    {subtask.assigneeId && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {workspaceMembers.find(m => m.id === subtask.assigneeId)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                    
                    {subtask.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{format(new Date(subtask.dueDate), 'MMM dd')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSubtask(subtask)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Subtask</DialogTitle>
                        <DialogDescription>
                          Update subtask details and assignment
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="subtask-title">Title</Label>
                          <Input
                            id="subtask-title"
                            value={editingSubtask?.title || ''}
                            onChange={(e) => setEditingSubtask(prev => 
                              prev ? { ...prev, title: e.target.value } : null
                            )}
                          />
                        </div>

                        <div>
                          <Label htmlFor="subtask-assignee">Assignee</Label>
                          <Select
                            value={editingSubtask?.assigneeId || ''}
                            onValueChange={(value) => setEditingSubtask(prev =>
                              prev ? { ...prev, assigneeId: value || undefined } : null
                            )}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {workspaceMembers.map(member => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Due Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editingSubtask?.dueDate 
                                  ? format(new Date(editingSubtask.dueDate), 'PPP')
                                  : 'No due date'
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={editingSubtask?.dueDate ? new Date(editingSubtask.dueDate) : undefined}
                                onSelect={(date) => setEditingSubtask(prev =>
                                  prev ? { ...prev, dueDate: date?.toISOString() } : null
                                )}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex justify-between">
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (editingSubtask) {
                                deleteSubtask(editingSubtask.id);
                                setEditingSubtask(null);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setEditingSubtask(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                if (editingSubtask) {
                                  updateSubtask(editingSubtask.id, editingSubtask);
                                  setEditingSubtask(null);
                                }
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
        </div>

        {subtasks.length === 0 && !isAddingSubtask && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No subtasks yet</p>
            <p className="text-sm">Break down this task into smaller steps</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubtaskManager;
