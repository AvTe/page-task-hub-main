import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTask } from '../contexts/TaskContext';
import { useWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Plus, ArrowRight, CheckCircle2, Zap, Target, Users, Crown } from 'lucide-react';
import DataMigration from '../components/DataMigration';
import InvitationManager from '../components/InvitationManager';

const Home: React.FC = () => {
  const { state } = useTask();
  const { currentWorkspace, userWorkspaces, createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    settings: {
      isPublic: false,
      allowGuestAccess: false,
      requireApprovalForJoining: false,
      defaultMemberRole: 'member' as const,
      notificationSettings: {
        emailNotifications: true,
        taskAssignments: true,
        taskComments: true,
        taskStatusChanges: true,
        workspaceUpdates: true
      }
    }
  });

  const totalTasks = state.pages.reduce((total, page) => total + page.tasks.length, 0) + state.unassignedTasks.length;
  const completedTasks = state.pages.reduce((total, page) => 
    total + page.tasks.filter(task => task.status === 'done').length, 0
  ) + state.unassignedTasks.filter(task => task.status === 'done').length;

  const handleCreateWorkspace = async () => {
    console.log('handleCreateWorkspace called', { newWorkspace });
    
    if (!newWorkspace.name.trim()) {
      console.log('No workspace name provided');
      return;
    }
    
    console.log('Calling createWorkspace...');
    try {
      await createWorkspace(newWorkspace);
      console.log('Workspace created successfully, resetting form');
      setNewWorkspace({
        name: '',
        description: '',
        settings: {
          isPublic: false,
          allowGuestAccess: false,
          requireApprovalForJoining: false,
          defaultMemberRole: 'member' as const,
          notificationSettings: {
            emailNotifications: true,
            taskAssignments: true,
            taskComments: true,
            taskStatusChanges: true,
            workspaceUpdates: true
          }
        }
      });
      setShowCreateWorkspaceModal(false);
    } catch (error) {
      console.error('Error in handleCreateWorkspace:', error);
    }
  };

  const handleGetStarted = () => {
    if (userWorkspaces.length === 0) {
      setShowCreateWorkspaceModal(true);
    } else if (state.pages.length === 0) {
      navigate('/websites');
    } else {
      navigate('/tasker');
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      

      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Manage Your 
            <span className="bg-gradient-to-r from-coral-orange to-cornflower-blue bg-clip-text text-transparent">
              {" "}Projects{" "}
            </span>
            Effortlessly
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Organize your websites and projects with powerful task management. 
            Keep track of all your work in one beautiful, intuitive dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
            >
              {userWorkspaces.length === 0 ? (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Create Your First Workspace
                </>
              ) : state.pages.length === 0 ? (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Website
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </>
              )}
            </Button>
            
            {state.pages.length > 0 && (
              <Link to="/websites">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  <Globe className="w-5 h-5 mr-2" />
                  Manage Websites
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Data Migration Component */}
        <DataMigration />

        {/* Workspace Invitations */}
        <div className="mb-12 flex justify-center">
          <InvitationManager />
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="p-6 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Project Organization</h3>
            </div>
            <p className="text-gray-600">
              Organize your work by websites or projects. Keep everything separated and focused.
            </p>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Task Management</h3>
            </div>
            <p className="text-gray-600">
              Create, organize, and track tasks with drag-and-drop simplicity. Set priorities and due dates.
            </p>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold">Real-time Updates</h3>
            </div>
            <p className="text-gray-600">
              See your progress in real-time with beautiful dashboards and instant task updates.
            </p>
          </Card>
        </div>

        {/* Quick Stats */}
        {state.pages.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-6">Your Progress</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <Card className="p-4 text-center bg-white/80 backdrop-blur-sm">
                <div className="text-2xl font-bold text-blue-600">{state.pages.length}</div>
                <div className="text-sm text-gray-600">Websites</div>
              </Card>
              <Card className="p-4 text-center bg-white/80 backdrop-blur-sm">
                <div className="text-2xl font-bold text-purple-600">{totalTasks}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </Card>
              <Card className="p-4 text-center bg-white/80 backdrop-blur-sm">
                <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </Card>
              <Card className="p-4 text-center bg-white/80 backdrop-blur-sm">
                <div className="text-2xl font-bold text-orange-600">
                  {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Progress</div>
              </Card>
            </div>
          </div>
        )}

        {/* Getting Started Steps */}
        {state.pages.length === 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Get Started in 3 Easy Steps</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 text-center bg-white/80 backdrop-blur-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold mb-2">Add Your Website</h3>
                <p className="text-gray-600 text-sm">Create your first project or website to get started with task management.</p>
              </Card>
              
              <Card className="p-6 text-center bg-white/80 backdrop-blur-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold mb-2">Create Tasks</h3>
                <p className="text-gray-600 text-sm">Add tasks with descriptions, priorities, due dates, and attachments.</p>
              </Card>
              
              <Card className="p-6 text-center bg-white/80 backdrop-blur-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold mb-2">Track Progress</h3>
                <p className="text-gray-600 text-sm">Monitor your progress and manage tasks with our intuitive dashboard.</p>
              </Card>
            </div>
          </div>
        )}

        {/* Recent Websites */}
        {state.pages.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your Websites</h2>
              <Link to="/websites">
                <Button variant="outline">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.pages.slice(0, 6).map((page) => (
                <Card key={page.id} className="p-4 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold truncate flex-1">{page.title}</h3>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {page.tasks.length} tasks
                    </Badge>
                  </div>
                  {page.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{page.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      {page.category}
                    </Badge>
                    <Link to={`/tasker?page=${page.id}`}>
                      <Button size="sm" variant="ghost" className="text-xs">
                        View Tasks <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Workspace Information */}
        {userWorkspaces.length > 0 && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your Workspaces</h2>
              <Dialog open={showCreateWorkspaceModal} onOpenChange={setShowCreateWorkspaceModal}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    New Workspace
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userWorkspaces.map((workspace) => (
                <Card 
                  key={workspace.id} 
                  className={`p-4 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow cursor-pointer ${
                    currentWorkspace?.id === workspace.id ? 'ring-2 ring-coral-orange' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg truncate flex-1">{workspace.name}</h3>
                    {workspace.ownerId === currentWorkspace?.members.find(m => m.userId === workspace.ownerId)?.userId && (
                      <Crown className="w-4 h-4 text-yellow-500 ml-2" />
                    )}
                  </div>
                  
                  {workspace.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{workspace.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {workspace.members.length} members
                    </Badge>
                    {currentWorkspace?.id === workspace.id && (
                      <Badge className="text-xs bg-coral-orange">Current</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <Dialog open={showCreateWorkspaceModal} onOpenChange={setShowCreateWorkspaceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your projects and collaborate with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={newWorkspace.name}
                onChange={(e) => setNewWorkspace(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Team Workspace"
              />
            </div>
            <div>
              <Label htmlFor="workspace-description">Description (Optional)</Label>
              <Textarea
                id="workspace-description"
                value={newWorkspace.description}
                onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What is this workspace for?"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateWorkspaceModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkspace}>
                Create Workspace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
