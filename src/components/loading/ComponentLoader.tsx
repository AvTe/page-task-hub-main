import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from './LoadingSpinner';

interface ComponentLoaderProps {
  type?: 'spinner' | 'skeleton' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const ComponentLoader: React.FC<ComponentLoaderProps> = ({ 
  type = 'spinner',
  size = 'md',
  text,
  className = ''
}) => {
  if (type === 'skeleton') {
    const skeletonSizes = {
      sm: 'h-16',
      md: 'h-24',
      lg: 'h-32'
    };

    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className={`w-full ${skeletonSizes[size]}`} />
        {size !== 'sm' && <Skeleton className="w-3/4 h-4" />}
        {size === 'lg' && <Skeleton className="w-1/2 h-4" />}
      </div>
    );
  }

  if (type === 'minimal') {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          {text || 'Loading...'}
        </div>
      </div>
    );
  }

  // Default spinner type
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <LoadingSpinner size={size} text={text} />
    </div>
  );
};

export default ComponentLoader;
