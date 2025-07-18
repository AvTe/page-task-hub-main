import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  FileText,
  CheckSquare,
  Users,
  MessageSquare,
  Paperclip,
  Clock,
  Tag,
  SortAsc,
  SortDesc,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { searchService, SearchResult, SearchOptions, SearchFilters } from '../services/searchService';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

interface AdvancedSearchProps {
  onResultClick?: (result: SearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showFilters?: boolean;
  compact?: boolean;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onResultClick,
  placeholder = "Search tasks, pages, members...",
  autoFocus = false,
  showFilters = true,
  compact = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  
  const { workspace, workspaces } = useSupabaseWorkspace();
  const { isMobile } = useResponsiveLayout();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Search filters
  const [filters, setFilters] = useState<SearchFilters>({
    workspaceIds: workspace ? [workspace.id] : [],
    types: [],
    dateRange: undefined,
    assignedTo: [],
    createdBy: [],
    tags: [],
    status: [],
    priority: [],
    hasAttachments: undefined,
    hasComments: undefined
  });

  // Search options
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title' | 'type'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [includeContent, setIncludeContent] = useState(true);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim() && Object.keys(searchFilters).every(key => 
      !searchFilters[key as keyof SearchFilters] || 
      (Array.isArray(searchFilters[key as keyof SearchFilters]) && 
       (searchFilters[key as keyof SearchFilters] as any[]).length === 0)
    )) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      setFacets({});
      return;
    }

    setLoading(true);
    try {
      const searchOptions: SearchOptions = {
        query: searchQuery,
        filters: searchFilters,
        limit: 20,
        offset: 0,
        sortBy,
        sortOrder,
        includeContent,
        fuzzySearch: true
      };

      const response = await searchService.search(searchOptions);
      setResults(response.results);
      setTotal(response.total);
      setHasMore(response.hasMore);
      setFacets(response.facets || {});
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotal(0);
      setHasMore(false);
      setFacets({});
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, includeContent]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setQuery(value);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Get suggestions
    if (value.trim()) {
      const newSuggestions = searchService.getSuggestions(value, 5);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      performSearch(value, filters);
    }, 300);
  };

  // Handle filter changes
  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    performSearch(query, updatedFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      workspaceIds: workspace ? [workspace.id] : [],
      types: [],
      dateRange: undefined,
      assignedTo: [],
      createdBy: [],
      tags: [],
      status: [],
      priority: [],
      hasAttachments: undefined,
      hasComments: undefined
    };
    setFilters(clearedFilters);
    performSearch(query, clearedFilters);
  };

  // Get result icon
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return <CheckSquare className="h-4 w-4" />;
      case 'page': return <FileText className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'attachment': return <Paperclip className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Get result color
  const getResultColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return 'text-blue-600';
      case 'page': return 'text-green-600';
      case 'member': return 'text-purple-600';
      case 'comment': return 'text-orange-600';
      case 'attachment': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion, filters);
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result);
    setShowSuggestions(false);
  };

  // Auto focus
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const activeFiltersCount = [
    filters.types && filters.types.length > 0,
    filters.dateRange,
    filters.assignedTo && filters.assignedTo.length > 0,
    filters.status && filters.status.length > 0,
    filters.priority && filters.priority.length > 0,
    filters.hasAttachments !== undefined,
    filters.hasComments !== undefined,
    filters.tags && filters.tags.length > 0
  ].filter(Boolean).length;

  return (
    <div className={`relative ${compact ? 'max-w-md' : 'w-full'}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-12"
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        
        {query && !loading && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowSuggestions(false);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg">
          <CardContent className="p-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Search className="h-3 w-3 mr-2" />
                {suggestion}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                {showAdvancedFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
              
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Content Types */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content Types</label>
                    <div className="space-y-2">
                      {['task', 'page', 'member', 'comment', 'attachment'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={filters.types?.includes(type as any) || false}
                            onCheckedChange={(checked) => {
                              const newTypes = checked
                                ? [...(filters.types || []), type as any]
                                : (filters.types || []).filter(t => t !== type);
                              updateFilters({ types: newTypes });
                            }}
                          />
                          <label htmlFor={type} className="text-sm capitalize flex items-center gap-1">
                            {getResultIcon(type as any)}
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="space-y-2">
                      {['todo', 'progress', 'done'].map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={status}
                            checked={filters.status?.includes(status) || false}
                            onCheckedChange={(checked) => {
                              const newStatus = checked
                                ? [...(filters.status || []), status]
                                : (filters.status || []).filter(s => s !== status);
                              updateFilters({ status: newStatus });
                            }}
                          />
                          <label htmlFor={status} className="text-sm capitalize">
                            {status === 'progress' ? 'In Progress' : status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <div className="space-y-2">
                      {['urgent', 'high', 'medium', 'low'].map(priority => (
                        <div key={priority} className="flex items-center space-x-2">
                          <Checkbox
                            id={priority}
                            checked={filters.priority?.includes(priority) || false}
                            onCheckedChange={(checked) => {
                              const newPriority = checked
                                ? [...(filters.priority || []), priority]
                                : (filters.priority || []).filter(p => p !== priority);
                              updateFilters({ priority: newPriority });
                            }}
                          />
                          <label htmlFor={priority} className="text-sm capitalize">
                            {priority}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Additional Filters */}
                <Separator />
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasAttachments"
                      checked={filters.hasAttachments === true}
                      onCheckedChange={(checked) => {
                        updateFilters({ hasAttachments: checked ? true : undefined });
                      }}
                    />
                    <label htmlFor="hasAttachments" className="text-sm flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      Has Attachments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasComments"
                      checked={filters.hasComments === true}
                      onCheckedChange={(checked) => {
                        updateFilters({ hasComments: checked ? true : undefined });
                      }}
                    />
                    <label htmlFor="hasComments" className="text-sm flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Has Comments
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Results */}
      {(results.length > 0 || loading) && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Search Results
                {total > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({total} found)
                  </span>
                )}
              </CardTitle>
              
              {/* Facets */}
              {Object.keys(facets).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(facets.type || {}).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type} ({count})
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Searching...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No results found</p>
                  <p className="text-sm">Try adjusting your search terms or filters</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <div
                      key={`${result.type}-${result.id}-${index}`}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`${getResultColor(result.type)} mt-1`}>
                          {getResultIcon(result.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm line-clamp-1">
                              {result.highlights?.[0] ? (
                                <span dangerouslySetInnerHTML={{ __html: result.highlights[0] }} />
                              ) : (
                                result.title
                              )}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {result.type}
                            </Badge>
                          </div>
                          
                          {result.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                              {result.highlights?.[1] ? (
                                <span dangerouslySetInnerHTML={{ __html: result.highlights[1] }} />
                              ) : (
                                result.description
                              )}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(result.createdAt), 'MMM dd, yyyy')}</span>
                            
                            {result.workspaceName && (
                              <>
                                <span>•</span>
                                <span>{result.workspaceName}</span>
                              </>
                            )}
                            
                            {result.metadata?.status && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs">
                                  {result.metadata.status}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {hasMore && (
              <div className="p-3 border-t">
                <Button variant="outline" className="w-full" size="sm">
                  Load More Results
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedSearch;
