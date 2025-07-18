import React, { Suspense, ReactNode, ComponentType } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import PageLoader from '../loading/PageLoader';

interface LazyPageWrapperProps {
  children: ReactNode;
  loadingText?: string;
}

const LazyPageWrapper: React.FC<LazyPageWrapperProps> = ({
  children,
  loadingText = 'Loading page...'
}) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader text={loadingText} type="skeleton" />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyPageWrapper;
