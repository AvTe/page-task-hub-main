
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useSearch } from '../contexts/SearchContext';
import WorkspaceSelector from './WorkspaceSelector';
import NotificationCenter from './NotificationCenter';
import { LogOut, User, Users, ChevronDown, Search, Command } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { state } = useTask();
  const { user, signOut } = useAuth();
  const { currentWorkspace, userWorkspaces } = useWorkspace();
  const { openSearch } = useSearch();
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/websites', label: 'My Websites' },
    ...(state.pages.length > 0 ? [{ path: '/tasker', label: 'Task Dashboard' }] : [])
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-coral-orange to-cornflower-blue bg-clip-text text-transparent">
              ProjectManager
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={openSearch}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Workspace Selector */}
            <Popover open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="max-w-32 truncate">
                    {currentWorkspace?.name || (userWorkspaces.length > 0 ? 'Select Workspace' : 'Create Workspace')}
                  </span>
                  {currentWorkspace && (
                    <Badge variant="secondary" className="text-xs">
                      {currentWorkspace.members.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <WorkspaceSelector />
              </PopoverContent>
            </Popover>

            {/* Navigation Items */}
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={location.pathname === item.path ? "default" : "ghost"}
                    className={location.pathname === item.path ? 
                      "bg-gradient-to-r from-coral-orange to-cornflower-blue" : ""
                    }
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
            
            {user && (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-2">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || user.email || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {user.user_metadata?.full_name || user.email || 'User'}
                  </span>
                </div>

                {/* Notification Center */}
                <NotificationCenter />

                <Button
                  onClick={signOut}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
