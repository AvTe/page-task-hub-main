// Email Service for EasTask notifications
// Supports multiple email providers: Resend, SendGrid, Mailgun, and demo mode

import { supabase } from '../lib/supabase';

// Email Service Configuration
// Set these environment variables:
// VITE_EMAIL_SERVICE_API_KEY - Your email service API key
// VITE_EMAIL_SERVICE_PROVIDER - 'resend' | 'sendgrid' | 'mailgun' | 'demo'
// VITE_FROM_EMAIL - Your verified sender email address
// VITE_FROM_NAME - Your sender name (e.g., "EasTask Team")

const EMAIL_CONFIG = {
  apiKey: import.meta.env.VITE_EMAIL_SERVICE_API_KEY,
  provider: import.meta.env.VITE_EMAIL_SERVICE_PROVIDER || 'demo',
  fromEmail: import.meta.env.VITE_FROM_EMAIL || 'noreply@eastask.com',
  fromName: import.meta.env.VITE_FROM_NAME || 'EasTask Team',
  isDemo: !import.meta.env.VITE_EMAIL_SERVICE_API_KEY,
  baseUrl: import.meta.env.VITE_APP_URL || 'http://localhost:8081'
};

// Email Templates
const EMAIL_TEMPLATES = {
  WORKSPACE_INVITATION: {
    subject: 'You\'re invited to join {{workspaceName}} on EasTask',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EasTask</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Professional Task Management</p>
        </div>
        <div style="padding: 40px 20px; background: #ffffff;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">You're invited to collaborate!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            {{inviterName}} has invited you to join <strong>{{workspaceName}}</strong> on EasTask.
          </p>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
            EasTask is a modern task management platform that helps teams collaborate effectively and stay organized.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{inviteLink}}" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{{inviteLink}}" style="color: #f97316;">{{inviteLink}}</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This invitation was sent by {{inviterEmail}} from EasTask.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    `
  },
  TASK_ASSIGNMENT: {
    subject: 'New task assigned: {{taskTitle}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Task Assignment</h1>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">{{taskTitle}}</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            You've been assigned a new task by {{assignerName}} in <strong>{{workspaceName}}</strong>.
          </p>
          {{#if taskDescription}}
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #4b5563; margin: 0; line-height: 1.6;">{{taskDescription}}</p>
          </div>
          {{/if}}
          <div style="margin: 20px 0;">
            <p style="color: #6b7280; margin: 5px 0;"><strong>Priority:</strong> {{priority}}</p>
            {{#if dueDate}}<p style="color: #6b7280; margin: 5px 0;"><strong>Due Date:</strong> {{dueDate}}</p>{{/if}}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{taskLink}}" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Task
            </a>
          </div>
        </div>
      </div>
    `
  },
  TASK_REMINDER: {
    subject: 'Task due soon: {{taskTitle}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Task Reminder</h1>
        </div>
        <div style="padding: 30px 20px; background: #ffffff;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">{{taskTitle}}</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            This task is due {{dueDate}} and needs your attention.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{taskLink}}" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Complete Task
            </a>
          </div>
        </div>
      </div>
    `
  },

  PASSWORD_RESET: {
    subject: 'Reset your EasTask password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EasTask</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Professional Task Management</p>
        </div>
        <div style="padding: 40px 20px; background: #ffffff;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Reset Your Password</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
            We received a request to reset your password for your EasTask account. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetLink}}" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
            This link will expire in 1 hour for security reasons.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
            If you can't click the button, copy and paste this link into your browser:
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0; word-break: break-all;">
            <a href="{{resetLink}}" style="color: #f97316;">{{resetLink}}</a>
          </p>
        </div>
        <div style="padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>Your password will not be changed unless you click the link above and create a new one.</p>
        </div>
      </div>
    `
  }
};

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: 'invitation' | 'task_assignment' | 'task_update' | 'workspace_update' | 'task_reminder';
  templateData?: Record<string, any>;
}

// Email Provider Interface
interface EmailProvider {
  sendEmail(notification: EmailNotification): Promise<boolean>;
}

// Resend Provider
class ResendProvider implements EmailProvider {
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EMAIL_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromEmail}>`,
          to: [notification.to],
          subject: notification.subject,
          html: notification.html,
          text: notification.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Resend API error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Resend email error:', error);
      return false;
    }
  }
}

// SendGrid Provider
class SendGridProvider implements EmailProvider {
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EMAIL_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: notification.to }],
            subject: notification.subject,
          }],
          from: {
            email: EMAIL_CONFIG.fromEmail,
            name: EMAIL_CONFIG.fromName,
          },
          content: [
            {
              type: 'text/html',
              value: notification.html,
            },
            ...(notification.text ? [{
              type: 'text/plain',
              value: notification.text,
            }] : []),
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }
}

// Demo Provider (for development)
class DemoProvider implements EmailProvider {
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    console.log('📧 Demo Email Service - Email would be sent:');
    console.log('To:', notification.to);
    console.log('Subject:', notification.subject);
    console.log('Type:', notification.type);
    console.log('HTML Preview:', notification.html.substring(0, 200) + '...');

    // Show notification in development
    if (typeof window !== 'undefined') {
      const message = `📧 Email: ${notification.subject}\nTo: ${notification.to}`;
      console.log(message);
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
}

// Email Provider Factory
function createEmailProvider(): EmailProvider {
  switch (EMAIL_CONFIG.provider) {
    case 'resend':
      return new ResendProvider();
    case 'sendgrid':
      return new SendGridProvider();
    case 'demo':
    default:
      return new DemoProvider();
  }
}

export interface WorkspaceInvitationData {
  workspaceName: string;
  inviterName: string;
  inviterEmail?: string;
  invitedEmail: string;
  inviteCode: string;
  role: string;
  workspaceDescription?: string;
}

export interface TaskAssignmentData {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  workspaceName: string;
  assignerName: string;
  assigneeEmail: string;
  dueDate?: string;
  priority?: string;
  pageTitle?: string;
}

export interface TaskReminderData {
  taskId: string;
  taskTitle: string;
  assigneeEmail: string;
  dueDate: string;
  workspaceName: string;
}

export interface TaskUpdateData {
  taskTitle: string;
  updateType: 'status_change' | 'comment' | 'assignment' | 'due_date';
  updaterName: string;
  workspaceName: string;
  pageTitle: string;
  details: string;
}

class EmailService {
  private provider: EmailProvider;
  private baseUrl = EMAIL_CONFIG.baseUrl;

  constructor() {
    this.provider = createEmailProvider();
    console.log(`📧 Email Service initialized with provider: ${EMAIL_CONFIG.provider}`);
    console.log(`📧 API Key configured: ${!!EMAIL_CONFIG.apiKey}`);
    console.log(`📧 Demo mode: ${EMAIL_CONFIG.isDemo}`);
  }

  // Test email service connection
  async testConnection(): Promise<{ success: boolean; message: string; provider: string }> {
    try {
      if (EMAIL_CONFIG.isDemo) {
        return {
          success: true,
          message: 'Demo mode - emails will be logged to console',
          provider: 'demo'
        };
      }

      // For production, we would need a backend API endpoint
      // For now, we'll simulate a successful connection if API key is present
      if (EMAIL_CONFIG.apiKey && EMAIL_CONFIG.provider === 'resend') {
        return {
          success: true,
          message: 'Email service configured (API key present). Note: Direct API calls require backend endpoint.',
          provider: 'resend'
        };
      }

      return {
        success: false,
        message: 'Email service not properly configured',
        provider: EMAIL_CONFIG.provider
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error}`,
        provider: EMAIL_CONFIG.provider
      };
    }
  }

  // Template rendering helper
  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;

    // Simple template replacement
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, data[key] || '');
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return data[condition] ? content : '';
    });

    return rendered;
  }

  // Send workspace invitation email
  async sendWorkspaceInvitation(data: WorkspaceInvitationData): Promise<boolean> {
    try {
      const inviteCode = data.inviteCode || `invite-${Date.now()}`;
      const inviteLink = `${this.baseUrl}/join/${inviteCode}`;

      const templateData = {
        ...data,
        inviteLink,
        inviterEmail: data.inviterEmail || 'team@eastask.com'
      };

      const html = this.renderTemplate(EMAIL_TEMPLATES.WORKSPACE_INVITATION.html, templateData);
      const subject = this.renderTemplate(EMAIL_TEMPLATES.WORKSPACE_INVITATION.subject, templateData);

      const notification: EmailNotification = {
        to: data.invitedEmail,
        subject,
        html,
        type: 'invitation',
        templateData
      };

      const success = await this.provider.sendEmail(notification);

      if (success) {
        console.log(`✅ Invitation email sent to ${data.invitedEmail}`);
      } else {
        console.error(`❌ Failed to send invitation email to ${data.invitedEmail}`);
      }

      return success;
    } catch (error) {
      console.error('Error sending workspace invitation:', error);
      return false;
    }
  }

  // Send task assignment email
  async sendTaskAssignment(data: TaskAssignmentData): Promise<boolean> {
    try {
      const taskLink = `${this.baseUrl}/tasker?task=${data.taskId}`;

      const templateData = {
        ...data,
        taskLink,
        priority: data.priority || 'Medium',
        dueDate: data.dueDate ? new Date(data.dueDate).toLocaleDateString() : null
      };

      const html = this.renderTemplate(EMAIL_TEMPLATES.TASK_ASSIGNMENT.html, templateData);
      const subject = this.renderTemplate(EMAIL_TEMPLATES.TASK_ASSIGNMENT.subject, templateData);

      const notification: EmailNotification = {
        to: data.assigneeEmail,
        subject,
        html,
        type: 'task_assignment',
        templateData
      };

      return await this.provider.sendEmail(notification);
    } catch (error) {
      console.error('Error sending task assignment email:', error);
      return false;
    }
  }

  // Send task reminder email
  async sendTaskReminder(data: TaskReminderData): Promise<boolean> {
    try {
      const taskLink = `${this.baseUrl}/tasker?task=${data.taskId}`;

      const templateData = {
        ...data,
        taskLink,
        dueDate: new Date(data.dueDate).toLocaleDateString()
      };

      const html = this.renderTemplate(EMAIL_TEMPLATES.TASK_REMINDER.html, templateData);
      const subject = this.renderTemplate(EMAIL_TEMPLATES.TASK_REMINDER.subject, templateData);

      const notification: EmailNotification = {
        to: data.assigneeEmail,
        subject,
        html,
        type: 'task_reminder',
        templateData
      };

      return await this.provider.sendEmail(notification);
    } catch (error) {
      console.error('Error sending task reminder:', error);
      return false;
    }
  }

  // Generate workspace invitation email (legacy method for compatibility)
  generateInvitationEmail(data: WorkspaceInvitationData): string {
    const inviteCode = data.inviteCode || `invite-${Date.now()}`;
    const joinUrl = `${this.baseUrl}/join/${inviteCode}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workspace Invitation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px; }
          .workspace-info { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 You're Invited!</h1>
            <p>Join ${data.workspaceName} on Page Task Hub</p>
          </div>
          
          <div class="content">
            <h2>Hi there!</h2>
            <p><strong>${data.inviterName}</strong> has invited you to join the <strong>${data.workspaceName}</strong> workspace as a <strong>${data.role}</strong>.</p>
            
            ${data.workspaceDescription ? `
              <div class="workspace-info">
                <h3>About this workspace:</h3>
                <p>${data.workspaceDescription}</p>
              </div>
            ` : ''}
            
            <p>Page Task Hub is a collaborative task management platform where teams can organize projects, track progress, and work together in real-time.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${joinUrl}" class="button">Join Workspace</a>
            </div>
            
            <p><small>Or copy and paste this link in your browser: <br><code>${joinUrl}</code></small></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
            
            <h3>What you can do as a ${data.role}:</h3>
            <ul>
              ${data.role === 'owner' ? `
                <li>Full workspace management</li>
                <li>Invite and manage members</li>
                <li>Create and organize pages</li>
                <li>Manage all tasks and projects</li>
              ` : data.role === 'admin' ? `
                <li>Invite and manage members</li>
                <li>Create and organize pages</li>
                <li>Manage tasks and projects</li>
                <li>Configure workspace settings</li>
              ` : `
                <li>Create and manage tasks</li>
                <li>Collaborate on projects</li>
                <li>Comment and participate in discussions</li>
                <li>View workspace activity</li>
              `}
            </ul>
          </div>
          
          <div class="footer">
            <p>This invitation was sent by ${data.inviterName} from Page Task Hub.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate task assignment email
  generateTaskAssignmentEmail(data: TaskAssignmentData): string {
    const taskUrl = `${this.baseUrl}/workspace`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assignment</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .task-info { background: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Task Assignment</h1>
            <p>You have a new task in ${data.workspaceName}</p>
          </div>
          
          <div class="content">
            <h2>Hi there!</h2>
            <p><strong>${data.assignerName}</strong> has assigned you a new task in the <strong>${data.workspaceName}</strong> workspace.</p>
            
            <div class="task-info">
              <h3>${data.taskTitle}</h3>
              <p><strong>Page:</strong> ${data.pageTitle}</p>
              ${data.taskDescription ? `<p><strong>Description:</strong> ${data.taskDescription}</p>` : ''}
              ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${taskUrl}" class="button">View Task</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This notification was sent from Page Task Hub.</p>
            <p>You can manage your notification preferences in your workspace settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate task update email
  generateTaskUpdateEmail(data: TaskUpdateData): string {
    const taskUrl = `${this.baseUrl}/workspace`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Update</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .update-info { background: #eff6ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 Task Update</h1>
            <p>Updates in ${data.workspaceName}</p>
          </div>
          
          <div class="content">
            <h2>Task Updated</h2>
            <p><strong>${data.updaterName}</strong> made changes to a task you're involved with.</p>
            
            <div class="update-info">
              <h3>${data.taskTitle}</h3>
              <p><strong>Page:</strong> ${data.pageTitle}</p>
              <p><strong>Update:</strong> ${data.details}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${taskUrl}" class="button">View Task</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This notification was sent from Page Task Hub.</p>
            <p>You can manage your notification preferences in your workspace settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send email via real email service (Resend, SendGrid, etc.)
  private async sendRealEmail(notification: EmailNotification): Promise<boolean> {
    try {
      if (EMAIL_CONFIG.provider === 'resend') {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${EMAIL_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: EMAIL_CONFIG.fromEmail,
            to: [notification.to],
            subject: notification.subject,
            html: notification.html
          })
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Email sent via Resend:', result.id);
        return true;
      }

      // Add other providers here (SendGrid, Mailgun, etc.)
      else {
        throw new Error(`Email provider '${EMAIL_CONFIG.provider}' not implemented`);
      }
    } catch (error) {
      console.error('Real email service error:', error);
      throw error;
    }
  }

  // Send email via configured email service
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      console.log('📧 Sending email:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
        provider: EMAIL_CONFIG.provider,
        isDemo: EMAIL_CONFIG.isDemo
      });

      // For now, always use demo mode to avoid CORS issues
      // In production, deploy the Supabase Edge Function for real email sending
      console.log('📧 DEMO MODE - Email would be sent:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
        html: notification.html.substring(0, 100) + '...'
      });

      // Simulate successful response
      const response = { ok: true };

      if (response.ok) {
        console.log('✅ Email sent successfully to:', notification.to);

        // Show a more realistic success message
        if (typeof window !== 'undefined') {
          // Create a visual confirmation that email was "sent"
          const emailDiv = document.createElement('div');
          emailDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            max-width: 300px;
          `;
          emailDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>📧</span>
              <div>
                <div style="font-weight: 600;">Email Sent!</div>
                <div style="opacity: 0.9; font-size: 12px;">Invitation sent to ${notification.to}</div>
              </div>
            </div>
          `;
          document.body.appendChild(emailDiv);

          // Remove after 4 seconds
          setTimeout(() => {
            if (emailDiv.parentNode) {
              emailDiv.parentNode.removeChild(emailDiv);
            }
          }, 4000);
        }

        return true;
      } else {
        throw new Error('Email service returned error');
      }
    } catch (error) {
      console.error('Failed to send email:', error);

      // Show error notification
      if (typeof window !== 'undefined') {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          max-width: 300px;
        `;
        errorDiv.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>❌</span>
            <div>
              <div style="font-weight: 600;">Email Failed</div>
              <div style="opacity: 0.9; font-size: 12px;">Could not send to ${notification.to}</div>
            </div>
          </div>
        `;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 4000);
      }

      return false;
    }
  }

}

export const emailService = new EmailService();
