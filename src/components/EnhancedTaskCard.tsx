import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task, TASK_PRIORITIES } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar,
  Flag,
  MessageCircle,
  Paperclip,
  Clock,
  User,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  Circle,
  PlayCircle,
  PauseCircle,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import TaskStatusDropdown from './TaskStatusDropdown';

interface EnhancedTaskCardProps {
  task: Task;
  compact?: boolean;
  showProject?: boolean;
  onTaskClick?: (task: Task) => void;
}

const EnhancedTaskCard: React.FC<EnhancedTaskCardProps> = ({ 
  task, 
  compact = false, 
  showProject = false,
  onTaskClick 
}) => {
  const { updateTask, deleteTask, duplicateTask, state } = useTask();
  const [showActions, setShowActions] = useState(false);

  // Get priority configuration
  const priorityConfig = TASK_PRIORITIES[task.priority || 'medium'];
  
  // Calculate due date status
  const getDueDateStatus = () => {
    if (!task.dueDate) return null;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    if (isBefore(dueDate, now) && task.status !== 'done') {
      return { status: 'overdue', color: 'text-red-600', bgColor: 'bg-red-50' };
    } else if (isBefore(dueDate, tomorrow) && task.status !== 'done') {
      return { status: 'due-soon', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    }
    return { status: 'normal', color: 'text-muted-foreground', bgColor: '' };
  };

  const dueDateStatus = getDueDateStatus();

  // Get project/page info
  const getProjectInfo = () => {
    if (!task.pageId) return null;
    const page = state.pages.find(p => p.id === task.pageId);
    return page;
  };

  const project = getProjectInfo();

  // Format due date
  const formatDueDate = (dueDate: string) => {
    try {
      return formatDistanceToNow(new Date(dueDate), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (task.status) {
      case 'todo':
        return <Circle className="h-4 w-4 text-blue-500" />;
      case 'progress':
        return <PlayCircle className="h-4 w-4 text-yellow-500" />;
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  // Handle task actions
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Open edit modal
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateTask(task.id);
  };

  const handleCardClick = () => {
    onTaskClick?.(task);
  };

  if (compact) {
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          dueDateStatus?.bgColor || ''
        }`}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon()}
                <h3 className="font-medium text-sm line-clamp-1">
                  {task.title}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {task.priority && (
                  <Badge 
                    variant="secondary" 
                    className={`${priorityConfig.color} ${priorityConfig.textColor} text-xs px-1 py-0`}
                  >
                    {priorityConfig.label}
                  </Badge>
                )}
                
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${dueDateStatus?.color}`}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDueDate(task.dueDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageCircle className="h-3 w-3" />
                  <span>{task.comments.length}</span>
                </div>
              )}
              
              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span>{task.attachments.length}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md group ${
        dueDateStatus?.bgColor || ''
      } ${task.status === 'done' ? 'opacity-75' : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon()}
            <h3 className="font-medium line-clamp-2 leading-tight">
              {task.title}
            </h3>
          </div>
          
          {/* Priority Badge */}
          {task.priority && (
            <Badge 
              variant="secondary" 
              className={`${priorityConfig.color} ${priorityConfig.textColor} shrink-0`}
            >
              <Flag className="h-3 w-3 mr-1" />
              {priorityConfig.label}
            </Badge>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        {/* Project Info */}
        {showProject && project && (
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: project.color }}
            />
            <span className="text-xs text-muted-foreground">{project.title}</span>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{task.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* Due Date */}
            {task.dueDate && (
              <div className={`flex items-center gap-1 ${dueDateStatus?.color}`}>
                <Calendar className="h-3 w-3" />
                <span>{formatDueDate(task.dueDate)}</span>
                {dueDateStatus?.status === 'overdue' && (
                  <AlertTriangle className="h-3 w-3" />
                )}
              </div>
            )}

            {/* Assignee */}
            {task.assignedToName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{task.assignedToName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Comments Count */}
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                <span>{task.comments.length}</span>
              </div>
            )}
            
            {/* Attachments Count */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachments.length}</span>
              </div>
            )}

            {/* Subtasks Progress */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                </span>
              </div>
            )}

            {/* Actions Menu */}
            {showActions && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEdit}
                  className="h-6 w-6 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDuplicate}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedTaskCard;
