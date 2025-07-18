import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { createCacheService, getCacheService } from '../services/cacheService';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';

// Hook to access cache service
export const useCacheService = () => {
  const queryClient = useQueryClient();
  
  const cacheService = useMemo(() => {
    return createCacheService(queryClient);
  }, [queryClient]);

  return cacheService;
};

// Hook for cache warmup on app initialization
export const useCacheWarmup = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useSupabaseWorkspace();
  const cacheService = useCacheService();

  useEffect(() => {
    if (user && currentWorkspace) {
      // Warm up cache when user and workspace are available
      cacheService.warmupCache(user.id, currentWorkspace.id);
    } else if (user) {
      // Warm up user data only
      cacheService.warmupCache(user.id);
    }
  }, [user, currentWorkspace, cacheService]);
};

// Hook for prefetching data on hover/interaction
export const usePrefetchOnHover = () => {
  const cacheService = useCacheService();

  const prefetchWorkspace = (workspaceId: string) => {
    cacheService.prefetchWorkspaceData(workspaceId);
  };

  const prefetchTask = (taskId: string) => {
    cacheService.prefetchTaskData(taskId);
  };

  const prefetchUser = (userId: string) => {
    cacheService.prefetchUserData(userId);
  };

  return {
    prefetchWorkspace,
    prefetchTask,
    prefetchUser,
  };
};

// Hook for cache management
export const useCacheManagement = () => {
  const cacheService = useCacheService();

  const invalidateUserCache = (userId: string) => {
    cacheService.invalidateUserCache(userId);
  };

  const invalidateWorkspaceCache = (workspaceId: string) => {
    cacheService.invalidateWorkspaceCache(workspaceId);
  };

  const invalidateTaskCache = (taskId: string) => {
    cacheService.invalidateTaskCache(taskId);
  };

  const clearAllCache = () => {
    cacheService.clearAllCache();
  };

  const getCacheStats = () => {
    return cacheService.getCacheStats();
  };

  const cleanupStaleCache = () => {
    cacheService.cleanupStaleCache();
  };

  return {
    invalidateUserCache,
    invalidateWorkspaceCache,
    invalidateTaskCache,
    clearAllCache,
    getCacheStats,
    cleanupStaleCache,
  };
};

// Hook for automatic cache cleanup
export const useAutoCacheCleanup = (intervalMinutes = 30) => {
  const { cleanupStaleCache } = useCacheManagement();

  useEffect(() => {
    // Set up automatic cache cleanup
    const interval = setInterval(() => {
      cleanupStaleCache();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [cleanupStaleCache, intervalMinutes]);
};

// Hook for cache statistics monitoring
export const useCacheStats = () => {
  const { getCacheStats } = useCacheManagement();
  
  // You could make this reactive by using a state and interval
  // For now, it's a simple function call
  return getCacheStats;
};

// Hook for network-aware caching
export const useNetworkAwareCache = () => {
  const cacheService = useCacheService();
  
  useEffect(() => {
    // The cache service already handles network events
    // This hook could be extended for additional network-aware features
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App became visible, could trigger cache refresh
        console.log('App became visible, cache service will handle any needed refreshes');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cacheService]);
};
