import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutGrid, 
  List, 
  Calendar as CalendarIcon,
  Filter,
  SortAsc,
  MoreHorizontal,
  Plus,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import TaskBoard from './TaskBoard';
import TaskListView from './TaskListView';
import TaskCalendarView from './TaskCalendarView';
import TaskFilters, { TaskFilterOptions } from './TaskFilters';
import TaskActions from './TaskActions';
import TaskProgress from './TaskProgress';
import AddTaskModal from './AddTaskModal';

interface TaskViewsProps {
  defaultView?: 'board' | 'list' | 'calendar';
  showViewToggle?: boolean;
  showFilters?: boolean;
  compactMode?: boolean;
}

const TaskViews: React.FC<TaskViewsProps> = ({
  defaultView = 'board',
  showViewToggle = true,
  showFilters = true,
  compactMode = false
}) => {
  const { state } = useTask();
  const [currentView, setCurrentView] = useState(defaultView);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState<TaskFilterOptions>({
    search: '',
    status: [],
    priority: [],
    assignee: [],
    tags: [],
    dueDateRange: {},
    createdDateRange: {},
    sortBy: 'dueDate',
    sortOrder: 'asc',
    showCompleted: true,
    showOverdue: true
  });

  // Get all tasks count
  const totalTasks = state.pages.reduce((total, page) => total + page.tasks.length, 0) + state.unassignedTasks.length;

  // View configurations
  const viewConfigs = {
    board: {
      id: 'board',
      label: 'Board',
      icon: LayoutGrid,
      description: 'Kanban-style board view'
    },
    list: {
      id: 'list',
      label: 'List',
      icon: List,
      description: 'Detailed list view'
    },
    calendar: {
      id: 'calendar',
      label: 'Calendar',
      icon: CalendarIcon,
      description: 'Calendar view with due dates'
    }
  };

  // Get all tasks for filtering
  const allTasks = [
    ...state.pages.flatMap(page => page.tasks),
    ...state.unassignedTasks
  ];

  // Apply filters to tasks
  const getFilteredTasks = () => {
    let filtered = allTasks;

    // Search filter
    if (filters.search.trim()) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status));
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority.includes(task.priority || 'medium'));
    }

    // Show completed filter
    if (!filters.showCompleted) {
      filtered = filtered.filter(task => task.status !== 'done');
    }

    // Show overdue filter
    if (!filters.showOverdue) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return true;
        return new Date(task.dueDate) >= new Date() || task.status === 'done';
      });
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  const renderCurrentView = () => {
    const commonProps = {
      tasks: filteredTasks,
      onTaskSelect: (taskId: string, selected: boolean) => {
        if (selected) {
          setSelectedTasks([...selectedTasks, taskId]);
        } else {
          setSelectedTasks(selectedTasks.filter(id => id !== taskId));
        }
      },
      selectedTasks,
      filters,
      onFiltersChange: setFilters
    };

    switch (currentView) {
      case 'board':
        return (
          <div className="space-y-6">
            {filtersVisible && showFilters && (
              <TaskFilters
                filters={filters}
                onFiltersChange={setFilters}
                compact={compactMode}
              />
            )}

            {selectedTasks.length > 0 && (
              <TaskActions
                selectedTasks={selectedTasks}
                onClearSelection={() => setSelectedTasks([])}
                allTasks={allTasks}
                compact={compactMode}
              />
            )}

            <TaskBoard
              view="board"
              showFilters={false} // We handle filters above
              compactMode={compactMode}
            />
          </div>
        );
      case 'list':
        return (
          <div className="space-y-6">
            {filtersVisible && showFilters && (
              <TaskFilters
                filters={filters}
                onFiltersChange={setFilters}
                compact={compactMode}
              />
            )}

            {selectedTasks.length > 0 && (
              <TaskActions
                selectedTasks={selectedTasks}
                onClearSelection={() => setSelectedTasks([])}
                allTasks={allTasks}
                compact={compactMode}
              />
            )}

            <TaskListView
              showFilters={false} // We handle filters above
              compactMode={compactMode}
            />
          </div>
        );
      case 'calendar':
        return (
          <div className="space-y-6">
            {filtersVisible && showFilters && (
              <TaskFilters
                filters={filters}
                onFiltersChange={setFilters}
                compact={compactMode}
              />
            )}

            <TaskCalendarView
              showFilters={false} // We handle filters above
            />
          </div>
        );
      default:
        return (
          <TaskBoard
            view="board"
            showFilters={filtersVisible && showFilters}
            compactMode={compactMode}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            My Tasks
          </h1>
          <p className="text-muted-foreground">
            Manage and track your tasks efficiently
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {showViewToggle && (
            <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                {Object.values(viewConfigs).map((config) => (
                  <TabsTrigger 
                    key={config.id} 
                    value={config.id}
                    className="flex items-center gap-2"
                  >
                    <config.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Filter Toggle */}
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersVisible(!filtersVisible)}
              className="flex items-center gap-2"
            >
              {filtersVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {filtersVisible ? 'Hide' : 'Show'} Filters
              </span>
            </Button>
          )}

          {/* Add Task Button */}
          <Button 
            onClick={() => setShowAddTaskModal(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Progress Dashboard */}
      <TaskProgress
        tasks={filteredTasks}
        showDetailed={!compactMode}
      />

      {/* Current View */}
      <div className="min-h-[600px]">
        {renderCurrentView()}
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
      />
    </div>
  );
};

export default TaskViews;
