import { useRef, useCallback, useEffect } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    onPinch,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300
  } = options;

  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<TouchPoint | null>(null);
  const initialDistanceRef = useRef<number | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    touchStartRef.current = touchPoint;
    touchEndRef.current = null;

    // Handle multi-touch for pinch gestures
    if (e.touches.length === 2 && onPinch) {
      initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
    }

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress();
        longPressTimerRef.current = null;
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay, onPinch, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Cancel long press on move
    clearLongPressTimer();

    // Handle pinch gesture
    if (e.touches.length === 2 && onPinch && initialDistanceRef.current) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      onPinch(scale);
    }

    // Update touch end position for swipe detection
    const touch = e.touches[0];
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
  }, [clearLongPressTimer, onPinch, getDistance]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    clearLongPressTimer();
    initialDistanceRef.current = null;

    if (!touchStartRef.current) return;

    const touchStart = touchStartRef.current;
    const touchEnd = touchEndRef.current || {
      x: touchStart.x,
      y: touchStart.y,
      timestamp: Date.now()
    };

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = touchEnd.timestamp - touchStart.timestamp;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Determine if this is a swipe or tap
    if (distance > swipeThreshold) {
      // Swipe gesture
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    } else if (deltaTime < 200) {
      // Tap gesture
      const currentTap: TouchPoint = {
        x: touchStart.x,
        y: touchStart.y,
        timestamp: touchStart.timestamp
      };

      // Check for double tap
      if (lastTapRef.current && onDoubleTap) {
        const timeDiff = currentTap.timestamp - lastTapRef.current.timestamp;
        const distanceDiff = Math.sqrt(
          Math.pow(currentTap.x - lastTapRef.current.x, 2) +
          Math.pow(currentTap.y - lastTapRef.current.y, 2)
        );

        if (timeDiff < doubleTapDelay && distanceDiff < 50) {
          onDoubleTap();
          lastTapRef.current = null;
          return;
        }
      }

      // Single tap
      if (onTap) {
        onTap();
      }

      lastTapRef.current = currentTap;

      // Clear last tap after double tap delay
      setTimeout(() => {
        if (lastTapRef.current === currentTap) {
          lastTapRef.current = null;
        }
      }, doubleTapDelay);
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [
    clearLongPressTimer,
    swipeThreshold,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    doubleTapDelay
  ]);

  const attachGestures = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return { attachGestures };
};

// Hook for swipeable list items
export const useSwipeableItem = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
) => {
  const { attachGestures } = useTouchGestures({
    onSwipeLeft,
    onSwipeRight,
    swipeThreshold: 100
  });

  return { attachGestures };
};

// Hook for pull-to-refresh
export const usePullToRefresh = (
  onRefresh: () => void,
  threshold: number = 80
) => {
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const refreshCallbackRef = useRef(onRefresh);

  // Update callback ref
  useEffect(() => {
    refreshCallbackRef.current = onRefresh;
  }, [onRefresh]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current) return;

    currentYRef.current = e.touches[0].clientY;
    const pullDistance = currentYRef.current - startYRef.current;

    if (pullDistance > 0 && window.scrollY === 0) {
      e.preventDefault();
      
      // Add visual feedback here if needed
      const pullRatio = Math.min(pullDistance / threshold, 1);
      
      // Dispatch custom event for visual feedback
      window.dispatchEvent(new CustomEvent('pullToRefresh', {
        detail: { pullDistance, pullRatio, threshold }
      }));
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return;

    const pullDistance = currentYRef.current - startYRef.current;
    
    if (pullDistance >= threshold) {
      refreshCallbackRef.current();
    }

    // Reset
    isPullingRef.current = false;
    startYRef.current = 0;
    currentYRef.current = 0;

    // Dispatch reset event
    window.dispatchEvent(new CustomEvent('pullToRefreshEnd'));
  }, [threshold]);

  const attachPullToRefresh = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { attachPullToRefresh };
};

export default useTouchGestures;
