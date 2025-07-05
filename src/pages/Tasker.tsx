import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } from '../utils/dragDrop';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Inbox, BarChart3, CheckCircle2, Globe } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import PageCard from '../components/PageCard';
import AddTaskModal from '../components/AddTaskModal';
import AddPageModal from '../components/AddPageModal';
import { Link } from 'react-router-dom';

const Tasker: React.FC = () => {
  const { state, moveTask, searchTasks } = useTask();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  if (state.pages.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="p-8 sm:p-12 text-center bg-white/80 backdrop-blur-sm shadow-lg">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-2xl mx-auto flex items-center justify-center">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                No Websites Yet
              </h2>
              <p className="text-gray-600 text-base">
                You need to add at least one website or project before you can start managing tasks. 
                Each website will have its own dedicated task board.
              </p>
              <div className="space-y-3">
                <Link to="/websites">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 w-full"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Website
                  </Button>
                </Link>
                <p className="text-sm text-gray-500">
                  Once you add a website, you'll be able to create and manage tasks for it.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const filteredTasks = searchQuery.trim() 
    ? searchTasks(searchQuery)
    : state.unassignedTasks;

  const handleUnassignedDrop = (event: React.DragEvent) => {
    const dragData = handleDrop(event);
    if (dragData && dragData.type === 'task') {
      moveTask(dragData.taskId, undefined);
    }
  };

  const totalTasks = state.unassignedTasks.length + 
    state.pages.reduce((total, page) => total + page.tasks.length, 0);

  const completedTasks = state.unassignedTasks.filter(task => task.status === 'done').length +
    state.pages.reduce((total, page) => 
      total + page.tasks.filter(task => task.status === 'done').length, 0
    );

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Enhanced Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  Task Dashboard
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Organize your work with drag-and-drop simplicity
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/websites">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-gradient-to-r from-coral-orange to-cornflower-blue"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Manage Websites
                  </Button>
                </Link>
                <Button
                  onClick={() => setShowAddPageModal(true)}
                  className="bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Website
                </Button>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-4 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Total Tasks</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900">{totalTasks}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Completed</p>
                    <p className="text-lg sm:text-xl font-bold text-green-600">{completedTasks}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Inbox className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Pages</p>
                    <p className="text-lg sm:text-xl font-bold text-purple-600">{state.pages.length}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <div className="w-4 h-4 text-orange-600 font-bold text-xs flex items-center justify-center">
                      %
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Progress</p>
                    <p className="text-lg sm:text-xl font-bold text-orange-600">{completionRate}%</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Sidebar - Unassigned Tasks */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="sticky top-4 bg-white/90 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-lg">
                    <Inbox className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base sm:text-lg">Tasks to Assign</h2>
                    <p className="text-xs text-gray-500">{filteredTasks.length} tasks</p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/80"
                  />
                </div>
              </CardHeader>
              
              <CardContent 
                className="max-h-[50vh] lg:max-h-96 overflow-y-auto space-y-1"
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleUnassignedDrop}
              >
                {/* Add Task Button */}
                <Button
                  onClick={() => setShowAddTaskModal(true)}
                  className="w-full justify-start text-left bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium mb-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Task
                </Button>
                
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {searchQuery ? (
                      <div className="space-y-2">
                        <Search className="w-8 h-8 mx-auto opacity-50" />
                        <p className="text-sm">No tasks found for "{searchQuery}"</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Inbox className="w-8 h-8 mx-auto opacity-50" />
                        <p className="text-sm">No unassigned tasks</p>
                        <p className="text-xs">Click "Add New Task" to get started</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task, index) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        index={index}
                        showFullDetails={true}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Pages */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {state.pages.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center bg-white/80 backdrop-blur-sm shadow-lg">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-2xl mx-auto flex items-center justify-center">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
                    No Pages Yet
                  </h3>
                  <p className="text-gray-500 text-sm sm:text-base">
                    Create your first page to start organizing your tasks. 
                    Pages help you group related tasks together by project or category.
                  </p>
                  <Button
                    onClick={() => setShowAddPageModal(true)}
                    className="bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    size="lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Page
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {state.pages.map((page) => (
                  <div key={page.id} className="animate-fade-in">
                    <PageCard page={page} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddPageModal 
        isOpen={showAddPageModal}
        onClose={() => setShowAddPageModal(false)}
      />

      <AddTaskModal 
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
      />
    </div>
  );
};

export default Tasker;
