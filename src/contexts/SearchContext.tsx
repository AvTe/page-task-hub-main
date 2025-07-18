import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { searchService, SearchResult } from '../services/searchService';
import { useSupabaseWorkspace } from './SupabaseWorkspaceContext';
import { useTask } from './TaskContext';
import { Task, Page } from '../types';

interface SearchContextType {
  // Search state
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  
  // Search results
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  
  // Search methods
  search: (query: string, options?: any) => Promise<void>;
  clearResults: () => void;
  
  // Index management
  indexWorkspaceData: (workspaceId: string) => Promise<void>;
  reindexAll: () => Promise<void>;
  
  // Quick search
  quickSearch: (query: string) => Promise<SearchResult[]>;
  
  // Recent searches
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: React.ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { currentWorkspace, userWorkspaces, workspaceMembers } = useSupabaseWorkspace();
  const { state } = useTask();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearches = useCallback((searches: string[]) => {
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  }, []);

  // Open search modal
  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  // Close search modal
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  // Add recent search
  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    saveRecentSearches(updated);
  }, [recentSearches, saveRecentSearches]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  }, []);

  // Index workspace data
  const indexWorkspaceData = useCallback(async (workspaceId: string) => {
    try {
      const targetWorkspace = userWorkspaces.find(w => w.id === workspaceId);
      if (!targetWorkspace) return;

      // Get all tasks from pages and unassigned tasks
      const allTasks = [
        ...state.unassignedTasks,
        ...state.pages.flatMap(page => page.tasks || [])
      ];

      // Index tasks for this workspace
      const workspaceTasks = allTasks.filter(task =>
        task.pageId ? state.pages.find(p => p.id === task.pageId) : true
      );
      if (workspaceTasks.length > 0) {
        searchService.indexTasks(workspaceTasks, workspaceId, targetWorkspace.name);
      }

      // Index pages for this workspace
      if (state.pages.length > 0) {
        searchService.indexPages(state.pages, workspaceId, targetWorkspace.name);
      }

      // Index members for this workspace
      const currentWorkspaceMembers = workspaceMembers.filter(member => member.workspaceId === workspaceId);
      if (currentWorkspaceMembers.length > 0) {
        searchService.indexMembers(currentWorkspaceMembers, workspaceId, targetWorkspace.name);
      }
    } catch (error) {
      console.error('Failed to index workspace data:', error);
    }
  }, [userWorkspaces, state.pages, state.unassignedTasks, workspaceMembers]);

  // Reindex all workspaces
  const reindexAll = useCallback(async () => {
    try {
      searchService.clearIndex();

      for (const ws of userWorkspaces) {
        await indexWorkspaceData(ws.id);
      }
    } catch (error) {
      console.error('Failed to reindex all data:', error);
    }
  }, [userWorkspaces, indexWorkspaceData]);

  // Perform search
  const search = useCallback(async (query: string, options: any = {}) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const searchOptions = {
        query,
        filters: {
          workspaceIds: currentWorkspace ? [currentWorkspace.id] : userWorkspaces.map(w => w.id),
          ...options.filters
        },
        limit: options.limit || 20,
        offset: options.offset || 0,
        sortBy: options.sortBy || 'relevance',
        sortOrder: options.sortOrder || 'desc',
        includeContent: options.includeContent !== false,
        fuzzySearch: options.fuzzySearch !== false
      };

      const response = await searchService.search(searchOptions);
      setResults(response.results);
      
      // Add to recent searches
      addRecentSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, userWorkspaces, addRecentSearch]);

  // Quick search for autocomplete/suggestions
  const quickSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const searchOptions = {
        query,
        filters: {
          workspaceIds: currentWorkspace ? [currentWorkspace.id] : userWorkspaces.map(w => w.id)
        },
        limit: 5,
        sortBy: 'relevance' as const,
        includeContent: false,
        fuzzySearch: true
      };

      const response = await searchService.search(searchOptions);
      return response.results;
    } catch (error) {
      console.error('Quick search failed:', error);
      return [];
    }
  }, [currentWorkspace, userWorkspaces]);

  // Clear search results
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  // Auto-index data when workspace data changes
  useEffect(() => {
    if (currentWorkspace) {
      indexWorkspaceData(currentWorkspace.id);
    }
  }, [currentWorkspace, indexWorkspaceData, state.pages, state.unassignedTasks, workspaceMembers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }

      // Escape to close search modal
      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        closeSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, openSearch, closeSearch]);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  const value: SearchContextType = {
    // Search state
    isSearchOpen,
    openSearch,
    closeSearch,
    
    // Search results
    results,
    loading,
    error,
    
    // Search methods
    search,
    clearResults,
    
    // Index management
    indexWorkspaceData,
    reindexAll,
    
    // Quick search
    quickSearch,
    
    // Recent searches
    recentSearches,
    addRecentSearch,
    clearRecentSearches
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchProvider;
