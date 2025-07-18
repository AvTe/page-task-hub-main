import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTask } from '../contexts/TaskContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import ModernLayout from '../components/ModernLayout';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckSquare,
  Users,
  Calendar,
  Activity,
  Zap
} from 'lucide-react';

const Analytics: React.FC = () => {
  const { state } = useTask();
  const { workspaceMembers } = useSupabaseWorkspace();

  // Calculate analytics data
  const totalTasks = state.pages.reduce((total, page) => total + page.tasks.length, 0) + state.unassignedTasks.length;
  const completedTasks = state.pages.reduce((total, page) => 
    total + page.tasks.filter(task => task.status === 'done').length, 0
  ) + state.unassignedTasks.filter(task => task.status === 'done').length;
  const inProgressTasks = state.pages.reduce((total, page) => 
    total + page.tasks.filter(task => task.status === 'in-progress').length, 0
  ) + state.unassignedTasks.filter(task => task.status === 'in-progress').length;
  const todoTasks = totalTasks - completedTasks - inProgressTasks;
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const productivity = totalTasks > 0 ? ((completedTasks + inProgressTasks) / totalTasks) * 100 : 0;

  // Task distribution by website
  const websiteStats = state.pages.map(page => ({
    name: page.title,
    total: page.tasks.length,
    completed: page.tasks.filter(task => task.status === 'done').length,
    inProgress: page.tasks.filter(task => task.status === 'in-progress').length,
    todo: page.tasks.filter(task => task.status === 'todo').length,
  }));

  // Recent activity (mock data for now)
  const recentActivity = [
    { action: 'Task completed', item: 'Fix navigation bug', time: '2 hours ago', type: 'completed' },
    { action: 'New task created', item: 'Add user authentication', time: '4 hours ago', type: 'created' },
    { action: 'Task updated', item: 'Update homepage design', time: '6 hours ago', type: 'updated' },
    { action: 'Website added', item: 'E-commerce Platform', time: '1 day ago', type: 'website' },
    { action: 'Team member joined', item: 'John Doe', time: '2 days ago', type: 'member' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed': return <CheckSquare className="h-4 w-4 text-green-500" />;
      case 'created': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'updated': return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'website': return <BarChart3 className="h-4 w-4 text-purple-500" />;
      case 'member': return <Users className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your productivity and team performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-modern card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +12% from last week
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{Math.round(completionRate)}%</div>
              <Progress value={completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="card-modern card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{state.pages.length}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +2 this month
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{workspaceMembers.length}</div>
              <p className="text-xs text-muted-foreground">
                {workspaceMembers.filter(m => m.isOnline).length} online now
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Status Distribution */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
              <CardDescription>Overview of task completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{completedTasks}</span>
                    <Badge variant="outline">{Math.round((completedTasks / totalTasks) * 100)}%</Badge>
                  </div>
                </div>
                <Progress value={(completedTasks / totalTasks) * 100} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{inProgressTasks}</span>
                    <Badge variant="outline">{Math.round((inProgressTasks / totalTasks) * 100)}%</Badge>
                  </div>
                </div>
                <Progress value={(inProgressTasks / totalTasks) * 100} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm">To Do</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{todoTasks}</span>
                    <Badge variant="outline">{Math.round((todoTasks / totalTasks) * 100)}%</Badge>
                  </div>
                </div>
                <Progress value={(todoTasks / totalTasks) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Productivity Score */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Productivity Score</CardTitle>
              <CardDescription>Based on task completion and activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-primary">{Math.round(productivity)}%</div>
                <Progress value={productivity} className="h-4" />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-green-600">{completedTasks}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-yellow-600">{inProgressTasks}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Performance */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle>Project Performance</CardTitle>
            <CardDescription>Task distribution across your websites</CardDescription>
          </CardHeader>
          <CardContent>
            {websiteStats.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground">Add your first website to see analytics</p>
              </div>
            ) : (
              <div className="space-y-4">
                {websiteStats.map((website, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{website.name}</h4>
                      <Badge variant="outline">{website.total} tasks</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded bg-green-50 dark:bg-green-950">
                        <div className="text-sm font-medium text-green-600">{website.completed}</div>
                        <div className="text-xs text-green-600">Done</div>
                      </div>
                      <div className="text-center p-2 rounded bg-yellow-50 dark:bg-yellow-950">
                        <div className="text-sm font-medium text-yellow-600">{website.inProgress}</div>
                        <div className="text-xs text-yellow-600">Progress</div>
                      </div>
                      <div className="text-center p-2 rounded bg-blue-50 dark:bg-blue-950">
                        <div className="text-sm font-medium text-blue-600">{website.todo}</div>
                        <div className="text-xs text-blue-600">To Do</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates and changes in your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}:</span> {activity.item}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
};

export default Analytics;
