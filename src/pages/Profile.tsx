import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { supabase } from '../lib/supabase';
import ModernLayout from '../components/ModernLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Camera,
  Edit3,
  Save,
  X,
  Building,
  Globe,
  Clock,
  Award,
  Target,
  Users
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useSupabaseWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    location: '',
    jobTitle: '',
    department: '',
    employeeId: '',
    bio: '',
    timezone: 'UTC',
    pronouns: '',
    startDate: '',
    manager: '',
    skills: [] as string[],
    profileImage: '',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    preferredCommunication: 'email',
    goalsObjectives: ''
  });

  const [userStats, setUserStats] = useState({
    tasksCompleted: 0,
    projectsCount: 0,
    hoursLogged: 0,
    onTimeRate: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // Load user profile data
  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
      loadUserStats();
      loadRecentActivity();
    }
  }, [user?.id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);

        // If table doesn't exist, show helpful message
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          console.warn('Profile tables not found. Please run the database schema first.');
          setLoading(false);
          return;
        }
        return;
      }

      if (data) {
        setProfileData({
          fullName: data.full_name || '',
          email: user?.email || '',
          phone: data.phone || '',
          location: data.location || '',
          jobTitle: data.job_title || '',
          department: data.department || '',
          employeeId: data.employee_id || '',
          bio: data.bio || '',
          timezone: data.timezone || 'UTC',
          pronouns: data.pronouns || '',
          startDate: data.start_date || '',
          manager: data.manager || '',
          skills: data.skills || [],
          profileImage: data.profile_image_url || user?.user_metadata?.avatar_url || '',
          workingHoursStart: data.working_hours_start || '09:00',
          workingHoursEnd: data.working_hours_end || '17:00',
          preferredCommunication: data.preferred_communication || 'email',
          goalsObjectives: data.goals_objectives || ''
        });
      } else {
        // Create initial profile if it doesn't exist
        setProfileData(prev => ({
          ...prev,
          fullName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
          profileImage: user?.user_metadata?.avatar_url || ''
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setUserStats({
          tasksCompleted: data.tasks_completed || 0,
          projectsCount: data.projects_count || 0,
          hoursLogged: data.hours_logged || 0,
          onTimeRate: data.on_time_rate || 0
        });
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setRecentActivity(data);
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const profileUpdateData = {
        user_id: user?.id,
        full_name: profileData.fullName,
        phone: profileData.phone,
        location: profileData.location,
        job_title: profileData.jobTitle,
        department: profileData.department,
        employee_id: profileData.employeeId,
        bio: profileData.bio,
        timezone: profileData.timezone,
        pronouns: profileData.pronouns,
        start_date: profileData.startDate || null,
        manager: profileData.manager,
        skills: profileData.skills,
        profile_image_url: profileData.profileImage,
        working_hours_start: profileData.workingHoursStart,
        working_hours_end: profileData.workingHoursEnd,
        preferred_communication: profileData.preferredCommunication,
        goals_objectives: profileData.goalsObjectives,
        updated_at: new Date().toISOString()
      };

      // Try to update first, then insert if doesn't exist
      let { error } = await supabase
        .from('user_profiles')
        .update(profileUpdateData)
        .eq('user_id', user?.id);

      if (error && error.code === 'PGRST116') {
        // Record doesn't exist, try to insert
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(profileUpdateData);
        error = insertError;
      }

      if (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile. Please try again.');
        return;
      }

      // Log activity
      await supabase.rpc('log_user_activity', {
        p_user_id: user?.id,
        p_activity_type: 'profile_update',
        p_activity_description: 'Updated profile information',
        p_metadata: { fields_updated: Object.keys(profileUpdateData) }
      });

      setIsEditing(false);
      loadRecentActivity(); // Refresh activity
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadUserProfile(); // Reset to original data
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user?.id) {
      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);

          // If storage bucket doesn't exist, use a fallback approach
          if (uploadError.message?.includes('bucket') || uploadError.statusCode === 400) {
            alert('Image upload is not configured yet. Please set up Supabase Storage first. Using profile without image for now.');
            return;
          }

          alert('Error uploading image. Please try again.');
          return;
        }

        // Get public URL
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        setProfileData(prev => ({
          ...prev,
          profileImage: data.publicUrl
        }));

        // Log activity
        await supabase.rpc('log_user_activity', {
          p_user_id: user.id,
          p_activity_type: 'profile_image_update',
          p_activity_description: 'Updated profile image',
          p_metadata: { image_url: data.publicUrl }
        });

      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image. Please try again.');
      }
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  return (
    <ModernLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and preferences
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} disabled={loading}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="work">Work Details</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your basic personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.profileImage} alt="Profile" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl">
                        {profileData.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="sm"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold">{profileData.fullName || 'Your Name'}</h3>
                    <p className="text-muted-foreground">{profileData.jobTitle || 'Job Title'}</p>
                    <p className="text-sm text-muted-foreground">{currentWorkspace?.name}</p>
                  </div>
                </div>

                <Separator />

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Select
                      value={profileData.pronouns}
                      onValueChange={(value) => setProfileData(prev => ({ ...prev, pronouns: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pronouns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="he/him">He/Him</SelectItem>
                        <SelectItem value="she/her">She/Her</SelectItem>
                        <SelectItem value="they/them">They/Them</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="bg-muted"
                      icon={<Mail className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      icon={<Phone className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={profileData.timezone}
                      onValueChange={(value) => setProfileData(prev => ({ ...prev, timezone: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="EST">Eastern Time</SelectItem>
                        <SelectItem value="PST">Pacific Time</SelectItem>
                        <SelectItem value="GMT">GMT</SelectItem>
                        <SelectItem value="IST">India Standard Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-muted' : ''}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Details Tab */}
          <TabsContent value="work" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Work Information
                </CardTitle>
                <CardDescription>
                  Your professional details and organizational information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={profileData.employeeId}
                      onChange={(e) => setProfileData(prev => ({ ...prev, employeeId: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      placeholder="EMP001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={profileData.jobTitle}
                      onChange={(e) => setProfileData(prev => ({ ...prev, jobTitle: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      placeholder="Software Engineer"
                      icon={<Briefcase className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={profileData.department}
                      onValueChange={(value) => setProfileData(prev => ({ ...prev, department: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={profileData.startDate}
                      onChange={(e) => setProfileData(prev => ({ ...prev, startDate: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      icon={<Calendar className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manager">Manager</Label>
                    <Input
                      id="manager"
                      value={profileData.manager}
                      onChange={(e) => setProfileData(prev => ({ ...prev, manager: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-muted' : ''}
                      placeholder="Manager Name"
                      icon={<Users className="h-4 w-4" />}
                    />
                  </div>
                </div>

                <Separator />

                {/* Skills Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Skills & Expertise</Label>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Input
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Add a skill"
                          className="w-40"
                          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                        />
                        <Button size="sm" onClick={addSkill}>Add</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        {isEditing && (
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => removeSkill(skill)}
                          />
                        )}
                      </Badge>
                    ))}
                    {profileData.skills.length === 0 && (
                      <p className="text-sm text-muted-foreground">No skills added yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Work Preferences
                </CardTitle>
                <CardDescription>
                  Configure your work style and notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Working Hours</Label>
                    <div className="flex gap-2">
                      <Input placeholder="9:00 AM" disabled={!isEditing} />
                      <span className="flex items-center">to</span>
                      <Input placeholder="5:00 PM" disabled={!isEditing} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Communication</Label>
                    <Select disabled={!isEditing}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="slack">Slack</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Goals & Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="What are your current goals and objectives?"
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-muted' : ''}
                  rows={4}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your recent actions and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.activity_type === 'profile_update' ? 'bg-blue-500' :
                          activity.activity_type === 'task_completed' ? 'bg-green-500' :
                          activity.activity_type === 'project_joined' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.activity_description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recent activity to display</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-600">{userStats.tasksCompleted}</div>
                    <div className="text-sm text-muted-foreground">Tasks Completed</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-600">{userStats.projectsCount}</div>
                    <div className="text-sm text-muted-foreground">Projects</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-orange-600">{userStats.hoursLogged}</div>
                    <div className="text-sm text-muted-foreground">Hours Logged</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-purple-600">{userStats.onTimeRate}%</div>
                    <div className="text-sm text-muted-foreground">On-time Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModernLayout>
  );
};

export default Profile;
