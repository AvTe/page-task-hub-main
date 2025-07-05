import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from './ui/sonner';

export const TaskManagementTest: React.FC = () => {
  const { state, loading, addTask, updateTask, deleteTask, addPage } = useTask();
  const { currentWorkspace } = useSupabaseWorkspace();
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as const,
    priority: 'medium' as const,
    pageId: undefined as string | undefined
  });

  const [newPage, setNewPage] = useState({
    title: '',
    description: '',
    category: 'Work',
    color: '#4ECDC4'
  });

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingPage, setIsAddingPage] = useState(false);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setIsAddingTask(true);
    try {
      await addTask({
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        pageId: newTask.pageId,
        tags: [],
        link: '',
        attachedImage: ''
      });
      
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        pageId: undefined
      });
      
      toast.success('Task added successfully!');
    } catch (error) {
      toast.error('Failed to add task');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleAddPage = async () => {
    if (!newPage.title.trim()) {
      toast.error('Page title is required');
      return;
    }

    setIsAddingPage(true);
    try {
      await addPage({
        title: newPage.title,
        description: newPage.description,
        category: newPage.category,
        color: newPage.color,
        url: ''
      });
      
      setNewPage({
        title: '',
        description: '',
        category: 'Work',
        color: '#4ECDC4'
      });
      
      toast.success('Page added successfully!');
    } catch (error) {
      toast.error('Failed to add page');
    } finally {
      setIsAddingPage(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'todo' | 'progress' | 'done') => {
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Please select a workspace to test task management.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Management Test - {currentWorkspace.name}</CardTitle>
          <CardDescription>
            Test the Supabase-powered task management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading workspace data...</span>
            </div>
          )}

          {/* Add New Page */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Add New Page</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Page title"
                value={newPage.title}
                onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={newPage.description}
                onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
              />
              <Select value={newPage.category} onValueChange={(value) => setNewPage({ ...newPage, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddPage} disabled={isAddingPage}>
                {isAddingPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Page
              </Button>
            </div>
          </div>

          {/* Add New Task */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Add New Task</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <Select value={newTask.pageId || 'unassigned'} onValueChange={(value) => setNewTask({ ...newTask, pageId: value === 'unassigned' ? undefined : value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {state.pages.map(page => (
                    <SelectItem key={page.id} value={page.id}>{page.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Task description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="md:col-span-2"
              />
              <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddTask} disabled={isAddingTask}>
                {isAddingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Task
              </Button>
            </div>
          </div>

          {/* Display Pages and Tasks */}
          <div className="space-y-4">
            <h3 className="font-semibold">Pages ({state.pages.length})</h3>
            {state.pages.map(page => (
              <Card key={page.id} className="border-l-4" style={{ borderLeftColor: page.color }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{page.title}</CardTitle>
                  <CardDescription>{page.description}</CardDescription>
                  <Badge variant="secondary">{page.category}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-medium">Tasks ({page.tasks.length})</h4>
                    {page.tasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                          <Select value={task.status} onValueChange={(value: any) => handleTaskStatusChange(task.id, value)}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">Todo</SelectItem>
                              <SelectItem value="progress">Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <h3 className="font-semibold">Unassigned Tasks ({state.unassignedTasks.length})</h3>
            {state.unassignedTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-gray-500">{task.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                    {task.status}
                  </Badge>
                  <Select value={task.status} onValueChange={(value: any) => handleTaskStatusChange(task.id, value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskManagementTest;
