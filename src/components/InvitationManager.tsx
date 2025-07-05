import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Mail, 
  Check, 
  X, 
  Clock, 
  Users, 
  Building2,
  Calendar,
  UserPlus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { supabase } from '../lib/supabase';

interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  workspace_name: string;
  invited_by: string;
  invited_email: string;
  role: 'member' | 'admin';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
  inviter_name?: string;
}

const InvitationManager: React.FC = () => {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { loadUserWorkspaces } = useSupabaseWorkspace();

  // Load pending invitations for current user
  const loadInvitations = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('workspace_invitations')
        .select(`
          *,
          profiles!workspace_invitations_invited_by_fkey(full_name)
        `)
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add inviter name to invitations
      const invitationsWithNames = data?.map(inv => ({
        ...inv,
        inviter_name: inv.profiles?.full_name || 'Unknown User'
      })) || [];

      setInvitations(invitationsWithNames);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  // Accept invitation
  const acceptInvitation = async (invitation: WorkspaceInvitation) => {
    if (!user) return;

    try {
      setProcessingInvitation(invitation.id);

      // Call the accept_workspace_invitation function
      const { error } = await supabase.rpc('accept_workspace_invitation', {
        invitation_id: invitation.id,
        user_id: user.id
      });

      if (error) throw error;

      toast.success(`Successfully joined ${invitation.workspace_name}!`);
      
      // Reload invitations and workspaces
      await loadInvitations();
      await loadUserWorkspaces();
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  // Decline invitation
  const declineInvitation = async (invitation: WorkspaceInvitation) => {
    try {
      setProcessingInvitation(invitation.id);

      const { error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);

      if (error) throw error;

      toast.success('Invitation declined');
      await loadInvitations();
      
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    } finally {
      setProcessingInvitation(null);
    }
  };

  // Check if invitation is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Load invitations when component mounts
  useEffect(() => {
    loadInvitations();
  }, [user]);

  if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Workspace Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Workspace Invitations
          {invitations.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {invitations.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Manage your pending workspace invitations
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No pending invitations</h3>
            <p className="text-muted-foreground">
              You don't have any pending workspace invitations at the moment.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {invitations.map((invitation, index) => {
                const expired = isExpired(invitation.expires_at);
                const isProcessing = processingInvitation === invitation.id;
                
                return (
                  <div key={invitation.id}>
                    <div className={`p-4 border rounded-lg ${expired ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium">{invitation.workspace_name}</h4>
                            <Badge variant={expired ? 'destructive' : 'default'} className="text-xs">
                              {invitation.role}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              <span>Invited by {invitation.inviter_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {expired && (
                              <div className="flex items-center gap-2 text-destructive">
                                <Clock className="h-3 w-3" />
                                <span>Expired</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {!expired && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => acceptInvitation(invitation)}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declineInvitation(invitation)}
                              disabled={isProcessing}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {index < invitations.length - 1 && <Separator className="my-4" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={loadInvitations}
            disabled={loading}
            className="w-full"
          >
            Refresh Invitations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvitationManager;
