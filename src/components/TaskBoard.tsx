import React, { useState, useEffect } from 'react';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Task, TASK_STATUSES, TASK_PRIORITIES } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Plus,
  Filter,
  SortAsc,
  MoreHorizontal,
  Calendar,
  User,
  Flag,
  MessageCircle,
  Paperclip,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  PauseCircle,
  Users,
  Eye,
  BarChart3
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import TaskCard from './TaskCard';
import EnhancedTaskCard from './EnhancedTaskCard';
import AddTaskModal from './AddTaskModal';

interface TaskBoardProps {
  view?: 'board' | 'list' | 'calendar';
  showFilters?: boolean;
  compactMode?: boolean;
}

interface TaskColumn {
  id: string;
  title: string;
  status: 'todo' | 'progress' | 'done';
  color: string;
  icon: React.ComponentType<any>;
  tasks: Task[];
  limit?: number;
}

const TaskBoard: React.FC<TaskBoardProps> = ({
  view = 'board',
  showFilters = true,
  compactMode = false
}) => {
  const { state, updateTask, searchTasks } = useTask();
  const { user } = useAuth();

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
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
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority || 'medium'] || 2) - (priorityOrder[a.priority || 'medium'] || 2);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  }, [allTasks, searchQuery, selectedPriority, selectedAssignee, sortBy]);

  // Create task columns
  const taskColumns: TaskColumn[] = [
    {
      id: 'todo',
      title: 'To Do',
      status: 'todo',
      color: 'bg-blue-50 border-blue-200',
      icon: Circle,
      tasks: filteredTasks.filter(task => task.status === 'todo')
    },
    {
      id: 'progress',
      title: 'In Progress',
      status: 'progress',
      color: 'bg-yellow-50 border-yellow-200',
      icon: PlayCircle,
      tasks: filteredTasks.filter(task => task.status === 'progress'),
      limit: 3 // WIP limit
    },
    {
      id: 'done',
      title: 'Done',
      status: 'done',
      color: 'bg-green-50 border-green-200',
      icon: CheckCircle2,
      tasks: filteredTasks.filter(task => task.status === 'done')
    }
  ];

  // Handle drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) {
      // Same column reordering - handle later
      return;
    }

    // Move task between columns
    const newStatus = destination.droppableId as 'todo' | 'progress' | 'done';
    updateTask(draggableId, { status: newStatus });
  };

  // Quick add task to specific column
  const handleQuickAdd = (columnId: string) => {
    setSelectedColumn(columnId);
    setShowAddTaskModal(true);
  };

  // Get task statistics
  const getTaskStats = () => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(task => task.status === 'done').length;
    const inProgress = filteredTasks.filter(task => task.status === 'progress').length;
    const overdue = filteredTasks.filter(task =>
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
    ).length;

    return { total, completed, inProgress, overdue };
  };

  const stats = getTaskStats();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Task Board
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>{stats.total} Total Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>{stats.completed} Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-yellow-600" />
              <span>{stats.inProgress} In Progress</span>
            </div>
            {stats.overdue > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-red-600">{stats.overdue} Overdue</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddTaskModal(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
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

              {/* Assignee Filter */}
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="w-full lg:w-40">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="me">Assigned to Me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
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
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {taskColumns.map((column) => (
            <Card key={column.id} className={`${column.color} border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <column.icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{column.title}</CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {column.tasks.length}
                    </Badge>
                    {column.limit && column.tasks.length > column.limit && (
                      <Badge variant="destructive" className="ml-1">
                        WIP Limit: {column.limit}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleQuickAdd(column.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <CardContent
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] pb-4 ${snapshot.isDraggingOver ? 'bg-muted/50' : ''
                      }`}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`${snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                              }`}
                          >
                            <EnhancedTaskCard
                              task={task}
                              compact={compactMode}
                              showProject={true}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Empty state */}
                    {column.tasks.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No tasks in {column.title.toLowerCase()}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleQuickAdd(column.id)}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Task
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Droppable>
            </Card>
          ))}
        </div>
      </DragDropContext>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => {
          setShowAddTaskModal(false);
          setSelectedColumn('');
        }}
        defaultStatus={selectedColumn as 'todo' | 'progress' | 'done' | undefined}
      />
    </div>
  );
};

export default TaskBoard;
