import React, { Suspense, ReactNode } from 'react';
import PageLoader from '../loading/PageLoader';
import ComponentLoader from '../loading/ComponentLoader';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  type?: 'page' | 'component' | 'minimal';
  loadingText?: string;
  className?: string;
}

const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback,
  type = 'component',
  loadingText,
  className = ''
}) => {
  // Custom fallback provided
  if (fallback) {
    return (
      <Suspense fallback={fallback}>
        <div className={className}>
          {children}
        </div>
      </Suspense>
    );
  }

  // Default fallbacks based on type
  let defaultFallback: ReactNode;

  switch (type) {
    case 'page':
      defaultFallback = <PageLoader text={loadingText} />;
      break;
    case 'minimal':
      defaultFallback = <ComponentLoader type="minimal" text={loadingText} />;
      break;
    default:
      defaultFallback = <ComponentLoader text={loadingText} />;
  }

  return (
    <Suspense fallback={defaultFallback}>
      <div className={className}>
        {children}
      </div>
    </Suspense>
  );
};

export default SuspenseWrapper;
