import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  Calendar as CalendarIcon,
  Flag,
  User,
  Tag,
  X,
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';

export interface TaskFilterOptions {
  search: string;
  status: string[];
  priority: string[];
  assignee: string[];
  tags: string[];
  dueDateRange: {
    from?: Date;
    to?: Date;
  };
  createdDateRange: {
    from?: Date;
    to?: Date;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  showCompleted: boolean;
  showOverdue: boolean;
}

interface TaskFiltersProps {
  filters: TaskFilterOptions;
  onFiltersChange: (filters: TaskFilterOptions) => void;
  availableAssignees?: Array<{ id: string; name: string; avatar?: string }>;
  availableTags?: string[];
  compact?: boolean;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFiltersChange,
  availableAssignees = [],
  availableTags = [],
  compact = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilters = (updates: Partial<TaskFilterOptions>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const resetFilters = () => {
    onFiltersChange({
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
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.dueDateRange.from || filters.dueDateRange.to) count++;
    if (filters.createdDateRange.from || filters.createdDateRange.to) count++;
    if (!filters.showCompleted || !filters.showOverdue) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const statusOptions = [
    { value: 'todo', label: 'To Do', color: 'bg-blue-100 text-blue-800' },
    { value: 'progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const sortOptions = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
    { value: 'created', label: 'Created Date' },
    { value: 'updated', label: 'Updated Date' },
    { value: 'title', label: 'Title' },
    { value: 'assignee', label: 'Assignee' }
  ];

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              <Select 
                value={filters.status.length === 1 ? filters.status[0] : 'all'} 
                onValueChange={(value) => updateFilters({ status: value === 'all' ? [] : [value] })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.priority.length === 1 ? filters.priority[0] : 'all'} 
                onValueChange={(value) => updateFilters({ priority: value === 'all' ? [] : [value] })}
              >
                <SelectTrigger className="w-32">
                  <Flag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value })}>
                <SelectTrigger className="w-32">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>

              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Basic Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks by title, description, or tags..."
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value })}>
                <SelectTrigger className="w-40">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            {/* Advanced Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Advanced
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>

            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              {/* Status and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${option.value}`}
                          checked={filters.status.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFilters({ status: [...filters.status, option.value] });
                            } else {
                              updateFilters({ status: filters.status.filter(s => s !== option.value) });
                            }
                          }}
                        />
                        <label
                          htmlFor={`status-${option.value}`}
                          className={`text-sm px-2 py-1 rounded ${option.color} cursor-pointer`}
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {priorityOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`priority-${option.value}`}
                          checked={filters.priority.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFilters({ priority: [...filters.priority, option.value] });
                            } else {
                              updateFilters({ priority: filters.priority.filter(p => p !== option.value) });
                            }
                          }}
                        />
                        <label
                          htmlFor={`priority-${option.value}`}
                          className={`text-sm px-2 py-1 rounded ${option.color} cursor-pointer`}
                        >
                          <Flag className="h-3 w-3 inline mr-1" />
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-completed"
                    checked={filters.showCompleted}
                    onCheckedChange={(checked) => updateFilters({ showCompleted: checked as boolean })}
                  />
                  <label htmlFor="show-completed" className="text-sm cursor-pointer">
                    Show completed tasks
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-overdue"
                    checked={filters.showOverdue}
                    onCheckedChange={(checked) => updateFilters({ showOverdue: checked as boolean })}
                  />
                  <label htmlFor="show-overdue" className="text-sm cursor-pointer">
                    Show overdue tasks
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskFilters;
