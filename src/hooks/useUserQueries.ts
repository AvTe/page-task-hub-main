import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS, CACHE_TIMES, GC_TIMES } from '../lib/queryClient';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { toast } from '../components/ui/sonner';

// Types
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  employee_id?: string;
  department?: string;
  job_title?: string;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
  time_format: '12' | '24';
  first_day_of_week: 'sunday' | 'monday';
  currency: string;
  email_notifications: boolean;
  push_notifications: boolean;
  task_reminders: boolean;
  project_updates: boolean;
  weekly_digest: boolean;
  marketing_emails: boolean;
  profile_visibility: 'public' | 'team' | 'private';
  activity_status: boolean;
  data_sharing: boolean;
  analytics_tracking: boolean;
  two_factor_auth: boolean;
  session_timeout: number;
  login_alerts: boolean;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalTimeTracked: number; // in minutes
  activeTimers: number;
  totalComments: number;
  totalSubtasks: number;
  completedSubtasks: number;
  workspacesCount: number;
  pagesCount: number;
}

interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: any;
  created_at: string;
}

// Fetch user profile
const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

// Fetch user settings
const fetchUserSettings = async (userId: string): Promise<UserSettings> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If no settings exist, return default settings
    if (error.code === 'PGRST116') {
      return {
        id: '',
        user_id: userId,
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        date_format: 'mm/dd/yyyy',
        time_format: '12',
        first_day_of_week: 'sunday',
        currency: 'usd',
        email_notifications: true,
        push_notifications: true,
        task_reminders: true,
        project_updates: true,
        weekly_digest: false,
        marketing_emails: false,
        profile_visibility: 'team',
        activity_status: true,
        data_sharing: false,
        analytics_tracking: true,
        two_factor_auth: false,
        session_timeout: 30,
        login_alerts: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    throw error;
  }
  return data;
};

// Fetch user statistics
const fetchUserStats = async (userId: string): Promise<UserStats> => {
  // Fetch all stats in parallel
  const [
    tasksResult,
    timeEntriesResult,
    commentsResult,
    subtasksResult,
    workspacesResult,
    pagesResult,
  ] = await Promise.all([
    supabase.from('tasks').select('status, due_date').eq('created_by', userId),
    supabase.from('task_time_entries').select('duration_minutes, end_time').eq('user_id', userId),
    supabase.from('task_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('subtasks').select('status').eq('created_by', userId),
    supabase.from('workspace_members').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('pages').select('*', { count: 'exact', head: true }).eq('created_by', userId),
  ]);

  const tasks = tasksResult.data || [];
  const timeEntries = timeEntriesResult.data || [];
  const subtasks = subtasksResult.data || [];

  const now = new Date();
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const overdueTasks = tasks.filter(task => 
    task.due_date && new Date(task.due_date) < now && task.status !== 'done'
  ).length;

  const totalTimeTracked = timeEntries
    .filter(entry => entry.end_time)
    .reduce((total, entry) => total + (entry.duration_minutes || 0), 0);

  const activeTimers = timeEntries.filter(entry => !entry.end_time).length;
  const completedSubtasks = subtasks.filter(subtask => subtask.status === 'done').length;

  return {
    totalTasks: tasks.length,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    totalTimeTracked,
    activeTimers,
    totalComments: commentsResult.count || 0,
    totalSubtasks: subtasks.length,
    completedSubtasks,
    workspacesCount: workspacesResult.count || 0,
    pagesCount: pagesResult.count || 0,
  };
};

// Fetch user activity
const fetchUserActivity = async (userId: string, limit = 20): Promise<UserActivity[]> => {
  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Hook to get user profile
export const useUserProfile = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE(targetUserId!),
    queryFn: () => fetchUserProfile(targetUserId!),
    enabled: !!targetUserId,
    staleTime: CACHE_TIMES.LONG, // Profile data doesn't change often
    gcTime: GC_TIMES.LONG,
  });
};

// Hook to get user settings
export const useUserSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.USER_SETTINGS(user!.id),
    queryFn: () => fetchUserSettings(user!.id),
    enabled: !!user,
    staleTime: CACHE_TIMES.LONG, // Settings don't change often
    gcTime: GC_TIMES.LONG,
  });
};

// Hook to get user statistics
export const useUserStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.USER_STATS(user!.id),
    queryFn: () => fetchUserStats(user!.id),
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // Stats change frequently
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to update user profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedProfile) => {
      // Update profile cache
      queryClient.setQueryData(QUERY_KEYS.USER_PROFILE(user!.id), updatedProfile);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    },
  });
};

// Hook to update user settings
export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      // First try to update existing settings
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (existingSettings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('user_settings')
          .update(settings)
          .eq('user_id', user!.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user!.id,
            ...settings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (updatedSettings) => {
      // Update settings cache
      queryClient.setQueryData(QUERY_KEYS.USER_SETTINGS(user!.id), updatedSettings);
      toast.success('Settings updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    },
  });
};

// Hook to upload avatar
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user profile with new avatar URL
      const { data, error } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedProfile) => {
      // Update profile cache
      queryClient.setQueryData(QUERY_KEYS.USER_PROFILE(user!.id), updatedProfile);
      toast.success('Avatar updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload avatar');
    },
  });
};

// Hook to delete account
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // This would typically be handled by a backend function
      // For now, we'll just mark the user as deleted
      const { error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', user!.id);

      if (error) throw error;
      
      // Sign out the user
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      toast.success('Account deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    },
  });
};
