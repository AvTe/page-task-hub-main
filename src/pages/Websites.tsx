import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTask } from '../contexts/TaskContext';
import ModernLayout from '../components/ModernLayout';
import {
  Globe,
  Plus,
  Search,
  ExternalLink,
  MoreVertical,
  Edit,
  Trash2,
  CheckSquare,
  Clock,
  Target,
  Filter
} from 'lucide-react';

const Websites: React.FC = () => {
  const { state } = useTask();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // Filter websites based on search and status
  const filteredWebsites = state.pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.url.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'all') return true;
    
    const completedTasks = page.tasks.filter(task => task.status === 'done').length;
    const totalTasks = page.tasks.length;
    
    if (filterStatus === 'completed') return totalTasks > 0 && completedTasks === totalTasks;
    if (filterStatus === 'active') return totalTasks === 0 || completedTasks < totalTasks;
    
    return true;
  });

  const getWebsiteStats = (page: any) => {
    const totalTasks = page.tasks.length;
    const completedTasks = page.tasks.filter((task: any) => task.status === 'done').length;
    const inProgressTasks = page.tasks.filter((task: any) => task.status === 'in-progress').length;
    const todoTasks = totalTasks - completedTasks - inProgressTasks;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return { totalTasks, completedTasks, inProgressTasks, todoTasks, completionRate };
  };

  const getStatusColor = (completionRate: number) => {
    if (completionRate === 100) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    if (completionRate >= 50) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
    return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
  };

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Websites</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all your website projects
            </p>
          </div>
          <Button onClick={() => navigate('/add-page')} className="btn-orange">
            <Plus className="h-4 w-4 mr-2" />
            Add Website
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Websites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{state.pages.length}</div>
              <p className="text-xs text-muted-foreground">Active projects</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {state.pages.reduce((total, page) => total + page.tasks.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Across all websites</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {state.pages.reduce((total, page) => 
                  total + page.tasks.filter(task => task.status === 'done').length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tasks finished</p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {state.pages.reduce((total, page) => 
                  total + page.tasks.filter(task => task.status === 'in-progress').length, 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Currently working</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="card-modern">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('active')}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('completed')}
                >
                  Completed
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Websites Grid */}
        {filteredWebsites.length === 0 ? (
          <Card className="card-modern">
            <CardContent className="p-12 text-center">
              <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {state.pages.length === 0 ? 'No websites yet' : 'No websites match your search'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {state.pages.length === 0 
                  ? 'Start by adding your first website to track tasks and manage your projects.'
                  : 'Try adjusting your search terms or filters.'
                }
              </p>
              {state.pages.length === 0 && (
                <Button onClick={() => navigate('/add-page')} className="btn-orange">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Website
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWebsites.map((page) => {
              const stats = getWebsiteStats(page);
              return (
                <Card key={page.id} className="card-modern card-hover">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{page.title}</CardTitle>
                        <CardDescription className="truncate">{page.url}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(page.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Task Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                          <div className="text-sm font-bold text-green-600">{stats.completedTasks}</div>
                          <div className="text-xs text-green-600">Done</div>
                        </div>
                        <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                          <div className="text-sm font-bold text-yellow-600">{stats.inProgressTasks}</div>
                          <div className="text-xs text-yellow-600">Progress</div>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                          <div className="text-sm font-bold text-blue-600">{stats.todoTasks}</div>
                          <div className="text-xs text-blue-600">To Do</div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{Math.round(stats.completionRate)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${stats.completionRate}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(stats.completionRate)}>
                          {stats.completionRate === 100 ? 'Completed' : 
                           stats.completionRate >= 50 ? 'In Progress' : 'Getting Started'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {stats.totalTasks} task{stats.totalTasks !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate(`/tasker?page=${page.id}`)}
                        >
                          <CheckSquare className="h-3 w-3 mr-1" />
                          View Tasks
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ModernLayout>
  );
};

export default Websites;
