import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task, TASK_STATUSES } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Link as LinkIcon, Flag, Paperclip, Trash2, Edit2, Copy } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  pageId?: string;
  showFullDetails?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, pageId, showFullDetails = false }) => {
  const { updateTask, deleteTask, duplicateTask, state } = useTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showDuplicateOptions, setShowDuplicateOptions] = useState(false);
  
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'task',
      taskId: task.id,
      sourcePageId: pageId
    }));
  };

  const handleStatusClick = () => {
    const statuses: ('todo' | 'progress' | 'done')[] = ['todo', 'progress', 'done'];
    const currentIndex = statuses.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    updateTask(task.id, { status: statuses[nextIndex] });
  };

  const handleEditSave = () => {
    if (editTitle.trim()) {
      updateTask(task.id, { title: editTitle.trim() });
      setIsEditing(false);
    }
  };

  const handleEditCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  const handleDuplicate = (targetPageId?: string) => {
    duplicateTask(task.id, targetPageId);
    setShowDuplicateOptions(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const priorityIcons = {
    low: '🟢',
    medium: '🟡',
    high: '🔴'
  };

  return (
    <Card 
      className={`cursor-move hover:shadow-md transition-all duration-200 border-l-4 ${
        task.status === 'done' ? 'opacity-75' : ''
      }`}
      style={{ borderLeftColor: TASK_STATUSES[task.status].color.replace('bg-', '#') }}
      draggable
      onDragStart={handleDragStart}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with status and actions */}
        <div className="flex items-start justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStatusClick}
            className={`h-6 px-2 text-xs font-medium ${TASK_STATUSES[task.status].color} ${TASK_STATUSES[task.status].textColor} hover:opacity-80`}
          >
            {TASK_STATUSES[task.status].label}
          </Button>
          
          <div className="flex gap-1">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDuplicateOptions(!showDuplicateOptions)}
                className="h-6 w-6 p-0 hover:bg-green-50"
              >
                <Copy className="w-3 h-3" />
              </Button>
              
              {showDuplicateOptions && (
                <div className="absolute right-0 top-8 z-10 bg-white border rounded-md shadow-lg p-2 min-w-48">
                  <p className="text-xs font-medium mb-2">Duplicate to:</p>
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate()}
                      className="w-full justify-start text-xs"
                    >
                      Unassigned Tasks
                    </Button>
                    {state.pages.map(page => (
                      <Button
                        key={page.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(page.id)}
                        className="w-full justify-start text-xs"
                      >
                        {page.title}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDuplicateOptions(false)}
                    className="w-full text-xs mt-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="h-6 w-6 p-0 hover:bg-blue-50"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTask(task.id)}
              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Title */}
        <div>
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2 py-1 text-sm font-medium border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSave();
                  if (e.key === 'Escape') handleEditCancel();
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEditSave} className="h-6 px-2 text-xs">
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditCancel} className="h-6 px-2 text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <h3 
              className={`font-medium text-sm leading-tight cursor-pointer hover:text-blue-600 ${
                task.status === 'done' ? 'line-through text-gray-500' : ''
              }`}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </h3>
          )}
        </div>

        {/* Description */}
        {task.description && showFullDetails && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Image */}
        {task.attachedImage && showFullDetails && (
          <div className="mt-2">
            <img
              src={task.attachedImage}
              alt="Task attachment"
              className="max-w-full h-20 object-cover rounded border"
            />
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Priority */}
          {task.priority && (
            <Badge variant="secondary" className={`${priorityColors[task.priority]} px-2 py-0.5`}>
              <Flag className="w-3 h-3 mr-1" />
              {priorityIcons[task.priority]} {task.priority}
            </Badge>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <Badge variant="outline" className="px-2 py-0.5">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDate(task.dueDate)}
            </Badge>
          )}

          {/* Link */}
          {task.link && showFullDetails && (
            <Badge variant="outline" className="px-2 py-0.5">
              <LinkIcon className="w-3 h-3 mr-1" />
              <a 
                href={task.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Link
              </a>
            </Badge>
          )}

          {/* Image indicator */}
          {task.attachedImage && !showFullDetails && (
            <Badge variant="outline" className="px-2 py-0.5">
              <Paperclip className="w-3 h-3 mr-1" />
              Image
            </Badge>
          )}
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && showFullDetails && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag, tagIndex) => (
              <Badge key={tagIndex} variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;
