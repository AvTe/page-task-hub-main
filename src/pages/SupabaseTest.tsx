import React, { useState } from 'react';
import { runSupabaseTests } from '../utils/supabase-test';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Play, Loader2 } from 'lucide-react';

interface TestResult {
  testName: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  message: string;
  details?: any;
}

const SupabaseTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      const results = await runSupabaseTests();
      setTestResults(results);
      setHasRun(true);
    } catch (error) {
      console.error('Error running tests:', error);
      setTestResults([{
        testName: 'Test Runner',
        status: 'FAILED',
        message: 'Failed to run tests',
        details: error
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'SUCCESS' ? 'default' : 
                   status === 'WARNING' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const successCount = testResults.filter(r => r.status === 'SUCCESS').length;
  const totalCount = testResults.length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Supabase Connection Test</h1>
        <p className="text-gray-600">
          Verify your Supabase setup, database schema, authentication, and all connections.
        </p>
      </div>

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRunTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run All Tests
                </>
              )}
            </Button>
            
            {hasRun && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Results: {successCount}/{totalCount} tests passed
                </span>
                {successCount === totalCount ? (
                  <Badge variant="default">All Passed ✅</Badge>
                ) : (
                  <Badge variant="destructive">Some Failed ❌</Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Supabase URL:</strong>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {import.meta.env.VITE_SUPABASE_URL || 'Not set'}
              </code>
            </div>
            <div>
              <strong>Anon Key:</strong>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
                  `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
                  'Not set'
                }
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Test Results</h2>
          
          {testResults.map((result, index) => (
            <Card key={index} className="border-l-4 border-l-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    Test {index + 1}: {result.testName}
                  </CardTitle>
                  {getStatusBadge(result.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-3">{result.message}</p>
                
                {result.details && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      {!hasRun && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 What This Test Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✅ Environment variables are properly configured</li>
              <li>✅ Basic connection to Supabase is working</li>
              <li>✅ Database schema and tables are created</li>
              <li>✅ Authentication setup is functional</li>
              <li>✅ Row Level Security (RLS) policies are active</li>
              <li>✅ Real-time capabilities are available</li>
              <li>✅ Google OAuth configuration is working</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {hasRun && successCount === totalCount && (
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🎉 All Tests Passed!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 mb-4">
              Your Supabase setup is working perfectly! You're ready to proceed with the migration.
            </p>
            <div className="space-y-2 text-sm text-green-600">
              <p>✅ Database schema is properly configured</p>
              <p>✅ Authentication is working</p>
              <p>✅ Security policies are active</p>
              <p>✅ Real-time features are available</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasRun && successCount < totalCount && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">⚠️ Some Tests Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">
              Please review the failed tests above and check your Supabase configuration.
            </p>
            <div className="space-y-2 text-sm text-red-600">
              <p>• Check your environment variables in .env.local</p>
              <p>• Verify database schema was created correctly</p>
              <p>• Ensure Google OAuth is configured in Supabase</p>
              <p>• Check Supabase project settings</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupabaseTest;
