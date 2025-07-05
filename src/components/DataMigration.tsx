import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { loadFromStorage } from '../utils/localStorage';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, Database, Upload } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export const DataMigration: React.FC = () => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [localDataExists, setLocalDataExists] = useState(false);
  const [localDataStats, setLocalDataStats] = useState({ pages: 0, tasks: 0 });
  
  const { user } = useAuth();
  const { currentWorkspace } = useSupabaseWorkspace();
  const { migrateFromLocalStorage, loading } = useTask();

  React.useEffect(() => {
    if (user) {
      const localData = loadFromStorage(user.id);
      const hasData = localData.pages.length > 0 || localData.unassignedTasks.length > 0;
      setLocalDataExists(hasData);
      
      if (hasData) {
        const totalTasks = localData.unassignedTasks.length + 
          localData.pages.reduce((sum, page) => sum + page.tasks.length, 0);
        setLocalDataStats({
          pages: localData.pages.length,
          tasks: totalTasks
        });
      }
    }
  }, [user]);

  const handleMigration = async () => {
    if (!currentWorkspace) {
      alert('Please select a workspace first');
      return;
    }

    setIsMigrating(true);
    try {
      await migrateFromLocalStorage();
      setLocalDataExists(false);
      setLocalDataStats({ pages: 0, tasks: 0 });
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!localDataExists) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          Local Data Migration Available
        </CardTitle>
        <CardDescription>
          We found existing task data in your browser's local storage that can be migrated to your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Found <strong>{localDataStats.pages} pages</strong> and <strong>{localDataStats.tasks} tasks</strong> in local storage.
            {currentWorkspace ? 
              ` These will be migrated to the "${currentWorkspace.name}" workspace.` :
              ' Please select a workspace to migrate this data.'
            }
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            onClick={handleMigration}
            disabled={isMigrating || loading || !currentWorkspace}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isMigrating ? 'Migrating...' : 'Migrate Data'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setLocalDataExists(false)}
          >
            Dismiss
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>What happens during migration:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>All pages and tasks will be copied to your Supabase workspace</li>
            <li>Local storage will be cleared after successful migration</li>
            <li>You'll have full collaboration features and real-time sync</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataMigration;
