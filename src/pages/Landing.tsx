import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import ForgotPassword from '../components/ForgotPassword';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  CheckCircle2,
  Users,
  Timer,
  BarChart3,
  Zap,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Landing: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmail(formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await signUpWithEmail(formData.email, formData.password);
      }
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: CheckCircle2,
      title: 'Task Management',
      description: 'Organize and track your tasks with advanced features like dependencies and subtasks',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work together with real-time updates, comments, and team workspaces',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      icon: Timer,
      title: 'Time Tracking',
      description: 'Track time spent on tasks with built-in timer and manual time entries',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Get insights into your productivity with detailed analytics and reports',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950'
    }
  ];

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [features.length]);

  const nextFeature = () => {
    setCurrentFeature((prev) => (prev + 1) % features.length);
  };

  const prevFeature = () => {
    setCurrentFeature((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <div className="min-h-screen lg:h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 lg:overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">EasTask</h1>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Task Management</p>
            </div>
          </div>
          <Button
            onClick={() => setIsLogin(!isLogin)}
            variant="outline"
            size="sm"
            className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:h-full">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 lg:items-center lg:h-full max-w-7xl mx-auto py-6 lg:py-0 pb-8 lg:pb-0">

          {/* Left Side - App Content & Features */}
          <div className="order-2 lg:order-1 flex flex-col justify-center space-y-4 lg:space-y-6 lg:h-full py-4 lg:py-8">
            {/* Hero Section - Hidden on mobile (shown in header) */}
            <div className="space-y-4 hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                    EasTask
                  </h1>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Task Management</p>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Manage your tasks
                </h2>
                <h2 className="text-2xl lg:text-3xl font-bold text-orange-500">
                  more professionally
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Streamline your workflow with advanced task management, team collaboration, and powerful analytics in one beautiful platform.
                </p>
              </div>
            </div>

            {/* Mobile Hero Section */}
            <div className="space-y-4 lg:hidden text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Manage your tasks
                </h2>
                <h2 className="text-2xl font-bold text-orange-500">
                  more professionally
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-base px-4">
                  Streamline your workflow with advanced task management, team collaboration, and powerful analytics in one beautiful platform.
                </p>
              </div>
            </div>

            {/* Compact Auto-Sliding Features */}
            <div className="space-y-4">
              {/* Main Feature Display - Compact */}
              <div className="relative">
                <div className={`${features[currentFeature].bgColor} rounded-xl p-4 lg:p-4 transition-all duration-500 ease-in-out`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 lg:w-12 lg:h-12 bg-gradient-to-r ${features[currentFeature].color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      {React.createElement(features[currentFeature].icon, { className: "w-6 h-6 lg:w-6 lg:h-6 text-white" })}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg lg:text-lg font-bold text-gray-900 dark:text-white">
                        {features[currentFeature].title}
                      </h3>
                      <p className="text-sm lg:text-sm text-gray-600 dark:text-gray-400">
                        {features[currentFeature].description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Indicators */}
              <div className="flex justify-center gap-2">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentFeature
                        ? 'bg-orange-500 w-6'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              {/* All Features Grid - Mobile Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-2">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`p-3 lg:p-3 rounded-lg border transition-all duration-300 text-center ${
                      index === currentFeature
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                        : 'border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 hover:border-orange-300 dark:hover:border-orange-700'
                    }`}
                  >
                    <div className={`w-8 h-8 lg:w-8 lg:h-8 bg-gradient-to-r ${feature.color} rounded-md flex items-center justify-center mb-2 mx-auto`}>
                      {React.createElement(feature.icon, { className: "w-4 h-4 lg:w-4 lg:h-4 text-white" })}
                    </div>
                    <h4 className="font-semibold text-xs lg:text-xs text-gray-900 dark:text-white mb-1">
                      {feature.title}
                    </h4>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="order-1 lg:order-2 flex items-center justify-center lg:h-full">
            {showForgotPassword ? (
              <ForgotPassword onBack={() => setShowForgotPassword(false)} />
            ) : (
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90">
              <CardHeader className="space-y-4 pb-6">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">EasTask</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Task Management</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {isLogin ? 'Login to Dashboard' : 'Create Account'}
                  </CardTitle>
                  <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                    {isLogin ? 'Fill the below form to login' : 'Join thousands of productive teams'}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Social Login Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign {isLogin ? 'in' : 'up'} with Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">OR</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter Password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 h-12"
                        required
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

                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm Password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {isLogin && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {error && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {isLogin ? 'Login' : 'Create Account'}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium"
                    >
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
