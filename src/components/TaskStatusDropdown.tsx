import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle2, 
  Clock, 
  Circle, 
  Pause, 
  Trash2, 
  ChevronDown,
  Play,
  RotateCcw
} from 'lucide-react';
import { useTask } from '../contexts/TaskContext';
import { toast } from 'sonner';

interface TaskStatusDropdownProps {
  taskId: string;
  currentStatus: 'todo' | 'progress' | 'done';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'badge';
  showDelete?: boolean;
  onStatusChange?: (taskId: string, newStatus: 'todo' | 'progress' | 'done') => void;
  onDelete?: (taskId: string) => void;
}

const TaskStatusDropdown: React.FC<TaskStatusDropdownProps> = ({
  taskId,
  currentStatus,
  size = 'md',
  variant = 'button',
  showDelete = true,
  onStatusChange,
  onDelete
}) => {
  const { updateTask, deleteTask } = useTask();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig = {
    todo: {
      label: 'To Do',
      icon: Circle,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      hoverColor: 'hover:bg-blue-200',
      buttonColor: 'bg-blue-500 hover:bg-blue-600 text-white'
    },
    progress: {
      label: 'In Progress',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      hoverColor: 'hover:bg-yellow-200',
      buttonColor: 'bg-yellow-500 hover:bg-yellow-600 text-white'
    },
    done: {
      label: 'Done',
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-800 border-green-200',
      hoverColor: 'hover:bg-green-200',
      buttonColor: 'bg-green-500 hover:bg-green-600 text-white'
    }
  };

  const handleStatusChange = async (newStatus: 'todo' | 'progress' | 'done') => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      await updateTask(taskId, { status: newStatus });
      onStatusChange?.(taskId, newStatus);
      
      const statusLabels = {
        todo: 'To Do',
        progress: 'In Progress',
        done: 'Done'
      };
      
      toast.success(`Task status updated to ${statusLabels[newStatus]}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(taskId);
      onDelete?.(taskId);
      toast.success('Task deleted successfully');
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getCurrentConfig = () => statusConfig[currentStatus];
  const CurrentIcon = getCurrentConfig().icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-6 px-2 text-xs';
      case 'lg':
        return 'h-10 px-4 text-base';
      default:
        return 'h-8 px-3 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  if (variant === 'badge') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge 
              className={`cursor-pointer flex items-center gap-1 ${getCurrentConfig().color} ${getCurrentConfig().hoverColor} transition-colors`}
            >
              <CurrentIcon className={getIconSize()} />
              {getCurrentConfig().label}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={() => handleStatusChange('todo')}
              disabled={currentStatus === 'todo' || isUpdating}
              className="flex items-center gap-2"
            >
              <Circle className="h-4 w-4 text-blue-500" />
              To Do
              {currentStatus === 'todo' && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => handleStatusChange('progress')}
              disabled={currentStatus === 'progress' || isUpdating}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4 text-yellow-500" />
              In Progress
              {currentStatus === 'progress' && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => handleStatusChange('done')}
              disabled={currentStatus === 'done' || isUpdating}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Done
              {currentStatus === 'done' && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
            </DropdownMenuItem>
            
            {showDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isUpdating}
            className={`${getSizeClasses()} ${getCurrentConfig().color} border-0 font-medium flex items-center gap-2`}
          >
            <CurrentIcon className={getIconSize()} />
            {getCurrentConfig().label}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => handleStatusChange('todo')}
            disabled={currentStatus === 'todo' || isUpdating}
            className="flex items-center gap-2"
          >
            <Circle className="h-4 w-4 text-blue-500" />
            To Do
            {currentStatus === 'todo' && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleStatusChange('progress')}
            disabled={currentStatus === 'progress' || isUpdating}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4 text-yellow-500" />
            In Progress
            {currentStatus === 'progress' && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleStatusChange('done')}
            disabled={currentStatus === 'done' || isUpdating}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Done
            {currentStatus === 'done' && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
          </DropdownMenuItem>
          
          {showDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskStatusDropdown;
