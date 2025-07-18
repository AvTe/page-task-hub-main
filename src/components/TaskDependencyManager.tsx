import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  GitBranch,
  ArrowRight,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { TaskDependency, Task } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/SupabaseAuthContext';

interface TaskDependencyManagerProps {
  task: Task;
  allTasks: Task[]; // All tasks in the workspace for dependency selection
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

const DEPENDENCY_TYPES = {
  finish_to_start: {
    label: 'Finish to Start',
    description: 'This task can start when the dependency finishes',
    icon: '→'
  },
  start_to_start: {
    label: 'Start to Start',
    description: 'This task can start when the dependency starts',
    icon: '⇉'
  },
  finish_to_finish: {
    label: 'Finish to Finish',
    description: 'This task can finish when the dependency finishes',
    icon: '⇄'
  },
  start_to_finish: {
    label: 'Start to Finish',
    description: 'This task can finish when the dependency starts',
    icon: '↰'
  }
} as const;

const TaskDependencyManager: React.FC<TaskDependencyManagerProps> = ({ 
  task, 
  allTasks, 
  onUpdateTask 
}) => {
  const { user } = useAuth();
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedType, setSelectedType] = useState<keyof typeof DEPENDENCY_TYPES>('finish_to_start');
  const [loading, setLoading] = useState(false);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load dependencies from database
  useEffect(() => {
    loadDependencies();
  }, [task.id]);

  const loadDependencies = async () => {
    try {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(
            id,
            title,
            status
          )
        `)
        .eq('task_id', task.id);

      if (error) {
        console.error('Error loading dependencies:', error);
        setError('Failed to load task dependencies');
        return;
      }

      const formattedDependencies: TaskDependency[] = data?.map(dep => ({
        id: dep.id,
        taskId: dep.task_id,
        dependsOnTaskId: dep.depends_on_task_id,
        type: dep.dependency_type as TaskDependency['type'],
        dependsOnTask: dep.depends_on_task
      })) || [];

      setDependencies(formattedDependencies);
    } catch (error) {
      console.error('Error loading dependencies:', error);
      setError('Failed to load task dependencies');
    }
  };
  
  // Get tasks that depend on this task
  const dependentTasks = allTasks.filter(t => 
    t.dependencies?.some(dep => dep.dependsOnTaskId === task.id)
  );

  // Get available tasks for dependency (exclude self and existing dependencies)
  const availableTasks = allTasks.filter(t => 
    t.id !== task.id && 
    !dependencies.some(dep => dep.dependsOnTaskId === t.id) &&
    !dependentTasks.some(dt => dt.id === t.id) // Prevent circular dependencies
  );

  const addDependency = async () => {
    if (!selectedTaskId || loading) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('task_dependencies')
        .insert({
          task_id: task.id,
          depends_on_task_id: selectedTaskId,
          dependency_type: selectedType,
          created_by: user?.id
        })
        .select(`
          *,
          depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(
            id,
            title,
            status
          )
        `)
        .single();

      if (error) {
        if (error.message.includes('Circular dependency')) {
          setError('Cannot add dependency: This would create a circular dependency');
        } else {
          setError('Failed to add dependency');
        }
        console.error('Error adding dependency:', error);
        return;
      }

      // Add to local state
      const newDependency: TaskDependency = {
        id: data.id,
        dependentTaskId: data.task_id,
        dependsOnTaskId: data.depends_on_task_id,
        type: data.dependency_type as TaskDependency['type'],
        dependsOnTask: data.depends_on_task,
        createdAt: data.created_at
      };

      setDependencies(prev => [...prev, newDependency]);
      setSelectedTaskId('');
      setSelectedType('finish_to_start');
      setIsAddingDependency(false);

    } catch (error) {
      console.error('Error adding dependency:', error);
      setError('Failed to add dependency');
    } finally {
      setLoading(false);
    }
  };

  const removeDependency = async (dependencyId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) {
        console.error('Error removing dependency:', error);
        setError('Failed to remove dependency');
        return;
      }

      // Remove from local state
      setDependencies(prev => prev.filter(dep => dep.id !== dependencyId));

    } catch (error) {
      console.error('Error removing dependency:', error);
      setError('Failed to remove dependency');
    } finally {
      setLoading(false);
    }
  };

  const getDependencyTask = (taskId: string) => {
    return allTasks.find(t => t.id === taskId);
  };

  const getDependencyStatus = (dependency: TaskDependency) => {
    const dependencyTask = getDependencyTask(dependency.dependsOnTaskId);
    if (!dependencyTask) return 'unknown';

    switch (dependency.type) {
      case 'finish_to_start':
        return dependencyTask.status === 'done' ? 'ready' : 'blocked';
      case 'start_to_start':
        return dependencyTask.status !== 'todo' ? 'ready' : 'blocked';
      case 'finish_to_finish':
        return dependencyTask.status === 'done' ? 'ready' : 'waiting';
      case 'start_to_finish':
        return dependencyTask.status !== 'todo' ? 'ready' : 'waiting';
      default:
        return 'unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Task Dependencies
          </CardTitle>
          <Dialog open={isAddingDependency} onOpenChange={setIsAddingDependency}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Dependency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Task Dependency</DialogTitle>
                <DialogDescription>
                  Select a task that this task depends on and the type of dependency.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dependency-task">Depends on Task</Label>
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTasks.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {t.status}
                            </Badge>
                            <span>{t.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No available tasks for dependencies
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dependency-type">Dependency Type</Label>
                  <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEPENDENCY_TYPES).map(([key, type]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{type.icon}</span>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingDependency(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addDependency}
                    disabled={!selectedTaskId}
                  >
                    Add Dependency
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Dependencies */}
        {dependencies.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">This task depends on:</h4>
            {dependencies.map(dependency => {
              const dependencyTask = getDependencyTask(dependency.dependsOnTaskId);
              const status = getDependencyStatus(dependency);
              
              return (
                <div
                  key={dependency.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <span className="font-mono text-sm">
                      {DEPENDENCY_TYPES[dependency.type].icon}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {dependencyTask?.title || 'Unknown Task'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {dependencyTask?.status || 'unknown'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {DEPENDENCY_TYPES[dependency.type].label}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(status)}`}>
                      {status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDependency(dependency.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dependent Tasks */}
        {dependentTasks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Tasks that depend on this:</h4>
            {dependentTasks.map(dependentTask => (
              <div
                key={dependentTask.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
              >
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{dependentTask.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {dependentTask.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {dependencies.length === 0 && dependentTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No dependencies set</p>
            <p className="text-sm">Add dependencies to manage task relationships</p>
          </div>
        )}

        {/* Blocked Warning */}
        {dependencies.some(dep => getDependencyStatus(dep) === 'blocked') && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This task is blocked by incomplete dependencies. Complete the required tasks first.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskDependencyManager;
