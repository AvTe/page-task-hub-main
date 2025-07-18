import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/SupabaseAuthContext';

interface RealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

export const useRealtimeSubscription = ({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: RealtimeSubscriptionOptions) => {
  const { user } = useAuth();
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

  // Task updates
  const taskSubscription = useRealtimeSubscription({
    table: 'tasks',
    filter: `id=eq.${taskId}`,
    onUpdate: (payload) => {
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

  // Task updates in workspace
  const taskSubscription = useRealtimeSubscription({
    table: 'tasks',
    filter: `workspace_id=eq.${workspaceId}`,
    onInsert: (payload) => {
      onTaskUpdate?.(payload.new);
    },
    onUpdate: (payload) => {
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
