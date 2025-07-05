import React, { useState } from 'react';
import { useWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Settings, 
  Crown, 
  Shield, 
  User, 
  Eye,
  Copy,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { Workspace, UserRole } from '../types/workspace';
import { toast } from 'sonner';

const WorkspaceSelector: React.FC = () => {
  const { 
    currentWorkspace, 
    userWorkspaces, 
    workspaceMembers,
    createWorkspace, 
    switchWorkspace,
    deleteWorkspace,
    inviteMember,
    removeMember,
    updateMemberRole,
    leaveWorkspace
  } = useWorkspace();
  const { user } = useAuth();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    settings: {
      isPublic: false,
      allowGuestAccess: false,
      requireApprovalForJoining: false,
      defaultMemberRole: 'member' as UserRole,
      notificationSettings: {
        emailNotifications: true,
        taskAssignments: true,
        taskComments: true,
        taskStatusChanges: true,
        workspaceUpdates: true
      }
    }
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    await createWorkspace(newWorkspace);
    setNewWorkspace({
      name: '',
      description: '',
      settings: {
        isPublic: false,
        allowGuestAccess: false,
        requireApprovalForJoining: false,
        defaultMemberRole: 'member',
        notificationSettings: {
          emailNotifications: true,
          taskAssignments: true,
          taskComments: true,
          taskStatusChanges: true,
          workspaceUpdates: true
        }
      }
    });
    setShowCreateModal(false);
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !currentWorkspace) {
      toast.error('Email is required');
      return;
    }

    await inviteMember(currentWorkspace.id, inviteEmail, inviteRole);
    setInviteEmail('');
    setInviteRole('member');
    setShowInviteModal(false);
  };

  const copyInviteLink = () => {
    if (!currentWorkspace) return;
    
    const inviteUrl = `${window.location.origin}/join/${currentWorkspace.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Invite link copied to clipboard!');
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'member': return <User className="w-4 h-4 text-green-500" />;
      case 'guest': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const canManageMembers = currentWorkspace && user &&
    (currentWorkspace.ownerId === user.id ||
     currentWorkspace.members.find(m => m.userId === user.id)?.role === 'admin');

  return (
    <div className="space-y-4">        {userWorkspaces.length === 0 ? (
          // No workspaces - show create workspace option
          <div className="p-4 text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">No Workspaces Yet</h3>
              <p className="text-sm text-gray-600 mb-4">
                Create your first workspace to start collaborating with your team.
              </p>
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-coral-orange to-cornflower-blue">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workspace
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>
        ) : (
          // Has workspaces - show full workspace management
          <>
            {currentWorkspace && (
              <Card className="bg-gradient-to-r from-coral-orange/10 to-cornflower-blue/10 border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">{currentWorkspace.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{currentWorkspace.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {currentWorkspace.members.length} members
                      </Badge>
                      {canManageMembers && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowMembersModal(true)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Workspace List */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Your Workspaces</h3>
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-to-r from-coral-orange to-cornflower-blue">
                      <Plus className="w-4 h-4 mr-1" />
                      New Workspace
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>

              {userWorkspaces.map((workspace) => (
                <Card 
                  key={workspace.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    currentWorkspace?.id === workspace.id 
                      ? 'ring-2 ring-coral-orange bg-coral-orange/5' 
                      : ''
                  }`}
                  onClick={() => switchWorkspace(workspace.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{workspace.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {workspace.members.length} members
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {workspace.ownerId === user?.id && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {workspace.members.find(m => m.userId === user?.id)?.role}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )        )}
      </div>

      {/* Create Workspace Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
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
                placeholder="My Awesome Project"
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
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkspace}>
                Create Workspace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
          </>
        )}

      {/* Members Management Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Members - {currentWorkspace?.name}</DialogTitle>
            <DialogDescription>
              Invite new members to your workspace and manage existing member permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Invite Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Invite Members</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyInviteLink}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Invite Link
                </Button>
                <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Invite by Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Invite Member by Email</DialogTitle>
                      <DialogDescription>
                        Send an email invitation to add a new member to your workspace.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="invite-email">Email Address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@company.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite-role">Role</Label>
                        <Select value={inviteRole} onValueChange={(value: UserRole) => setInviteRole(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleInviteMember}>
                          Send Invite
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <h4 className="font-medium">Current Members</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentWorkspace?.members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.displayName} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center text-white text-sm">
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{member.displayName}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(member.role)}
                      <Badge variant="outline" className="text-xs">
                        {member.role}
                      </Badge>
                      {canManageMembers && member.userId !== user?.id && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(currentWorkspace!.id, member.userId)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspaceSelector;
