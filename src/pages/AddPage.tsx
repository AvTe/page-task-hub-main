
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTask } from '../contexts/TaskContext';
import { CATEGORIES, PAGE_COLORS } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Globe, Save } from 'lucide-react';
import ModernLayout from '../components/ModernLayout';

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
    <ModernLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <h1 className="text-3xl font-bold text-foreground mb-2">
              Add New Website
            </h1>
            <p className="text-muted-foreground">
              Create a new website project to organize your tasks.
            </p>
          </div>
        </div>

        <Card className="card-modern">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Website Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fill in the information below to create your new website project
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  Website Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., E-commerce Store, Portfolio Website, Blog"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="url" className="text-base font-medium">
                  Website URL
                </Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-2"
                  type="url"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this website project..."
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
                <Label className="text-base font-medium">Color Theme</Label>
                <div className="flex flex-wrap gap-3 mt-3">
                  {PAGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                        selectedColor === color
                          ? 'border-primary shadow-lg'
                          : 'border-border hover:border-primary/50'
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
                  className="flex-1 btn-orange"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Website
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
    </ModernLayout>
  );
};

export default AddPage;
