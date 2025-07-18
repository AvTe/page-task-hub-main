import React, { useState } from 'react';
import ModernHeader from './ModernHeader';
import ModernSidebar from './ModernSidebar';

interface ModernLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  showSidebar = true
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Sidebar */}
      {showSidebar && (
        <ModernSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      )}

      {/* Main Content with margin for sidebar */}
      <main className={`flex flex-col ${showSidebar ? (sidebarCollapsed ? 'ml-16' : 'ml-80') : 'ml-0'} transition-all duration-300`}>
        {/* Header */}
        <ModernHeader onToggleSidebar={toggleSidebar} />

        {/* Page Content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ModernLayout;
