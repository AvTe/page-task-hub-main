import React, { useState, useEffect, useCallback } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  FileText, 
  CheckSquare, 
  Users, 
  Settings, 
  Home,
  Calendar,
  Bell,
  Archive,
  Trash2,
  Download,
  Upload,
  Copy,
  Edit,
  Eye,
  Share,
  Filter,
  SortAsc,
  Clock,
  Tag,
  Bookmark,
  Star,
  ArrowRight
} from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { SearchResult } from '../services/searchService';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
  group: 'navigation' | 'create' | 'search' | 'actions' | 'settings';
  shortcut?: string;
}

interface SearchCommandPaletteProps {
  onNavigate?: (path: string) => void;
  onCreateTask?: () => void;
  onCreatePage?: () => void;
  onOpenSettings?: () => void;
}

const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({
  onNavigate,
  onCreateTask,
  onCreatePage,
  onOpenSettings
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { quickSearch, recentSearches, addRecentSearch } = useSearch();
  const { workspace, workspaces } = useSupabaseWorkspace();
  const { isMobile } = useResponsiveLayout();

  // Define command actions
  const commands: CommandAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View workspace overview',
      icon: <Home className="h-4 w-4" />,
      keywords: ['dashboard', 'home', 'overview'],
      action: () => onNavigate?.('/dashboard'),
      group: 'navigation',
      shortcut: '⌘+H'
    },
    {
      id: 'nav-tasks',
      label: 'Go to Tasks',
      description: 'View all tasks',
      icon: <CheckSquare className="h-4 w-4" />,
      keywords: ['tasks', 'todo', 'assignments'],
      action: () => onNavigate?.('/tasks'),
      group: 'navigation',
      shortcut: '⌘+T'
    },
    {
      id: 'nav-pages',
      label: 'Go to Pages',
      description: 'View all pages',
      icon: <FileText className="h-4 w-4" />,
      keywords: ['pages', 'documents', 'notes'],
      action: () => onNavigate?.('/pages'),
      group: 'navigation',
      shortcut: '⌘+P'
    },
    {
      id: 'nav-calendar',
      label: 'Go to Calendar',
      description: 'View calendar and deadlines',
      icon: <Calendar className="h-4 w-4" />,
      keywords: ['calendar', 'schedule', 'deadlines'],
      action: () => onNavigate?.('/calendar'),
      group: 'navigation',
      shortcut: '⌘+C'
    },
    {
      id: 'nav-team',
      label: 'Go to Team',
      description: 'View team members',
      icon: <Users className="h-4 w-4" />,
      keywords: ['team', 'members', 'people'],
      action: () => onNavigate?.('/team'),
      group: 'navigation'
    },

    // Create actions
    {
      id: 'create-task',
      label: 'Create New Task',
      description: 'Add a new task',
      icon: <Plus className="h-4 w-4" />,
      keywords: ['create', 'new', 'task', 'add'],
      action: () => onCreateTask?.(),
      group: 'create',
      shortcut: '⌘+N'
    },
    {
      id: 'create-page',
      label: 'Create New Page',
      description: 'Add a new page',
      icon: <FileText className="h-4 w-4" />,
      keywords: ['create', 'new', 'page', 'document'],
      action: () => onCreatePage?.(),
      group: 'create',
      shortcut: '⌘+Shift+N'
    },

    // Search actions
    {
      id: 'search-tasks',
      label: 'Search Tasks',
      description: 'Find specific tasks',
      icon: <Search className="h-4 w-4" />,
      keywords: ['search', 'find', 'tasks'],
      action: () => {
        setSearchQuery('type:task ');
      },
      group: 'search'
    },
    {
      id: 'search-pages',
      label: 'Search Pages',
      description: 'Find specific pages',
      icon: <Search className="h-4 w-4" />,
      keywords: ['search', 'find', 'pages'],
      action: () => {
        setSearchQuery('type:page ');
      },
      group: 'search'
    },
    {
      id: 'search-high-priority',
      label: 'High Priority Items',
      description: 'Find high priority tasks',
      icon: <Star className="h-4 w-4" />,
      keywords: ['high', 'priority', 'urgent', 'important'],
      action: () => {
        setSearchQuery('priority:high ');
      },
      group: 'search'
    },
    {
      id: 'search-my-tasks',
      label: 'My Tasks',
      description: 'Find tasks assigned to me',
      icon: <CheckSquare className="h-4 w-4" />,
      keywords: ['my', 'assigned', 'tasks'],
      action: () => {
        setSearchQuery('assignee:me ');
      },
      group: 'search'
    },
    {
      id: 'search-overdue',
      label: 'Overdue Items',
      description: 'Find overdue tasks',
      icon: <Clock className="h-4 w-4" />,
      keywords: ['overdue', 'late', 'past due'],
      action: () => {
        setSearchQuery('overdue:true ');
      },
      group: 'search'
    },

    // Quick actions
    {
      id: 'action-notifications',
      label: 'View Notifications',
      description: 'Check recent notifications',
      icon: <Bell className="h-4 w-4" />,
      keywords: ['notifications', 'alerts', 'updates'],
      action: () => onNavigate?.('/notifications'),
      group: 'actions'
    },
    {
      id: 'action-bookmarks',
      label: 'View Bookmarks',
      description: 'See saved items',
      icon: <Bookmark className="h-4 w-4" />,
      keywords: ['bookmarks', 'saved', 'favorites'],
      action: () => onNavigate?.('/bookmarks'),
      group: 'actions'
    },

    // Settings
    {
      id: 'settings-workspace',
      label: 'Workspace Settings',
      description: 'Configure workspace',
      icon: <Settings className="h-4 w-4" />,
      keywords: ['settings', 'preferences', 'config'],
      action: () => onOpenSettings?.(),
      group: 'settings'
    }
  ];

  // Filter commands based on search query
  const filteredCommands = commands.filter(command => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      command.label.toLowerCase().includes(query) ||
      command.description?.toLowerCase().includes(query) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  // Perform search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim() && !searchQuery.startsWith('/')) {
        try {
          const results = await quickSearch(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    };

    const debounce = setTimeout(performSearch, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery, quickSearch]);

  // Handle command execution
  const executeCommand = useCallback((command: CommandAction) => {
    command.action();
    setOpen(false);
    setSearchQuery('');
    
    // Add to recent searches if it's a search command
    if (command.group === 'search' && searchQuery.trim()) {
      addRecentSearch(searchQuery);
    }
  }, [searchQuery, addRecentSearch]);

  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    // Navigate to the result
    const path = result.type === 'task' ? `/tasks/${result.id}` : 
                 result.type === 'page' ? `/pages/${result.id}` : 
                 `/search?q=${encodeURIComponent(result.title)}`;
    
    onNavigate?.(path);
    setOpen(false);
    setSearchQuery('');
    
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery);
    }
  }, [searchQuery, addRecentSearch, onNavigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + K to open command palette (different from search)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setOpen(true);
      }

      // Escape to close
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Group commands
  const groupedCommands = {
    navigation: filteredCommands.filter(cmd => cmd.group === 'navigation'),
    create: filteredCommands.filter(cmd => cmd.group === 'create'),
    search: filteredCommands.filter(cmd => cmd.group === 'search'),
    actions: filteredCommands.filter(cmd => cmd.group === 'actions'),
    settings: filteredCommands.filter(cmd => cmd.group === 'settings')
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent Searches">
              {recentSearches.slice(0, 3).map((search, index) => (
                <CommandItem
                  key={`recent-${index}`}
                  onSelect={() => setSearchQuery(search)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  <span>{search}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <>
            <CommandGroup heading="Search Results">
              {searchResults.slice(0, 5).map((result, index) => (
                <CommandItem
                  key={`result-${result.id}-${index}`}
                  onSelect={() => handleResultClick(result)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {result.type === 'task' && <CheckSquare className="h-4 w-4" />}
                    {result.type === 'page' && <FileText className="h-4 w-4" />}
                    {result.type === 'member' && <Users className="h-4 w-4" />}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{result.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                      </div>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </p>
                      )}
                    </div>
                    
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation Commands */}
        {groupedCommands.navigation.length > 0 && (
          <>
            <CommandGroup heading="Navigation">
              {groupedCommands.navigation.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => executeCommand(command)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {command.icon}
                    <div className="flex-1">
                      <span>{command.label}</span>
                      {command.description && (
                        <p className="text-xs text-muted-foreground">
                          {command.description}
                        </p>
                      )}
                    </div>
                    {command.shortcut && !isMobile && (
                      <Badge variant="outline" className="text-xs">
                        {command.shortcut}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Create Commands */}
        {groupedCommands.create.length > 0 && (
          <>
            <CommandGroup heading="Create">
              {groupedCommands.create.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => executeCommand(command)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {command.icon}
                    <div className="flex-1">
                      <span>{command.label}</span>
                      {command.description && (
                        <p className="text-xs text-muted-foreground">
                          {command.description}
                        </p>
                      )}
                    </div>
                    {command.shortcut && !isMobile && (
                      <Badge variant="outline" className="text-xs">
                        {command.shortcut}
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Search Commands */}
        {groupedCommands.search.length > 0 && (
          <>
            <CommandGroup heading="Quick Searches">
              {groupedCommands.search.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => executeCommand(command)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {command.icon}
                    <div className="flex-1">
                      <span>{command.label}</span>
                      {command.description && (
                        <p className="text-xs text-muted-foreground">
                          {command.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Action Commands */}
        {groupedCommands.actions.length > 0 && (
          <>
            <CommandGroup heading="Actions">
              {groupedCommands.actions.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => executeCommand(command)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {command.icon}
                    <div className="flex-1">
                      <span>{command.label}</span>
                      {command.description && (
                        <p className="text-xs text-muted-foreground">
                          {command.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Settings Commands */}
        {groupedCommands.settings.length > 0 && (
          <CommandGroup heading="Settings">
            {groupedCommands.settings.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => executeCommand(command)}
              >
                <div className="flex items-center gap-2 w-full">
                  {command.icon}
                  <div className="flex-1">
                    <span>{command.label}</span>
                    {command.description && (
                      <p className="text-xs text-muted-foreground">
                        {command.description}
                      </p>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default SearchCommandPalette;
