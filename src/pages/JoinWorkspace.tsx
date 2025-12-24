import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Workspace } from '../types/workspace';

const JoinWorkspace: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { joinWorkspaceByCode, userWorkspaces } = useWorkspace();
  const { user, loading: authLoading } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!inviteCode) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    // Fetch workspace details by invite code from Supabase
    const fetchWorkspaceByCode = async () => {
      try {
        setLoading(true);

        // Check if user is already a member
        const alreadyMember = userWorkspaces.some(w => w.inviteCode === inviteCode);
        if (alreadyMember) {
          setError('You are already a member of this workspace');
          setLoading(false);
          return;
        }

        // Try using the SECURITY DEFINER function first (bypasses RLS)
        let workspaceData = null;

        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_workspace_by_invite_code', { p_invite_code: inviteCode });

        if (!rpcError && rpcData && rpcData.length > 0) {
          // Use RPC function result
          const wsData = rpcData[0];
          workspaceData = {
            id: wsData.workspace_id,
            name: wsData.workspace_name,
            description: wsData.workspace_description || '',
            memberCount: wsData.member_count,
            inviterName: wsData.inviter_name,
            role: wsData.role
          };
        } else {
          // Fallback to direct query (for workspaces using invite_code on workspaces table)
          const { data: wsData, error: workspaceError } = await supabase
            .from('workspaces')
            .select(`
              *,
              workspace_members (
                user_id,
                role,
                joined_at
              )
            `)
            .eq('invite_code', inviteCode)
            .single();

          if (workspaceError || !wsData) {
            setError('Invalid invite link or workspace not found');
            setLoading(false);
            return;
          }

          workspaceData = {
            id: wsData.id,
            name: wsData.name,
            description: wsData.description || '',
            owner_id: wsData.owner_id,
            workspace_members: wsData.workspace_members,
            invite_code: wsData.invite_code,
            settings: wsData.settings,
            created_at: wsData.created_at,
            updated_at: wsData.updated_at
          };
        }

        if (!workspaceData) {
          setError('Invalid invite link or workspace not found');
          setLoading(false);
          return;
        }

        // Transform to frontend format
        const transformedWorkspace: Workspace = {
          id: workspaceData.id,
          name: workspaceData.name,
          description: workspaceData.description || '',
          ownerId: workspaceData.owner_id || '',
          members: (workspaceData.workspace_members || []).map((member: any) => ({
            userId: member.user_id,
            email: 'member@example.com',
            displayName: 'Team Member',
            role: member.role,
            joinedAt: member.joined_at,
            lastActive: new Date().toISOString(),
            permissions: [],
            isOnline: false
          })),
          inviteCode: workspaceData.invite_code || inviteCode,
          settings: workspaceData.settings || {
            isPublic: false,
            allowGuestAccess: true,
            requireApprovalForJoining: false,
            defaultMemberRole: 'member',
            notificationSettings: {
              emailNotifications: true,
              taskAssignments: true,
              taskComments: true,
              taskStatusChanges: true,
              workspaceUpdates: true
            }
          },
          createdAt: workspaceData.created_at || new Date().toISOString(),
          updatedAt: workspaceData.updated_at || new Date().toISOString(),
          memberCount: workspaceData.memberCount
        };

        setWorkspace(transformedWorkspace);
      } catch (err) {
        console.error('Error fetching workspace:', err);
        setError('Failed to load workspace information');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceByCode();
  }, [inviteCode, userWorkspaces]);

  const handleJoinWorkspace = async () => {
    if (!workspace || !inviteCode) return;

    try {
      setJoining(true);
      await joinWorkspaceByCode(inviteCode);
      setJoined(true);

      // Redirect to workspace after a brief success message
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError('Failed to join workspace');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-coral-orange" />
            <p className="text-gray-600">Loading workspace information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              You need to sign in to join a workspace.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-coral-orange to-cornflower-blue"
            >
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">Unable to Join</h2>
            <p className="text-gray-600">{error}</p>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">Welcome to the Team!</h2>
            <p className="text-gray-600">
              You have successfully joined <strong>{workspace?.name}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to your workspace...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Join Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {workspace && (
            <>
              {/* Workspace Info */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{workspace.name}</h3>
                {workspace.description && (
                  <p className="text-gray-600">{workspace.description}</p>
                )}
                <div className="flex justify-center gap-2">
                  <Badge variant="outline">
                    <Users className="w-3 h-3 mr-1" />
                    {workspace.members.length} members
                  </Badge>
                  <Badge variant="outline">
                    {workspace.settings.isPublic ? 'Public' : 'Private'}
                  </Badge>
                </div>
              </div>

              {/* Current Members Preview */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-900">Current Members</h4>
                <div className="space-y-2">
                  {workspace.members.slice(0, 3).map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.displayName} className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center text-white text-xs">
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.displayName}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                  {workspace.members.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{workspace.members.length - 3} more members
                    </p>
                  )}
                </div>
              </div>

              {/* Join Button */}
              <div className="space-y-3">
                <Button
                  onClick={handleJoinWorkspace}
                  disabled={joining}
                  className="w-full bg-gradient-to-r from-coral-orange to-cornflower-blue"
                  size="lg"
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Join Workspace
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center">
                By joining this workspace, you agree to collaborate respectfully and follow the team's guidelines.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinWorkspace;
