import React, { useState, useEffect } from 'react';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } from '../utils/dragDrop';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Inbox, 
  BarChart3, 
  CheckCircle2, 
  Globe, 
  Timer, 
  MessageCircle, 
  GitBranch, 
  Layers,
  Settings,
  PlayCircle,
  PauseCircle,
  Clock
} from 'lucide-react';
import TaskCard from '../components/TaskCard';
import PageCard from '../components/PageCard';
import AddTaskModal from '../components/AddTaskModal';
import AddPageModal from '../components/AddPageModal';
import ModernLayout from '../components/ModernLayout';
import TaskViews from '../components/TaskViews';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useUserStats } from '../hooks/useUserQueries';
import { useWorkspaceTasks } from '../hooks/useTaskQueries';
import { useWorkspacePages } from '../hooks/usePageQueries';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';

const Tasker: React.FC = () => {
  const { state, moveTask, searchTasks, updateTask } = useTask();
  const { user } = useAuth();
  const { currentWorkspace } = useSupabaseWorkspace();

  // Use caching hooks for better performance
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: workspaceTasks, isLoading: tasksLoading } = useWorkspaceTasks(currentWorkspace?.id || '');
  const { data: workspacePages, isLoading: pagesLoading } = useWorkspacePages(currentWorkspace?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [advancedStats, setAdvancedStats] = useState({
    totalTimeTracked: userStats?.totalTimeTracked || 0,
    activeTimers: userStats?.activeTimers || 0,
    totalComments: userStats?.totalComments || 0,
    totalDependencies: 0,
    totalSubtasks: userStats?.totalSubtasks || 0,
    databaseSetup: false
  });

  // Load advanced features stats
  useEffect(() => {
    loadAdvancedStats();
  }, [user]);

  const loadAdvancedStats = async () => {
    if (!user) return;

    try {
      // Check if advanced features tables exist (gracefully handle errors)
      let databaseSetup = false;
      try {
        const { data: tables, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .in('table_name', ['task_dependencies', 'subtasks', 'task_comments', 'task_time_entries']);

        if (!error && tables) {
          databaseSetup = tables.length === 4;
        }
      } catch (tableCheckError) {
        console.log('Advanced tables check failed, continuing with basic features');
        databaseSetup = false;
      }

      if (!databaseSetup) {
        setAdvancedStats(prev => ({ ...prev, databaseSetup: false }));
        return;
      }

      // Load stats
      const [timeEntries, comments, dependencies, subtasks] = await Promise.all([
        supabase.from('task_time_entries').select('duration_minutes, end_time').eq('user_id', user.id),
        supabase.from('task_comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('task_dependencies').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
        supabase.from('subtasks').select('*').eq('created_by', user.id)
      ]);

      const totalTimeTracked = timeEntries.data?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
      const activeTimers = timeEntries.data?.filter(entry => !entry.end_time).length || 0;

      setAdvancedStats({
        totalTimeTracked,
        activeTimers,
        totalComments: comments.count || 0,
        totalDependencies: dependencies.count || 0,
        totalSubtasks: subtasks.data?.length || 0,
        databaseSetup: true
      });

    } catch (error) {
      console.error('Error loading advanced stats:', error);
    }
  };

  const openTaskDetails = (task: any) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  if (state.pages.length === 0) {
    return (
      <ModernLayout>
        <div className="max-w-4xl mx-auto">
          <Card className="card-modern p-8 sm:p-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl mx-auto flex items-center justify-center">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome to EasTask</h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Create your first project to start organizing your tasks and boost your productivity.
                </p>
              </div>
              <div className="space-y-3">
                <Link to="/websites">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Projects help you organize related tasks and collaborate with your team
                </p>
              </div>
            </div>
          </Card>
        </div>
      </ModernLayout>
    );
  }

  // Calculate stats
  const totalTasks = state.unassignedTasks.length + state.pages.reduce((sum, page) => sum + page.tasks.length, 0);
  const completedTasks = state.unassignedTasks.filter(task => task.status === 'done').length + 
                        state.pages.reduce((sum, page) => sum + page.tasks.filter(task => task.status === 'done').length, 0);
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Filter tasks based on search
  const filteredTasks = searchQuery 
    ? searchTasks(searchQuery)
    : state.unassignedTasks;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <ModernLayout>
      <TaskViews
        defaultView="board"
        showViewToggle={true}
        showFilters={true}
        compactMode={false}
      />
    </ModernLayout>
  );
};

export default Tasker;

