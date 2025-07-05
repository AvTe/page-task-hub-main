import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  Home, 
  Users, 
  Settings, 
  Plus, 
  Search,
  Bell,
  User,
  LogOut,
  Workspace,
  FileText,
  CheckSquare,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';

interface MobileNavigationProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
  unreadNotifications?: number;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentPage = 'dashboard',
  onNavigate,
  unreadNotifications = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useSupabaseAuth();
  const { workspace, workspaces, switchWorkspace } = useSupabaseWorkspace();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'pages', label: 'Pages', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavigate = (page: string) => {
    onNavigate?.(page);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                  <SheetDescription className="text-left">
                    Access all features and settings
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* User Info */}
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                      {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user?.user_metadata?.full_name || 'User'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  {/* Current Workspace */}
                  {workspace && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Current Workspace</p>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Workspace className="h-4 w-4" />
                        <span className="font-medium">{workspace.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {workspace.role}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Navigation Items */}
                  <nav className="space-y-1">
                    {navigationItems.map(item => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleNavigate(item.id)}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {item.label}
                          {item.id === 'notifications' && unreadNotifications > 0 && (
                            <Badge variant="destructive" className="ml-auto text-xs">
                              {unreadNotifications}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </nav>

                  <Separator />

                  {/* Workspace Switcher */}
                  {workspaces.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Switch Workspace</p>
                      <div className="space-y-1">
                        {workspaces.filter(w => w.id !== workspace?.id).map(ws => (
                          <Button
                            key={ws.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              switchWorkspace(ws.id);
                              setIsOpen(false);
                            }}
                          >
                            <Workspace className="h-4 w-4 mr-2" />
                            {ws.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Sign Out */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg">
                {workspace?.name || 'Page Task Hub'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Badge>
              )}
            </Button>

            <Button variant="ghost" size="sm">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navigationItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className="flex flex-col gap-1 h-auto py-2"
                onClick={() => handleNavigate(item.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Mobile Content Padding */}
      <style jsx global>{`
        @media (max-width: 1023px) {
          .mobile-content {
            padding-top: 4rem;
            padding-bottom: 5rem;
          }
        }
      `}</style>
    </>
  );
};

export default MobileNavigation;
