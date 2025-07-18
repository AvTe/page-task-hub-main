import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';

// Cache configuration constants - optimized for EasTask usage patterns
export const CACHE_TIMES = {
  // Very short cache for real-time data (comments, notifications)
  REALTIME: 30 * 1000, // 30 seconds
  // Short cache for frequently changing data (tasks, task status)
  SHORT: 2 * 60 * 1000, // 2 minutes
  // Medium cache for moderately changing data (pages, workspace data)
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  // Long cache for rarely changing data (user profiles, settings)
  LONG: 15 * 60 * 1000, // 15 minutes
  // Very long cache for static data (workspace members, user info)
  STATIC: 60 * 60 * 1000, // 1 hour
} as const;

export const GC_TIMES = {
  // Garbage collection times (how long to keep unused data)
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 10 * 60 * 1000, // 10 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  STATIC: 60 * 60 * 1000, // 1 hour
} as const;

// Query keys for consistent caching
export const QUERY_KEYS = {
  // User-related queries
  USER: ['user'] as const,
  USER_PROFILE: (userId: string) => ['user', 'profile', userId] as const,
  USER_SETTINGS: (userId: string) => ['user', 'settings', userId] as const,
  
  // Workspace-related queries
  WORKSPACES: ['workspaces'] as const,
  WORKSPACE: (workspaceId: string) => ['workspace', workspaceId] as const,
  WORKSPACE_MEMBERS: (workspaceId: string) => ['workspace', workspaceId, 'members'] as const,
  
  // Task-related queries
  TASKS: ['tasks'] as const,
  WORKSPACE_TASKS: (workspaceId: string) => ['tasks', 'workspace', workspaceId] as const,
  TASK: (taskId: string) => ['task', taskId] as const,
  TASK_COMMENTS: (taskId: string) => ['task', taskId, 'comments'] as const,
  TASK_SUBTASKS: (taskId: string) => ['task', taskId, 'subtasks'] as const,
  TASK_DEPENDENCIES: (taskId: string) => ['task', taskId, 'dependencies'] as const,
  TASK_TIME_ENTRIES: (taskId: string) => ['task', taskId, 'time-entries'] as const,
  
  // Page-related queries
  PAGES: ['pages'] as const,
  WORKSPACE_PAGES: (workspaceId: string) => ['pages', 'workspace', workspaceId] as const,
  PAGE: (pageId: string) => ['page', pageId] as const,
  PAGE_TASKS: (pageId: string) => ['page', pageId, 'tasks'] as const,
  
  // Analytics and stats
  ANALYTICS: ['analytics'] as const,
  USER_STATS: (userId: string) => ['analytics', 'user', userId] as const,
  WORKSPACE_STATS: (workspaceId: string) => ['analytics', 'workspace', workspaceId] as const,
  
  // Notifications
  NOTIFICATIONS: ['notifications'] as const,
  USER_NOTIFICATIONS: (userId: string) => ['notifications', 'user', userId] as const,
  
  // Search
  SEARCH: ['search'] as const,
  SEARCH_RESULTS: (query: string, filters: any) => ['search', 'results', query, filters] as const,
} as const;

// Error handler for queries
const handleQueryError = (error: any, query: any) => {
  console.error('Query failed:', {
    queryKey: query.queryKey,
    error: error.message,
    status: error.status,
  });

  // Don't show toast for background refetches
  if (query.state.fetchStatus === 'fetching' && query.state.data) {
    return;
  }

  // Show user-friendly error messages
  const isNetworkError = !navigator.onLine || error.message?.includes('fetch');
  const isServerError = error.status >= 500;
  const isAuthError = error.status === 401 || error.status === 403;

  if (isNetworkError) {
    toast.error('Network connection lost. Please check your internet connection.');
  } else if (isAuthError) {
    toast.error('Authentication required. Please log in again.');
  } else if (isServerError) {
    toast.error('Server error. Please try again later.');
  } else {
    toast.error('Failed to load data. Please try again.');
  }
};

// Error handler for mutations
const handleMutationError = (error: any, variables: any, context: any, mutation: any) => {
  console.error('Mutation failed:', {
    mutationKey: mutation.options.mutationKey,
    error: error.message,
    status: error.status,
    variables,
  });

  // Show user-friendly error messages for mutations
  const isNetworkError = !navigator.onLine || error.message?.includes('fetch');
  const isServerError = error.status >= 500;
  const isAuthError = error.status === 401 || error.status === 403;
  const isValidationError = error.status === 400 || error.status === 422;

  if (isNetworkError) {
    toast.error('Network connection lost. Changes could not be saved.');
  } else if (isAuthError) {
    toast.error('Authentication required. Please log in again.');
  } else if (isValidationError) {
    toast.error(error.message || 'Invalid data. Please check your input.');
  } else if (isServerError) {
    toast.error('Server error. Please try again later.');
  } else {
    toast.error('Failed to save changes. Please try again.');
  }
};

// Create query cache with error handling
const queryCache = new QueryCache({
  onError: handleQueryError,
});

// Create mutation cache with error handling
const mutationCache = new MutationCache({
  onError: handleMutationError,
});

// Create and configure the query client
export const createQueryClient = () => {
  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        // Default cache time for most queries
        staleTime: CACHE_TIMES.MEDIUM,
        gcTime: GC_TIMES.MEDIUM,
        
        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch behavior
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: 'always',
        
        // Network mode
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        retryDelay: 1000,
        
        // Network mode
        networkMode: 'online',
      },
    },
  });
};

// Cache invalidation helpers
export const invalidateQueries = {
  // Invalidate all user-related data
  user: (queryClient: QueryClient, userId?: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER });
    if (userId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_SETTINGS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_STATS(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_NOTIFICATIONS(userId) });
    }
  },
  
  // Invalidate workspace-related data
  workspace: (queryClient: QueryClient, workspaceId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE(workspaceId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_TASKS(workspaceId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_PAGES(workspaceId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_STATS(workspaceId) });
  },
  
  // Invalidate task-related data
  task: (queryClient: QueryClient, taskId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK(taskId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK_COMMENTS(taskId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK_SUBTASKS(taskId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK_DEPENDENCIES(taskId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASK_TIME_ENTRIES(taskId) });
    // Also invalidate tasks lists
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TASKS });
  },
  
  // Invalidate page-related data
  page: (queryClient: QueryClient, pageId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGE(pageId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGE_TASKS(pageId) });
    // Also invalidate pages lists
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGES });
  },
  
  // Invalidate all data (use sparingly)
  all: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
  },
};

// Prefetch helpers
export const prefetchQueries = {
  // Prefetch user data
  user: async (queryClient: QueryClient, userId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.USER_PROFILE(userId),
        staleTime: CACHE_TIMES.LONG,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.USER_SETTINGS(userId),
        staleTime: CACHE_TIMES.LONG,
      }),
    ]);
  },
  
  // Prefetch workspace data
  workspace: async (queryClient: QueryClient, workspaceId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.WORKSPACE(workspaceId),
        staleTime: CACHE_TIMES.MEDIUM,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId),
        staleTime: CACHE_TIMES.MEDIUM,
      }),
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.WORKSPACE_TASKS(workspaceId),
        staleTime: CACHE_TIMES.SHORT,
      }),
    ]);
  },
};
