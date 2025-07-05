import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  User, 
  Flag, 
  MessageSquare, 
  Paperclip, 
  CheckSquare,
  MoreHorizontal,
  Play,
  Pause,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '../types';

interface ResponsiveTaskCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  showAssignee?: boolean;
  showDueDate?: boolean;
  showProgress?: boolean;
  compact?: boolean;
  workspaceMembers?: Array<{ id: string; name: string; email: string }>;
}

const ResponsiveTaskCard: React.FC<ResponsiveTaskCardProps> = ({
  task,
  onTaskClick,
  onStatusChange,
  showAssignee = true,
  showDueDate = true,
  showProgress = true,
  compact = false,
  workspaceMembers = []
}) => {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <Check className="h-4 w-4" />;
      case 'progress': return <Play className="h-4 w-4" />;
      case 'todo': return <Pause className="h-4 w-4" />;
      default: return <Pause className="h-4 w-4" />;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'todo': return 'progress';
      case 'progress': return 'done';
      case 'done': return 'todo';
      default: return 'progress';
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = getNextStatus(task.status);
    onStatusChange?.(task.id, nextStatus);
  };

  const assignee = workspaceMembers.find(m => m.id === task.assignedTo);
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const progressPercentage = subtaskCount > 0 ? (completedSubtasks / subtaskCount) * 100 : 0;
  const attachmentCount = task.attachments?.length || 0;
  const commentCount = task.comments?.length || 0;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const isDueSoon = task.dueDate && 
    new Date(task.dueDate) > new Date() && 
    new Date(task.dueDate) < new Date(Date.now() + 24 * 60 * 60 * 1000); // Due within 24 hours

  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]
        ${compact ? 'p-2' : ''}
        ${isOverdue ? 'border-red-200 bg-red-50' : ''}
        ${isDueSoon ? 'border-yellow-200 bg-yellow-50' : ''}
      `}
      onClick={() => onTaskClick?.(task)}
    >
      {compact ? (
        // Compact Mobile Layout
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {task.description}
                </p>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${getStatusColor(task.status)}`}
              onClick={handleStatusClick}
            >
              {getStatusIcon(task.status)}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.priority && (
                <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                  <Flag className="h-3 w-3 mr-1" />
                  {task.priority}
                </Badge>
              )}
              
              {showAssignee && assignee && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {assignee.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {subtaskCount > 0 && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>{completedSubtasks}/{subtaskCount}</span>
                </div>
              )}
              
              {attachmentCount > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachmentCount}</span>
                </div>
              )}
              
              {commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{commentCount}</span>
                </div>
              )}
            </div>
          </div>

          {showDueDate && task.dueDate && (
            <div className={`flex items-center gap-1 text-xs ${
              isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-muted-foreground'
            }`}>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.dueDate), 'MMM dd')}</span>
            </div>
          )}

          {showProgress && subtaskCount > 0 && (
            <Progress value={progressPercentage} className="h-1" />
          )}
        </CardContent>
      ) : (
        // Full Desktop Layout
        <>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base line-clamp-2 leading-tight">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {task.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStatusClick}
                >
                  {getStatusIcon(task.status)}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {task.priority && (
                  <Badge className={getPriorityColor(task.priority)}>
                    <Flag className="h-3 w-3 mr-1" />
                    {task.priority}
                  </Badge>
                )}
                
                {showAssignee && assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {assignee.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {assignee.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {subtaskCount > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckSquare className="h-4 w-4" />
                    <span>{completedSubtasks}/{subtaskCount}</span>
                  </div>
                )}
                
                {attachmentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-4 w-4" />
                    <span>{attachmentCount}</span>
                  </div>
                )}
                
                {commentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{commentCount}</span>
                  </div>
                )}
              </div>
            </div>

            {showDueDate && task.dueDate && (
              <div className={`flex items-center gap-2 text-sm ${
                isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-muted-foreground'
              }`}>
                <Calendar className="h-4 w-4" />
                <span>Due {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                {task.estimatedHours && (
                  <>
                    <Clock className="h-4 w-4 ml-2" />
                    <span>{task.estimatedHours}h estimated</span>
                  </>
                )}
              </div>
            )}

            {showProgress && subtaskCount > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
};

export default ResponsiveTaskCard;
