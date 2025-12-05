import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Detects if the device supports hover (non-touch devices)
 */
export function useCanHover() {
  const [canHover, setCanHover] = useState(true);

  useEffect(() => {
    // Check if device supports hover
    const mediaQuery = window.matchMedia('(hover: hover)');
    setCanHover(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return canHover;
}

/**
 * Hook that converts hover effects to click/tap on touch devices
 *
 * Usage:
 * ```tsx
 * const { isActive, touchHoverProps, touchHoverClass } = useTouchHover();
 *
 * <div
 *   {...touchHoverProps}
 *   className={`base-styles ${touchHoverClass('hover:bg-accent')}`}
 * >
 *   Content
 * </div>
 * ```
 */
export function useTouchHover() {
  const [isActive, setIsActive] = useState(false);
  const canHover = useCanHover();
  const elementRef = useRef<HTMLElement | null>(null);

  // Handle click outside to deactivate
  useEffect(() => {
    if (!isActive || canHover) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
        setIsActive(false);
      }
    };

    // Small delay to prevent immediate deactivation from the same click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isActive, canHover]);

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only handle on touch devices
    if (canHover) return;

    // Toggle active state
    setIsActive(prev => !prev);
  }, [canHover]);

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  // Props to spread on the element
  const touchHoverProps = {
    ref: setRef,
    onClick: handleClick,
    'data-touch-active': !canHover && isActive ? 'true' : undefined,
  };

  /**
   * Returns the appropriate class based on device type
   * On hover devices: returns the hover class as-is
   * On touch devices: returns the active variant when active
   *
   * @param hoverClass - The Tailwind hover class (e.g., 'hover:bg-accent')
   */
  const touchHoverClass = useCallback((hoverClass: string) => {
    if (canHover) {
      // On hover-capable devices, use the original hover class
      return hoverClass;
    }

    // On touch devices, convert hover: to active state
    if (isActive) {
      // Extract the actual style from hover:xxx and apply it directly
      return hoverClass.replace(/hover:/g, '');
    }

    return '';
  }, [canHover, isActive]);

  return {
    isActive,
    setIsActive,
    canHover,
    touchHoverProps,
    touchHoverClass,
  };
}

/**
 * Utility function to get touch-hover compatible classes
 * Use this for simpler cases where you just need the CSS approach
 *
 * @param baseClass - Base classes without hover
 * @param hoverClass - Hover-specific classes (without 'hover:' prefix)
 * @returns Combined class string with touch-hover support
 *
 * Usage:
 * ```tsx
 * <div className={getTouchHoverClasses(
 *   'p-4 rounded-lg border',
 *   'bg-accent shadow-md'
 * )}>
 * ```
 */
export function getTouchHoverClasses(baseClass: string, hoverClass: string): string {
  const hoverClasses = hoverClass.split(' ').map(c => `hover:${c}`).join(' ');
  const activeClasses = hoverClass.split(' ').map(c => `active:${c}`).join(' ');

  return `${baseClass} ${hoverClasses} ${activeClasses} touch-hover`;
}

/**
 * Combined class utility for touch-hover elements
 * Automatically handles the hover -> active conversion for touch devices
 */
export function cn_touch(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
