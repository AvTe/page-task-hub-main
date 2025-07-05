
import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Plus, Trash2, Eye, BarChart3 } from 'lucide-react';
import AddPageModal from './AddPageModal';

const WebsiteManager: React.FC = () => {
  const { state, deletePage } = useTask();
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  const handleDeletePage = (pageId: string, pageTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${pageTitle}"? All tasks will be moved back to the unassigned list.`)) {
      deletePage(pageId);
    }
  };

  const getTaskStats = (pageId: string) => {
    const page = state.pages.find(p => p.id === pageId);
    if (!page) return { total: 0, completed: 0, inProgress: 0 };
    
    const total = page.tasks.length;
    const completed = page.tasks.filter(task => task.status === 'done').length;
    const inProgress = page.tasks.filter(task => task.status === 'progress').length;
    
    return { total, completed, inProgress };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Website Manager
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Manage all your websites and their task screens
              </p>
            </div>
            <Button
              onClick={() => setShowAddPageModal(true)}
              className="bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Website
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Websites</p>
                <p className="text-xl font-bold text-gray-900">{state.pages.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-xl font-bold text-green-600">
                  {state.pages.reduce((total, page) => total + page.tasks.length, 0)}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unassigned</p>
                <p className="text-xl font-bold text-purple-600">{state.unassignedTasks.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Websites Grid */}
        {state.pages.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center bg-white/80 backdrop-blur-sm shadow-lg">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-2xl mx-auto flex items-center justify-center">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
                No Websites Yet
              </h3>
              <p className="text-gray-500 text-sm sm:text-base">
                Create your first website to start organizing your tasks by project or client.
              </p>
              <Button
                onClick={() => setShowAddPageModal(true)}
                className="bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Website
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.pages.map((page) => {
              const stats = getTaskStats(page.id);
              return (
                <Card key={page.id} className="hover:shadow-lg transition-shadow bg-white/90 backdrop-blur-sm">
                  <CardHeader 
                    className="pb-3"
                    style={{ backgroundColor: `${page.color}20` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{page.title}</h3>
                        {page.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{page.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {page.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {stats.total} tasks
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                        onClick={() => handleDeletePage(page.id, page.title)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 space-y-4">
                    {/* Task Statistics */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-gray-600">Todo</p>
                        <p className="font-semibold text-blue-600">{stats.total - stats.completed - stats.inProgress}</p>
                      </div>
                      <div className="p-2 bg-yellow-50 rounded">
                        <p className="text-xs text-gray-600">Progress</p>
                        <p className="font-semibold text-yellow-600">{stats.inProgress}</p>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <p className="text-xs text-gray-600">Done</p>
                        <p className="font-semibold text-green-600">{stats.completed}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => window.location.href = `/tasker?page=${page.id}`}
                        className="flex-1 bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white text-sm"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Tasks
                      </Button>
                    </div>

                    {page.url && (
                      <div className="pt-2 border-t">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          Visit Website
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddPageModal 
        isOpen={showAddPageModal}
        onClose={() => setShowAddPageModal(false)}
      />
    </div>
  );
};

export default WebsiteManager;
