import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './SupabaseAuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  workspace_id?: string;
  type: 'invitation' | 'task_assignment' | 'task_update' | 'workspace_update' | 'mention' | 'system' | 'task_comment' | 'task_status_change' | 'workspace_invitation';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  action_url?: string;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' };

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.read).length
      };
    
    case 'ADD_NOTIFICATION':
      const newNotifications = [action.payload, ...state.notifications];
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.read).length
      };
    
    case 'MARK_AS_READ':
      const updatedNotifications = state.notifications.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length
      };
    
    case 'MARK_ALL_AS_READ':
      const allReadNotifications = state.notifications.map(n => ({ ...n, read: true }));
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0
      };
    
    case 'DELETE_NOTIFICATION':
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.read).length
      };
    
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };
    
    default:
      return state;
  }
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: [],
    unreadCount: 0,
    loading: false
  });
  
  const { user } = useAuth();

  // Load notifications for the current user
  const loadNotifications = async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        // If table doesn't exist, create demo notifications
        if (error.message.includes('relation "notifications" does not exist')) {
          console.log('📧 Notifications table not found - using demo notifications');
          const demoNotifications: Notification[] = [
            {
              id: 'demo-1',
              user_id: user.id,
              type: 'system',
              title: 'Welcome to EasTask!',
              message: 'Your notification system is ready. Set up the database to enable full functionality.',
              data: { demo: true },
              read: false,
              created_at: new Date().toISOString()
            },
            {
              id: 'demo-2',
              user_id: user.id,
              type: 'system',
              title: 'Database Setup Required',
              message: 'Run the database setup script to enable notifications.',
              data: { demo: true, action: 'setup_database' },
              read: false,
              created_at: new Date(Date.now() - 60000).toISOString()
            }
          ];
          dispatch({ type: 'SET_NOTIFICATIONS', payload: demoNotifications });
        } else {
          throw error;
        }
      } else {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: data || [] });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Fallback to demo notifications on any error
      const demoNotifications: Notification[] = [
        {
          id: 'demo-error',
          user_id: user.id,
          type: 'system',
          title: 'Notification System',
          message: 'Unable to load notifications. Please check database setup.',
          data: { demo: true, error: true },
          read: false,
          created_at: new Date().toISOString()
        }
      ];
      dispatch({ type: 'SET_NOTIFICATIONS', payload: demoNotifications });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      // If it's a demo notification, just update locally
      if (notificationId.startsWith('demo-')) {
        dispatch({ type: 'MARK_AS_READ', payload: notificationId });
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        // Still update locally even if database update fails
        dispatch({ type: 'MARK_AS_READ', payload: notificationId });
        return;
      }

      dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Update locally as fallback
      dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      dispatch({ type: 'MARK_ALL_AS_READ' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      dispatch({ type: 'CLEAR_ALL' });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Create new notification
  const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          read: false
        })
        .select()
        .single();

      if (error) throw error;

      // If this notification is for the current user, add it to the state
      if (data.user_id === user?.id) {
        dispatch({ type: 'ADD_NOTIFICATION', payload: data });
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Load notifications when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
    }
  }, [user]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
          
          // Show toast notification
          toast.info(newNotification.title, {
            description: newNotification.message,
            action: newNotification.action_url ? {
              label: 'View',
              onClick: () => {
                if (newNotification.action_url) {
                  window.location.href = newNotification.action_url;
                }
              }
            } : undefined
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const value: NotificationContextType = {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    createNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
