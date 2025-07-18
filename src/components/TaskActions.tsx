import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  CheckSquare, 
  Trash2, 
  Copy, 
  Archive, 
  Tag, 
  User, 
  Calendar,
  Flag,
  MoreHorizontal,
  Download,
  Upload,
  FileText,
  Zap,
  Target,
  Clock
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface TaskActionsProps {
  selectedTasks: string[];
  onClearSelection: () => void;
  allTasks: Task[];
  compact?: boolean;
}

const TaskActions: React.FC<TaskActionsProps> = ({
  selectedTasks,
  onClearSelection,
  allTasks,
  compact = false
}) => {
  const { updateTask, deleteTask, duplicateTask } = useTask();
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedTaskObjects = allTasks.filter(task => selectedTasks.includes(task.id));

  // Bulk status update
  const handleBulkStatusUpdate = async (status: 'todo' | 'progress' | 'done') => {
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedTasks.map(taskId => updateTask(taskId, { status }))
      );
      
      const statusLabels = { todo: 'To Do', progress: 'In Progress', done: 'Done' };
      toast.success(`${selectedTasks.length} task(s) marked as ${statusLabels[status]}`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to update tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk priority update
  const handleBulkPriorityUpdate = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedTasks.map(taskId => updateTask(taskId, { priority }))
      );
      
      const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
      toast.success(`${selectedTasks.length} task(s) priority set to ${priorityLabels[priority]}`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to update task priorities');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} task(s)? This action cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await Promise.all(
        selectedTasks.map(taskId => deleteTask(taskId))
      );
      
      toast.success(`${selectedTasks.length} task(s) deleted successfully`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to delete tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk duplicate
  const handleBulkDuplicate = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        selectedTasks.map(taskId => duplicateTask(taskId))
      );
      
      toast.success(`${selectedTasks.length} task(s) duplicated successfully`);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to duplicate tasks');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export tasks
  const handleExportTasks = () => {
    const tasksToExport = selectedTaskObjects.map(task => ({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags,
      createdAt: task.createdAt
    }));

    const dataStr = JSON.stringify(tasksToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${selectedTasks.length} task(s) exported successfully`);
  };

  // Get task statistics
  const getTaskStats = () => {
    const stats = {
      total: selectedTaskObjects.length,
      todo: selectedTaskObjects.filter(t => t.status === 'todo').length,
      progress: selectedTaskObjects.filter(t => t.status === 'progress').length,
      done: selectedTaskObjects.filter(t => t.status === 'done').length,
      high_priority: selectedTaskObjects.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      overdue: selectedTaskObjects.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
      ).length
    };
    return stats;
  };

  const stats = getTaskStats();

  if (selectedTasks.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">
                {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate('done')}
                disabled={isProcessing}
              >
                Mark Done
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDuplicate}
                disabled={isProcessing}
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <CheckSquare className="h-5 w-5" />
            Bulk Actions
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-orange-600 hover:text-orange-700"
          >
            Clear Selection
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Selection Summary */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            {stats.total} Total
          </Badge>
          {stats.todo > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {stats.todo} To Do
            </Badge>
          )}
          {stats.progress > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {stats.progress} In Progress
            </Badge>
          )}
          {stats.done > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {stats.done} Done
            </Badge>
          )}
          {stats.high_priority > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {stats.high_priority} High Priority
            </Badge>
          )}
          {stats.overdue > 0 && (
            <Badge variant="destructive">
              {stats.overdue} Overdue
            </Badge>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Status Actions */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-orange-800">Update Status</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate('todo')}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <Target className="h-4 w-4" />
                To Do
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate('progress')}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <Clock className="h-4 w-4" />
                In Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate('done')}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <CheckSquare className="h-4 w-4" />
                Done
              </Button>
            </div>
          </div>

          {/* Priority Actions */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-orange-800">Update Priority</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkPriorityUpdate('low')}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <Flag className="h-4 w-4 text-gray-500" />
                Low
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkPriorityUpdate('medium')}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <Flag className="h-4 w-4 text-blue-500" />
                Medium
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkPriorityUpdate('high')}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <Flag className="h-4 w-4 text-orange-500" />
                High
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkPriorityUpdate('urgent')}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <Flag className="h-4 w-4 text-red-500" />
                Urgent
              </Button>
            </div>
          </div>

          <Separator />

          {/* Other Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkDuplicate}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Copy className="h-4 w-4" />
              Duplicate All
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportTasks}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskActions;
