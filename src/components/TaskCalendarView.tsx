import React, { useState, useEffect } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task, TASK_PRIORITIES } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Clock,
  Flag,
  CheckCircle2,
  Circle,
  PlayCircle
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO
} from 'date-fns';

interface TaskCalendarViewProps {
  showFilters?: boolean;
  onTaskClick?: (task: Task) => void;
}

const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({ 
  showFilters = true,
  onTaskClick 
}) => {
  const { state } = useTask();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get all tasks from pages and unassigned
  const allTasks = [
    ...state.pages.flatMap(page => page.tasks),
    ...state.unassignedTasks
  ];

  // Filter tasks with due dates
  const tasksWithDueDates = allTasks.filter(task => task.dueDate);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return tasksWithDueDates.filter(task => {
      if (!task.dueDate) return false;
      try {
        const taskDate = parseISO(task.dueDate);
        return isSameDay(taskDate, date);
      } catch {
        return false;
      }
    });
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <Circle className="h-3 w-3 text-blue-500" />;
      case 'progress':
        return <PlayCircle className="h-3 w-3 text-yellow-500" />;
      case 'done':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    const config = TASK_PRIORITIES[priority as keyof typeof TASK_PRIORITIES] || TASK_PRIORITIES.medium;
    return config.color.replace('bg-', '');
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                Today
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayTasks = getTasksForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                    ${isSelected ? 'ring-2 ring-orange-500' : ''}
                    ${isTodayDate ? 'bg-orange-50 border-orange-200' : 'border-border'}
                    hover:bg-muted/50
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  {/* Date Number */}
                  <div className={`
                    text-sm font-medium mb-2
                    ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                    ${isTodayDate ? 'text-orange-600 font-bold' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>

                  {/* Tasks for this day */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const priorityColor = getPriorityColor(task.priority);
                      
                      return (
                        <div
                          key={task.id}
                          className={`
                            text-xs p-1 rounded cursor-pointer transition-colors
                            ${task.status === 'done' ? 'opacity-60 line-through' : ''}
                            hover:shadow-sm
                          `}
                          style={{ 
                            backgroundColor: `${priorityColor}20`,
                            borderLeft: `3px solid ${priorityColor}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            <span className="truncate flex-1">
                              {task.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show more indicator */}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Tasks */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Tasks for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const selectedDateTasks = getTasksForDate(selectedDate);
              
              if (selectedDateTasks.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks scheduled for this date</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {selectedDateTasks.map((task) => {
                    const priorityConfig = TASK_PRIORITIES[task.priority || 'medium'];
                    
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onTaskClick?.(task)}
                      >
                        {getStatusIcon(task.status)}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <Badge 
                          variant="secondary" 
                          className={`${priorityConfig.color} ${priorityConfig.textColor}`}
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {priorityConfig.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskCalendarView;
