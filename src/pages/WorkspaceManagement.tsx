import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { notificationService } from '../services/notificationService';
import ModernLayout from '../components/ModernLayout';

import {
  Building2,
  Plus,
  Settings,
  Users,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  Shield,
  Eye,
  UserPlus,
  Copy,
  ExternalLink,
  Calendar,
  Activity,
  Globe,
  Lock,
  Unlock,
  UserMinus,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const WorkspaceManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    userWorkspaces,
    currentWorkspace,
    workspaceMembers,
    loading,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    removeMember,
    updateMemberRole
  } = useSupabaseWorkspace();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: ''
  });

  const [editWorkspace, setEditWorkspace] = useState({
    name: '',
    description: ''
  });

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    try {
      await createWorkspace(newWorkspace.name, newWorkspace.description);
      setNewWorkspace({ name: '', description: '' });
      setShowCreateDialog(false);
      toast.success('Workspace created successfully!');
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error('Failed to create workspace');
    }
  };

  const handleEditWorkspace = async () => {
    if (!selectedWorkspace || !editWorkspace.name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }

    try {
      await updateWorkspace(selectedWorkspace.id, {
        name: editWorkspace.name,
        description: editWorkspace.description
      });
      setShowEditDialog(false);
      setSelectedWorkspace(null);
      toast.success('Workspace updated successfully!');
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast.error('Failed to update workspace');
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteWorkspace(workspaceId);
      toast.success('Workspace deleted successfully!');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error('Failed to delete workspace');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedWorkspace) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      await inviteMember(selectedWorkspace.id, inviteEmail, inviteRole);
      
      // Send email notification
      if (user) {
        await notificationService.sendWorkspaceInvitation({
          invitedEmail: inviteEmail,
          inviterUserId: user.id,
          workspaceId: selectedWorkspace.id,
          workspaceName: selectedWorkspace.name,
          inviterName: user.user_metadata?.full_name || user.email || 'Unknown User',
          inviterEmail: user.email,
          role: inviteRole,
          inviteCode: selectedWorkspace.invite_code || `invite-${Date.now()}`
        });
      }

      setInviteEmail('');
      setShowInviteDialog(false);
      toast.success(`Invitation sent to ${inviteEmail}!`);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    }
  };

  const handleRemoveMember = async (workspaceId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) {
      return;
    }

    try {
      await removeMember(workspaceId, userId);
      toast.success('Member removed successfully!');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleRoleChange = async (workspaceId: string, userId: string, newRole: string) => {
    try {
      await updateMemberRole(workspaceId, userId, newRole);
      toast.success('Member role updated successfully!');
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    }
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteLink = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard!');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member': return <Users className="h-4 w-4 text-green-500" />;
      case 'viewer': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workspace management...</p>
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-6">


        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workspace Management</h1>
            <p className="text-muted-foreground">
              Manage your workspaces, members, and permissions
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                    placeholder="Enter workspace name"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="workspace-description">Description (Optional)</Label>
                  <Textarea
                    id="workspace-description"
                    placeholder="Enter workspace description"
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
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

        {/* Main Content with Tabs */}
        {currentWorkspace ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {currentWorkspace.name}
                  </CardTitle>
                  <CardDescription>
                    {currentWorkspace.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                      <Users className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{workspaceMembers.length}</p>
                        <p className="text-sm text-muted-foreground">Total Members</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                      <Calendar className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">
                          {new Date(currentWorkspace.createdAt || currentWorkspace.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Created</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                      <Activity className="h-8 w-8 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold">Active</p>
                        <p className="text-sm text-muted-foreground">Status</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setSelectedWorkspace(currentWorkspace);
                        setShowInviteDialog(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite Members
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedWorkspace(currentWorkspace);
                        setEditWorkspace({
                          name: currentWorkspace.name,
                          description: currentWorkspace.description || ''
                        });
                        setShowEditDialog(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Workspace
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => copyInviteLink(currentWorkspace.invite_code || `invite-${currentWorkspace.id}`)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Invite Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Workspace Members ({workspaceMembers.length})
                      </CardTitle>
                      <CardDescription>
                        Manage members and their roles in {currentWorkspace.name}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedWorkspace(currentWorkspace);
                        setShowInviteDialog(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter */}
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Members List */}
                  <div className="space-y-4">
                    {workspaceMembers
                      .filter(member => {
                        const matchesSearch = member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            member.email.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
                        return matchesSearch && matchesRole;
                      })
                      .map((member) => (
                        <div key={member.userId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.photoURL} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                                {member.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.displayName}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                              <div className="text-xs text-muted-foreground">
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`flex items-center gap-1 ${getRoleBadgeColor(member.role)}`}>
                              {getRoleIcon(member.role)}
                              {member.role}
                            </Badge>
                            {member.role !== 'owner' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Manage Member</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(currentWorkspace.id, member.userId, 'admin')}
                                    disabled={member.role === 'admin'}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(currentWorkspace.id, member.userId, 'member')}
                                    disabled={member.role === 'member'}
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Make Member
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(currentWorkspace.id, member.userId, 'viewer')}
                                    disabled={member.role === 'viewer'}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Make Viewer
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Remove Member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Workspace Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your workspace preferences and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">General Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Public Workspace</p>
                            <p className="text-sm text-muted-foreground">Allow anyone to discover this workspace</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Private</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Invite Code</p>
                            <p className="text-sm text-muted-foreground">Share this code to invite members</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(currentWorkspace.invite_code || `invite-${currentWorkspace.id}`)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Danger Zone</h3>
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-red-800">Delete Workspace</p>
                            <p className="text-sm text-red-600">Permanently delete this workspace and all its data</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{currentWorkspace.name}"? This action cannot be undone and will permanently delete all workspace data, including tasks, pages, and member information.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteWorkspace(currentWorkspace.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Workspace
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Track workspace activity and member engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">Workspace created</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(currentWorkspace.createdAt || currentWorkspace.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {workspaceMembers.slice(1).map((member) => (
                      <div key={member.userId} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm">{member.displayName} joined the workspace</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(member.joinedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Workspace Selected</h3>
              <p className="text-muted-foreground text-center mb-4">
                Select a workspace from the list below or create a new one to get started.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        )}

        {/* All Workspaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userWorkspaces.map((workspace) => (
            <Card key={workspace.id} className={`relative ${
              currentWorkspace?.id === workspace.id ? 'ring-2 ring-primary' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => switchWorkspace(workspace.id)}
                        disabled={currentWorkspace?.id === workspace.id}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Switch to Workspace
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setEditWorkspace({
                            name: workspace.name,
                            description: workspace.description || ''
                          });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Workspace
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setShowInviteDialog(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Members
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => copyInviteLink(workspace.invite_code || `invite-${workspace.id}`)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Invite Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>
                  {workspace.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <Badge variant="secondary">
                      {workspace.member_count || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(workspace.created_at).toLocaleDateString()}</span>
                  </div>
                  {currentWorkspace?.id === workspace.id && (
                    <Badge className="w-full justify-center">
                      Current Workspace
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>



        {/* Edit Workspace Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Workspace</DialogTitle>
              <DialogDescription>
                Update your workspace information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-workspace-name">Workspace Name</Label>
                <Input
                  id="edit-workspace-name"
                  placeholder="Enter workspace name"
                  value={editWorkspace.name}
                  onChange={(e) => setEditWorkspace({ ...editWorkspace, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-workspace-description">Description (Optional)</Label>
                <Textarea
                  id="edit-workspace-description"
                  placeholder="Enter workspace description"
                  value={editWorkspace.description}
                  onChange={(e) => setEditWorkspace({ ...editWorkspace, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditWorkspace}>
                  Update Workspace
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite Member Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
              <DialogDescription>
                Invite a new member to {selectedWorkspace?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Viewer - Can view content only
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Member - Can create and edit content
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin - Can manage members and settings
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteMember}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Member Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {selectedMember?.displayName} from {currentWorkspace?.name}?
                They will lose access to all workspace content and will need to be re-invited to rejoin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedMember(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedMember && currentWorkspace) {
                    handleRemoveMember(currentWorkspace.id, selectedMember.userId);
                    setShowDeleteDialog(false);
                    setSelectedMember(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModernLayout>
  );
};

export default WorkspaceManagement;
