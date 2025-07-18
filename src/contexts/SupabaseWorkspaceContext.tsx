import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  Workspace, 
  WorkspaceMember, 
  WorkspaceInvitation, 
  UserRole,
  UserActivity,
  UserPresence 
} from '../types/workspace';
import { useAuth } from './SupabaseAuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { emailService } from '../services/emailService';
import { useNotifications } from './NotificationContext';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  userWorkspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  pendingInvitations: WorkspaceInvitation[];
  userActivities: UserActivity[];
  onlineUsers: UserPresence[];
  loading: boolean;
  
  // Workspace management
  createWorkspace: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'members' | 'inviteCode'>) => Promise<void>;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  
  // Member management
  inviteMember: (workspaceId: string, email: string, role: UserRole) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  updateMemberRole: (workspaceId: string, userId: string, role: UserRole) => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  joinWorkspaceByCode: (inviteCode: string) => Promise<void>;
  
  // Real-time features
  updateUserPresence: (presence: Partial<UserPresence>) => void;
  trackActivity: (activity: Omit<UserActivity, 'userId' | 'timestamp'>) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

type WorkspaceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_WORKSPACE'; payload: Workspace | null }
  | { type: 'SET_USER_WORKSPACES'; payload: Workspace[] }
  | { type: 'SET_WORKSPACE_MEMBERS'; payload: WorkspaceMember[] }
  | { type: 'SET_PENDING_INVITATIONS'; payload: WorkspaceInvitation[] }
  | { type: 'SET_USER_ACTIVITIES'; payload: UserActivity[] }
  | { type: 'SET_ONLINE_USERS'; payload: UserPresence[] }
  | { type: 'ADD_WORKSPACE'; payload: Workspace }
  | { type: 'UPDATE_WORKSPACE'; payload: { id: string; updates: Partial<Workspace> } }
  | { type: 'REMOVE_WORKSPACE'; payload: string };

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  userWorkspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  pendingInvitations: WorkspaceInvitation[];
  userActivities: UserActivity[];
  onlineUsers: UserPresence[];
  loading: boolean;
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  userWorkspaces: [],
  workspaceMembers: [],
  pendingInvitations: [],
  userActivities: [],
  onlineUsers: [],
  loading: false,
};

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CURRENT_WORKSPACE':
      return { ...state, currentWorkspace: action.payload };
    case 'SET_USER_WORKSPACES':
      return { ...state, userWorkspaces: action.payload };
    case 'SET_WORKSPACE_MEMBERS':
      return { ...state, workspaceMembers: action.payload };
    case 'SET_PENDING_INVITATIONS':
      return { ...state, pendingInvitations: action.payload };
    case 'SET_USER_ACTIVITIES':
      return { ...state, userActivities: action.payload };
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    case 'ADD_WORKSPACE':
      return { 
        ...state, 
        userWorkspaces: [...state.userWorkspaces, action.payload] 
      };
    case 'UPDATE_WORKSPACE':
      return {
        ...state,
        userWorkspaces: state.userWorkspaces.map(w => 
          w.id === action.payload.id ? { ...w, ...action.payload.updates } : w
        ),
        currentWorkspace: state.currentWorkspace?.id === action.payload.id 
          ? { ...state.currentWorkspace, ...action.payload.updates }
          : state.currentWorkspace
      };
    case 'REMOVE_WORKSPACE':
      return {
        ...state,
        userWorkspaces: state.userWorkspaces.filter(w => w.id !== action.payload),
        currentWorkspace: state.currentWorkspace?.id === action.payload ? null : state.currentWorkspace
      };
    default:
      return state;
  }
}

// Utility function to generate invite codes
const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const SupabaseWorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const { user } = useAuth();
  const { createNotification } = useNotifications();

  // Create workspace
  const createWorkspace = async (workspaceData: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt' | 'ownerId' | 'members' | 'inviteCode'>) => {
    if (!user) return;

    if (!workspaceData.name?.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const inviteCode = generateInviteCode();

      // Create workspace in Supabase
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceData.name,
          description: workspaceData.description,
          owner_id: user.id,
          settings: workspaceData.settings,
          invite_code: inviteCode
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Note: Owner is automatically added as member by database trigger

      // Convert to frontend format
      const newWorkspace: Workspace = {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description || '',
        ownerId: workspace.owner_id,
        members: [{
          userId: user.id,
          email: user.email || '',
          displayName: user.user_metadata?.full_name || user.email || 'Unknown User',
          photoURL: user.user_metadata?.avatar_url,
          role: 'owner',
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          permissions: [],
          isOnline: true
        }],
        inviteCode: workspace.invite_code,
        settings: workspace.settings,
        createdAt: workspace.created_at,
        updatedAt: workspace.updated_at,
      };

      dispatch({ type: 'ADD_WORKSPACE', payload: newWorkspace });
      dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: newWorkspace });
      
      // Track activity
      await trackActivity({
        action: 'created',
        resourceType: 'workspace',
        resourceId: workspace.id,
        details: { workspaceName: workspace.name }
      });
      
      toast.success(`Workspace "${newWorkspace.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating workspace:', error);
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to create workspace';
      toast.error(`Failed to create workspace: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update workspace
  const updateWorkspace = async (workspaceId: string, updates: Partial<Workspace>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: updates.name,
          description: updates.description,
          settings: updates.settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

      if (error) throw error;

      dispatch({ type: 'UPDATE_WORKSPACE', payload: { id: workspaceId, updates } });
      toast.success('Workspace updated successfully');
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast.error('Failed to update workspace');
    }
  };

  // Delete workspace
  const deleteWorkspace = async (workspaceId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)
        .eq('owner_id', user.id);

      if (error) throw error;

      dispatch({ type: 'REMOVE_WORKSPACE', payload: workspaceId });
      toast.success('Workspace deleted successfully');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error('Failed to delete workspace');
    }
  };

  // Switch workspace
  const switchWorkspace = (workspaceId: string) => {
    const workspace = state.userWorkspaces.find(w => w.id === workspaceId);
    if (workspace) {
      dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: workspace });
      localStorage.setItem('currentWorkspaceId', workspaceId);
    }
  };

  // Track activity
  const trackActivity = async (activity: Omit<UserActivity, 'userId' | 'timestamp'>) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          action: activity.action,
          resource_type: activity.resourceType,
          resource_id: activity.resourceId,
          details: activity.details,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  // Placeholder functions for features to be implemented
  const leaveWorkspace = async (workspaceId: string) => {
    toast.info('Leave workspace feature coming soon');
  };

  const inviteMember = async (workspaceId: string, email: string, role: UserRole) => {
    if (!user) {
      toast.error('You must be logged in to invite members');
      return;
    }

    try {
      // 1. Check if user has permission to invite
      const workspace = state.userWorkspaces.find(w => w.id === workspaceId);
      if (!workspace) {
        toast.error('Workspace not found');
        return;
      }

      // Check user's role in the workspace from database
      const { data: currentMember, error: memberError } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !currentMember) {
        toast.error('You are not a member of this workspace');
        return;
      }

      if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
        toast.error('You do not have permission to invite members');
        return;
      }

      // 2. Check if there's already a pending invitation for this email
      const { data: existingInvitation } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('invited_email', email)
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        toast.error('An invitation has already been sent to this email');
        return;
      }

      // 3. Check if user is already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .single();

      if (existingMember) {
        toast.error('This user is already a member of the workspace');
        return;
      }

      // 4. Generate invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // 5. Create invitation record
      const { error: inviteError } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          workspace_name: workspace.name,
          invited_by: user.id,
          invited_by_name: user.user_metadata?.full_name || user.email || 'Unknown',
          invited_email: email,
          role: role,
          invite_code: inviteCode,
          status: 'pending'
        });

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        toast.error(`Failed to send invitation: ${inviteError.message}`);
        return;
      }

      // 6. Send email notification
      try {
        const emailSent = await emailService.sendWorkspaceInvitation(email, {
          workspaceName: workspace.name,
          inviterName: user.user_metadata?.full_name || user.email || 'Someone',
          inviteCode: inviteCode,
          role: role,
          workspaceDescription: workspace.description
        });

        // 7. Log activity
        await supabase
          .from('user_activities')
          .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            activity_type: 'member_invited',
            activity_data: { invited_email: email, role: role, email_sent: emailSent }
          });

        if (emailSent) {
          toast.success(`Invitation sent to ${email}! They will receive an email with instructions.`);
        } else {
          toast.success(`Invitation created for ${email}! (Email sending is simulated in demo mode)`);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast.success(`Invitation created for ${email}! (Email could not be sent)`);
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to send invitation: ${errorMessage}`);
    }
  };

  const removeMember = async (workspaceId: string, userId: string) => {
    if (!user) {
      toast.error('You must be logged in to remove members');
      return;
    }

    try {
      // 1. Check permissions
      const workspace = state.userWorkspaces.find(w => w.id === workspaceId);
      if (!workspace) {
        toast.error('Workspace not found');
        return;
      }

      // Check current user's role
      const { data: currentMember, error: currentMemberError } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (currentMemberError || !currentMember) {
        toast.error('You are not a member of this workspace');
        return;
      }

      if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
        toast.error('You do not have permission to remove members');
        return;
      }

      // Check target member's role and get member info
      const { data: targetMember, error: targetMemberError } = await supabase
        .from('workspace_members')
        .select('role, display_name, email')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (targetMemberError || !targetMember) {
        toast.error('Member not found');
        return;
      }

      if (targetMember.role === 'owner') {
        toast.error('Cannot remove workspace owner');
        return;
      }

      // 2. Remove member
      const { error: removeError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (removeError) {
        console.error('Error removing member:', removeError);
        toast.error('Failed to remove member');
        return;
      }

      // 3. Log activity
      await supabase
        .from('user_activities')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          activity_type: 'member_removed',
          activity_data: {
            removed_member: targetMember.display_name || targetMember.email || 'Unknown User',
            removed_user_id: userId
          }
        });

      // 4. Refresh workspaces
      await loadUserWorkspaces();

      toast.success(`${targetMember.display_name || targetMember.email || 'Member'} has been removed from the workspace`);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const updateMemberRole = async (_workspaceId: string, _userId: string, _role: UserRole) => {
    toast.info('Update member role feature coming soon');
  };

  const acceptInvitation = async (_invitationId: string) => {
    toast.info('Accept invitation feature coming soon');
  };

  const declineInvitation = async (_invitationId: string) => {
    toast.info('Decline invitation feature coming soon');
  };

  const joinWorkspaceByCode = async (inviteCode: string) => {
    if (!user) {
      toast.error('You must be logged in to join a workspace');
      return;
    }

    try {
      // 1. Find workspace by invite code
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (workspaceError || !workspace) {
        toast.error('Invalid invite code or workspace not found');
        return;
      }

      // 2. Check if user is already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast.error('You are already a member of this workspace');
        return;
      }

      // 3. Add user as member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) {
        console.error('Error joining workspace:', memberError);
        toast.error('Failed to join workspace');
        return;
      }

      // 4. Log activity
      await supabase
        .from('user_activities')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          activity_type: 'member_joined',
          activity_data: { workspace_name: workspace.name }
        });

      // 5. Refresh workspaces
      await loadUserWorkspaces();

      toast.success(`Successfully joined ${workspace.name}!`);
    } catch (error) {
      console.error('Error joining workspace:', error);
      toast.error('Failed to join workspace');
    }
  };

  const updateUserPresence = async (presence: Partial<UserPresence>) => {
    if (!user || !state.currentWorkspace) return;

    try {
      const presenceData = {
        user_id: user.id,
        workspace_id: state.currentWorkspace.id,
        status: presence.isOnline ? 'online' : 'offline',
        last_seen: presence.lastSeen || new Date().toISOString(),
        current_page_id: null, // Will be enhanced later
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_presence')
        .upsert(presenceData, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating user presence:', error);
        return;
      }

      // Update local state
      const updatedPresence: UserPresence = {
        userId: user.id,
        workspaceId: state.currentWorkspace.id,
        isOnline: presence.isOnline ?? true,
        lastSeen: presence.lastSeen || new Date().toISOString(),
        currentPage: presence.currentPage || window.location.pathname,
        cursor: presence.cursor
      };

      // Update the online users list
      const updatedOnlineUsers = state.onlineUsers.filter(u => u.userId !== user.id);
      if (presence.isOnline !== false) {
        updatedOnlineUsers.push(updatedPresence);
      }

      dispatch({ type: 'SET_ONLINE_USERS', payload: updatedOnlineUsers });
    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  };

  // Load user workspaces
  const loadUserWorkspaces = async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Get workspaces where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          workspaces (
            id,
            name,
            description,
            owner_id,
            settings,
            invite_code,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Convert to frontend format and get member counts
      const workspaces: Workspace[] = [];

      for (const item of memberData.filter(item => item.workspaces)) {
        const ws = item.workspaces as any;

        // Get member count for this workspace
        const { count: memberCount } = await supabase
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', ws.id);

        workspaces.push({
          id: ws.id,
          name: ws.name,
          description: ws.description || '',
          ownerId: ws.owner_id,
          members: [], // Will be loaded separately when needed
          inviteCode: ws.invite_code,
          settings: ws.settings,
          createdAt: ws.created_at,
          updatedAt: ws.updated_at,
          memberCount: memberCount || 0 // Add member count
        });
      }

      dispatch({ type: 'SET_USER_WORKSPACES', payload: workspaces });

      // Set current workspace from localStorage or first workspace
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      const currentWorkspace = savedWorkspaceId
        ? workspaces.find(w => w.id === savedWorkspaceId) || workspaces[0]
        : workspaces[0];

      if (currentWorkspace) {
        dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: currentWorkspace });
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Load workspace members
  const loadWorkspaceMembers = async (workspaceId: string) => {
    try {
      // Use the safe view instead of complex joins
      const { data: memberData, error: memberError } = await supabase
        .from('safe_workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (memberError) {
        console.error('Error with safe view, trying basic query:', memberError);

        // Fallback to basic workspace_members query
        const { data: basicData, error: basicError } = await supabase
          .from('workspace_members')
          .select('user_id, role, joined_at, invited_by, display_name, email')
          .eq('workspace_id', workspaceId);

        if (basicError) throw basicError;

        // Transform basic data
        const members: WorkspaceMember[] = (basicData || []).map(member => ({
          userId: member.user_id,
          email: member.email || 'user@example.com',
          displayName: member.display_name || 'User',
          photoURL: undefined,
          role: member.role,
          joinedAt: member.joined_at || new Date().toISOString(),
          lastActive: new Date().toISOString(),
          permissions: [],
          isOnline: true,
          jobTitle: undefined,
          department: undefined
        }));

        dispatch({ type: 'SET_WORKSPACE_MEMBERS', payload: members });
        console.log(`Loaded ${members.length} workspace members (basic)`);
        return;
      }

      // Transform the data from safe view
      const members: WorkspaceMember[] = (memberData || []).map(member => ({
        userId: member.user_id,
        email: member.email || 'user@example.com',
        displayName: member.display_name || 'User',
        photoURL: member.avatar_url,
        role: member.role,
        joinedAt: member.joined_at || new Date().toISOString(),
        lastActive: member.last_seen || new Date().toISOString(),
        permissions: [],
        isOnline: member.is_active || true,
        jobTitle: member.job_title,
        department: member.department,
        fullName: member.full_name
      }));

      dispatch({ type: 'SET_WORKSPACE_MEMBERS', payload: members });
      console.log(`Loaded ${members.length} workspace members`);
    } catch (error) {
      console.error('Error loading workspace members:', error);
      // Set empty array on error to prevent infinite loading
      dispatch({ type: 'SET_WORKSPACE_MEMBERS', payload: [] });
    }
  };

  // Effect to load data when user changes
  useEffect(() => {
    if (user) {
      loadUserWorkspaces();
    } else {
      dispatch({ type: 'SET_USER_WORKSPACES', payload: [] });
      dispatch({ type: 'SET_CURRENT_WORKSPACE', payload: null });
    }
  }, [user]);

  // Effect to load members when current workspace changes
  useEffect(() => {
    if (state.currentWorkspace) {
      loadWorkspaceMembers(state.currentWorkspace.id);
    }
  }, [state.currentWorkspace]);

  return (
    <WorkspaceContext.Provider value={{
      ...state,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
      switchWorkspace,
      leaveWorkspace,
      inviteMember,
      removeMember,
      updateMemberRole,
      acceptInvitation,
      declineInvitation,
      joinWorkspaceByCode,
      updateUserPresence,
      trackActivity
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useSupabaseWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useSupabaseWorkspace must be used within a SupabaseWorkspaceProvider');
  }
  return context;
};

// Export as main workspace hook for backward compatibility
export const useWorkspace = useSupabaseWorkspace;

export default SupabaseWorkspaceProvider;
