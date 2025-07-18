
import React from 'react';
import { Page } from '../types';
import { useTask } from '../contexts/TaskContext';
import { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } from '../utils/dragDrop';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import TaskCard from './TaskCard';

interface PageCardProps {
  page: Page;
  onTaskClick?: (task: any) => void;
}

const PageCard: React.FC<PageCardProps> = ({ page, onTaskClick }) => {
  const { deletePage, moveTask } = useTask();

  const handleDeletePage = () => {
    if (window.confirm(`Are you sure you want to delete "${page.title}"? All tasks will be moved back to the unassigned list.`)) {
      deletePage(page.id);
    }
  };

  const handleTaskDrop = (event: React.DragEvent) => {
    const dragData = handleDrop(event);
    if (dragData && dragData.type === 'task') {
      moveTask(dragData.taskId, page.id);
    }
  };

  const tasksByStatus = {
    todo: page.tasks.filter(task => task.status === 'todo'),
    progress: page.tasks.filter(task => task.status === 'progress'),
    done: page.tasks.filter(task => task.status === 'done')
  };

  return (
    <Card className="h-full">
      <CardHeader 
        className="pb-3"
        style={{ backgroundColor: `${page.color}20` }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{page.title}</h3>
            {page.description && (
              <p className="text-sm text-gray-600 mt-1">{page.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {page.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {page.tasks.length} tasks
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
            onClick={handleDeletePage}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent 
        className="p-4 min-h-32"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleTaskDrop}
      >
        {page.tasks.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Drop tasks here to assign them</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* To Do Tasks */}
            {tasksByStatus.todo.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">To Do</h4>
                <div className="space-y-1">
                  {tasksByStatus.todo.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      pageId={page.id}
                      index={index}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* In Progress Tasks */}
            {tasksByStatus.progress.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">In Progress</h4>
                <div className="space-y-1">
                  {tasksByStatus.progress.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      pageId={page.id}
                      index={index}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Done Tasks */}
            {tasksByStatus.done.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Done</h4>
                <div className="space-y-1">
                  {tasksByStatus.done.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      pageId={page.id}
                      index={index}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PageCard;
