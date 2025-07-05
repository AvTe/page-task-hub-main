
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTask } from '../contexts/TaskContext';
import { CATEGORIES, PAGE_COLORS } from '../types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Globe } from 'lucide-react';

const AddPage: React.FC = () => {
  const navigate = useNavigate();
  const { addPage } = useTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [url, setUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState(PAGE_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && category) {
      addPage({
        title: title.trim(),
        description: description.trim(),
        category,
        url: url.trim() || undefined,
        color: selectedColor
      });
      
      navigate('/tasker');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Add New Page
          </h1>
          <p className="text-gray-600">
            Create a new page to organize your tasks by project, category, or website.
          </p>
        </div>

        <Card className="border-2 border-gradient-to-r from-coral-orange to-cornflower-blue">
          <CardHeader className="bg-gradient-to-r from-coral-orange/10 to-cornflower-blue/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Page Details</h2>
                <p className="text-sm text-gray-600">
                  Fill in the information below to create your new page
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  Page Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Website Redesign, Shopping List, Work Tasks"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what this page is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="category" className="text-base font-medium">
                  Category *
                </Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="url" className="text-base font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website URL (optional)
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Add a website URL if this page is related to a specific site
                </p>
              </div>
              
              <div>
                <Label className="text-base font-medium">Color Theme</Label>
                <div className="flex flex-wrap gap-3 mt-3">
                  {PAGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColor === color 
                          ? 'border-gray-800 shadow-lg' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-6 border-t">
                <Button 
                  type="submit" 
                  disabled={!title.trim() || !category}
                  className="flex-1 bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Page
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/tasker')}
                  className="px-8"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddPage;
