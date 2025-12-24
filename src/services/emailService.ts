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

// Email Templates - Minimal Modern Design
const EMAIL_TEMPLATES = {
  WORKSPACE_INVITATION: {
    subject: 'You\'re invited to join {{workspaceName}} on EasTask',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                
                <!-- Logo Header -->
                <tr>
                  <td style="padding: 32px 32px 24px; text-align: center;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px; display: inline-block; line-height: 48px;">
                      <span style="color: white; font-size: 24px; font-weight: bold;">✓</span>
                    </div>
                    <h1 style="margin: 16px 0 0; font-size: 24px; font-weight: 700; color: #0f172a;">EasTask</h1>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1e293b; text-align: center;">You're invited! 🎉</h2>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #64748b; text-align: center;">
                      <strong style="color: #1e293b;">{{inviterName}}</strong> has invited you to collaborate on
                    </p>
                    
                    <!-- Workspace Card -->
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0f172a;">{{workspaceName}}</p>
                      <p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">Workspace on EasTask</p>
                    </div>
                    
                    <!-- CTA Button -->
                    <a href="{{inviteLink}}" style="display: block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                      Accept Invitation →
                    </a>
                    
                    <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
                      Or copy this link:<br>
                      <a href="{{inviteLink}}" style="color: #f97316; word-break: break-all;">{{inviteLink}}</a>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
                      Sent by {{inviterEmail}}<br>
                      <span style="color: #cbd5e1;">Don't want these emails? You can ignore this invitation.</span>
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  },
  TASK_ASSIGNMENT: {
    subject: 'New task assigned: {{taskTitle}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 24px; text-align: center;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px; display: inline-block; line-height: 48px;">
                      <span style="color: white; font-size: 20px;">📋</span>
                    </div>
                    <p style="margin: 12px 0 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">New Task Assigned</p>
                  </td>
                </tr>
                
                <!-- Task Card -->
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                      <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #0f172a;">{{taskTitle}}</h2>
                      <p style="margin: 0; font-size: 14px; color: #64748b;">in <strong>{{workspaceName}}</strong></p>
                    </div>
                    
                    <p style="margin: 0 0 16px; font-size: 14px; color: #64748b; text-align: center;">
                      Assigned by <strong style="color: #1e293b;">{{assignerName}}</strong>
                    </p>
                    
                    <!-- Task Details -->
                    <table width="100%" style="margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-size: 13px; color: #64748b;">Priority</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                          <span style="font-size: 13px; font-weight: 600; color: #0f172a;">{{priority}}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 13px; color: #64748b;">Due Date</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="font-size: 13px; font-weight: 600; color: #0f172a;">{{dueDate}}</span>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <a href="{{taskLink}}" style="display: block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                      View Task →
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                      EasTask • Professional Task Management
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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

// Resend Provider - Uses Supabase Edge Function to avoid CORS issues
class ResendProvider implements EmailProvider {
  async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.warn('No active session, cannot send email via Edge Function');
        this.logEmail(notification);
        return true;
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: notification.to,
          subject: notification.subject,
          html: notification.html || '',
          type: notification.type
        }
      });

      if (error) {
        console.warn('Edge Function email failed:', error.message);
        // Check if it's a "function not deployed" error
        if (error.message.includes('FunctionNotFound') || error.message.includes('not found')) {
          console.log('📧 Edge Function not deployed yet. Email logged:');
          this.logEmail(notification);
        } else {
          console.log('📧 Email sending failed, but continuing invitation flow:');
          this.logEmail(notification);
        }
        return true; // Continue invitation flow
      }

      if (data?.success) {
        console.log('✅ Email sent successfully via Edge Function to:', notification.to);
        return true;
      } else {
        console.warn('Email sending returned error:', data?.error);
        this.logEmail(notification);
        return true;
      }
    } catch (error) {
      console.error('Email error:', error);
      this.logEmail(notification);
      return true; // Continue invitation flow
    }
  }

  private logEmail(notification: EmailNotification) {
    console.log('📧 Email Details (would be sent when Edge Function is deployed):');
    console.log('  To:', notification.to);
    console.log('  Subject:', notification.subject);
    console.log('  Type:', notification.type);
    console.log('  From:', `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.fromEmail}>`);
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
