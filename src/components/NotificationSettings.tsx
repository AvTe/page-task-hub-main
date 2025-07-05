import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, CheckSquare, Users, Settings } from 'lucide-react';

interface NotificationPreferences {
  emailNotifications: boolean;
  taskAssignments: boolean;
  taskComments: boolean;
  taskStatusChanges: boolean;
  workspaceUpdates: boolean;
  memberActivity: boolean;
  digestEmails: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
}

interface NotificationSettingsProps {
  workspaceId?: string;
  isGlobal?: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ 
  workspaceId, 
  isGlobal = false 
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    taskAssignments: true,
    taskComments: true,
    taskStatusChanges: true,
    workspaceUpdates: true,
    memberActivity: false,
    digestEmails: true,
    digestFrequency: 'daily'
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, save to Supabase
      // await supabase.from('user_notification_preferences').upsert({
      //   user_id: user.id,
      //   workspace_id: workspaceId,
      //   preferences: preferences
      // });

      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Notification preferences saved!');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {isGlobal ? 'Global Notification Settings' : 'Workspace Notification Settings'}
        </CardTitle>
        <CardDescription>
          {isGlobal 
            ? 'Configure your default notification preferences for all workspaces'
            : 'Configure notification preferences for this workspace'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email-notifications" className="text-base font-medium">
                Email Notifications
              </Label>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
            />
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Receive email notifications for important updates
          </p>
        </div>

        <Separator />

        {/* Task Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Task Notifications
          </h3>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-assignments" className="text-sm">
                Task assignments
              </Label>
              <Switch
                id="task-assignments"
                checked={preferences.taskAssignments}
                onCheckedChange={(checked) => handleToggle('taskAssignments', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="task-comments" className="text-sm">
                Task comments and mentions
              </Label>
              <Switch
                id="task-comments"
                checked={preferences.taskComments}
                onCheckedChange={(checked) => handleToggle('taskComments', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="task-status" className="text-sm">
                Task status changes
              </Label>
              <Switch
                id="task-status"
                checked={preferences.taskStatusChanges}
                onCheckedChange={(checked) => handleToggle('taskStatusChanges', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Workspace Notifications */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Workspace Notifications
          </h3>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="workspace-updates" className="text-sm">
                Workspace updates and announcements
              </Label>
              <Switch
                id="workspace-updates"
                checked={preferences.workspaceUpdates}
                onCheckedChange={(checked) => handleToggle('workspaceUpdates', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="member-activity" className="text-sm">
                Member activity (joins, leaves)
              </Label>
              <Switch
                id="member-activity"
                checked={preferences.memberActivity}
                onCheckedChange={(checked) => handleToggle('memberActivity', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Digest Emails */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Digest Emails
          </h3>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="digest-emails" className="text-sm">
                Receive digest emails
              </Label>
              <Switch
                id="digest-emails"
                checked={preferences.digestEmails}
                onCheckedChange={(checked) => handleToggle('digestEmails', checked)}
                disabled={!preferences.emailNotifications}
              />
            </div>
            
            {preferences.digestEmails && preferences.emailNotifications && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Frequency:</Label>
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'never'] as const).map((freq) => (
                    <Button
                      key={freq}
                      variant={preferences.digestFrequency === freq ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreferences(prev => ({ ...prev, digestFrequency: freq }))}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Settings className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Note:</p>
              <p>
                Email notifications are currently in demo mode. In a production environment, 
                you would receive actual emails based on these preferences.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
