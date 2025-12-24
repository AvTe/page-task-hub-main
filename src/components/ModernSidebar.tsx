import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useTask } from '../contexts/TaskContext';
import { usePreloadOnHover } from '../hooks/usePreloadOnHover';
import TimezoneDisplay from './TimezoneDisplay';
import {
  Home,
  Globe,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Zap,
  Star,
  Search,
  Mail,
  Building2,
  Briefcase,
  Folder
} from 'lucide-react';

interface ModernSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentWorkspace, userWorkspaces, workspaceMembers, switchWorkspace } = useSupabaseWorkspace();
  const { state } = useTask();
  const { createPreloadHandler } = usePreloadOnHover();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      current: location.pathname === '/',
      badge: null
    },
    {
      name: 'My Websites',
      href: '/websites',
      icon: Globe,
      current: location.pathname === '/websites',
      badge: state.pages.length
    },
    {
      name: 'Tasks',
      href: '/tasker',
      icon: CheckSquare,
      current: location.pathname === '/tasker',
      badge: state.pages.reduce((total, page) => total + page.tasks.length, 0) + state.unassignedTasks.length
    },
    {
      name: 'Team',
      href: '/team',
      icon: Users,
      current: location.pathname === '/team',
      badge: workspaceMembers.length
    },
    {
      name: 'Workspaces',
      href: '/workspace-management',
      icon: Building2,
      current: location.pathname === '/workspace-management',
      badge: userWorkspaces.length > 1 ? userWorkspaces.length : null
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      current: location.pathname === '/analytics',
      badge: null
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: Calendar,
      current: location.pathname === '/calendar',
      badge: null
    },
    {
      name: 'Features',
      href: '/features',
      icon: Star,
      current: location.pathname === '/features',
      badge: null
    },
  ];



  const quickActions = [
    { name: 'New Task', icon: Plus, action: () => navigate('/tasker'), color: 'bg-blue-500' },
    { name: 'Add Website', icon: Globe, action: () => navigate('/add-page'), color: 'bg-green-500' },
    { name: 'Invite Member', icon: Users, action: () => navigate('/team'), color: 'bg-purple-500' },
  ];

  // Calculate task statistics
  const totalTasks = state.pages.reduce((total, page) => total + page.tasks.length, 0) + state.unassignedTasks.length;
  const completedTasks = state.pages.reduce((total, page) =>
    total + page.tasks.filter(task => task.status === 'done').length, 0
  ) + state.unassignedTasks.filter(task => task.status === 'done').length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-80'} h-screen bg-card border-r border-border flex flex-col transition-all duration-300 fixed left-0 top-0 z-30`}>
      {/* Header with Logo and Collapse Toggle */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  EasTask
                </h2>
                <p className="text-xs text-muted-foreground">
                  {currentWorkspace?.name || 'My Workspace'}
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0 hover:bg-accent hover:text-orange-600 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks, websites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 focus:bg-background"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          // Map routes to component names for preloading
          const componentMap: Record<string, string> = {
            '/': 'home',
            '/tasker': 'tasker',
            '/websites': 'websites',
            '/team': 'team',
            '/analytics': 'analytics',
            '/calendar': 'calendar',
            '/profile': 'profile',
            '/settings': 'settings',
            '/workspace-management': 'workspace-management'
          };

          const componentName = componentMap[item.href];
          const preloadHandlers = componentName ? createPreloadHandler(componentName) : {};

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${item.current
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              title={isCollapsed ? item.name : undefined}
              {...preloadHandlers}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <item.icon className={`h-4 w-4 ${item.current ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </div>
              {!isCollapsed && item.badge !== null && item.badge > 0 && (
                <Badge variant={item.current ? "secondary" : "outline"} className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}

        {/* Workspace Indicator for Collapsed Sidebar */}
        {isCollapsed && currentWorkspace && (
          <div className="pt-4 border-t border-border">
            <button
              onClick={() => navigate('/workspace-management')}
              className="flex items-center justify-center w-full px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group bg-primary/10 text-primary border border-primary/20"
              title={`Current Workspace: ${currentWorkspace.name}`}
            >
              <Building2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Workspaces Section */}
        {!isCollapsed && userWorkspaces.length > 0 && (
          <div className="pt-6">
            <button
              onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Workspaces</span>
              {workspacesExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {workspacesExpanded && (
              <div className="mt-2 space-y-1">
                {userWorkspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => switchWorkspace(workspace.id)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${currentWorkspace?.id === workspace.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                    title={workspace.name}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${currentWorkspace?.id === workspace.id
                        ? 'bg-primary'
                        : 'bg-muted-foreground/40'
                        }`} />
                      <span className="truncate">{workspace.name}</span>
                    </div>
                    {currentWorkspace?.id === workspace.id && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        Current
                      </Badge>
                    )}
                  </button>
                ))}

                {/* Add Workspace Button */}
                <button
                  onClick={() => navigate('/workspace-management')}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 group"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Workspace</span>
                </button>

                {/* Manage Workspaces Link */}
                <Link
                  to="/workspace-management"
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all duration-200 group font-medium"
                >
                  <Settings className="h-4 w-4" />
                  <span>Manage Workspaces</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Projects Section */}
        {!isCollapsed && (
          <div className="pt-6">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Projects</span>
              {projectsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {projectsExpanded && (
              <div className="mt-2 space-y-1">
                {state.pages.slice(0, 5).map((page) => (
                  <Link
                    key={page.id}
                    to={`/tasker?page=${page.id}`}
                    className="flex items-center justify-between px-6 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                      <span className="truncate">{page.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {page.tasks.length}
                    </Badge>
                  </Link>
                ))}

                {state.pages.length === 0 && (
                  <div className="px-6 py-2 text-xs text-muted-foreground">
                    No projects yet
                  </div>
                )}

                <Link
                  to="/add-page"
                  className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Project</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Progress Card */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Today's Progress
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-orange-700 dark:text-orange-300">
                  <span>{completedTasks} completed</span>
                  <span>{totalTasks} total</span>
                </div>
                <Progress
                  value={progressPercentage}
                  className="h-2 bg-orange-200 dark:bg-orange-800"
                />
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  {Math.round(progressPercentage)}% complete
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        {!isCollapsed ? (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.name}
                  variant="ghost"
                  size="sm"
                  className="h-auto p-2 flex flex-col items-center gap-1 hover:bg-accent"
                  onClick={action.action}
                >
                  <div className={`w-6 h-6 rounded-md ${action.color} flex items-center justify-center`}>
                    <action.icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs">{action.name.split(' ')[0]}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.name}
                variant="ghost"
                size="sm"
                className="w-full h-10 p-0 flex items-center justify-center hover:bg-accent"
                onClick={action.action}
                title={action.name}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Timezone Display */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <TimezoneDisplay className="justify-center" />
        </div>
      )}

      {/* Settings & Tools */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className={`${isCollapsed ? 'w-full justify-center' : 'w-full justify-start'} h-10`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Settings</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/email-test')}
          className={`${isCollapsed ? 'w-full justify-center' : 'w-full justify-start'} h-10 text-muted-foreground`}
          title={isCollapsed ? 'Email Testing' : undefined}
        >
          <Mail className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Email Testing</span>}
        </Button>
      </div>
    </aside>
  );
};

export default ModernSidebar;
