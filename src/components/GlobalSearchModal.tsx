import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import { 
  Search, 
  Command, 
  ArrowRight, 
  Clock, 
  TrendingUp,
  X
} from 'lucide-react';
import AdvancedSearch from './AdvancedSearch';
import { SearchResult } from '../services/searchService';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick?: (result: SearchResult) => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onResultClick
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState<string[]>([
    'high priority tasks',
    'overdue tasks',
    'my tasks',
    'recent pages',
    'team members',
    'project documents'
  ]);
  
  const { isMobile } = useResponsiveLayout();

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

  // Save search to recent searches
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result);
    onClose();
  };

  // Handle recent search click
  const handleRecentSearchClick = (query: string) => {
    // This would trigger the search in AdvancedSearch component
    // For now, we'll just save it as a recent search
    saveRecentSearch(query);
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This would be handled by parent component
        }
      }
      
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-full h-full' : 'max-w-4xl max-h-[80vh]'} p-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Global Search
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Search across all your workspaces, tasks, pages, and more
                </DialogDescription>
              </div>
              
              {!isMobile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Search Content */}
          <div className="flex-1 overflow-hidden">
            <div className="p-6">
              <AdvancedSearch
                onResultClick={handleResultClick}
                placeholder="Search everything..."
                autoFocus={true}
                showFilters={true}
                compact={false}
              />
            </div>

            {/* Quick Actions & Recent Searches */}
            <div className="px-6 pb-6 space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recent Searches
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecentSearches}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => handleRecentSearchClick(search)}
                      >
                        {search}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Popular Searches
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="secondary"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => handleRecentSearchClick(search)}
                    >
                      {search}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Search Tips */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Search Tips</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <p><Badge variant="outline" className="text-xs mr-1">type:task</Badge> Search only tasks</p>
                    <p><Badge variant="outline" className="text-xs mr-1">status:done</Badge> Find completed items</p>
                    <p><Badge variant="outline" className="text-xs mr-1">priority:high</Badge> High priority items</p>
                  </div>
                  <div className="space-y-1">
                    <p><Badge variant="outline" className="text-xs mr-1">assignee:me</Badge> Items assigned to you</p>
                    <p><Badge variant="outline" className="text-xs mr-1">has:attachments</Badge> Items with files</p>
                    <p><Badge variant="outline" className="text-xs mr-1">created:today</Badge> Created today</p>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              {!isMobile && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Open search</span>
                      <div className="flex gap-1">
                        <Kbd>⌘</Kbd>
                        <Kbd>K</Kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Close search</span>
                      <Kbd>Esc</Kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Navigate results</span>
                      <div className="flex gap-1">
                        <Kbd>↑</Kbd>
                        <Kbd>↓</Kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Select result</span>
                      <Kbd>Enter</Kbd>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchModal;
