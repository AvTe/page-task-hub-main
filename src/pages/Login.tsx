
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Chrome, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();

  const handleSignIn = async () => {
    console.log('Login button clicked');
    await signInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-coral-orange to-cornflower-blue bg-clip-text text-transparent">
            Welcome to ProjectManager
          </CardTitle>
          <CardDescription className="text-lg">
            Sign in to manage your projects and tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-r from-coral-orange to-cornflower-blue rounded-full flex items-center justify-center mx-auto">
              <Chrome className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-600">
              Get started by signing in with your Google account
            </p>
          </div>
          
          <Button 
            onClick={handleSignIn}
            disabled={loading}
            className="w-full bg-gradient-to-r from-coral-orange to-cornflower-blue hover:from-coral-orange/90 hover:to-cornflower-blue/90 text-white font-medium py-3 text-lg disabled:opacity-50"
            size="lg"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Chrome className="w-5 h-5 mr-2" />
            )}
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
          
          <div className="text-center text-sm text-gray-500">
            <p>Your data is secure and private</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
