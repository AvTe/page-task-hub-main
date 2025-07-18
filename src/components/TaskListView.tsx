import React, { useState, useEffect } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task, TASK_PRIORITIES } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  SortAsc, 
  Calendar,
  Flag,
  User,
  MessageCircle,
  Paperclip,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Eye
} from 'lucide-react';
import { formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import TaskStatusDropdown from './TaskStatusDropdown';

interface TaskListViewProps {
  showFilters?: boolean;
  compactMode?: boolean;
  onTaskClick?: (task: Task) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ 
  showFilters = true, 
  compactMode = false,
  onTaskClick 
}) => {
  const { state, updateTask, deleteTask, duplicateTask } = useTask();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Get all tasks from pages and unassigned
  const allTasks = [
    ...state.pages.flatMap(page => page.tasks),
    ...state.unassignedTasks
  ];

  // Filter and search tasks
  useEffect(() => {
    let filtered = allTasks;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(task => task.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }

    // Assignee filter
    if (selectedAssignee !== 'all') {
      filtered = filtered.filter(task => task.assignedTo === selectedAssignee);
    }

    // Sort tasks
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[b.priority || 'medium'] || 2) - (priorityOrder[a.priority || 'medium'] || 2);
          break;
        case 'created':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          const statusOrder = { todo: 1, progress: 2, done: 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredTasks(filtered);
  }, [allTasks, searchQuery, selectedStatus, selectedPriority, selectedAssignee, sortBy, sortOrder]);

  // Calculate due date status
  const getDueDateStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    if (isBefore(due, now)) {
      return { status: 'overdue', color: 'text-red-600', label: 'Overdue' };
    } else if (isBefore(due, tomorrow)) {
      return { status: 'due-soon', color: 'text-orange-600', label: 'Due Soon' };
    }
    return { status: 'normal', color: 'text-muted-foreground', label: 'On Track' };
  };

  // Handle task selection
  const handleTaskSelect = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(filteredTasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  // Bulk actions
  const handleBulkStatusUpdate = (status: 'todo' | 'progress' | 'done') => {
    selectedTasks.forEach(taskId => {
      updateTask(taskId, { status });
    });
    setSelectedTasks([]);
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
      selectedTasks.forEach(taskId => {
        deleteTask(taskId);
      });
      setSelectedTasks([]);
    }
  };

  // Get project info
  const getProjectInfo = (pageId?: string) => {
    if (!pageId) return null;
    return state.pages.find(p => p.id === pageId);
  };

  // Format due date
  const formatDueDate = (dueDate: string) => {
    try {
      return formatDistanceToNow(new Date(dueDate), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-full lg:w-40">
                  <Flag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-40">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full lg:w-auto"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('todo')}
                >
                  Mark as To Do
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('progress')}
                >
                  Mark as In Progress
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('done')}
                >
                  Mark as Done
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Checkbox
                checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
              Tasks ({filteredTasks.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <Circle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedStatus !== 'all' || selectedPriority !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first task to get started'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTasks.map((task, index) => {
                const dueDateStatus = getDueDateStatus(task.dueDate);
                const project = getProjectInfo(task.pageId);
                const priorityConfig = TASK_PRIORITIES[task.priority || 'medium'];

                return (
                  <div
                    key={task.id}
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      selectedTasks.includes(task.id) ? 'bg-muted/30' : ''
                    } ${task.status === 'done' ? 'opacity-75' : ''}`}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={(checked) => handleTaskSelect(task.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title and Status */}
                            <div className="flex items-center gap-3 mb-2">
                              <TaskStatusDropdown
                                taskId={task.id}
                                currentStatus={task.status}
                                size="sm"
                                variant="icon"
                                showDelete={false}
                              />
                              <h3 className="font-medium line-clamp-1">
                                {task.title}
                              </h3>

                              {/* Priority Badge */}
                              {task.priority && (
                                <Badge
                                  variant="secondary"
                                  className={`${priorityConfig.color} ${priorityConfig.textColor} text-xs`}
                                >
                                  {priorityConfig.label}
                                </Badge>
                              )}
                            </div>

                            {/* Description */}
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {task.description}
                              </p>
                            )}

                            {/* Meta Information */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {/* Project */}
                              {project && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <span>{project.title}</span>
                                </div>
                              )}

                              {/* Due Date */}
                              {task.dueDate && (
                                <div className={`flex items-center gap-1 ${dueDateStatus?.color}`}>
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDueDate(task.dueDate)}</span>
                                  {dueDateStatus?.status === 'overdue' && (
                                    <Badge variant="destructive" className="text-xs px-1 py-0">
                                      {dueDateStatus.label}
                                    </Badge>
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

                              {/* Comments */}
                              {task.comments && task.comments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-3 w-3" />
                                  <span>{task.comments.length}</span>
                                </div>
                              )}

                              {/* Attachments */}
                              {task.attachments && task.attachments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{task.attachments.length}</span>
                                </div>
                              )}

                              {/* Subtasks */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>
                                    {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Tags */}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs">
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
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskClick?.(task);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Open edit modal
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateTask(task.id);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this task?')) {
                                  deleteTask(task.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskListView;
