import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useUserStats } from '../hooks/useUserQueries';
import { useWorkspaceTasks } from '../hooks/useTaskQueries';
import { useWorkspacePages } from '../hooks/usePageQueries';
import { useCacheWarmup, useAutoCacheCleanup, useNetworkAwareCache } from '../hooks/useCacheService';
import { supabase } from '../lib/supabase';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Globe,
  Plus,
  ArrowRight,
  CheckCircle2,
  Zap,
  Target,
  Users,
  Crown,
  BarChart3,
  Clock,
  Calendar,
  TrendingUp,
  Activity,
  ExternalLink,
  CheckSquare,
  Timer,
  MessageCircle,
  GitBranch,
  Mail,
  Settings,
  Layers,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import ModernLayout from '../components/ModernLayout';
import InvitationManager from '../components/InvitationManager';
import WorkspaceOnboarding from '../components/WorkspaceOnboarding';

import { formatDistanceToNow } from 'date-fns';

const Home: React.FC = () => {
  const { state } = useTask();
  const { user } = useAuth();
  const { currentWorkspace, workspaceMembers, userWorkspaces, loading: workspaceLoading } = useSupabaseWorkspace();
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  // Use caching hooks for better performance
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: workspaceTasks, isLoading: tasksLoading } = useWorkspaceTasks(currentWorkspace?.id || '');
  const { data: workspacePages, isLoading: pagesLoading } = useWorkspacePages(currentWorkspace?.id || '');

  // Initialize caching
  useCacheWarmup();
  useNetworkAwareCache();
  useAutoCacheCleanup();

  // Check if database setup is needed
  const needsDatabaseSetup = notifications.some(n => n.data?.demo && n.data?.action === 'setup_database');

  // Advanced features state
  const [advancedStats, setAdvancedStats] = useState({
    totalTimeTracked: 0,
    activeTimers: 0,
    totalComments: 0,
    totalDependencies: 0,
    totalSubtasks: 0,
    completedSubtasks: 0,
    recentActivity: [],
    emailsEnabled: false,
    databaseSetup: false
  });
  const [loading, setLoading] = useState(true);

  // Overall loading state considering cached data
  const isLoading = loading || statsLoading || (currentWorkspace && (tasksLoading || pagesLoading));

  // Calculate task statistics using cached data when available
  const totalTasks = userStats?.totalTasks || state.pages.reduce((total, page) => total + page.tasks.length, 0) + state.unassignedTasks.length;
  const completedTasks = userStats?.completedTasks || state.pages.reduce((total, page) =>
    total + page.tasks.filter(task => task.status === 'done').length, 0
  ) + state.unassignedTasks.filter(task => task.status === 'done').length;
  const inProgressTasks = userStats?.inProgressTasks || state.pages.reduce((total, page) =>
    total + page.tasks.filter(task => task.status === 'progress').length, 0
  ) + state.unassignedTasks.filter(task => task.status === 'progress').length;
  const todoTasks = totalTasks - completedTasks - inProgressTasks;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Get recent tasks (last 5) - prefer cached data
  const recentTasks = workspaceTasks
    ? workspaceTasks
      .sort((a, b) => new Date((b as any).created_at || (b as any).createdAt || '').getTime() - new Date((a as any).created_at || (a as any).createdAt || '').getTime())
      .slice(0, 5)
      .map(task => ({
        ...task,
        pageName: workspacePages?.find(page => page.id === ((task as any).page_id || (task as any).pageId))?.title || 'Unassigned'
      }))
    : state.pages
      .flatMap(page => page.tasks.map(task => ({ ...task, pageName: page.title })))
      .concat(state.unassignedTasks.map(task => ({ ...task, pageName: 'Unassigned' })))
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 5);

  // Get recent websites (last 3) - prefer cached data
  // Ensure each website has a tasks array for safety
  const recentWebsites = (workspacePages || state.pages)
    .slice(0, 3)
    .map(page => ({
      ...page,
      // Ensure tasks array exists - use cached tasks or page tasks or empty array
      tasks: (page as any).tasks ||
        workspaceTasks?.filter(t => (t as any).page_id === page.id || (t as any).pageId === page.id) ||
        []
    }));

  // Load advanced features data
  useEffect(() => {
    loadAdvancedStats();
  }, [user, currentWorkspace]);

  const loadAdvancedStats = async () => {
    if (!user || !currentWorkspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Try to query advanced tables directly - if they don't exist, we'll get an error
      let databaseSetup = false;

      try {
        // Try a simple query on each table to check if they exist
        const [timeEntriesCheck, commentsCheck] = await Promise.all([
          supabase.from('task_time_entries').select('id').limit(1),
          supabase.from('task_comments').select('id').limit(1)
        ]);

        // If both queries succeed (no error), tables exist
        if (!timeEntriesCheck.error && !commentsCheck.error) {
          databaseSetup = true;
        }
      } catch (tableCheckError) {
        console.log('Advanced tables not available, using basic features');
        databaseSetup = false;
      }

      if (!databaseSetup) {
        setAdvancedStats(prev => ({ ...prev, databaseSetup: false }));
        setLoading(false);
        return;
      }

      // Load time tracking stats
      const { data: timeEntries } = await supabase
        .from('task_time_entries')
        .select('duration_minutes, end_time')
        .eq('user_id', user.id);

      const totalTimeTracked = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
      const activeTimers = timeEntries?.filter(entry => !entry.end_time).length || 0;

      // Load comments count
      const { count: commentsCount } = await supabase
        .from('task_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Load dependencies count (with graceful fallback)
      let dependenciesCount = 0;
      try {
        const depResult = await supabase
          .from('task_dependencies')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id);
        dependenciesCount = depResult.count || 0;
      } catch (e) {
        // Table might not exist
      }

      // Load subtasks stats (with graceful fallback)
      let totalSubtasks = 0;
      let completedSubtasks = 0;
      try {
        const { data: subtasks } = await supabase
          .from('subtasks')
          .select('status')
          .eq('created_by', user.id);
        totalSubtasks = subtasks?.length || 0;
        completedSubtasks = subtasks?.filter(st => st.status === 'done').length || 0;
      } catch (e) {
        // Table might not exist
      }

      // Load recent activity (with graceful fallback)
      let recentActivity: any[] = [];
      try {
        const { data } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        recentActivity = data || [];
      } catch (e) {
        // Table might not exist
      }

      // Check email configuration
      const emailsEnabled = !!import.meta.env.VITE_EMAIL_SERVICE_API_KEY ||
        import.meta.env.VITE_EMAIL_SERVICE_PROVIDER === 'demo';

      setAdvancedStats({
        totalTimeTracked,
        activeTimers,
        totalComments: commentsCount || 0,
        totalDependencies: dependenciesCount,
        totalSubtasks,
        completedSubtasks,
        recentActivity,
        emailsEnabled,
        databaseSetup: true
      });

    } catch (error) {
      console.error('Error loading advanced stats:', error);
      setAdvancedStats(prev => ({ ...prev, databaseSetup: false }));
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };



  return (
    <ModernLayout>
      {/* Show onboarding if user has no workspaces */}
      {!workspaceLoading && userWorkspaces.length === 0 ? (
        <WorkspaceOnboarding />
      ) : (
        <div className="space-y-6">


          {/* Welcome Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {getGreeting()}, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Let's organize your Daily Tasks
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/add-page')} className="btn-orange">
                <Plus className="h-4 w-4 mr-2" />
                New Website
              </Button>
              <Button onClick={() => navigate('/tasker')} variant="outline">
                <CheckSquare className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

          {/* Database Setup Check */}
          {!advancedStats.databaseSetup && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Advanced Features Setup Required:</strong> Run the database schemas to enable task dependencies, subtasks, time tracking, and comments.
                <Button
                  variant="link"
                  className="p-0 h-auto text-orange-600 hover:text-orange-700"
                  onClick={() => navigate('/profile')}
                >
                  View Setup Guide
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="card-modern card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {completedTasks} completed
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {Math.floor(advancedStats.totalTimeTracked / 60)}h {advancedStats.totalTimeTracked % 60}m
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {advancedStats.activeTimers > 0 && (
                    <>
                      <PlayCircle className="h-3 w-3 text-green-500" />
                      {advancedStats.activeTimers} active
                    </>
                  )}
                  {advancedStats.activeTimers === 0 && 'No active timers'}
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subtasks</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{advancedStats.totalSubtasks}</div>
                <p className="text-xs text-muted-foreground">
                  {advancedStats.completedSubtasks} completed
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comments</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{advancedStats.totalComments}</div>
                <p className="text-xs text-muted-foreground">
                  Team discussions
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dependencies</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{advancedStats.totalDependencies}</div>
                <p className="text-xs text-muted-foreground">
                  Task relationships
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Features</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {[advancedStats.databaseSetup, advancedStats.emailsEnabled].filter(Boolean).length}/2
                </div>
                <p className="text-xs text-muted-foreground">
                  Advanced features
                </p>
              </CardContent>
            </Card>
          </div>
          {/* Advanced Features Status */}
          {advancedStats.databaseSetup && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={advancedStats.emailsEnabled ? "default" : "secondary"}>
                      {advancedStats.emailsEnabled ? "Active" : "Demo Mode"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {advancedStats.emailsEnabled ? "Notifications enabled" : "Console logging only"}
                  </p>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Time Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={advancedStats.activeTimers > 0 ? "default" : "secondary"}>
                      {advancedStats.activeTimers > 0 ? `${advancedStats.activeTimers} Running` : "Stopped"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/tasker')}>
                      <PlayCircle className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.floor(advancedStats.totalTimeTracked / 60)}h {advancedStats.totalTimeTracked % 60}m total
                  </p>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Collaboration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={advancedStats.totalComments > 0 ? "default" : "secondary"}>
                      {advancedStats.totalComments} Comments
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/tasker')}>
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Real-time discussions
                  </p>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="default">
                      {advancedStats.recentActivity.length} Activities
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                      <Activity className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Performance tracking
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Tasks */}
            <div className="lg:col-span-2">
              <Card className="card-modern">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Recent Tasks
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/tasker')}>
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first task to get started</p>
                      <Button onClick={() => navigate('/tasker')} className="btn-orange">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Task
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' :
                              task.status === 'progress' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} />
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">{task.pageName}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Task Progress */}
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Task Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Completed</span>
                      <span>{completedTasks}/{totalTasks}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                        <div className="text-lg font-bold text-blue-600">{todoTasks}</div>
                        <div className="text-xs text-blue-600">To Do</div>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <div className="text-lg font-bold text-yellow-600">{inProgressTasks}</div>
                        <div className="text-xs text-yellow-600">In Progress</div>
                      </div>
                      <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                        <div className="text-lg font-bold text-green-600">{completedTasks}</div>
                        <div className="text-xs text-green-600">Completed</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Websites */}
              <Card className="card-modern">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Recent Websites
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/websites')}>
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentWebsites.length === 0 ? (
                    <div className="text-center py-4">
                      <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">No websites yet</p>
                      <Button size="sm" onClick={() => navigate('/add-page')} className="btn-orange">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Website
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentWebsites.map((website) => (
                        <div key={website.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{website.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{website.url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {website.tasks.length}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => window.open(website.url, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              {advancedStats.databaseSetup && advancedStats.recentActivity.length > 0 && (
                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {advancedStats.recentActivity.slice(0, 5).map((activity, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.activity_description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team Members */}
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workspaceMembers.slice(0, 3).map((member) => (
                      <div key={member.userId} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photoURL} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs">
                            {member.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.displayName}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                    ))}
                    {workspaceMembers.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{workspaceMembers.length - 3} more members
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions for Advanced Features */}
          {advancedStats.databaseSetup && (
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Access advanced features and tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/tasker')}
                  >
                    <Timer className="h-5 w-5 text-orange-500" />
                    <span className="text-sm">Start Timer</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/tasker')}
                  >
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    <span className="text-sm">Add Comment</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/tasker')}
                  >
                    <GitBranch className="h-5 w-5 text-purple-500" />
                    <span className="text-sm">Dependencies</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/profile')}
                  >
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invitation Manager */}
          <div className="mt-6">
            <InvitationManager />
          </div>


        </div>
      )}
    </ModernLayout>
  );
};

export default Home;
