import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { QUERY_KEYS, invalidateQueries } from '../lib/queryClient';
import { useCacheService } from './useCacheService';
import { QueryClient } from '@tanstack/react-query';
import { CacheService } from '../services/cacheService';

interface RealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

// Handle cache invalidation based on real-time events
const handleCacheInvalidation = (
  table: string,
  payload: any,
  queryClient: QueryClient,
  cacheService: CacheService
) => {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (table) {
    case 'tasks':
      if (newRecord?.id) {
        // Invalidate specific task
        cacheService.invalidateTaskCache(newRecord.id);

        // Invalidate workspace tasks
        if (newRecord.workspace_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.WORKSPACE_TASKS(newRecord.workspace_id)
          });
        }

        // Invalidate page tasks
        if (newRecord.page_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.PAGE_TASKS(newRecord.page_id)
          });
        }

        // Invalidate user stats
        if (newRecord.created_by) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.USER_STATS(newRecord.created_by)
          });
        }
      }

      // Handle deletions
      if (eventType === 'DELETE' && oldRecord?.id) {
        cacheService.invalidateTaskCache(oldRecord.id);
        if (oldRecord.workspace_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.WORKSPACE_TASKS(oldRecord.workspace_id)
          });
        }
      }
      break;

    case 'pages':
      if (newRecord?.id) {
        // Invalidate specific page
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAGE(newRecord.id)
        });

        // Invalidate workspace pages
        if (newRecord.workspace_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.WORKSPACE_PAGES(newRecord.workspace_id)
          });
        }
      }

      if (eventType === 'DELETE' && oldRecord?.id) {
        queryClient.removeQueries({
          queryKey: QUERY_KEYS.PAGE(oldRecord.id)
        });
        if (oldRecord.workspace_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.WORKSPACE_PAGES(oldRecord.workspace_id)
          });
        }
      }
      break;

    case 'workspaces':
      if (newRecord?.id) {
        // Invalidate specific workspace
        cacheService.invalidateWorkspaceCache(newRecord.id);

        // Invalidate user workspaces
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACES
        });
      }

      if (eventType === 'DELETE' && oldRecord?.id) {
        queryClient.removeQueries({
          queryKey: QUERY_KEYS.WORKSPACE(oldRecord.id)
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACES
        });
      }
      break;

    case 'workspace_members':
      if (newRecord?.workspace_id) {
        // Invalidate workspace members
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.WORKSPACE_MEMBERS(newRecord.workspace_id)
        });

        // Invalidate user workspaces if user was added/removed
        if (newRecord.user_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.WORKSPACES
          });
        }
      }
      break;

    case 'task_comments':
      if (newRecord?.task_id) {
        // Invalidate task comments
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TASK_COMMENTS(newRecord.task_id)
        });

        // Update task cache to reflect new comment count
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TASK(newRecord.task_id)
        });
      }
      break;

    case 'subtasks':
      if (newRecord?.task_id) {
        // Invalidate task subtasks
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TASK_SUBTASKS(newRecord.task_id)
        });

        // Update task cache
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TASK(newRecord.task_id)
        });
      }
      break;

    case 'task_dependencies':
      if (newRecord?.task_id) {
        // Invalidate task dependencies
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TASK_DEPENDENCIES(newRecord.task_id)
        });
      }
      break;

    case 'task_time_entries':
      if (newRecord?.task_id) {
        // Invalidate task time entries
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TASK_TIME_ENTRIES(newRecord.task_id)
        });

        // Invalidate user stats
        if (newRecord.user_id) {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.USER_STATS(newRecord.user_id)
          });
        }
      }
      break;

    case 'users':
      if (newRecord?.id) {
        // Invalidate user profile
        cacheService.invalidateUserCache(newRecord.id);
      }
      break;

    case 'user_settings':
      if (newRecord?.user_id) {
        // Invalidate user settings
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.USER_SETTINGS(newRecord.user_id)
        });
      }
      break;

    default:
      console.log(`No cache invalidation handler for table: ${table}`);
  }
};

export const useRealtimeSubscription = ({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: RealtimeSubscriptionOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cacheService = useCacheService();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;

    // Create channel name
    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;
    
    // Create subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          console.log(`Realtime ${payload.eventType} on ${table}:`, payload);

          // Handle cache invalidation based on table and event type
          handleCacheInvalidation(table, payload, queryClient, cacheService);

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status for ${table}:`, status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete, enabled, user]);

  return {
    isConnected: channelRef.current?.state === 'joined'
  };
};

// Hook for task-specific real-time updates
export const useTaskRealtime = (
  taskId: string,
  onTaskUpdate?: (task: any) => void,
  onSubtaskUpdate?: (subtask: any) => void,
  onCommentUpdate?: (comment: any) => void
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cacheService = useCacheService();

  // Task updates
  const taskSubscription = useRealtimeSubscription({
    table: 'tasks',
    filter: `id=eq.${taskId}`,
    onUpdate: (payload) => {
      // Update the specific task in cache
      if (payload.new) {
        queryClient.setQueryData(QUERY_KEYS.TASK(taskId), payload.new);
      }
      onTaskUpdate?.(payload.new);
    },
    enabled: !!taskId && !!user
  });

  // Subtask updates
  const subtaskSubscription = useRealtimeSubscription({
    table: 'subtasks',
    filter: `parent_task_id=eq.${taskId}`,
    onInsert: (payload) => {
      onSubtaskUpdate?.(payload.new);
    },
    onUpdate: (payload) => {
      onSubtaskUpdate?.(payload.new);
    },
    onDelete: (payload) => {
      onSubtaskUpdate?.(payload.old);
    },
    enabled: !!taskId && !!user
  });

  // Comment updates
  const commentSubscription = useRealtimeSubscription({
    table: 'task_comments',
    filter: `task_id=eq.${taskId}`,
    onInsert: (payload) => {
      onCommentUpdate?.(payload.new);
    },
    onUpdate: (payload) => {
      onCommentUpdate?.(payload.new);
    },
    onDelete: (payload) => {
      onCommentUpdate?.(payload.old);
    },
    enabled: !!taskId && !!user
  });

  return {
    isConnected: taskSubscription.isConnected && 
                 subtaskSubscription.isConnected && 
                 commentSubscription.isConnected
  };
};

// Hook for workspace-wide real-time updates
export const useWorkspaceRealtime = (
  workspaceId: string,
  onTaskUpdate?: (task: any) => void,
  onMemberUpdate?: (member: any) => void
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cacheService = useCacheService();

  // Task updates in workspace
  const taskSubscription = useRealtimeSubscription({
    table: 'tasks',
    filter: `workspace_id=eq.${workspaceId}`,
    onInsert: (payload) => {
      // Add new task to workspace tasks cache
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKSPACE_TASKS(workspaceId)
      });
      onTaskUpdate?.(payload.new);
    },
    onUpdate: (payload) => {
      // Update task in cache
      if (payload.new?.id) {
        queryClient.setQueryData(QUERY_KEYS.TASK(payload.new.id), payload.new);
      }
      onTaskUpdate?.(payload.new);
    },
    onDelete: (payload) => {
      onTaskUpdate?.(payload.old);
    },
    enabled: !!workspaceId && !!user
  });

  // Member updates
  const memberSubscription = useRealtimeSubscription({
    table: 'workspace_members',
    filter: `workspace_id=eq.${workspaceId}`,
    onInsert: (payload) => {
      onMemberUpdate?.(payload.new);
    },
    onUpdate: (payload) => {
      onMemberUpdate?.(payload.new);
    },
    onDelete: (payload) => {
      onMemberUpdate?.(payload.old);
    },
    enabled: !!workspaceId && !!user
  });

  return {
    isConnected: taskSubscription.isConnected && memberSubscription.isConnected
  };
};

// Hook for user presence tracking
export const usePresence = (workspaceId: string) => {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!workspaceId || !user) return;

    const channel = supabase.channel(`workspace:${workspaceId}:presence`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track user presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence sync:', presenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Send initial presence data
          await channel.track({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [workspaceId, user]);

  return {
    channel: channelRef.current,
    isConnected: channelRef.current?.state === 'joined'
  };
};

// Hook for live cursors and collaborative editing
export const useCollaborativeCursor = (taskId: string) => {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!taskId || !user) return;

    const channel = supabase.channel(`task:${taskId}:cursors`);

    channel
      .on('broadcast', { event: 'cursor' }, (payload) => {
        console.log('Cursor update:', payload);
        // Handle cursor updates from other users
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [taskId, user]);

  const sendCursorUpdate = (position: { x: number; y: number; element?: string }) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email,
          position,
          timestamp: Date.now()
        }
      });
    }
  };

  return {
    sendCursorUpdate,
    isConnected: channelRef.current?.state === 'joined'
  };
};
