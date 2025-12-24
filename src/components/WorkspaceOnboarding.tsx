import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { toast } from 'sonner';
import {
    Users,
    Plus,
    Link as LinkIcon,
    Building2,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    UserPlus,
    FolderKanban,
    Target
} from 'lucide-react';

interface WorkspaceOnboardingProps {
    onWorkspaceCreated?: () => void;
}

const WorkspaceOnboarding: React.FC<WorkspaceOnboardingProps> = ({ onWorkspaceCreated }) => {
    const navigate = useNavigate();
    const { createWorkspace, joinWorkspaceByCode, loading } = useSupabaseWorkspace();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showJoinDialog, setShowJoinDialog] = useState(false);
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceDescription, setWorkspaceDescription] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);

    const handleCreateWorkspace = async () => {
        if (!workspaceName.trim()) {
            toast.error('Please enter a workspace name');
            return;
        }

        setCreating(true);
        try {
            await createWorkspace({
                name: workspaceName.trim(),
                description: workspaceDescription.trim(),
                settings: {
                    isPublic: false,
                    allowGuestAccess: false,
                    requireApprovalForJoining: false,
                    defaultMemberRole: 'member',
                    notificationSettings: {
                        emailNotifications: true,
                        taskAssignments: true,
                        taskComments: true,
                        taskStatusChanges: true,
                        workspaceUpdates: true
                    }
                }
            });
            setShowCreateDialog(false);
            setWorkspaceName('');
            setWorkspaceDescription('');
            onWorkspaceCreated?.();
            toast.success('Workspace created successfully! 🎉');
        } catch (error) {
            console.error('Error creating workspace:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleJoinWorkspace = async () => {
        if (!inviteCode.trim()) {
            toast.error('Please enter an invite code');
            return;
        }

        setJoining(true);
        try {
            // Handle full URL or just the code
            let code = inviteCode.trim();
            if (code.includes('/join/')) {
                code = code.split('/join/').pop() || code;
            }

            await joinWorkspaceByCode(code);
            setShowJoinDialog(false);
            setInviteCode('');
            onWorkspaceCreated?.();
        } catch (error) {
            console.error('Error joining workspace:', error);
        } finally {
            setJoining(false);
        }
    };

    const features = [
        {
            icon: <Users className="h-6 w-6 text-orange-500" />,
            title: 'Team Collaboration',
            description: 'Invite team members and work together on tasks'
        },
        {
            icon: <FolderKanban className="h-6 w-6 text-blue-500" />,
            title: 'Organize Projects',
            description: 'Create pages to organize tasks by project or website'
        },
        {
            icon: <Target className="h-6 w-6 text-green-500" />,
            title: 'Track Progress',
            description: 'Assign tasks, set due dates, and track completion'
        },
        {
            icon: <UserPlus className="h-6 w-6 text-purple-500" />,
            title: 'Easy Invitations',
            description: 'Share invite links to quickly add team members'
        }
    ];

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
            {/* Welcome Section */}
            <div className="text-center mb-8 max-w-2xl">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <Building2 className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">
                    Welcome to EasTask! 🎉
                </h1>
                <p className="text-xl text-muted-foreground mb-2">
                    Your journey to better task management starts here.
                </p>
                <p className="text-muted-foreground">
                    Create a workspace to organize your tasks and collaborate with your team.
                </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
                {/* Create Workspace Card */}
                <Card className="border-2 border-dashed border-primary/50 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => setShowCreateDialog(true)}>
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-xl">Create a Workspace</CardTitle>
                        <CardDescription>
                            Start fresh with your own workspace
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button className="btn-orange w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Workspace
                        </Button>
                    </CardContent>
                </Card>

                {/* Join Workspace Card */}
                <Card className="border-2 border-dashed border-muted-foreground/50 hover:border-muted-foreground hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => setShowJoinDialog(true)}>
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <LinkIcon className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-xl">Join a Workspace</CardTitle>
                        <CardDescription>
                            Enter an invite code to join an existing team
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button variant="outline" className="w-full">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Join with Invite Code
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Features Section */}
            <div className="w-full max-w-4xl">
                <h2 className="text-2xl font-semibold text-center mb-6">
                    What you can do with workspaces
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map((feature, index) => (
                        <Card key={index} className="text-center p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-center mb-3">
                                {feature.icon}
                            </div>
                            <h3 className="font-semibold mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Create Workspace Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-orange-500" />
                            Create Your Workspace
                        </DialogTitle>
                        <DialogDescription>
                            Give your workspace a name and optional description to get started.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label htmlFor="workspace-name">Workspace Name *</Label>
                            <Input
                                id="workspace-name"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                placeholder="e.g., My Team, Project Alpha, Marketing"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="workspace-desc">Description (Optional)</Label>
                            <Textarea
                                id="workspace-desc"
                                value={workspaceDescription}
                                onChange={(e) => setWorkspaceDescription(e.target.value)}
                                placeholder="What is this workspace for?"
                                className="mt-1"
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateWorkspace}
                                disabled={creating || !workspaceName.trim()}
                                className="btn-orange"
                            >
                                {creating ? 'Creating...' : 'Create Workspace'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Join Workspace Dialog */}
            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-blue-500" />
                            Join a Workspace
                        </DialogTitle>
                        <DialogDescription>
                            Enter the invite code or paste the invite link shared with you.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label htmlFor="invite-code">Invite Code or Link *</Label>
                            <Input
                                id="invite-code"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                placeholder="Paste invite link or code here..."
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Example: abc123xyz or https://app.com/join/abc123xyz
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleJoinWorkspace}
                                disabled={joining || !inviteCode.trim()}
                            >
                                {joining ? 'Joining...' : 'Join Workspace'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WorkspaceOnboarding;
