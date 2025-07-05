import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Template, 
  Star, 
  Copy, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  CheckSquare,
  Clock,
  Tag,
  Users,
  Globe,
  Lock
} from 'lucide-react';
import { TaskTemplate, Task, SubTask, CATEGORIES } from '../types';

interface TaskTemplateManagerProps {
  onCreateTaskFromTemplate: (template: TaskTemplate, pageId?: string) => void;
  workspaceId: string;
  currentUserId: string;
}

const PREDEFINED_TEMPLATES: TaskTemplate[] = [
  {
    id: 'template_1',
    name: 'Bug Fix',
    description: 'Standard template for fixing bugs',
    category: 'Work',
    priority: 'high',
    estimatedHours: 4,
    tags: ['bug', 'development'],
    subtasks: [
      { title: 'Reproduce the bug' },
      { title: 'Identify root cause' },
      { title: 'Implement fix' },
      { title: 'Write tests' },
      { title: 'Code review' },
      { title: 'Deploy to staging' },
      { title: 'Verify fix' }
    ],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isPublic: true,
    usageCount: 156
  },
  {
    id: 'template_2',
    name: 'Feature Development',
    description: 'Complete feature development workflow',
    category: 'Work',
    priority: 'medium',
    estimatedHours: 16,
    tags: ['feature', 'development'],
    subtasks: [
      { title: 'Requirements analysis' },
      { title: 'Design mockups' },
      { title: 'Technical specification' },
      { title: 'Implementation' },
      { title: 'Unit testing' },
      { title: 'Integration testing' },
      { title: 'Documentation' },
      { title: 'Code review' },
      { title: 'QA testing' },
      { title: 'Deployment' }
    ],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isPublic: true,
    usageCount: 89
  },
  {
    id: 'template_3',
    name: 'Content Creation',
    description: 'Blog post or article creation process',
    category: 'Work',
    priority: 'medium',
    estimatedHours: 8,
    tags: ['content', 'writing', 'marketing'],
    subtasks: [
      { title: 'Research topic' },
      { title: 'Create outline' },
      { title: 'Write first draft' },
      { title: 'Add images/media' },
      { title: 'Edit and proofread' },
      { title: 'SEO optimization' },
      { title: 'Publish' },
      { title: 'Promote on social media' }
    ],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isPublic: true,
    usageCount: 67
  },
  {
    id: 'template_4',
    name: 'Event Planning',
    description: 'Comprehensive event planning checklist',
    category: 'Work',
    priority: 'medium',
    estimatedHours: 20,
    tags: ['event', 'planning', 'coordination'],
    subtasks: [
      { title: 'Define event goals and budget' },
      { title: 'Choose date and venue' },
      { title: 'Create guest list' },
      { title: 'Send invitations' },
      { title: 'Plan catering' },
      { title: 'Arrange equipment/AV' },
      { title: 'Coordinate speakers/entertainment' },
      { title: 'Prepare materials' },
      { title: 'Day-of coordination' },
      { title: 'Follow-up and feedback' }
    ],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isPublic: true,
    usageCount: 43
  }
];

const TaskTemplateManager: React.FC<TaskTemplateManagerProps> = ({
  onCreateTaskFromTemplate,
  workspaceId,
  currentUserId
}) => {
  const [templates, setTemplates] = useState<TaskTemplate[]>(PREDEFINED_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({
    name: '',
    description: '',
    category: 'Work',
    priority: 'medium',
    tags: [],
    subtasks: [],
    isPublic: false
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name?.trim()) return;

    const template: TaskTemplate = {
      id: `template_${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description || '',
      category: newTemplate.category || 'Work',
      priority: newTemplate.priority || 'medium',
      estimatedHours: newTemplate.estimatedHours,
      tags: newTemplate.tags || [],
      subtasks: newTemplate.subtasks || [],
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      isPublic: newTemplate.isPublic || false,
      usageCount: 0
    };

    setTemplates(prev => [template, ...prev]);
    setNewTemplate({
      name: '',
      description: '',
      category: 'Work',
      priority: 'medium',
      tags: [],
      subtasks: [],
      isPublic: false
    });
    setIsCreatingTemplate(false);
  };

  const handleUseTemplate = (template: TaskTemplate) => {
    // Increment usage count
    setTemplates(prev => prev.map(t => 
      t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t
    ));
    
    onCreateTaskFromTemplate(template);
  };

  const addSubtaskToTemplate = () => {
    setNewTemplate(prev => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), { title: '', description: '' }]
    }));
  };

  const updateTemplateSubtask = (index: number, updates: Partial<{ title: string; description: string }>) => {
    setNewTemplate(prev => ({
      ...prev,
      subtasks: prev.subtasks?.map((st, i) => 
        i === index ? { ...st, ...updates } : st
      ) || []
    }));
  };

  const removeTemplateSubtask = (index: number) => {
    setNewTemplate(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Template className="h-6 w-6" />
            Task Templates
          </h2>
          <p className="text-muted-foreground">
            Create tasks quickly using predefined templates
          </p>
        </div>
        
        <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Task Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for common tasks
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name || ''}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Bug Fix, Feature Development"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={newTemplate.category || 'Work'}
                    onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description || ''}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when to use this template..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-priority">Default Priority</Label>
                  <Select
                    value={newTemplate.priority || 'medium'}
                    onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="template-hours">Estimated Hours</Label>
                  <Input
                    id="template-hours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={newTemplate.estimatedHours || ''}
                    onChange={(e) => setNewTemplate(prev => ({ 
                      ...prev, 
                      estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="template-tags">Tags</Label>
                <Input
                  id="template-tags"
                  value={newTemplate.tags?.join(', ') || ''}
                  onChange={(e) => setNewTemplate(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }))}
                  placeholder="Enter tags separated by commas"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Subtasks</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSubtaskToTemplate}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Subtask
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {newTemplate.subtasks?.map((subtask, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={subtask.title}
                        onChange={(e) => updateTemplateSubtask(index, { title: e.target.value })}
                        placeholder="Subtask title..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTemplateSubtask(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="template-public"
                  checked={newTemplate.isPublic || false}
                  onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="template-public">Make template public for all workspace members</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingTemplate(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {template.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {template.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {template.category}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  {template.subtasks.length} subtasks
                </div>
                {template.estimatedHours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {template.estimatedHours}h
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {template.usageCount}
                </div>
              </div>
              
              {template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              <Button
                className="w-full"
                onClick={() => handleUseTemplate(template)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Template className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first template to get started'
            }
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <Button onClick={() => setIsCreatingTemplate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskTemplateManager;
