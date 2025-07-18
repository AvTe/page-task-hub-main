import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  Globe,
  CheckSquare,
  Settings,
  UserPlus,
  Crown,
  Shield,
  User,
  Mail,
  Calendar,
  MoreVertical,
  Trash2,
  Plus,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useTask } from '../contexts/TaskContext';
import { notificationService } from '../services/notificationService';

const WorkspaceManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentWorkspace,
    workspaceMembers,
    inviteMember,
    removeMember,
    loading
  } = useSupabaseWorkspace();
  const { state } = useTask();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  if (!currentWorkspace) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select or create a workspace to manage it.</p>
        </CardContent>
      </Card>
    );
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!user || !currentWorkspace) {
      toast.error('Missing user or workspace information');
      return;
    }

    try {
      // First create the invitation in the database
      await inviteMember(currentWorkspace.id, inviteEmail, inviteRole);

      // Then send the email notification
      const emailSent = await notificationService.sendWorkspaceInvitation({
        invitedEmail: inviteEmail,
        inviterUserId: user.id,
        workspaceId: currentWorkspace.id,
        workspaceName: currentWorkspace.name,
        inviterName: user.user_metadata?.full_name || user.email || 'Unknown User',
        inviterEmail: user.email,
        role: inviteRole,
        inviteCode: currentWorkspace.invite_code || ''
      });

      if (emailSent) {
        toast.success(`Invitation sent to ${inviteEmail}!`);
      } else {
        toast.warning(`Invitation created but email failed to send to ${inviteEmail}`);
      }

      setInviteEmail('');
      setShowInviteDialog(false);
    } catch (error) {
      console.error('Failed to invite member:', error);
      toast.error('Failed to send invitation');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === currentWorkspace.ownerId) {
      toast.error('Cannot remove workspace owner');
      return;
    }

    if (confirm('Are you sure you want to remove this member?')) {
      try {
        await removeMember(currentWorkspace.id, userId);
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  const totalTasks = state.pages.reduce((total, page) => total + page.tasks.length, 0) + state.unassignedTasks.length;
  const completedTasks = state.pages.reduce((total, page) => 
    total + page.tasks.filter(task => task.status === 'done').length, 0
  ) + state.unassignedTasks.filter(task => task.status === 'done').length;

  const currentUserRole = workspaceMembers.find(m => m.userId === user?.id)?.role || 'member';
  const canInviteMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canRemoveMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Workspace Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentWorkspace.name}
                <Badge variant="outline">{currentUserRole}</Badge>
              </CardTitle>
              <CardDescription>
                {currentWorkspace.description || 'No description provided'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {workspaceMembers.length} member{workspaceMembers.length !== 1 ? 's' : ''}
              </Badge>
              {canInviteMembers && (
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite New Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="user@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={inviteRole} onValueChange={(value: 'member' | 'admin') => setInviteRole(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInviteMember}>
                          Send Invitation
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Workspace Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workspaceMembers.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Websites</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{state.pages.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
                <p className="text-xs text-muted-foreground">completed</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="grid gap-4">
            {workspaceMembers.map((member) => (
              <Card key={member.userId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.displayName}</span>
                          {getRoleIcon(member.role)}
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canRemoveMembers && member.role !== 'owner' && member.userId !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="websites" className="space-y-4">
          <div className="grid gap-4">
            {state.pages.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Websites Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding your first website to track tasks and manage your projects.
                  </p>
                  <Button onClick={() => navigate('/add-page')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Website
                  </Button>
                </CardContent>
              </Card>
            ) : (
              state.pages.map((page) => (
                <Card key={page.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{page.title}</h3>
                        <p className="text-sm text-muted-foreground">{page.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {page.tasks.length} task{page.tasks.length !== 1 ? 's' : ''}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(page.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/tasker')}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {state.pages.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/add-page')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Website
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4">
            {totalTasks === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Tasks Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first task to start organizing your work.
                  </p>
                  <Button onClick={() => navigate('/tasker')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {state.pages.map((page) => 
                  page.tasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {page.title} • {task.status}
                            </p>
                          </div>
                          <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkspaceManagement;
