import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from './LoadingSpinner';

interface PageLoaderProps {
  type?: 'spinner' | 'skeleton' | 'card';
  text?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({ 
  type = 'spinner', 
  text = 'Loading page...' 
}) => {
  if (type === 'skeleton') {
    return (
      <div className="space-y-6 p-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <LoadingSpinner size="lg" text={text} className="py-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default spinner type
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="xl" text={text} />
    </div>
  );
};

export default PageLoader;
