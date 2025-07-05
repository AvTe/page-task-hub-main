import { useState, useEffect, useCallback } from 'react';

export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: BreakpointKey;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  devicePixelRatio: number;
  isTouchDevice: boolean;
}

const defaultBreakpoints: Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export const useResponsiveLayout = (customBreakpoints?: Partial<Breakpoints>) => {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };
  
  const getBreakpoint = useCallback((width: number): BreakpointKey => {
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  }, [breakpoints]);

  const getResponsiveState = useCallback((): ResponsiveState => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);
    
    return {
      width,
      height,
      breakpoint,
      isMobile: breakpoint === 'xs' || breakpoint === 'sm',
      isTablet: breakpoint === 'md',
      isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
      isLandscape: width > height,
      isPortrait: height > width,
      devicePixelRatio: window.devicePixelRatio || 1,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };
  }, [getBreakpoint]);

  const [state, setState] = useState<ResponsiveState>(getResponsiveState);

  useEffect(() => {
    const handleResize = () => {
      setState(getResponsiveState());
    };

    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated after orientation change
      setTimeout(() => {
        setState(getResponsiveState());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [getResponsiveState]);

  // Utility functions
  const isBreakpoint = useCallback((bp: BreakpointKey) => {
    return state.breakpoint === bp;
  }, [state.breakpoint]);

  const isBreakpointUp = useCallback((bp: BreakpointKey) => {
    const currentIndex = Object.keys(breakpoints).indexOf(state.breakpoint);
    const targetIndex = Object.keys(breakpoints).indexOf(bp);
    return currentIndex >= targetIndex;
  }, [state.breakpoint, breakpoints]);

  const isBreakpointDown = useCallback((bp: BreakpointKey) => {
    const currentIndex = Object.keys(breakpoints).indexOf(state.breakpoint);
    const targetIndex = Object.keys(breakpoints).indexOf(bp);
    return currentIndex <= targetIndex;
  }, [state.breakpoint, breakpoints]);

  const getColumns = useCallback((columnConfig: Partial<Record<BreakpointKey, number>>) => {
    const breakpointKeys: BreakpointKey[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    
    for (const bp of breakpointKeys) {
      if (isBreakpointUp(bp) && columnConfig[bp] !== undefined) {
        return columnConfig[bp]!;
      }
    }
    
    return 1; // Default to 1 column
  }, [isBreakpointUp]);

  const getSpacing = useCallback((spacingConfig: Partial<Record<BreakpointKey, number | string>>) => {
    const breakpointKeys: BreakpointKey[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    
    for (const bp of breakpointKeys) {
      if (isBreakpointUp(bp) && spacingConfig[bp] !== undefined) {
        return spacingConfig[bp]!;
      }
    }
    
    return 16; // Default spacing
  }, [isBreakpointUp]);

  return {
    ...state,
    breakpoints,
    isBreakpoint,
    isBreakpointUp,
    isBreakpointDown,
    getColumns,
    getSpacing
  };
};

// Hook for responsive values
export const useResponsiveValue = <T>(values: Partial<Record<BreakpointKey, T>>, defaultValue: T) => {
  const { breakpoint, isBreakpointUp } = useResponsiveLayout();
  
  const getValue = useCallback(() => {
    const breakpointKeys: BreakpointKey[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    
    for (const bp of breakpointKeys) {
      if (isBreakpointUp(bp) && values[bp] !== undefined) {
        return values[bp]!;
      }
    }
    
    return defaultValue;
  }, [values, defaultValue, isBreakpointUp]);

  return getValue();
};

// Hook for media queries
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

// Hook for container queries (experimental)
export const useContainerQuery = (containerRef: React.RefObject<HTMLElement>, query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Simple container query parsing (extend as needed)
        if (query.includes('min-width')) {
          const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)?.[1] || '0');
          setMatches(width >= minWidth);
        } else if (query.includes('max-width')) {
          const maxWidth = parseInt(query.match(/max-width:\s*(\d+)px/)?.[1] || '0');
          setMatches(width <= maxWidth);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, query]);

  return matches;
};

// Hook for safe area insets (for mobile devices with notches)
export const useSafeAreaInsets = () => {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
        right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
      });
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    window.addEventListener('orientationchange', updateInsets);

    return () => {
      window.removeEventListener('resize', updateInsets);
      window.removeEventListener('orientationchange', updateInsets);
    };
  }, []);

  return insets;
};

// Hook for viewport height that accounts for mobile browser UI
export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const updateHeight = () => {
      // Use visualViewport if available (better for mobile)
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
    };

    updateHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      return () => window.visualViewport?.removeEventListener('resize', updateHeight);
    } else {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, []);

  return viewportHeight;
};

export default useResponsiveLayout;
