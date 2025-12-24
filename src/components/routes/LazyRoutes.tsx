import { lazy } from 'react';

// =====================================================
// LAZY-LOADED PAGE COMPONENTS
// =====================================================

// Authentication Pages
export const LazyLogin = lazy(() => import('../../pages/Login'));
// Note: Landing is NOT lazy-loaded because it's used on the critical auth path

// Main Application Pages
export const LazyHome = lazy(() => import('../../pages/Home'));
export const LazyTasker = lazy(() => import('../../pages/Tasker'));
export const LazyProfile = lazy(() => import('../../pages/Profile'));
export const LazySettings = lazy(() => import('../../pages/Settings'));

// Workspace Pages
export const LazyWorkspaceManagement = lazy(() => import('../../pages/WorkspaceManagement'));

// Calendar and Analytics
export const LazyCalendar = lazy(() => import('../../pages/Calendar'));
export const LazyAnalytics = lazy(() => import('../../pages/Analytics'));

// Team and Other Pages
export const LazyTeam = lazy(() => import('../../pages/Team'));
export const LazyWebsites = lazy(() => import('../../pages/Websites'));

// =====================================================
// LAZY-LOADED COMPONENT GROUPS
// =====================================================

// Modal Components
export const LazyTaskModal = lazy(() => import('../EnhancedTaskModal'));
export const LazyPageModal = lazy(() => import('../AddPageModal'));
export const LazyInvitationModal = lazy(() => import('../InvitationManager'));

// Complex Components
export const LazyWorkspaceSelector = lazy(() => import('../WorkspaceSelector'));
// Note: NotificationCenter is NOT lazy-loaded because it's used in ModernHeader
// Note: GlobalSearchModal is NOT lazy-loaded because it's used in App.tsx
export const LazyTimeTracker = lazy(() => import('../TimeTracker'));

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Preload a lazy component
 * @param lazyComponent - The lazy component to preload
 */
export const preloadComponent = (lazyComponent: any) => {
  if (typeof lazyComponent === 'function') {
    lazyComponent();
  }
};

/**
 * Preload multiple components
 * @param components - Array of lazy components to preload
 */
export const preloadComponents = (components: any[]) => {
  components.forEach(preloadComponent);
};

/**
 * Preload critical components on app start
 */
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used immediately
  // Note: NotificationCenter is statically imported so no need to preload
  preloadComponents([
    LazyHome,
    LazyTasker,
    LazyWorkspaceSelector
  ]);
};

/**
 * Preload components on user interaction (hover, focus, etc.)
 */
export const preloadOnInteraction = (componentName: string) => {
  const componentMap: Record<string, any> = {
    'home': LazyHome,
    'tasker': LazyTasker,
    'task-modal': LazyTaskModal,
    'page-modal': LazyPageModal,
    'workspace-management': LazyWorkspaceManagement,
    'profile': LazyProfile,
    'settings': LazySettings,
    'calendar': LazyCalendar,
    'analytics': LazyAnalytics,
    'team': LazyTeam,
    'websites': LazyWebsites
  };

  const component = componentMap[componentName];
  if (component) {
    preloadComponent(component);
  }
};
