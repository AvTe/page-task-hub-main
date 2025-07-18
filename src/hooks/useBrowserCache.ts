import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBrowserCache } from '../services/browserCacheService';
import { QUERY_KEYS } from '../lib/queryClient';
import { useAuth } from '../contexts/SupabaseAuthContext';

// Hook to integrate browser caching with React Query
export const useBrowserCache = () => {
  const queryClient = useQueryClient();
  const browserCache = getBrowserCache();
  const { user } = useAuth();

  // Cache React Query data to browser storage
  const cacheToBrowser = async (queryKey: any[], data: any, type: string) => {
    if (!user || !data) return;

    try {
      const keyString = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
      await browserCache.set(type, keyString, data, user.id);
    } catch (error) {
      console.error('Failed to cache to browser storage:', error);
    }
  };

  // Load data from browser cache
  const loadFromBrowser = async (queryKey: any[], type: string) => {
    if (!user) return null;

    try {
      const keyString = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
      return await browserCache.get(type, keyString, user.id);
    } catch (error) {
      console.error('Failed to load from browser cache:', error);
      return null;
    }
  };

  // Set up cache persistence for specific query types
  useEffect(() => {
    if (!user) return;

    const cache = queryClient.getQueryCache();

    // Subscribe to query cache changes
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === 'updated' && event.query.state.data) {
        const queryKey = event.query.queryKey;
        const data = event.query.state.data;

        // Determine cache type based on query key
        let cacheType = 'unknown';
        
        if (queryKey.includes('user') && queryKey.includes('profile')) {
          cacheType = 'USER_PROFILE';
        } else if (queryKey.includes('user') && queryKey.includes('settings')) {
          cacheType = 'USER_SETTINGS';
        } else if (queryKey.includes('workspace') && !queryKey.includes('members')) {
          cacheType = 'WORKSPACE';
        } else if (queryKey.includes('workspace') && queryKey.includes('members')) {
          cacheType = 'WORKSPACE_MEMBERS';
        } else if (queryKey.includes('tasks')) {
          cacheType = 'TASKS';
        } else if (queryKey.includes('pages')) {
          cacheType = 'PAGES';
        } else if (queryKey.includes('comments')) {
          cacheType = 'COMMENTS';
        } else if (queryKey.includes('analytics') || queryKey.includes('stats')) {
          cacheType = 'STATS';
        }

        // Cache important data types
        if (cacheType !== 'unknown' && cacheType !== 'COMMENTS') {
          cacheToBrowser(queryKey, data, cacheType);
        }
      }
    });

    return unsubscribe;
  }, [user, queryClient, browserCache]);

  return {
    cacheToBrowser,
    loadFromBrowser,
    browserCache,
  };
};

// Hook to preload data from browser cache on app start
export const useBrowserCachePreload = () => {
  const queryClient = useQueryClient();
  const { loadFromBrowser } = useBrowserCache();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const preloadFromCache = async () => {
      try {
        // Preload user profile
        const userProfile = await loadFromBrowser(
          QUERY_KEYS.USER_PROFILE(user.id),
          'USER_PROFILE'
        );
        if (userProfile) {
          queryClient.setQueryData(QUERY_KEYS.USER_PROFILE(user.id), userProfile);
        }

        // Preload user settings
        const userSettings = await loadFromBrowser(
          QUERY_KEYS.USER_SETTINGS(user.id),
          'USER_SETTINGS'
        );
        if (userSettings) {
          queryClient.setQueryData(QUERY_KEYS.USER_SETTINGS(user.id), userSettings);
        }

        // Preload workspaces
        const workspaces = await loadFromBrowser(
          QUERY_KEYS.WORKSPACES,
          'WORKSPACE'
        );
        if (workspaces) {
          queryClient.setQueryData(QUERY_KEYS.WORKSPACES, workspaces);
        }

        console.log('Preloaded data from browser cache');
      } catch (error) {
        console.error('Failed to preload from browser cache:', error);
      }
    };

    preloadFromCache();
  }, [user, queryClient, loadFromBrowser]);
};

// Hook for cache management
export const useBrowserCacheManagement = () => {
  const browserCache = getBrowserCache();
  const { user } = useAuth();

  const clearUserCache = async () => {
    if (!user) return;
    await browserCache.clearUserCache(user.id);
  };

  const clearAllCache = async () => {
    await browserCache.clearAll();
  };

  const getCacheStats = async () => {
    return await browserCache.getStats();
  };

  const cleanupCache = async () => {
    return await browserCache.cleanup();
  };

  return {
    clearUserCache,
    clearAllCache,
    getCacheStats,
    cleanupCache,
  };
};

// Hook for automatic cache cleanup
export const useAutoBrowserCacheCleanup = () => {
  const { cleanupCache } = useBrowserCacheManagement();

  useEffect(() => {
    // Run cleanup on app start
    cleanupCache();

    // Set up periodic cleanup (every 30 minutes)
    const interval = setInterval(() => {
      cleanupCache();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [cleanupCache]);
};

// Hook for offline data access
export const useOfflineData = () => {
  const { loadFromBrowser } = useBrowserCache();
  const { user } = useAuth();

  const getOfflineUserProfile = async () => {
    if (!user) return null;
    return await loadFromBrowser(QUERY_KEYS.USER_PROFILE(user.id), 'USER_PROFILE');
  };

  const getOfflineWorkspaces = async () => {
    if (!user) return null;
    return await loadFromBrowser(QUERY_KEYS.WORKSPACES, 'WORKSPACE');
  };

  const getOfflineWorkspaceTasks = async (workspaceId: string) => {
    if (!user) return null;
    return await loadFromBrowser(QUERY_KEYS.WORKSPACE_TASKS(workspaceId), 'TASKS');
  };

  const getOfflineWorkspacePages = async (workspaceId: string) => {
    if (!user) return null;
    return await loadFromBrowser(QUERY_KEYS.WORKSPACE_PAGES(workspaceId), 'PAGES');
  };

  return {
    getOfflineUserProfile,
    getOfflineWorkspaces,
    getOfflineWorkspaceTasks,
    getOfflineWorkspacePages,
  };
};

// Hook to check if app is running offline
export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};
