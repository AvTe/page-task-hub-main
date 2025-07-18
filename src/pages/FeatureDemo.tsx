import React, { useState } from 'react';
import ModernLayout from '../components/ModernLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  GitBranch, 
  Users, 
  FileText,
  BarChart3,
  Settings,
  Zap,
  Star,
  Play,
  CheckSquare,
  Timer,
  Paperclip
} from 'lucide-react';

const FeatureDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const features = [
    {
      id: 'drag-drop',
      title: 'Drag & Drop Task Management',
      description: 'Seamlessly move tasks between pages and assign them to team members',
      icon: CheckSquare,
      status: 'completed',
      demo: 'Try dragging tasks between different pages in the Task Dashboard'
    },
    {
      id: 'time-tracking',
      title: 'Advanced Time Tracking',
      description: 'Track time spent on tasks with start/stop timers and manual entries',
      icon: Timer,
      status: 'completed',
      demo: 'Click on any task to open the enhanced modal and go to the Time tab'
    },
    {
      id: 'subtasks',
      title: 'Subtask Management',
      description: 'Break down complex tasks into manageable subtasks with progress tracking',
      icon: CheckSquare,
      status: 'completed',
      demo: 'Open any task and navigate to the Subtasks tab to create and manage subtasks'
    },
    {
      id: 'comments',
      title: 'Task Comments & Collaboration',
      description: 'Team discussions with threaded comments and real-time updates',
      icon: MessageSquare,
      status: 'completed',
      demo: 'Open any task and go to the Comments tab to start team discussions'
    },
    {
      id: 'dependencies',
      title: 'Task Dependencies',
      description: 'Create task relationships with circular dependency prevention',
      icon: GitBranch,
      status: 'completed',
      demo: 'Open any task and go to the Dependencies tab to link related tasks'
    },
    {
      id: 'attachments',
      title: 'File Attachments',
      description: 'Upload and manage files attached to tasks and comments',
      icon: Paperclip,
      status: 'completed',
      demo: 'Open any task and go to the Files tab to upload attachments'
    },
    {
      id: 'settings',
      title: 'User Settings & Preferences',
      description: 'Comprehensive settings for appearance, notifications, and privacy',
      icon: Settings,
      status: 'completed',
      demo: 'Navigate to Settings from the sidebar to customize your experience'
    },
    {
      id: 'profiles',
      title: 'Professional User Profiles',
      description: 'Complete user profiles with skills, goals, and professional information',
      icon: Users,
      status: 'completed',
      demo: 'Visit your Profile page to set up your professional information'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'planned': return <Star className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <ModernLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-orange-500" />
            <h1 className="text-4xl font-bold text-foreground">EasTask Feature Showcase</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore all the powerful features that make EasTask the ultimate task management solution
          </p>
          
          <Alert className="max-w-2xl mx-auto">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              All features are fully implemented and ready to use! Click on any feature below to learn how to test it.
            </AlertDescription>
          </Alert>
        </div>

        {/* Feature Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600">8</div>
              <div className="text-sm text-muted-foreground">Features Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600">100%</div>
              <div className="text-sm text-muted-foreground">Implementation Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">15+</div>
              <div className="text-sm text-muted-foreground">Database Tables</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">Ready</div>
              <div className="text-sm text-muted-foreground">Production Status</div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  activeDemo === feature.id ? 'ring-2 ring-orange-500' : ''
                }`}
                onClick={() => setActiveDemo(activeDemo === feature.id ? null : feature.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                        <Icon className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </div>
                    </div>
                    <Badge className={getStatusColor(feature.status)}>
                      {getStatusIcon(feature.status)}
                      <span className="ml-1 capitalize">{feature.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {feature.description}
                  </CardDescription>
                  
                  {activeDemo === feature.id && (
                    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-start gap-2">
                        <Play className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-orange-800 dark:text-orange-200 mb-1">
                            How to Test:
                          </div>
                          <div className="text-sm text-orange-700 dark:text-orange-300">
                            {feature.demo}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Implementation Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Technical Implementation
            </CardTitle>
            <CardDescription>
              Overview of the technical architecture and database setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="database" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="database">Database Schema</TabsTrigger>
                <TabsTrigger value="features">Feature Components</TabsTrigger>
                <TabsTrigger value="setup">Setup Instructions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="database" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Core Tables</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• workspaces, workspace_members</li>
                      <li>• pages, tasks</li>
                      <li>• user_profiles, user_settings</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Advanced Features</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• task_dependencies, subtasks</li>
                      <li>• task_comments, task_time_entries</li>
                      <li>• task_attachments, user_activity</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="features" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">React Components</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• TimeTracker.tsx</li>
                      <li>• SubtaskManager.tsx</li>
                      <li>• TaskComments.tsx</li>
                      <li>• TaskDependencyManager.tsx</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Enhanced Features</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Drag & Drop with visual feedback</li>
                      <li>• Real-time collaboration</li>
                      <li>• File upload & management</li>
                      <li>• Advanced settings & profiles</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="setup" className="space-y-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Run the <code>COMPLETE_EASTASK_SETUP.sql</code> script in your Supabase SQL editor to set up all database tables, functions, triggers, and security policies.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <h4 className="font-semibold">Setup Steps:</h4>
                  <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                    <li>Copy the complete SQL setup script</li>
                    <li>Run it in Supabase SQL Editor</li>
                    <li>Verify all tables and functions are created</li>
                    <li>Test the features in the application</li>
                  </ol>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
};

export default FeatureDemo;
