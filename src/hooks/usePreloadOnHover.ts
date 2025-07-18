import { useCallback } from 'react';
import { preloadOnInteraction } from '../components/routes/LazyRoutes';

/**
 * Hook for preloading components on hover/focus interactions
 */
export const usePreloadOnHover = () => {
  const preloadComponent = useCallback((componentName: string) => {
    preloadOnInteraction(componentName);
  }, []);

  const createPreloadHandler = useCallback((componentName: string) => {
    return {
      onMouseEnter: () => preloadComponent(componentName),
      onFocus: () => preloadComponent(componentName),
    };
  }, [preloadComponent]);

  return {
    preloadComponent,
    createPreloadHandler,
  };
};

export default usePreloadOnHover;
