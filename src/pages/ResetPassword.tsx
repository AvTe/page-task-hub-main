import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';


// Simplified PKCE handler for password reset
const handlePasswordResetAuth = async () => {
  try {
    // Get current URL and hash parameters
    const currentUrl = window.location.href;
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);

    const type = hashParams.get('type');
    const token = hashParams.get('token'); // PKCE token
    const accessToken = hashParams.get('access_token'); // Regular access token

    // Must be a recovery type
    if (type !== 'recovery') {
      return { success: false, error: 'Invalid reset link type. Please use the link from your password reset email.' };
    }

    // Check if we already have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return { success: true, method: 'existing_session' };
    }

    // Handle PKCE token (new Supabase format)
    if (token) {
      try {
        // Method 1: Try getSessionFromUrl (recommended for PKCE)
        const { data, error } = await supabase.auth.getSessionFromUrl({ url: currentUrl });
        if (!error && data.session) {
          return { success: true, method: 'pkce_url_session' };
        }

        // Method 2: Try exchangeCodeForSession
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(hash);
        if (!exchangeError && exchangeData.session) {
          return { success: true, method: 'pkce_exchange' };
        }

        // For password reset, we can proceed even without a full session
        // The updateUser call will handle the authentication
        return { success: true, method: 'pkce_token_present' };

      } catch (error) {
        // Still allow password reset attempt
        return { success: true, method: 'pkce_fallback' };
      }
    }

    // Handle regular access token
    if (accessToken) {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: '', // PKCE doesn't provide refresh token
        });

        if (!error) {
          return { success: true, method: 'access_token_session' };
        }
      } catch (error) {
        // Access token session failed, continue to fallback
      }
    }

    return { success: false, error: 'No valid reset token found. Please request a new password reset link.' };

  } catch (error) {
    console.error('Password reset auth error:', error);
    return { success: false, error: 'Authentication failed. Please request a new reset link.' };
  }
};

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // Handle Supabase auth state changes (including password reset)
  useEffect(() => {
    const initializeAuth = async () => {
      setValidating(true);
      setError(null);

      // Use simplified PKCE handler
      const result = await handlePasswordResetAuth();

      if (result.success) {
        setValidating(false);
      } else {
        console.error('Password reset auth failed:', result.error);
        setError(result.error);
        setValidating(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setValidating(false);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle fallback email request
  const handleFallbackReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fallbackEmail) {
      setError('Please enter your email address');
      return;
    }

    setFallbackLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(fallbackEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast.success('New password reset link sent to your email!');
      setShowFallback(false);
      setFallbackEmail('');
    } catch (error: any) {
      console.error('Fallback reset error:', error);
      setError(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setFallbackLoading(false);
    }
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // For PKCE flow, check if we have a session or can establish one
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Try to establish session from URL
        const currentUrl = window.location.href;
        const { data, error: sessionError } = await supabase.auth.getSessionFromUrl({ url: currentUrl });

        if (!sessionError && data.session) {
          session = data.session;
        }
      }

      // Update the password (this should work even with PKCE tokens)
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update failed:', error);

        // Provide specific error messages
        if (error.message?.includes('session') || error.message?.includes('auth')) {
          throw new Error('Session expired. Please click the reset link in your email again.');
        } else if (error.message?.includes('token')) {
          throw new Error('Reset link expired. Please request a new password reset.');
        } else {
          throw new Error(error.message || 'Failed to update password. Please try again.');
        }
      }

      setSuccess(true);
      toast.success('Password updated successfully!');

      // Sign out the user after password reset for security
      await supabase.auth.signOut();

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Password update error:', error);
      setError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !password && !confirmPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {error}
            </p>

            {!showFallback ? (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowFallback(true)}
                  variant="outline"
                  className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
                >
                  Request New Reset Link
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleFallbackReset} className="space-y-4">
                <div className="text-left">
                  <Label htmlFor="fallback-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </Label>
                  <Input
                    id="fallback-email"
                    type="email"
                    value={fallbackEmail}
                    onChange={(e) => setFallbackEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => setShowFallback(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={fallbackLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    disabled={fallbackLoading}
                  >
                    {fallbackLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Password Updated!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to login page...
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">EasTask</h1>
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Task Management</p>
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Reset Your Password
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your new password below
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">
                Confirm New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password Requirements:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*[a-z])/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  One lowercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*[A-Z])/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  One uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*\d)/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  One number
                </li>
              </ul>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
