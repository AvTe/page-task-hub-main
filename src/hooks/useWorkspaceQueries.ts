import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS, CACHE_TIMES, GC_TIMES, invalidateQueries } from '../lib/queryClient';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { toast } from '../components/ui/sonner';

// Types
interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  settings?: any;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// Fetch user's workspaces
const fetchUserWorkspaces = async (userId: string): Promise<Workspace[]> => {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      workspace:workspaces (
        id,
        name,
        description,
        created_at,
        updated_at,
        owner_id,
        settings
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data?.map(item => item.workspace).filter(Boolean) || [];
};

// Fetch specific workspace
const fetchWorkspace = async (workspaceId: string): Promise<Workspace> => {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  if (error) throw error;
  return data;
};

// Fetch workspace members
const fetchWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  try {
    // Try to fetch with user details from public.users table
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        *,
        user:users (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('workspace_id', workspaceId);

    if (error) {
      // If users table doesn't exist or permission denied, fetch without user details
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.warn('Users table not accessible, fetching members without user details');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', workspaceId);

        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching workspace members:', err);
    // Final fallback: just fetch members without join
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (fallbackError) throw fallbackError;
    return fallbackData || [];
  }
};

// Hook to get user's workspaces
export const useUserWorkspaces = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.WORKSPACES,
    queryFn: () => fetchUserWorkspaces(user!.id),
    enabled: !!user,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get specific workspace
export const useWorkspace = (workspaceId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.WORKSPACE(workspaceId),
    queryFn: () => fetchWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.LONG,
  });
};

// Hook to get workspace members
export const useWorkspaceMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId),
    queryFn: () => fetchWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to create workspace
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (workspaceData: Omit<Workspace, 'id' | 'created_at' | 'updated_at' | 'owner_id'>) => {
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          ...workspaceData,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user!.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      return workspace;
    },
    onSuccess: (workspace) => {
      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACES });
      toast.success('Workspace created successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create workspace:', error);
      toast.error('Failed to create workspace');
    },
  });
};

// Hook to update workspace
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, updates }: { workspaceId: string; updates: Partial<Workspace> }) => {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (workspace) => {
      // Update specific workspace cache
      queryClient.setQueryData(QUERY_KEYS.WORKSPACE(workspace.id), workspace);
      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACES });
      toast.success('Workspace updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update workspace:', error);
      toast.error('Failed to update workspace');
    },
  });
};

// Hook to delete workspace
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;
      return workspaceId;
    },
    onSuccess: (workspaceId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.WORKSPACE(workspaceId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId) });
      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACES });
      toast.success('Workspace deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete workspace:', error);
      toast.error('Failed to delete workspace');
    },
  });
};

// Hook to invite user to workspace
export const useInviteToWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, email, role = 'member' }: {
      workspaceId: string;
      email: string;
      role?: 'admin' | 'member'
    }) => {
      // First, find user by email in public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        // Check if it's a permission error or user not found
        if (userError.code === '42501' || userError.message?.includes('permission denied')) {
          throw new Error('Database not configured. Please run FINAL_FIX.sql in Supabase SQL Editor.');
        }
        throw new Error('User not found. The user must have an account first.');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userData.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this workspace');
      }

      // Add user to workspace
      const { data, error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userData.id,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { workspaceId }) => {
      // Invalidate workspace members
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId) });
      toast.success('User invited successfully');
    },
    onError: (error: any) => {
      console.error('Failed to invite user:', error);
      toast.error(error.message || 'Failed to invite user');
    },
  });
};

// Hook to remove user from workspace
export const useRemoveFromWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
      return { workspaceId, userId };
    },
    onSuccess: ({ workspaceId }) => {
      // Invalidate workspace members
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId) });
      toast.success('User removed successfully');
    },
    onError: (error: any) => {
      console.error('Failed to remove user:', error);
      toast.error('Failed to remove user');
    },
  });
};

// Hook to update member role
export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      role
    }: {
      workspaceId: string;
      userId: string;
      role: 'admin' | 'member'
    }) => {
      const { data, error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { workspaceId }) => {
      // Invalidate workspace members
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId) });
      toast.success('Member role updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update member role:', error);
      toast.error('Failed to update member role');
    },
  });
};
