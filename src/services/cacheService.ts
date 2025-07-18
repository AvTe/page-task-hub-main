import { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_TIMES, invalidateQueries, prefetchQueries } from '../lib/queryClient';
import { supabase } from '../lib/supabase';

// Cache management service for centralized cache operations
export class CacheService {
  private queryClient: QueryClient;
  private prefetchQueue: Set<string> = new Set();
  private isOnline: boolean = navigator.onLine;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupNetworkListeners();
  }

  // Setup network status listeners
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOfflineStatus();
    });
  }

  // Handle when app comes back online
  private handleOnlineStatus() {
    console.log('App is back online, refreshing critical data...');
    
    // Refetch critical queries when back online
    this.queryClient.refetchQueries({
      predicate: (query) => {
        // Refetch queries that are stale or failed
        return query.isStale() || query.state.status === 'error';
      },
    });
  }

  // Handle when app goes offline
  private handleOfflineStatus() {
    console.log('App is offline, using cached data...');
    // Could implement offline-specific logic here
  }

  // Prefetch user-related data
  async prefetchUserData(userId: string) {
    if (!this.isOnline) return;

    const prefetchKey = `user-${userId}`;
    if (this.prefetchQueue.has(prefetchKey)) return;

    this.prefetchQueue.add(prefetchKey);

    try {
      await Promise.all([
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.USER_PROFILE(userId),
          queryFn: () => this.fetchUserProfile(userId),
          staleTime: CACHE_TIMES.LONG,
        }),
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.USER_SETTINGS(userId),
          queryFn: () => this.fetchUserSettings(userId),
          staleTime: CACHE_TIMES.LONG,
        }),
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.USER_STATS(userId),
          queryFn: () => this.fetchUserStats(userId),
          staleTime: CACHE_TIMES.SHORT,
        }),
      ]);
    } catch (error) {
      console.error('Failed to prefetch user data:', error);
    } finally {
      this.prefetchQueue.delete(prefetchKey);
    }
  }

  // Prefetch workspace data
  async prefetchWorkspaceData(workspaceId: string) {
    if (!this.isOnline) return;

    const prefetchKey = `workspace-${workspaceId}`;
    if (this.prefetchQueue.has(prefetchKey)) return;

    this.prefetchQueue.add(prefetchKey);

    try {
      await Promise.all([
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.WORKSPACE(workspaceId),
          queryFn: () => this.fetchWorkspace(workspaceId),
          staleTime: CACHE_TIMES.MEDIUM,
        }),
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(workspaceId),
          queryFn: () => this.fetchWorkspaceMembers(workspaceId),
          staleTime: CACHE_TIMES.MEDIUM,
        }),
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.WORKSPACE_TASKS(workspaceId),
          queryFn: () => this.fetchWorkspaceTasks(workspaceId),
          staleTime: CACHE_TIMES.SHORT,
        }),
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.WORKSPACE_PAGES(workspaceId),
          queryFn: () => this.fetchWorkspacePages(workspaceId),
          staleTime: CACHE_TIMES.MEDIUM,
        }),
      ]);
    } catch (error) {
      console.error('Failed to prefetch workspace data:', error);
    } finally {
      this.prefetchQueue.delete(prefetchKey);
    }
  }

  // Prefetch task details
  async prefetchTaskData(taskId: string) {
    if (!this.isOnline) return;

    const prefetchKey = `task-${taskId}`;
    if (this.prefetchQueue.has(prefetchKey)) return;

    this.prefetchQueue.add(prefetchKey);

    try {
      await Promise.all([
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.TASK(taskId),
          queryFn: () => this.fetchTask(taskId),
          staleTime: CACHE_TIMES.SHORT,
        }),
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.TASK_COMMENTS(taskId),
          queryFn: () => this.fetchTaskComments(taskId),
          staleTime: CACHE_TIMES.REALTIME,
        }),
        this.queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.TASK_SUBTASKS(taskId),
          queryFn: () => this.fetchTaskSubtasks(taskId),
          staleTime: CACHE_TIMES.SHORT,
        }),
      ]);
    } catch (error) {
      console.error('Failed to prefetch task data:', error);
    } finally {
      this.prefetchQueue.delete(prefetchKey);
    }
  }

  // Invalidate all user-related cache
  invalidateUserCache(userId: string) {
    invalidateQueries.user(this.queryClient, userId);
  }

  // Invalidate workspace cache
  invalidateWorkspaceCache(workspaceId: string) {
    invalidateQueries.workspace(this.queryClient, workspaceId);
  }

  // Invalidate task cache
  invalidateTaskCache(taskId: string) {
    invalidateQueries.task(this.queryClient, taskId);
  }

  // Clear all cache (use sparingly)
  clearAllCache() {
    this.queryClient.clear();
  }

  // Get cache statistics
  getCacheStats() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      freshQueries: queries.filter(q => q.state.dataUpdatedAt > Date.now() - CACHE_TIMES.SHORT).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      cacheSize: this.estimateCacheSize(queries),
    };

    return stats;
  }

  // Estimate cache size (rough calculation)
  private estimateCacheSize(queries: any[]) {
    let totalSize = 0;
    queries.forEach(query => {
      if (query.state.data) {
        try {
          totalSize += JSON.stringify(query.state.data).length;
        } catch (e) {
          // Ignore circular references
        }
      }
    });
    return totalSize;
  }

  // Cleanup stale cache entries
  cleanupStaleCache() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    queries.forEach(query => {
      // Remove queries that haven't been used in a while and are stale
      const lastUsed = query.state.dataUpdatedAt;
      const isOld = lastUsed < Date.now() - (30 * 60 * 1000); // 30 minutes
      
      if (isOld && query.isStale()) {
        cache.remove(query);
      }
    });
  }

  // Warm up cache with essential data
  async warmupCache(userId: string, workspaceId?: string) {
    if (!this.isOnline) return;

    console.log('Warming up cache...');

    try {
      // Always prefetch user data
      await this.prefetchUserData(userId);

      // Prefetch workspace data if available
      if (workspaceId) {
        await this.prefetchWorkspaceData(workspaceId);
      }

      console.log('Cache warmup completed');
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  // Data fetching methods (these would typically be in separate services)
  private async fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  private async fetchUserSettings(userId: string) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  private async fetchUserStats(userId: string) {
    // Implementation would be similar to useUserQueries
    const [tasksResult, timeEntriesResult] = await Promise.all([
      supabase.from('tasks').select('status, due_date').eq('created_by', userId),
      supabase.from('task_time_entries').select('duration_minutes, end_time').eq('user_id', userId),
    ]);

    const tasks = tasksResult.data || [];
    const timeEntries = timeEntriesResult.data || [];

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      totalTimeTracked: timeEntries.reduce((total, entry) => total + (entry.duration_minutes || 0), 0),
    };
  }

  private async fetchWorkspace(workspaceId: string) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();
    if (error) throw error;
    return data;
  }

  private async fetchWorkspaceMembers(workspaceId: string) {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*, user:users(*)')
      .eq('workspace_id', workspaceId);
    if (error) throw error;
    return data;
  }

  private async fetchWorkspaceTasks(workspaceId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignee:users(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  private async fetchWorkspacePages(workspaceId: string) {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  private async fetchTask(taskId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assignee:users(*)')
      .eq('id', taskId)
      .single();
    if (error) throw error;
    return data;
  }

  private async fetchTaskComments(taskId: string) {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*, user:users(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  private async fetchTaskSubtasks(taskId: string) {
    const { data, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
}

// Create singleton instance
let cacheServiceInstance: CacheService | null = null;

export const createCacheService = (queryClient: QueryClient): CacheService => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService(queryClient);
  }
  return cacheServiceInstance;
};

export const getCacheService = (): CacheService => {
  if (!cacheServiceInstance) {
    throw new Error('Cache service not initialized. Call createCacheService first.');
  }
  return cacheServiceInstance;
};
