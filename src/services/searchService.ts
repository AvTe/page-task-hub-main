import { Task, Page, WorkspaceMember } from '../types';

export interface SearchResult {
  id: string;
  type: 'task' | 'page' | 'member' | 'comment' | 'attachment';
  title: string;
  description?: string;
  content?: string;
  url?: string;
  workspaceId: string;
  workspaceName?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
  highlights?: string[];
  score: number;
}

export interface SearchFilters {
  workspaceIds?: string[];
  types?: SearchResult['type'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  assignedTo?: string[];
  createdBy?: string[];
  tags?: string[];
  status?: string[];
  priority?: string[];
  hasAttachments?: boolean;
  hasComments?: boolean;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'type';
  sortOrder?: 'asc' | 'desc';
  includeContent?: boolean;
  fuzzySearch?: boolean;
}

class SearchService {
  private searchIndex: Map<string, SearchResult> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
    'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their',
    'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some',
    'her', 'would', 'make', 'like', 'into', 'him', 'time', 'two', 'more',
    'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call',
    'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get',
    'come', 'made', 'may', 'part'
  ]);

  // Tokenize and normalize text
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !this.stopWords.has(token));
  }

  // Calculate text similarity using Jaccard similarity
  private calculateSimilarity(query: string, text: string): number {
    const queryTokens = new Set(this.tokenize(query));
    const textTokens = new Set(this.tokenize(text));
    
    const intersection = new Set([...queryTokens].filter(x => textTokens.has(x)));
    const union = new Set([...queryTokens, ...textTokens]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // Highlight matching terms in text
  private highlightText(text: string, query: string): string {
    const tokens = this.tokenize(query);
    let highlightedText = text;
    
    tokens.forEach(token => {
      const regex = new RegExp(`\\b${token}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `<mark>$&</mark>`);
    });
    
    return highlightedText;
  }

  // Index a search result
  private indexResult(result: SearchResult): void {
    this.searchIndex.set(result.id, result);
    
    // Index all searchable text
    const searchableText = [
      result.title,
      result.description || '',
      result.content || '',
      ...(result.metadata?.tags || [])
    ].join(' ');
    
    const tokens = this.tokenize(searchableText);
    
    tokens.forEach(token => {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(result.id);
    });
  }

  // Index tasks
  indexTasks(tasks: Task[], workspaceId: string, workspaceName?: string): void {
    tasks.forEach(task => {
      const result: SearchResult = {
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        description: task.description,
        content: [
          task.description,
          ...(task.subtasks?.map(st => st.title) || []),
          ...(task.comments?.map(c => c.content) || [])
        ].filter(Boolean).join(' '),
        workspaceId,
        workspaceName,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        metadata: {
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo,
          tags: task.tags,
          dueDate: task.dueDate,
          hasAttachments: (task.attachments?.length || 0) > 0,
          hasComments: (task.comments?.length || 0) > 0,
          subtaskCount: task.subtasks?.length || 0,
          pageId: task.pageId
        },
        score: 0
      };
      
      this.indexResult(result);
    });
  }

  // Index pages
  indexPages(pages: Page[], workspaceId: string, workspaceName?: string): void {
    pages.forEach(page => {
      const result: SearchResult = {
        id: `page-${page.id}`,
        type: 'page',
        title: page.title,
        description: page.description,
        content: page.content,
        workspaceId,
        workspaceName,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        metadata: {
          category: page.category,
          color: page.color,
          isPublic: page.isPublic,
          taskCount: page.tasks?.length || 0
        },
        score: 0
      };
      
      this.indexResult(result);
    });
  }

  // Index workspace members
  indexMembers(members: WorkspaceMember[], workspaceId: string, workspaceName?: string): void {
    members.forEach(member => {
      const result: SearchResult = {
        id: `member-${member.id}`,
        type: 'member',
        title: member.name,
        description: member.email,
        workspaceId,
        workspaceName,
        createdAt: member.joinedAt || new Date().toISOString(),
        metadata: {
          role: member.role,
          email: member.email,
          isActive: member.isActive
        },
        score: 0
      };
      
      this.indexResult(result);
    });
  }

  // Perform search
  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    total: number;
    hasMore: boolean;
    facets?: Record<string, Record<string, number>>;
  }> {
    const {
      query,
      filters = {},
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc',
      includeContent = false,
      fuzzySearch = true
    } = options;

    let candidateIds = new Set<string>();
    
    if (query.trim()) {
      const queryTokens = this.tokenize(query);
      
      if (queryTokens.length === 0) {
        // If no valid tokens, return all results
        candidateIds = new Set(this.searchIndex.keys());
      } else {
        // Find documents containing query tokens
        queryTokens.forEach((token, index) => {
          const matchingIds = new Set<string>();
          
          // Exact matches
          if (this.invertedIndex.has(token)) {
            this.invertedIndex.get(token)!.forEach(id => matchingIds.add(id));
          }
          
          // Fuzzy matches if enabled
          if (fuzzySearch) {
            this.invertedIndex.forEach((ids, indexToken) => {
              if (this.calculateSimilarity(token, indexToken) > 0.7) {
                ids.forEach(id => matchingIds.add(id));
              }
            });
          }
          
          if (index === 0) {
            candidateIds = matchingIds;
          } else {
            // Intersection for AND behavior
            candidateIds = new Set([...candidateIds].filter(id => matchingIds.has(id)));
          }
        });
      }
    } else {
      // No query, return all results
      candidateIds = new Set(this.searchIndex.keys());
    }

    // Apply filters and calculate scores
    let results: SearchResult[] = [];
    
    candidateIds.forEach(id => {
      const result = this.searchIndex.get(id);
      if (!result) return;
      
      // Apply filters
      if (filters.workspaceIds && !filters.workspaceIds.includes(result.workspaceId)) return;
      if (filters.types && !filters.types.includes(result.type)) return;
      if (filters.assignedTo && !filters.assignedTo.includes(result.metadata?.assignedTo)) return;
      if (filters.createdBy && !filters.createdBy.includes(result.metadata?.createdBy)) return;
      if (filters.status && !filters.status.includes(result.metadata?.status)) return;
      if (filters.priority && !filters.priority.includes(result.metadata?.priority)) return;
      if (filters.hasAttachments !== undefined && result.metadata?.hasAttachments !== filters.hasAttachments) return;
      if (filters.hasComments !== undefined && result.metadata?.hasComments !== filters.hasComments) return;
      
      // Date range filter
      if (filters.dateRange) {
        const resultDate = new Date(result.createdAt);
        if (resultDate < filters.dateRange.start || resultDate > filters.dateRange.end) return;
      }
      
      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const resultTags = result.metadata?.tags || [];
        if (!filters.tags.some(tag => resultTags.includes(tag))) return;
      }
      
      // Calculate relevance score
      let score = 0;
      if (query.trim()) {
        const searchableText = [result.title, result.description || '', result.content || ''].join(' ');
        score = this.calculateSimilarity(query, searchableText);
        
        // Boost score based on where matches occur
        if (result.title.toLowerCase().includes(query.toLowerCase())) score += 0.5;
        if (result.description?.toLowerCase().includes(query.toLowerCase())) score += 0.3;
      } else {
        // Default score based on recency
        score = new Date(result.createdAt).getTime() / 1000000000000;
      }
      
      // Add highlights
      const highlights: string[] = [];
      if (query.trim() && includeContent) {
        if (result.title) highlights.push(this.highlightText(result.title, query));
        if (result.description) highlights.push(this.highlightText(result.description, query));
        if (result.content) {
          const snippet = result.content.substring(0, 200) + '...';
          highlights.push(this.highlightText(snippet, query));
        }
      }
      
      results.push({
        ...result,
        score,
        highlights: highlights.length > 0 ? highlights : undefined
      });
    });

    // Sort results
    results.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
        case 'date':
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
        case 'title':
          return sortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
        case 'type':
          return sortOrder === 'desc' ? b.type.localeCompare(a.type) : a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    // Pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Generate facets for filtering
    const facets = this.generateFacets(results);

    return {
      results: paginatedResults,
      total,
      hasMore,
      facets
    };
  }

  // Generate facets for filtering
  private generateFacets(results: SearchResult[]): Record<string, Record<string, number>> {
    const facets: Record<string, Record<string, number>> = {
      type: {},
      status: {},
      priority: {},
      workspace: {}
    };

    results.forEach(result => {
      // Type facet
      facets.type[result.type] = (facets.type[result.type] || 0) + 1;
      
      // Workspace facet
      if (result.workspaceName) {
        facets.workspace[result.workspaceName] = (facets.workspace[result.workspaceName] || 0) + 1;
      }
      
      // Status facet
      if (result.metadata?.status) {
        facets.status[result.metadata.status] = (facets.status[result.metadata.status] || 0) + 1;
      }
      
      // Priority facet
      if (result.metadata?.priority) {
        facets.priority[result.metadata.priority] = (facets.priority[result.metadata.priority] || 0) + 1;
      }
    });

    return facets;
  }

  // Clear index
  clearIndex(): void {
    this.searchIndex.clear();
    this.invertedIndex.clear();
  }

  // Get suggestions for autocomplete
  getSuggestions(query: string, limit: number = 5): string[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];
    
    const lastToken = queryTokens[queryTokens.length - 1];
    const suggestions: string[] = [];
    
    this.invertedIndex.forEach((_, token) => {
      if (token.startsWith(lastToken) && token !== lastToken) {
        suggestions.push(token);
      }
    });
    
    return suggestions.slice(0, limit);
  }
}

export const searchService = new SearchService();
export default searchService;
