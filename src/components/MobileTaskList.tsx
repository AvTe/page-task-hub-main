import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Plus, 
  SortAsc, 
  SortDesc,
  Calendar,
  User,
  Flag,
  CheckSquare,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { Task } from '../types';
import ResponsiveTaskCard from './ResponsiveTaskCard';

interface MobileTaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onCreateTask?: () => void;
  workspaceMembers?: Array<{ id: string; name: string; email: string }>;
  loading?: boolean;
}

type SortOption = 'dueDate' | 'priority' | 'status' | 'created' | 'title';
type FilterStatus = 'all' | 'todo' | 'progress' | 'done';
type FilterPriority = 'all' | 'high' | 'medium' | 'low';

const MobileTaskList: React.FC<MobileTaskListProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
  onCreateTask,
  workspaceMembers = [],
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Search filter
      const matchesSearch = !searchQuery || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

      // Priority filter
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

      // Assignee filter
      const matchesAssignee = filterAssignee === 'all' || task.assignedTo === filterAssignee;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'dueDate':
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          comparison = bPriority - aPriority; // High priority first
          break;
        
        case 'status':
          const statusOrder = { todo: 1, progress: 2, done: 3 };
          const aStatus = statusOrder[a.status as keyof typeof statusOrder] || 0;
          const bStatus = statusOrder[b.status as keyof typeof statusOrder] || 0;
          comparison = aStatus - bStatus;
          break;
        
        case 'created':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [tasks, searchQuery, sortBy, sortOrder, filterStatus, filterPriority, filterAssignee]);

  const tasksByStatus = useMemo(() => {
    return {
      todo: filteredAndSortedTasks.filter(t => t.status === 'todo'),
      progress: filteredAndSortedTasks.filter(t => t.status === 'progress'),
      done: filteredAndSortedTasks.filter(t => t.status === 'done')
    };
  }, [filteredAndSortedTasks]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterAssignee('all');
    setSortBy('dueDate');
    setSortOrder('asc');
  };

  const activeFiltersCount = [
    filterStatus !== 'all',
    filterPriority !== 'all',
    filterAssignee !== 'all',
    searchQuery.length > 0
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <Button size="sm" onClick={onCreateTask}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-1" /> : <SortDesc className="h-4 w-4 mr-1" />}
            Sort
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={(value: FilterPriority) => setFilterPriority(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {workspaceMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="all" className="h-full">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-2">
            <TabsTrigger value="all" className="text-xs">
              All ({filteredAndSortedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="todo" className="text-xs">
              To Do ({tasksByStatus.todo.length})
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">
              Progress ({tasksByStatus.progress.length})
            </TabsTrigger>
            <TabsTrigger value="done" className="text-xs">
              Done ({tasksByStatus.done.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-2 space-y-2 px-4 pb-4">
            {filteredAndSortedTasks.map(task => (
              <ResponsiveTaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onStatusChange={onStatusChange}
                workspaceMembers={workspaceMembers}
                compact={true}
              />
            ))}
          </TabsContent>

          <TabsContent value="todo" className="mt-2 space-y-2 px-4 pb-4">
            {tasksByStatus.todo.map(task => (
              <ResponsiveTaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onStatusChange={onStatusChange}
                workspaceMembers={workspaceMembers}
                compact={true}
              />
            ))}
          </TabsContent>

          <TabsContent value="progress" className="mt-2 space-y-2 px-4 pb-4">
            {tasksByStatus.progress.map(task => (
              <ResponsiveTaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onStatusChange={onStatusChange}
                workspaceMembers={workspaceMembers}
                compact={true}
              />
            ))}
          </TabsContent>

          <TabsContent value="done" className="mt-2 space-y-2 px-4 pb-4">
            {tasksByStatus.done.map(task => (
              <ResponsiveTaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onStatusChange={onStatusChange}
                workspaceMembers={workspaceMembers}
                compact={true}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {filteredAndSortedTasks.length === 0 && (
          <div className="text-center py-12 px-4">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {activeFiltersCount > 0 
                ? 'Try adjusting your filters or search terms'
                : 'Create your first task to get started'
              }
            </p>
            {activeFiltersCount === 0 && (
              <Button onClick={onCreateTask}>
                <Plus className="h-4 w-4 mr-1" />
                Create Task
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTaskList;
