import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const SupabaseConnectionTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuth();

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, status, message, details } : t);
      } else {
        return [...prev, { name, status, message, details }];
      }
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    // Test 1: Environment Variables
    updateTest('Environment Variables', 'pending', 'Checking...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      updateTest('Environment Variables', 'error', 'Missing environment variables');
    } else {
      updateTest('Environment Variables', 'success', 'Environment variables found');
    }

    // Test 2: Basic Connection
    updateTest('Basic Connection', 'pending', 'Testing connection...');
    try {
      const { data, error } = await supabase.from('workspaces').select('count').limit(1);
      if (error) throw error;
      updateTest('Basic Connection', 'success', 'Connected to Supabase');
    } catch (error: any) {
      updateTest('Basic Connection', 'error', `Connection failed: ${error.message}`, error);
    }

    // Test 3: Authentication
    updateTest('Authentication', 'pending', 'Checking auth...');
    if (user) {
      updateTest('Authentication', 'success', `Authenticated as ${user.email}`);
    } else {
      updateTest('Authentication', 'warning', 'Not authenticated');
    }

    // Test 4: Database Schema
    updateTest('Database Schema', 'pending', 'Checking tables...');
    try {
      const tables = ['workspaces', 'workspace_members', 'pages', 'tasks'];
      const results = await Promise.all(
        tables.map(async (table) => {
          const { data, error } = await supabase.from(table).select('count').limit(1);
          return { table, success: !error, error };
        })
      );
      
      const failedTables = results.filter(r => !r.success);
      if (failedTables.length === 0) {
        updateTest('Database Schema', 'success', 'All required tables exist');
      } else {
        updateTest('Database Schema', 'error', `Missing tables: ${failedTables.map(t => t.table).join(', ')}`);
      }
    } catch (error: any) {
      updateTest('Database Schema', 'error', `Schema check failed: ${error.message}`, error);
    }

    // Test 5: User Workspaces Query (if authenticated)
    if (user) {
      updateTest('User Workspaces', 'pending', 'Loading workspaces...');
      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select(`
            workspace_id,
            workspaces (
              id,
              name,
              description,
              owner_id,
              settings,
              invite_code,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;
        updateTest('User Workspaces', 'success', `Found ${data.length} workspace memberships`);
      } catch (error: any) {
        updateTest('User Workspaces', 'error', `Workspace query failed: ${error.message}`, error);
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Supabase Connection Test
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Running...
              </>
            ) : (
              'Run Tests'
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              {getStatusIcon(test.status)}
              <div className="flex-1">
                <div className="font-medium">{test.name}</div>
                <div className={`text-sm ${getStatusColor(test.status)}`}>
                  {test.message}
                </div>
                {test.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      Show details
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {tests.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Click "Run Tests" to check your Supabase connection
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseConnectionTest;
