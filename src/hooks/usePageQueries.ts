import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { QUERY_KEYS, CACHE_TIMES, GC_TIMES, invalidateQueries } from '../lib/queryClient';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { toast } from '../components/ui/sonner';
import { Page, Task } from '../types';

// Extended page type with relations
interface PageWithTasks extends Page {
  tasks: Task[];
  taskCount: number;
  completedTaskCount: number;
}

// Fetch workspace pages
const fetchWorkspacePages = async (workspaceId: string): Promise<Page[]> => {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Fetch specific page
const fetchPage = async (pageId: string): Promise<Page> => {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .single();

  if (error) throw error;
  return data;
};

// Fetch page with tasks
const fetchPageWithTasks = async (pageId: string): Promise<PageWithTasks> => {
  // Fetch page and tasks in parallel
  const [pageData, tasksData] = await Promise.all([
    fetchPage(pageId),
    fetchPageTasks(pageId),
  ]);

  const completedTaskCount = tasksData.filter(task => task.status === 'done').length;

  return {
    ...pageData,
    tasks: tasksData,
    taskCount: tasksData.length,
    completedTaskCount,
  };
};

// Fetch page tasks
const fetchPageTasks = async (pageId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('page_id', pageId)
    .order('order', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Hook to get workspace pages
export const useWorkspacePages = (workspaceId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.WORKSPACE_PAGES(workspaceId),
    queryFn: () => fetchWorkspacePages(workspaceId),
    enabled: !!workspaceId,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get specific page
export const usePage = (pageId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.PAGE(pageId),
    queryFn: () => fetchPage(pageId),
    enabled: !!pageId,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get page with tasks
export const usePageWithTasks = (pageId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.PAGE_TASKS(pageId),
    queryFn: () => fetchPageWithTasks(pageId),
    enabled: !!pageId,
    staleTime: CACHE_TIMES.SHORT, // Tasks change frequently
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to get page tasks only
export const usePageTasks = (pageId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.PAGE_TASKS(pageId),
    queryFn: () => fetchPageTasks(pageId),
    enabled: !!pageId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
};

// Hook to create page
export const useCreatePage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (pageData: Omit<Page, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('pages')
        .insert({
          ...pageData,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (page) => {
      // Invalidate workspace pages
      if (page.workspace_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_PAGES(page.workspace_id) });
      }
      // Invalidate all pages
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGES });
      toast.success('Page created successfully');
    },
    onError: (error: any) => {
      console.error('Failed to create page:', error);
      toast.error('Failed to create page');
    },
  });
};

// Hook to update page
export const useUpdatePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, updates }: { pageId: string; updates: Partial<Page> }) => {
      const { data, error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', pageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (page) => {
      // Update specific page cache
      queryClient.setQueryData(QUERY_KEYS.PAGE(page.id), page);
      // Invalidate related queries
      invalidateQueries.page(queryClient, page.id);
      if (page.workspace_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_PAGES(page.workspace_id) });
      }
      toast.success('Page updated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to update page:', error);
      toast.error('Failed to update page');
    },
  });
};

// Hook to delete page
export const useDeletePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      // First, delete all tasks in the page
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('page_id', pageId);

      if (tasksError) throw tasksError;

      // Then delete the page
      const { error: pageError } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (pageError) throw pageError;
      return pageId;
    },
    onSuccess: (pageId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.PAGE(pageId) });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.PAGE_TASKS(pageId) });
      // Invalidate pages lists
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGES });
      toast.success('Page deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete page:', error);
      toast.error('Failed to delete page');
    },
  });
};

// Hook to duplicate page
export const useDuplicatePage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (pageId: string) => {
      // Get original page
      const originalPage = await fetchPage(pageId);
      const originalTasks = await fetchPageTasks(pageId);

      // Create new page
      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert({
          title: `${originalPage.title} (Copy)`,
          description: originalPage.description,
          workspace_id: originalPage.workspace_id,
          created_by: user!.id,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // Duplicate tasks
      if (originalTasks.length > 0) {
        const tasksToInsert = originalTasks.map(task => ({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          page_id: newPage.id,
          workspace_id: task.workspace_id,
          created_by: user!.id,
          order: task.order,
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      return newPage;
    },
    onSuccess: (page) => {
      // Invalidate workspace pages
      if (page.workspace_id) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_PAGES(page.workspace_id) });
      }
      // Invalidate all pages
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGES });
      toast.success('Page duplicated successfully');
    },
    onError: (error: any) => {
      console.error('Failed to duplicate page:', error);
      toast.error('Failed to duplicate page');
    },
  });
};

// Hook to reorder pages
export const useReorderPages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      pageIds 
    }: { 
      workspaceId: string; 
      pageIds: string[] 
    }) => {
      // Update order for each page
      const updates = pageIds.map((pageId, index) => 
        supabase
          .from('pages')
          .update({ order: index })
          .eq('id', pageId)
      );

      const results = await Promise.all(updates);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      return pageIds;
    },
    onSuccess: (_, { workspaceId }) => {
      // Invalidate workspace pages to refresh order
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_PAGES(workspaceId) });
    },
    onError: (error: any) => {
      console.error('Failed to reorder pages:', error);
      toast.error('Failed to reorder pages');
    },
  });
};

// Hook to move page to different workspace
export const useMovePageToWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      pageId, 
      targetWorkspaceId 
    }: { 
      pageId: string; 
      targetWorkspaceId: string 
    }) => {
      // Update page workspace
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .update({ workspace_id: targetWorkspaceId })
        .eq('id', pageId)
        .select()
        .single();

      if (pageError) throw pageError;

      // Update all tasks in the page to new workspace
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({ workspace_id: targetWorkspaceId })
        .eq('page_id', pageId);

      if (tasksError) throw tasksError;

      return page;
    },
    onSuccess: (page, { targetWorkspaceId }) => {
      // Invalidate both old and new workspace pages
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAGES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WORKSPACE_PAGES(targetWorkspaceId) });
      // Update specific page cache
      queryClient.setQueryData(QUERY_KEYS.PAGE(page.id), page);
      toast.success('Page moved successfully');
    },
    onError: (error: any) => {
      console.error('Failed to move page:', error);
      toast.error('Failed to move page');
    },
  });
};
