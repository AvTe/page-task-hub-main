import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X, ChevronDown } from 'lucide-react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useTouchGestures } from '../hooks/useTouchGestures';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  preventClose?: boolean;
  className?: string;
}

const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  preventClose = false,
  className = ''
}) => {
  const { isMobile, isTablet } = useResponsiveLayout();
  const contentRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Use drawer on mobile, dialog on desktop
  const useMobileDrawer = isMobile || isTablet;

  // Handle swipe down to close on mobile
  const { attachGestures } = useTouchGestures({
    onSwipeDown: () => {
      if (useMobileDrawer && !preventClose) {
        onClose();
      }
    }
  });

  useEffect(() => {
    if (useMobileDrawer && contentRef.current) {
      return attachGestures(contentRef.current);
    }
  }, [useMobileDrawer, attachGestures]);

  // Handle drag to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!useMobileDrawer) return;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!useMobileDrawer || !isDraggingRef.current) return;
    
    currentYRef.current = e.touches[0].clientY;
    const deltaY = currentYRef.current - startYRef.current;
    
    // Only allow dragging down
    if (deltaY > 0 && contentRef.current) {
      const opacity = Math.max(0.5, 1 - deltaY / 300);
      const transform = `translateY(${deltaY}px)`;
      
      contentRef.current.style.transform = transform;
      contentRef.current.style.opacity = opacity.toString();
    }
  };

  const handleTouchEnd = () => {
    if (!useMobileDrawer || !isDraggingRef.current) return;
    
    const deltaY = currentYRef.current - startYRef.current;
    
    if (contentRef.current) {
      if (deltaY > 100 && !preventClose) {
        // Close if dragged down more than 100px
        onClose();
      } else {
        // Snap back
        contentRef.current.style.transform = 'translateY(0)';
        contentRef.current.style.opacity = '1';
      }
    }
    
    isDraggingRef.current = false;
    startYRef.current = 0;
    currentYRef.current = 0;
  };

  const getSizeClasses = () => {
    if (useMobileDrawer) {
      switch (size) {
        case 'sm': return 'max-h-[40vh]';
        case 'md': return 'max-h-[60vh]';
        case 'lg': return 'max-h-[80vh]';
        case 'xl': return 'max-h-[90vh]';
        case 'full': return 'h-[100vh]';
        default: return 'max-h-[60vh]';
      }
    } else {
      switch (size) {
        case 'sm': return 'max-w-sm';
        case 'md': return 'max-w-md';
        case 'lg': return 'max-w-lg';
        case 'xl': return 'max-w-xl';
        case 'full': return 'max-w-full max-h-full';
        default: return 'max-w-md';
      }
    }
  };

  const handleClose = () => {
    if (!preventClose) {
      onClose();
    }
  };

  if (useMobileDrawer) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent 
          className={`${getSizeClasses()} ${className}`}
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DrawerTitle className="text-lg font-semibold">
                  {title}
                </DrawerTitle>
                {description && (
                  <DrawerDescription className="text-sm text-muted-foreground mt-1">
                    {description}
                  </DrawerDescription>
                )}
              </div>
              
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Drag indicator */}
            <div className="flex justify-center pt-2">
              <div className="w-12 h-1 bg-muted rounded-full" />
            </div>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeOnOverlayClick ? handleClose : undefined}>
      <DialogContent className={`${getSizeClasses()} ${className}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Specialized mobile-first modals
export const MobileBottomSheet: React.FC<Omit<MobileModalProps, 'size'>> = (props) => {
  return <MobileModal {...props} size="lg" />;
};

export const MobileFullScreen: React.FC<Omit<MobileModalProps, 'size'>> = (props) => {
  return <MobileModal {...props} size="full" />;
};

export const MobileActionSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'secondary';
    icon?: React.ReactNode;
  }>;
}> = ({ isOpen, onClose, title, actions }) => {
  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
    >
      <div className="space-y-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'ghost'}
            className="w-full justify-start h-12"
            onClick={() => {
              action.onClick();
              onClose();
            }}
          >
            {action.icon && <span className="mr-3">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
        
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </MobileModal>
  );
};

export default MobileModal;
