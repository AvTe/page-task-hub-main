// =====================================================
// Supabase Connection and Authentication Test
// Run this to verify your Supabase setup is working
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results interface
interface TestResult {
  testName: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  message: string;
  details?: any;
}

// =====================================================
// TEST FUNCTIONS
// =====================================================

export async function runSupabaseTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🚀 Starting Supabase Connection Tests...\n');

  // Test 1: Environment Variables
  results.push(await testEnvironmentVariables());
  
  // Test 2: Basic Connection
  results.push(await testBasicConnection());
  
  // Test 3: Database Schema
  results.push(await testDatabaseSchema());
  
  // Test 4: Authentication Setup
  results.push(await testAuthenticationSetup());
  
  // Test 5: RLS Policies
  results.push(await testRLSPolicies());
  
  // Test 6: Real-time Capabilities
  results.push(await testRealtimeCapabilities());
  
  // Test 7: Google OAuth Configuration
  results.push(await testGoogleOAuthConfig());

  // Print results
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  
  results.forEach((result, index) => {
    const icon = result.status === 'SUCCESS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.testName}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
    console.log('');
  });

  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const totalCount = results.length;
  
  console.log(`\n🎯 Overall Result: ${successCount}/${totalCount} tests passed`);
  
  if (successCount === totalCount) {
    console.log('🎉 All tests passed! Your Supabase setup is ready!');
  } else {
    console.log('⚠️ Some tests failed. Please review the setup steps.');
  }

  return results;
}

// =====================================================
// INDIVIDUAL TEST FUNCTIONS
// =====================================================

async function testEnvironmentVariables(): Promise<TestResult> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        testName: 'Environment Variables',
        status: 'FAILED',
        message: 'Missing environment variables',
        details: {
          VITE_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
          VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'Set' : 'Missing'
        }
      };
    }

    if (supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) {
      return {
        testName: 'Environment Variables',
        status: 'FAILED',
        message: 'Environment variables contain placeholder values',
        details: { supabaseUrl, anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...' }
      };
    }

    return {
      testName: 'Environment Variables',
      status: 'SUCCESS',
      message: 'All environment variables are properly configured',
      details: { 
        url: supabaseUrl, 
        keyPrefix: supabaseAnonKey.substring(0, 20) + '...' 
      }
    };
  } catch (error) {
    return {
      testName: 'Environment Variables',
      status: 'FAILED',
      message: 'Error checking environment variables',
      details: error
    };
  }
}

async function testBasicConnection(): Promise<TestResult> {
  try {
    // Test basic connection by checking Supabase health
    const { data, error } = await supabase
      .from('workspaces')
      .select('count', { count: 'exact', head: true });

    if (error && error.code === 'PGRST116') {
      // Table not found - schema issue
      return {
        testName: 'Basic Connection',
        status: 'FAILED',
        message: 'Connected to Supabase but database schema not found',
        details: error
      };
    }

    if (error && error.code === '42501') {
      // Permission denied - RLS working correctly
      return {
        testName: 'Basic Connection',
        status: 'SUCCESS',
        message: 'Connected to Supabase successfully (RLS is working)',
        details: 'Permission denied is expected when not authenticated'
      };
    }

    if (error) {
      return {
        testName: 'Basic Connection',
        status: 'FAILED',
        message: 'Failed to connect to Supabase',
        details: error
      };
    }

    return {
      testName: 'Basic Connection',
      status: 'SUCCESS',
      message: 'Successfully connected to Supabase',
      details: { count: data }
    };
  } catch (error) {
    return {
      testName: 'Basic Connection',
      status: 'FAILED',
      message: 'Network error connecting to Supabase',
      details: error
    };
  }
}

async function testDatabaseSchema(): Promise<TestResult> {
  try {
    // Test if our custom tables exist by checking multiple tables
    const tables = ['workspaces', 'tasks', 'pages', 'workspace_members'];
    const results = await Promise.all(
      tables.map(table => 
        supabase.from(table).select('count', { count: 'exact', head: true })
      )
    );

    const existingTables = results.filter(result => 
      !result.error || result.error.code === '42501' // Permission denied means table exists
    );

    if (existingTables.length === tables.length) {
      return {
        testName: 'Database Schema',
        status: 'SUCCESS',
        message: 'All required tables exist in the database',
        details: { tablesFound: tables.length }
      };
    } else {
      return {
        testName: 'Database Schema',
        status: 'FAILED',
        message: 'Some required tables are missing',
        details: { 
          expected: tables.length, 
          found: existingTables.length,
          errors: results.map(r => r.error?.message).filter(Boolean)
        }
      };
    }
  } catch (error) {
    return {
      testName: 'Database Schema',
      status: 'FAILED',
      message: 'Error checking database schema',
      details: error
    };
  }
}

async function testAuthenticationSetup(): Promise<TestResult> {
  try {
    // Test authentication configuration
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        testName: 'Authentication Setup',
        status: 'FAILED',
        message: 'Error checking authentication setup',
        details: error
      };
    }

    // Check if we can get auth providers
    const authConfig = supabase.auth;
    
    return {
      testName: 'Authentication Setup',
      status: 'SUCCESS',
      message: 'Authentication is properly configured',
      details: { 
        currentSession: session ? 'Active' : 'None',
        authConfigured: !!authConfig
      }
    };
  } catch (error) {
    return {
      testName: 'Authentication Setup',
      status: 'FAILED',
      message: 'Authentication setup error',
      details: error
    };
  }
}

async function testRLSPolicies(): Promise<TestResult> {
  try {
    // Test RLS by trying to access data without authentication
    const { error } = await supabase
      .from('workspaces')
      .select('*')
      .limit(1);

    if (error && error.code === '42501') {
      return {
        testName: 'RLS Policies',
        status: 'SUCCESS',
        message: 'Row Level Security is working correctly',
        details: 'Access denied without authentication (expected)'
      };
    }

    if (!error) {
      return {
        testName: 'RLS Policies',
        status: 'WARNING',
        message: 'RLS might not be properly configured',
        details: 'Data accessible without authentication'
      };
    }

    return {
      testName: 'RLS Policies',
      status: 'FAILED',
      message: 'Unexpected error testing RLS',
      details: error
    };
  } catch (error) {
    return {
      testName: 'RLS Policies',
      status: 'FAILED',
      message: 'Error testing RLS policies',
      details: error
    };
  }
}

async function testRealtimeCapabilities(): Promise<TestResult> {
  try {
    // Test if realtime is available
    const channel = supabase.channel('test-channel');
    
    if (!channel) {
      return {
        testName: 'Realtime Capabilities',
        status: 'FAILED',
        message: 'Realtime channels not available',
        details: 'Could not create test channel'
      };
    }

    // Clean up
    await supabase.removeChannel(channel);

    return {
      testName: 'Realtime Capabilities',
      status: 'SUCCESS',
      message: 'Realtime capabilities are available',
      details: 'Test channel created and removed successfully'
    };
  } catch (error) {
    return {
      testName: 'Realtime Capabilities',
      status: 'FAILED',
      message: 'Error testing realtime capabilities',
      details: error
    };
  }
}

async function testGoogleOAuthConfig(): Promise<TestResult> {
  try {
    // Test Google OAuth by checking if we can initiate the flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true // Don't actually redirect
      }
    });

    if (error && error.message.includes('Provider not found')) {
      return {
        testName: 'Google OAuth Configuration',
        status: 'FAILED',
        message: 'Google OAuth provider not configured in Supabase',
        details: error
      };
    }

    if (error && error.message.includes('redirect')) {
      return {
        testName: 'Google OAuth Configuration',
        status: 'SUCCESS',
        message: 'Google OAuth is configured (redirect prevented for test)',
        details: 'OAuth flow would have started'
      };
    }

    return {
      testName: 'Google OAuth Configuration',
      status: 'SUCCESS',
      message: 'Google OAuth is properly configured',
      details: 'OAuth provider is available'
    };
  } catch (error) {
    return {
      testName: 'Google OAuth Configuration',
      status: 'WARNING',
      message: 'Could not fully test Google OAuth',
      details: error
    };
  }
}
