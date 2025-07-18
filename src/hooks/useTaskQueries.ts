import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS, CACHE_TIMES, GC_TIMES, invalidateQueries } from '../lib/queryClient';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { toast } from '../components/ui/sonner';
import { Task } from '../types';

// Extended task type with relations
interface TaskWithRelations extends Task {
  comments?: TaskComment[];
  subtasks?: Subtask[];
  dependencies?: TaskDependency[];
  timeEntries?: TaskTimeEntry[];
  assignee?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
  created_by: string;
  dependsOnTask?: Task;
}

interface TaskTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  created_at: string;
}

// Fetch workspace tasks
const fetchWorkspaceTasks = async (workspaceId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Fetch specific task with all relations
const fetchTask = async (taskId: string): Promise<TaskWithRelations> => {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('id', taskId)
    .single();

  if (taskError) throw taskError;

  // Fetch related data in parallel
  const [comments, subtasks, dependencies, timeEntries] = await Promise.all([
    fetchTaskComments(taskId),
    fetchTaskSubtasks(taskId),
    fetchTaskDependencies(taskId),
    fetchTaskTimeEntries(taskId),
  ]);

  return {
    ...task,
    comments,
    subtasks,
    dependencies,
    timeEntries,
  };
};

// Fetch task comments
const fetchTaskComments = async (taskId: string): Promise<TaskComment[]> => {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      user:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Fetch task subtasks
const fetchTaskSubtasks = async (taskId: string): Promise<Subtask[]> => {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Fetch task dependencies
const fetchTaskDependencies = async (taskId: string): Promise<TaskDependency[]> => {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      dependsOnTask:tasks!depends_on_task_id (
        id,
        title,
        status,
        priority
      )
    `)
    .eq('task_id', taskId);

  if (error) throw error;
  return data || [];
};

// Fetch task time entries
const fetchTaskTimeEntries = async (taskId: string): Promise<TaskTimeEntry[]> => {
  const { data, error } = await supabase
    .from('task_time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('start_time', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Hook to get workspace tasks
export const useWorkspaceTasks = (workspaceId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.WORKSPACE_TASKS(workspaceId),
    queryFn: () => fetchWorkspaceTasks(workspaceId),
    enabled: !!workspaceId,
    staleTime: CACHE_TIMES.SHORT, // Tasks change frequently
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get specific task
export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.TASK(taskId),
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get task comments
export const useTaskComments = (taskId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.TASK_COMMENTS(taskId),
    queryFn: () => fetchTaskComments(taskId),
    enabled: !!taskId,
    staleTime: CACHE_TIMES.REALTIME, // Comments are real-time
    gcTime: GC_TIMES.SHORT,
  });
};

// Hook to get task subtasks
export const useTaskSubtasks = (taskId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.TASK_SUBTASKS(taskId),
    queryFn: () => fetchTaskSubtasks(taskId),
    enabled: !!taskId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get task dependencies
export const useTaskDependencies = (taskId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.TASK_DEPENDENCIES(taskId),
    queryFn: () => fetchTaskDependencies(taskId),
    enabled: !!taskId,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get task time entries
export const useTaskTimeEntries = (taskId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.TASK_TIME_ENTRIES(taskId),
    queryFn: () => fetchTaskTimeEntries(taskId),
    enabled: !!taskId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to create task
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (task) => {
      // Invalidate workspace tasks
      if (task.workspace_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_TASKS(task.workspace_id) });
      }
      // Invalidate page tasks if task belongs to a page
      if (task.page_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGE_TASKS(task.page_id) });
      }
      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    },
  });
};

// Hook to update task
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (task) => {
      // Update specific task cache
      queryClient.setQueryData(QUERY_KEYS.TASK(task.id), task);
      // Invalidate related queries
      invalidateQueries.task(queryClient, task.id);
      if (task.workspace_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_TASKS(task.workspace_id) });
      }
      toast.success('Task updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    },
  });
};

// Hook to delete task
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.TASK(taskId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.TASK_COMMENTS(taskId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.TASK_SUBTASKS(taskId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.TASK_DEPENDENCIES(taskId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.TASK_TIME_ENTRIES(taskId) });
      // Invalidate tasks lists
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
      toast.success('Task deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    },
  });
};

// Hook to add task comment
export const useAddTaskComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user!.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { taskId }) => {
      // Invalidate task comments
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK_COMMENTS(taskId) });
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    },
  });
};
