import React, { useEffect, useState, useRef } from 'react';
import { useWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { UserPresence } from '../types/workspace';

interface CollaborationOverlayProps {
  children: React.ReactNode;
}

const CollaborationOverlay: React.FC<CollaborationOverlayProps> = ({ children }) => {
  const { onlineUsers, updateUserPresence, currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Track mouse movement and update presence
  useEffect(() => {
    if (!user || !currentWorkspace) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        setMousePosition({ x: e.clientX, y: e.clientY });
        
        // Throttle presence updates
        updateUserPresence({
          cursor: { x, y },
          currentPage: window.location.pathname,
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
      }
    };

    const handleVisibilityChange = () => {
      updateUserPresence({
        isOnline: !document.hidden,
        lastSeen: new Date().toISOString()
      });
    };

    // Throttle mouse move events
    let throttleTimer: NodeJS.Timeout;
    const throttledMouseMove = (e: MouseEvent) => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        handleMouseMove(e);
        throttleTimer = null as any;
      }, 100);
    };

    document.addEventListener('mousemove', throttledMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Update presence on mount
    updateUserPresence({
      isOnline: true,
      lastSeen: new Date().toISOString(),
      currentPage: window.location.pathname
    });

    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (throttleTimer) clearTimeout(throttleTimer);
      
      // Mark as offline on unmount
      updateUserPresence({
        isOnline: false,
        lastSeen: new Date().toISOString()
      });
    };
  }, [user, currentWorkspace, updateUserPresence]);

  // Filter out current user and offline users
  const otherOnlineUsers = onlineUsers.filter(
    presence => presence.userId !== user?.id &&
    presence.isOnline && 
    presence.workspaceId === currentWorkspace?.id &&
    presence.currentPage === window.location.pathname
  );

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {children}
      
      {/* Render other users' cursors */}
      {otherOnlineUsers.map((presence) => {
        if (!presence.cursor) return null;
        
        const member = currentWorkspace?.members.find(m => m.userId === presence.userId);
        if (!member) return null;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const x = (presence.cursor.x / 100) * rect.width;
        const y = (presence.cursor.y / 100) * rect.height;

        return (
          <UserCursor
            key={presence.userId}
            x={x}
            y={y}
            user={member}
          />
        );
      })}
      
      {/* Online users indicator */}
      {otherOnlineUsers.length > 0 && (
        <OnlineUsersIndicator users={otherOnlineUsers} />
      )}
    </div>
  );
};

interface UserCursorProps {
  x: number;
  y: number;
  user: {
    userId: string;
    displayName: string;
    photoURL?: string;
  };
}

const UserCursor: React.FC<UserCursorProps> = ({ x, y, user }) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];
  
  // Generate consistent color based on user ID
  const colorIndex = user.userId.charCodeAt(0) % colors.length;
  const cursorColor = colors[colorIndex];

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-100 ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)'
      }}
    >
      {/* Cursor */}
      <div className="relative">
        <svg
          width="24"
          height="36"
          viewBox="0 0 24 36"
          fill="none"
          className="drop-shadow-md"
        >
          <path
            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
            fill="white"
            stroke="black"
            strokeWidth="1"
          />
        </svg>
        
        {/* User indicator */}
        <div className={`absolute top-6 left-6 ${cursorColor} rounded-full px-2 py-1 text-white text-xs font-medium shadow-lg whitespace-nowrap flex items-center gap-1 max-w-32`}>
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName}
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs text-gray-800">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="truncate">{user.displayName}</span>
        </div>
      </div>
    </div>
  );
};

interface OnlineUsersIndicatorProps {
  users: UserPresence[];
}

const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({ users }) => {
  const { currentWorkspace } = useWorkspace();
  
  return (
    <div className="fixed top-4 right-4 z-40 bg-white rounded-lg shadow-lg border p-2">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {users.slice(0, 3).map((presence) => {
            const member = currentWorkspace?.members.find(m => m.userId === presence.userId);
            if (!member) return null;
            
            return (
              <div
                key={presence.userId}
                className="relative"
                title={`${member.displayName} is online`}
              >
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="w-8 h-8 rounded-full border-2 border-white"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full border-2 border-white flex items-center justify-center text-white text-sm font-medium">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
            );
          })}
          
          {users.length > 3 && (
            <div className="w-8 h-8 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
              +{users.length - 3}
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {users.length === 1 ? '1 person' : `${users.length} people`} online
        </div>
      </div>
    </div>
  );
};

export default CollaborationOverlay;
