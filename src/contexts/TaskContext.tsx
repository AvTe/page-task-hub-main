import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Task, Page } from '../types';
import { loadFromStorage, saveToStorage, generateId } from '../utils/localStorage';
import { useAuth } from './SupabaseAuthContext';
import { useSupabaseWorkspace } from './SupabaseWorkspaceContext';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/sonner';

// Database type mappings
interface SupabaseTask {
  id: string;
  workspace_id: string;
  page_id?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  created_by: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface SupabasePage {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  category: string;
  url?: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TaskContextType {
  state: AppState;
  loading: boolean;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'order'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  duplicateTask: (taskId: string, targetPageId?: string) => Promise<void>;
  addPage: (page: Omit<Page, 'id' | 'createdAt' | 'tasks'>) => Promise<void>;
  updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  moveTask: (taskId: string, targetPageId?: string, targetIndex?: number) => Promise<void>;
  searchTasks: (query: string) => Task[];
  loadWorkspaceData: () => Promise<void>;
  migrateFromLocalStorage: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Mapping functions between local types and Supabase types
const mapSupabaseTaskToLocal = (supabaseTask: SupabaseTask, order: number = 0): Task => {
  return {
    id: supabaseTask.id,
    title: supabaseTask.title,
    description: supabaseTask.description || '',
    status: supabaseTask.status === 'pending' ? 'todo' :
            supabaseTask.status === 'in_progress' ? 'progress' :
            supabaseTask.status === 'completed' ? 'done' : 'todo', // Handle 'cancelled' as 'todo'
    dueDate: supabaseTask.due_date,
    priority: supabaseTask.priority === 'urgent' ? 'high' : supabaseTask.priority,
    pageId: supabaseTask.page_id,
    order,
    createdAt: supabaseTask.created_at,
    tags: [], // Will be enhanced later with tags table
    link: '', // Will be enhanced later
    attachedImage: '' // Will be enhanced later
  };
};

const mapLocalTaskToSupabase = (localTask: Task, workspaceId: string, userId: string): Omit<SupabaseTask, 'id' | 'created_at' | 'updated_at'> => {
  return {
    workspace_id: workspaceId,
    page_id: localTask.pageId || null,
    title: localTask.title,
    description: localTask.description,
    status: localTask.status === 'todo' ? 'pending' :
            localTask.status === 'progress' ? 'in_progress' : 'completed',
    priority: localTask.priority === 'high' ? 'urgent' : (localTask.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    created_by: userId,
    due_date: localTask.dueDate || null,
    assigned_to: null // Will be enhanced later with assignments
  };
};

const mapSupabasePageToLocal = (supabasePage: SupabasePage, tasks: Task[] = []): Page => {
  return {
    id: supabasePage.id,
    title: supabasePage.title,
    description: supabasePage.description || '',
    category: supabasePage.category,
    url: supabasePage.url,
    color: supabasePage.color,
    createdAt: supabasePage.created_at,
    tasks
  };
};

const mapLocalPageToSupabase = (localPage: Page, workspaceId: string, userId: string): Omit<SupabasePage, 'id' | 'created_at' | 'updated_at'> => {
  return {
    workspace_id: workspaceId,
    title: localPage.title,
    description: localPage.description,
    category: localPage.category,
    url: localPage.url,
    color: localPage.color,
    created_by: userId
  };
};

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { taskId: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'DUPLICATE_TASK'; payload: { originalTaskId: string; targetPageId?: string } }
  | { type: 'ADD_PAGE'; payload: Page }
  | { type: 'UPDATE_PAGE'; payload: { pageId: string; updates: Partial<Page> } }
  | { type: 'DELETE_PAGE'; payload: string }
  | { type: 'MOVE_TASK'; payload: { taskId: string; targetPageId?: string; targetIndex?: number } };

interface TaskState extends AppState {
  loading: boolean;
}

const taskReducer = (state: TaskState, action: Action): TaskState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'LOAD_STATE':
      return { ...action.payload, loading: false };

    case 'ADD_TASK': {
      return {
        ...state,
        unassignedTasks: [...state.unassignedTasks, action.payload]
      };
    }

    case 'UPDATE_TASK': {
      const { taskId, updates } = action.payload;
      
      const updateTaskInList = (tasks: Task[]) =>
        tasks.map(task => task.id === taskId ? { ...task, ...updates } : task);

      return {
        ...state,
        unassignedTasks: updateTaskInList(state.unassignedTasks),
        pages: state.pages.map(page => ({
          ...page,
          tasks: updateTaskInList(page.tasks)
        }))
      };
    }

    case 'DELETE_TASK': {
      const taskId = action.payload;
      
      return {
        ...state,
        unassignedTasks: state.unassignedTasks.filter(task => task.id !== taskId),
        pages: state.pages.map(page => ({
          ...page,
          tasks: page.tasks.filter(task => task.id !== taskId)
        }))
      };
    }

    case 'DUPLICATE_TASK': {
      const { originalTaskId, targetPageId } = action.payload;
      
      // Find the original task
      let originalTask: Task | undefined;
      
      // Check unassigned tasks
      originalTask = state.unassignedTasks.find(task => task.id === originalTaskId);
      
      if (!originalTask) {
        // Check page tasks
        for (const page of state.pages) {
          originalTask = page.tasks.find(task => task.id === originalTaskId);
          if (originalTask) break;
        }
      }
      
      if (!originalTask) return state;
      
      // Create duplicated task
      const duplicatedTask: Task = {
        ...originalTask,
        id: generateId(),
        title: `${originalTask.title} (Copy)`,
        createdAt: new Date().toISOString(),
        pageId: targetPageId,
        order: 0
      };
      
      if (targetPageId) {
        // Add to specific page
        const targetPageIndex = state.pages.findIndex(page => page.id === targetPageId);
        if (targetPageIndex >= 0) {
          const updatedPages = [...state.pages];
          updatedPages[targetPageIndex] = {
            ...updatedPages[targetPageIndex],
            tasks: [duplicatedTask, ...updatedPages[targetPageIndex].tasks].map((task, index) => ({ ...task, order: index }))
          };
          
          return {
            ...state,
            pages: updatedPages
          };
        }
      } else {
        // Add to unassigned tasks
        return {
          ...state,
          unassignedTasks: [duplicatedTask, ...state.unassignedTasks].map((task, index) => ({ ...task, order: index }))
        };
      }
      
      return state;
    }

    case 'ADD_PAGE': {
      return {
        ...state,
        pages: [...state.pages, action.payload]
      };
    }

    case 'UPDATE_PAGE': {
      const { pageId, updates } = action.payload;
      return {
        ...state,
        pages: state.pages.map(page => 
          page.id === pageId ? { ...page, ...updates } : page
        )
      };
    }

    case 'DELETE_PAGE': {
      const pageId = action.payload;
      const pageToDelete = state.pages.find(page => page.id === pageId);
      
      if (!pageToDelete) return state;
      
      // Move tasks back to unassigned
      const tasksToMove = pageToDelete.tasks.map(task => ({
        ...task,
        pageId: undefined,
        order: state.unassignedTasks.length + pageToDelete.tasks.indexOf(task)
      }));
      
      return {
        ...state,
        unassignedTasks: [...state.unassignedTasks, ...tasksToMove],
        pages: state.pages.filter(page => page.id !== pageId)
      };
    }

    case 'MOVE_TASK': {
      const { taskId, targetPageId, targetIndex } = action.payload;
      
      // Find the task and its current location
      let sourceTask: Task | undefined;
      let sourcePageId: string | undefined;
      
      // Check unassigned tasks
      const unassignedTask = state.unassignedTasks.find(task => task.id === taskId);
      if (unassignedTask) {
        sourceTask = unassignedTask;
      } else {
        // Check page tasks
        for (const page of state.pages) {
          const pageTask = page.tasks.find(task => task.id === taskId);
          if (pageTask) {
            sourceTask = pageTask;
            sourcePageId = page.id;
            break;
          }
        }
      }
      
      if (!sourceTask) return state;
      
      // Remove task from source
      const newUnassignedTasks = state.unassignedTasks.filter(task => task.id !== taskId);
      const newPages = state.pages.map(page => ({
        ...page,
        tasks: page.tasks.filter(task => task.id !== taskId)
      }));
      
      // Add task to target
      const updatedTask = { ...sourceTask, pageId: targetPageId };
      
      if (targetPageId) {
        // Moving to a page
        const targetPageIndex = newPages.findIndex(page => page.id === targetPageId);
        if (targetPageIndex >= 0) {
          const targetPage = newPages[targetPageIndex];
          const newTasks = [...targetPage.tasks];
          const insertIndex = targetIndex !== undefined ? targetIndex : newTasks.length;
          newTasks.splice(insertIndex, 0, updatedTask);
          
          newPages[targetPageIndex] = {
            ...targetPage,
            tasks: newTasks.map((task, index) => ({ ...task, order: index }))
          };
        }
      } else {
        // Moving to unassigned
        const insertIndex = targetIndex !== undefined ? targetIndex : newUnassignedTasks.length;
        newUnassignedTasks.splice(insertIndex, 0, { ...updatedTask, pageId: undefined });
      }
      
      return {
        ...state,
        unassignedTasks: newUnassignedTasks.map((task, index) => ({ ...task, order: index })),
        pages: newPages
      };
    }

    default:
      return state;
  }
};

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, { pages: [], unassignedTasks: [], loading: false });
  const { user } = useAuth();
  const { currentWorkspace } = useSupabaseWorkspace();

  // Load workspace data when user and workspace are available
  useEffect(() => {
    if (user && currentWorkspace) {
      loadWorkspaceData();
    }
  }, [user, currentWorkspace]);

  // Real-time subscriptions for tasks and pages
  useEffect(() => {
    if (!user || !currentWorkspace) return;

    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        () => {
          loadWorkspaceData();
        }
      )
      .subscribe();

    const pagesSubscription = supabase
      .channel('pages-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pages',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        () => {
          loadWorkspaceData();
        }
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      pagesSubscription.unsubscribe();
    };
  }, [user, currentWorkspace]);

  // Load workspace data from Supabase
  const loadWorkspaceData = async () => {
    if (!user || !currentWorkspace) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Load pages with their tasks
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: true });

      if (pagesError) throw pagesError;

      // Load all tasks for this workspace
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      // Group tasks by page
      const tasksByPage: { [pageId: string]: Task[] } = {};
      const unassignedTasks: Task[] = [];

      tasksData?.forEach((task, index) => {
        const localTask = mapSupabaseTaskToLocal(task, index);
        if (task.page_id) {
          if (!tasksByPage[task.page_id]) {
            tasksByPage[task.page_id] = [];
          }
          tasksByPage[task.page_id].push(localTask);
        } else {
          unassignedTasks.push(localTask);
        }
      });

      // Create pages with their tasks
      const pages: Page[] = pagesData?.map(pageData => {
        const pageTasks = tasksByPage[pageData.id] || [];
        return mapSupabasePageToLocal(pageData, pageTasks);
      }) || [];

      dispatch({
        type: 'LOAD_STATE',
        payload: { pages, unassignedTasks }
      });

    } catch (error) {
      console.error('Error loading workspace data:', error);
      toast.error('Failed to load workspace data');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'order'>) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      const supabaseTask = mapLocalTaskToSupabase({
        ...taskData,
        id: '', // Will be generated by Supabase
        createdAt: '',
        order: 0
      }, currentWorkspace.id, user.id);

      const { data, error } = await supabase
        .from('tasks')
        .insert(supabaseTask)
        .select()
        .single();

      if (error) throw error;

      const newTask = mapSupabaseTaskToLocal(data, state.unassignedTasks.length);
      dispatch({ type: 'ADD_TASK', payload: newTask });

      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      toast.error(`Failed to create task: ${errorMessage}`);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      // Convert local updates to Supabase format
      const supabaseUpdates: Partial<SupabaseTask> = {};

      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.status !== undefined) {
        supabaseUpdates.status = updates.status === 'todo' ? 'pending' :
                                 updates.status === 'progress' ? 'in_progress' : 'completed';
      }
      if (updates.priority !== undefined) {
        supabaseUpdates.priority = updates.priority === 'high' ? 'urgent' : (updates.priority || 'medium');
      }
      if (updates.dueDate !== undefined) supabaseUpdates.due_date = updates.dueDate;
      if (updates.pageId !== undefined) supabaseUpdates.page_id = updates.pageId;

      const { error } = await supabase
        .from('tasks')
        .update(supabaseUpdates)
        .eq('id', taskId)
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      dispatch({ type: 'UPDATE_TASK', payload: { taskId, updates } });
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      dispatch({ type: 'DELETE_TASK', payload: taskId });
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const duplicateTask = async (taskId: string, targetPageId?: string) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      // Find the original task
      let originalTask: Task | undefined;

      // Check unassigned tasks
      originalTask = state.unassignedTasks.find(task => task.id === taskId);

      if (!originalTask) {
        // Check page tasks
        for (const page of state.pages) {
          originalTask = page.tasks.find(task => task.id === taskId);
          if (originalTask) break;
        }
      }

      if (!originalTask) {
        toast.error('Task not found');
        return;
      }

      // Create duplicated task data
      const duplicatedTaskData = {
        ...originalTask,
        title: `${originalTask.title} (Copy)`,
        pageId: targetPageId
      };

      // Remove fields that will be auto-generated
      const { id, createdAt, order, ...taskDataToCreate } = duplicatedTaskData;

      await addTask(taskDataToCreate);

      toast.success('Task duplicated successfully');
    } catch (error) {
      console.error('Error duplicating task:', error);
      toast.error('Failed to duplicate task');
    }
  };

  const addPage = async (pageData: Omit<Page, 'id' | 'createdAt' | 'tasks'>) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      const supabasePage = mapLocalPageToSupabase({
        ...pageData,
        id: '', // Will be generated by Supabase
        createdAt: '',
        tasks: []
      }, currentWorkspace.id, user.id);

      console.log('Attempting to insert page:', supabasePage);
      console.log('Current workspace:', currentWorkspace);
      console.log('Current user:', user);

      const { data, error } = await supabase
        .from('pages')
        .insert(supabasePage)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }

      const newPage = mapSupabasePageToLocal(data, []);
      dispatch({ type: 'ADD_PAGE', payload: newPage });

      toast.success('Page created successfully');
    } catch (error) {
      console.error('Error adding page:', error);
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to create page';
      toast.error(`Failed to create page: ${errorMessage}`);
    }
  };

  const updatePage = async (pageId: string, updates: Partial<Page>) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      // Convert local updates to Supabase format
      const supabaseUpdates: Partial<SupabasePage> = {};

      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.category !== undefined) supabaseUpdates.category = updates.category;
      if (updates.url !== undefined) supabaseUpdates.url = updates.url;
      if (updates.color !== undefined) supabaseUpdates.color = updates.color;

      const { error } = await supabase
        .from('pages')
        .update(supabaseUpdates)
        .eq('id', pageId)
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      dispatch({ type: 'UPDATE_PAGE', payload: { pageId, updates } });
      toast.success('Page updated successfully');
    } catch (error) {
      console.error('Error updating page:', error);
      toast.error('Failed to update page');
    }
  };

  const deletePage = async (pageId: string) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      dispatch({ type: 'DELETE_PAGE', payload: pageId });
      toast.success('Page deleted successfully');
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
    }
  };

  const moveTask = async (taskId: string, targetPageId?: string, targetIndex?: number) => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      await updateTask(taskId, { pageId: targetPageId });
      toast.success('Task moved successfully');
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
    }
  };

  // Migration function to move data from localStorage to Supabase
  const migrateFromLocalStorage = async () => {
    if (!user || !currentWorkspace) {
      toast.error('No workspace selected');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Load data from localStorage
      const localData = loadFromStorage(user.id);

      if (localData.pages.length === 0 && localData.unassignedTasks.length === 0) {
        toast.info('No local data to migrate');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Migrate pages first
      const pageIdMapping: { [oldId: string]: string } = {};

      for (const page of localData.pages) {
        const { id, createdAt, tasks, ...pageData } = page;
        const supabasePage = mapLocalPageToSupabase(page, currentWorkspace.id, user.id);

        const { data, error } = await supabase
          .from('pages')
          .insert(supabasePage)
          .select()
          .single();

        if (error) throw error;

        pageIdMapping[id] = data.id;
      }

      // Migrate tasks
      const allTasks = [
        ...localData.unassignedTasks,
        ...localData.pages.flatMap(page => page.tasks)
      ];

      for (const task of allTasks) {
        const { id, createdAt, order, ...taskData } = task;

        // Update pageId if task was on a page
        if (task.pageId && pageIdMapping[task.pageId]) {
          taskData.pageId = pageIdMapping[task.pageId];
        }

        const supabaseTask = mapLocalTaskToSupabase(task, currentWorkspace.id, user.id);

        const { error } = await supabase
          .from('tasks')
          .insert(supabaseTask);

        if (error) throw error;
      }

      // Clear localStorage after successful migration
      saveToStorage({ pages: [], unassignedTasks: [] }, user.id);

      // Reload data from Supabase
      await loadWorkspaceData();

      toast.success(`Successfully migrated ${localData.pages.length} pages and ${allTasks.length} tasks`);
    } catch (error) {
      console.error('Error migrating data:', error);
      toast.error('Failed to migrate data from local storage');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const searchTasks = (query: string): Task[] => {
    if (!query.trim()) return state.unassignedTasks;
    
    const lowerQuery = query.toLowerCase();
    return state.unassignedTasks.filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description.toLowerCase().includes(lowerQuery)
    );
  };

  return (
    <TaskContext.Provider value={{
      state: { pages: state.pages, unassignedTasks: state.unassignedTasks },
      loading: state.loading,
      addTask,
      updateTask,
      deleteTask,
      duplicateTask,
      addPage,
      updatePage,
      deletePage,
      moveTask,
      searchTasks,
      loadWorkspaceData,
      migrateFromLocalStorage
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};
