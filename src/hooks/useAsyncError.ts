import { useCallback, useState } from 'react';
import { toast } from '@/components/ui/sonner';

interface AsyncErrorOptions {
  showToast?: boolean;
  toastMessage?: string;
  logError?: boolean;
  onError?: (error: Error) => void;
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for handling async operations with consistent error handling
 */
export function useAsyncError<T = any>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (
    asyncFn: () => Promise<T>,
    options: AsyncErrorOptions = {}
  ): Promise<T | null> => {
    const {
      showToast = true,
      toastMessage,
      logError = true,
      onError
    } = options;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await asyncFn();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      setState(prev => ({ ...prev, loading: false, error: errorObj }));

      // Log error if enabled
      if (logError) {
        console.error('Async operation failed:', errorObj);
      }

      // Show toast notification if enabled
      if (showToast) {
        const message = toastMessage || getErrorMessage(errorObj);
        toast.error(message);
      }

      // Call custom error handler if provided
      if (onError) {
        onError(errorObj);
      }

      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

/**
 * Get user-friendly error message from error object
 */
function getErrorMessage(error: Error): string {
  // Handle Supabase errors
  if (error.message.includes('duplicate key value')) {
    return 'This item already exists';
  }
  
  if (error.message.includes('foreign key constraint')) {
    return 'Cannot perform this action due to related data';
  }
  
  if (error.message.includes('permission denied')) {
    return 'You do not have permission to perform this action';
  }
  
  if (error.message.includes('network')) {
    return 'Network error. Please check your connection';
  }
  
  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again';
  }

  // Return original message if no specific handling
  return error.message || 'An unexpected error occurred';
}

/**
 * Hook specifically for async operations that don't need state management
 */
export function useAsyncOperation() {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: AsyncErrorOptions = {}
  ): Promise<T | null> => {
    const {
      showToast = true,
      toastMessage,
      logError = true,
      onError
    } = options;

    setLoading(true);

    try {
      const result = await asyncFn();
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Log error if enabled
      if (logError) {
        console.error('Async operation failed:', errorObj);
      }

      // Show toast notification if enabled
      if (showToast) {
        const message = toastMessage || getErrorMessage(errorObj);
        toast.error(message);
      }

      // Call custom error handler if provided
      if (onError) {
        onError(errorObj);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading };
}
