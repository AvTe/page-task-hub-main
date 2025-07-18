// Notification Service for EasTask
// Handles both in-app notifications and email notifications

import { supabase } from '../lib/supabase';
import { emailService, WorkspaceInvitationData, TaskAssignmentData } from './emailService';

export interface NotificationData {
  id?: string;
  user_id: string;
  workspace_id: string;
  type: 'workspace_invitation' | 'task_assignment' | 'task_comment' | 'task_status_change' | 'workspace_update' | 'mention';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at?: string;
  action_url?: string;
}

export interface ActivityData {
  user_id: string;
  workspace_id: string;
  activity_type: string;
  resource_type: 'workspace' | 'page' | 'task' | 'comment' | 'member';
  resource_id: string;
  details: Record<string, any>;
}

class NotificationService {
  // Create in-app notification
  async createNotification(notification: Omit<NotificationData, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          workspace_id: notification.workspace_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          read: false,
          action_url: notification.action_url
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      console.log('✅ Notification created:', data.id);
      return data.id;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  // Log user activity
  async logActivity(activity: ActivityData): Promise<void> {
    try {
      // First try with details column
      let { error } = await supabase
        .from('user_activity')
        .insert({
          user_id: activity.user_id,
          workspace_id: activity.workspace_id,
          activity_type: activity.activity_type,
          resource_type: activity.resource_type,
          resource_id: activity.resource_id,
          details: activity.details
        });

      // If details column doesn't exist, try without it
      if (error && error.message.includes("Could not find the 'details' column")) {
        console.log('📝 Details column not found, logging activity without details');
        const { error: retryError } = await supabase
          .from('user_activity')
          .insert({
            user_id: activity.user_id,
            workspace_id: activity.workspace_id,
            activity_type: activity.activity_type,
            resource_type: activity.resource_type,
            resource_id: activity.resource_id
          });

        if (retryError) {
          console.error('Error logging activity (retry):', retryError);
        } else {
          console.log('✅ Activity logged (without details):', activity.activity_type);
        }
      } else if (error) {
        console.error('Error logging activity:', error);
      } else {
        console.log('✅ Activity logged:', activity.activity_type);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  // Send workspace invitation (email + notification)
  async sendWorkspaceInvitation(data: {
    invitedEmail: string;
    inviterUserId: string;
    workspaceId: string;
    workspaceName: string;
    inviterName: string;
    inviterEmail?: string;
    role: string;
    inviteCode: string;
  }): Promise<boolean> {
    try {
      // Send email invitation
      const emailData: WorkspaceInvitationData = {
        workspaceName: data.workspaceName,
        inviterName: data.inviterName,
        inviterEmail: data.inviterEmail,
        invitedEmail: data.invitedEmail,
        inviteCode: data.inviteCode,
        role: data.role
      };

      const emailSent = await emailService.sendWorkspaceInvitation(emailData);

      // Log activity
      await this.logActivity({
        user_id: data.inviterUserId,
        workspace_id: data.workspaceId,
        activity_type: 'workspace_invitation_sent',
        resource_type: 'workspace',
        resource_id: data.workspaceId,
        details: {
          invited_email: data.invitedEmail,
          role: data.role,
          email_sent: emailSent
        }
      });

      return emailSent;
    } catch (error) {
      console.error('Error sending workspace invitation:', error);
      return false;
    }
  }

  // Send task assignment notification
  async sendTaskAssignment(data: {
    taskId: string;
    taskTitle: string;
    taskDescription?: string;
    assigneeUserId: string;
    assigneeEmail: string;
    assignerUserId: string;
    assignerName: string;
    workspaceId: string;
    workspaceName: string;
    pageTitle?: string;
    dueDate?: string;
    priority?: string;
  }): Promise<void> {
    try {
      // Create in-app notification
      await this.createNotification({
        user_id: data.assigneeUserId,
        workspace_id: data.workspaceId,
        type: 'task_assignment',
        title: 'New Task Assignment',
        message: `${data.assignerName} assigned you the task "${data.taskTitle}"`,
        data: {
          task_id: data.taskId,
          assigner_name: data.assignerName,
          workspace_name: data.workspaceName
        },
        read: false,
        action_url: `/tasker?task=${data.taskId}`
      });

      // Send email notification
      const emailData: TaskAssignmentData = {
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        taskDescription: data.taskDescription,
        workspaceName: data.workspaceName,
        assignerName: data.assignerName,
        assigneeEmail: data.assigneeEmail,
        dueDate: data.dueDate,
        priority: data.priority,
        pageTitle: data.pageTitle
      };

      await emailService.sendTaskAssignment(data.assigneeEmail, emailData);

      // Log activity
      await this.logActivity({
        user_id: data.assignerUserId,
        workspace_id: data.workspaceId,
        activity_type: 'task_assigned',
        resource_type: 'task',
        resource_id: data.taskId,
        details: {
          task_title: data.taskTitle,
          assignee_id: data.assigneeUserId,
          assigner_name: data.assignerName
        }
      });

      console.log('✅ Task assignment notification sent');
    } catch (error) {
      console.error('Error sending task assignment notification:', error);
    }
  }

  // Send task comment notification
  async sendTaskComment(data: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    commentText: string;
    commenterUserId: string;
    commenterName: string;
    workspaceId: string;
    workspaceName: string;
    notifyUserIds: string[];
  }): Promise<void> {
    try {
      // Create notifications for all users to notify
      for (const userId of data.notifyUserIds) {
        if (userId !== data.commenterUserId) { // Don't notify the commenter
          await this.createNotification({
            user_id: userId,
            workspace_id: data.workspaceId,
            type: 'task_comment',
            title: 'New Comment',
            message: `${data.commenterName} commented on "${data.taskTitle}"`,
            data: {
              task_id: data.taskId,
              comment_id: data.commentId,
              commenter_name: data.commenterName
            },
            read: false,
            action_url: `/tasker?task=${data.taskId}#comment-${data.commentId}`
          });
        }
      }

      // Log activity
      await this.logActivity({
        user_id: data.commenterUserId,
        workspace_id: data.workspaceId,
        activity_type: 'task_comment_added',
        resource_type: 'comment',
        resource_id: data.commentId,
        details: {
          task_id: data.taskId,
          task_title: data.taskTitle,
          comment_text: data.commentText.substring(0, 100) // Truncate for storage
        }
      });

      console.log('✅ Task comment notifications sent');
    } catch (error) {
      console.error('Error sending task comment notifications:', error);
    }
  }

  // Send task status change notification
  async sendTaskStatusChange(data: {
    taskId: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    updaterUserId: string;
    updaterName: string;
    workspaceId: string;
    notifyUserIds: string[];
  }): Promise<void> {
    try {
      const statusMessages = {
        'pending': 'To Do',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
      };

      const message = `${data.updaterName} moved "${data.taskTitle}" to ${statusMessages[data.newStatus as keyof typeof statusMessages] || data.newStatus}`;

      // Create notifications for relevant users
      for (const userId of data.notifyUserIds) {
        if (userId !== data.updaterUserId) { // Don't notify the person who made the change
          await this.createNotification({
            user_id: userId,
            workspace_id: data.workspaceId,
            type: 'task_status_change',
            title: 'Task Status Updated',
            message,
            data: {
              task_id: data.taskId,
              old_status: data.oldStatus,
              new_status: data.newStatus,
              updater_name: data.updaterName
            },
            read: false,
            action_url: `/tasker?task=${data.taskId}`
          });
        }
      }

      // Log activity
      await this.logActivity({
        user_id: data.updaterUserId,
        workspace_id: data.workspaceId,
        activity_type: 'task_status_changed',
        resource_type: 'task',
        resource_id: data.taskId,
        details: {
          task_title: data.taskTitle,
          old_status: data.oldStatus,
          new_status: data.newStatus
        }
      });

      console.log('✅ Task status change notifications sent');
    } catch (error) {
      console.error('Error sending task status change notifications:', error);
    }
  }

  // Get notifications for a user
  async getUserNotifications(userId: string, limit: number = 50): Promise<NotificationData[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
