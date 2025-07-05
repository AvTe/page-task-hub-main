

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupabaseAuthProvider } from "./contexts/SupabaseAuthContext";
import { SupabaseWorkspaceProvider } from "./contexts/SupabaseWorkspaceContext";
import { TaskProvider } from "./contexts/TaskContext";
import { NotificationProvider } from "./contexts/NotificationContext";
// import { SearchProvider, useSearch } from "./contexts/SearchContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import CollaborationOverlay from "./components/CollaborationOverlay";
import Navbar from "./components/Navbar";
// import GlobalSearchModal from "./components/GlobalSearchModal";
// import SearchCommandPalette from "./components/SearchCommandPalette";
import Home from "./pages/Home";
import Tasker from "./pages/Tasker";
import AddPage from "./pages/AddPage";
import JoinWorkspace from "./pages/JoinWorkspace";
import WebsiteManager from "./components/WebsiteManager";
import SupabaseTest from "./pages/SupabaseTest";
import TestTaskManagement from "./pages/TestTaskManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// AppContent component that uses search context
const AppContent = () => {
  // const { isSearchOpen, closeSearch } = useSearch();

  return (
    <>
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            {/* Public route for joining workspaces */}
            <Route path="/join/:inviteCode" element={<JoinWorkspace />} />

            {/* Protected routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <CollaborationOverlay>
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/tasker" element={<Tasker />} />
                    <Route path="/websites" element={<WebsiteManager />} />
                    <Route path="/add-page" element={<AddPage />} />
                    <Route path="/supabase-test" element={<SupabaseTest />} />
                    <Route path="/test-tasks" element={<TestTaskManagement />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </CollaborationOverlay>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>

      {/* Global Search Modal - Temporarily disabled */}
      {/* <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={closeSearch}
        onResultClick={(result) => {
          console.log('Search result clicked:', result);
          closeSearch();
        }}
      /> */}

      {/* Search Command Palette - Temporarily disabled */}
      {/* <SearchCommandPalette
        onNavigate={(path) => {
          console.log('Navigate to:', path);
        }}
        onCreateTask={() => {
          console.log('Create task');
        }}
        onCreatePage={() => {
          console.log('Create page');
        }}
        onOpenSettings={() => {
          console.log('Open settings');
        }}
      /> */}
    </>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SupabaseAuthProvider>
            <SupabaseWorkspaceProvider>
              <NotificationProvider>
                <TaskProvider>
                  <Toaster />
                  <Sonner />
                  <AppContent />
                </TaskProvider>
              </NotificationProvider>
            </SupabaseWorkspaceProvider>
          </SupabaseAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
