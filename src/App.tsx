

import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./lib/queryClient";
import { createCacheMonitoringService } from "./services/cacheMonitoringService";
import CacheDebugPanel from "./components/CacheDebugPanel";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SupabaseAuthProvider } from "./contexts/SupabaseAuthContext";
import { SupabaseWorkspaceProvider } from "./contexts/SupabaseWorkspaceContext";
import { TaskProvider } from "./contexts/TaskContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SearchProvider, useSearch } from "./contexts/SearchContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AsyncErrorBoundary from "./components/AsyncErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import CollaborationOverlay from "./components/CollaborationOverlay";
import Navbar from "./components/Navbar";
import SearchCommandPalette from "./components/SearchCommandPalette";
import GlobalSearchModal from "./components/GlobalSearchModal";

// Lazy-loaded components
import {
  LazyHome,
  LazyTasker,
  LazyProfile,
  LazySettings,
  LazyWorkspaceManagement,
  LazyCalendar,
  LazyAnalytics,
  LazyTeam,
  LazyWebsites,
  LazyNotificationCenter,
  preloadCriticalComponents
} from "./components/routes/LazyRoutes";

// Suspense wrappers
import LazyPageWrapper from "./components/suspense/LazyPageWrapper";
import SuspenseWrapper from "./components/suspense/SuspenseWrapper";

// Non-lazy components (keep these for critical path)
import AddPage from "./pages/AddPage";
import JoinWorkspace from "./pages/JoinWorkspace";
import WebsiteManager from "./components/WebsiteManager";
import FeatureDemo from "./pages/FeatureDemo";
import Landing from "./pages/Landing";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Create query client with advanced caching configuration
const queryClient = createQueryClient();

// Initialize cache monitoring service
createCacheMonitoringService(queryClient);

// AppContent component that uses search context
const AppContent = () => {
  const { isSearchOpen, closeSearch } = useSearch();

  // Preload critical components on app start
  React.useEffect(() => {
    preloadCriticalComponents();
  }, []);

  return (
    <>
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join/:inviteCode" element={<JoinWorkspace />} />

            {/* Protected routes with Suspense */}
            <Route path="/*" element={
              <ProtectedRoute>
                <CollaborationOverlay>
                  <Routes>
                    {/* Main pages with Suspense */}
                    <Route path="/" element={
                      <LazyPageWrapper loadingText="Loading dashboard...">
                        <LazyHome />
                      </LazyPageWrapper>
                    } />

                    <Route path="/tasker" element={
                      <LazyPageWrapper loadingText="Loading task manager...">
                        <LazyTasker />
                      </LazyPageWrapper>
                    } />

                    <Route path="/team" element={
                      <LazyPageWrapper loadingText="Loading team page...">
                        <LazyTeam />
                      </LazyPageWrapper>
                    } />

                    <Route path="/analytics" element={
                      <LazyPageWrapper loadingText="Loading analytics...">
                        <LazyAnalytics />
                      </LazyPageWrapper>
                    } />

                    <Route path="/calendar" element={
                      <LazyPageWrapper loadingText="Loading calendar...">
                        <LazyCalendar />
                      </LazyPageWrapper>
                    } />

                    <Route path="/profile" element={
                      <LazyPageWrapper loadingText="Loading profile...">
                        <LazyProfile />
                      </LazyPageWrapper>
                    } />

                    <Route path="/settings" element={
                      <LazyPageWrapper loadingText="Loading settings...">
                        <LazySettings />
                      </LazyPageWrapper>
                    } />

                    <Route path="/workspaces" element={
                      <LazyPageWrapper loadingText="Loading workspace management...">
                        <LazyWorkspaceManagement />
                      </LazyPageWrapper>
                    } />

                    <Route path="/workspace-management" element={
                      <LazyPageWrapper loadingText="Loading workspace management...">
                        <LazyWorkspaceManagement />
                      </LazyPageWrapper>
                    } />

                    {/* Websites page with Suspense */}
                    <Route path="/websites" element={
                      <LazyPageWrapper loadingText="Loading websites...">
                        <LazyWebsites />
                      </LazyPageWrapper>
                    } />

                    {/* Non-lazy routes (keep for critical path or small components) */}
                    <Route path="/features" element={<FeatureDemo />} />
                    <Route path="/add-page" element={<AddPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </CollaborationOverlay>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={closeSearch}
        onResultClick={(result) => {
          closeSearch();
        }}
      />

      {/* Search Command Palette */}
      <SearchCommandPalette
        onNavigate={(path) => {
          // Handle navigation
        }}
        onCreateTask={() => {
          // Handle task creation
        }}
        onCreatePage={() => {
          // Handle page creation
        }}
        onOpenSettings={() => {
          // Handle settings
        }}
      />
    </>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <SupabaseAuthProvider>
              <NotificationProvider>
                <SupabaseWorkspaceProvider>
                  <AsyncErrorBoundary>
                    <TaskProvider>
                      <AsyncErrorBoundary>
                        <SearchProvider>
                          <Toaster />
                          <Sonner />
                          <AppContent />
                          {/* Cache Debug Panel - only in development */}
                          {import.meta.env.DEV && <CacheDebugPanel />}
                        </SearchProvider>
                      </AsyncErrorBoundary>
                    </TaskProvider>
                  </AsyncErrorBoundary>
                </SupabaseWorkspaceProvider>
              </NotificationProvider>
            </SupabaseAuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
