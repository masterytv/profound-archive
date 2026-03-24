'use client';

/**
 * usePhaseNavigation Hook
 *
 * Manages phase index state with directional locking.
 * The lock state is controlled externally via a ref (from ExperienceShell)
 * to avoid circular reference issues between the hook and the shell.
 *
 * Inputs: total phase count, callback for phase change, lock ref
 * Side effects: keyboard (ArrowUp/Down/Left/Right) and gesture listeners
 */

import { useState, useCallback, useEffect } from 'react';

interface UsePhaseNavigationOptions {
  totalPhases: number;
  onPhaseChange: (fromIndex: number, toIndex: number, direction: 'next' | 'prev') => void;
  isLockedRef: React.RefObject<boolean>;
}

export function usePhaseNavigation({ totalPhases, onPhaseChange, isLockedRef }: UsePhaseNavigationOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    if (isLockedRef.current) return;
    setCurrentIndex((prev) => {
      if (prev >= totalPhases - 1) return prev;
      const next = prev + 1;
      onPhaseChange(prev, next, 'next');
      return next;
    });
  }, [totalPhases, onPhaseChange, isLockedRef]);

  const goPrev = useCallback(() => {
    if (isLockedRef.current) return;
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev;
      const next = prev - 1;
      onPhaseChange(prev, next, 'prev');
      return next;
    });
  }, [onPhaseChange, isLockedRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // Touch/swipe detection
  useEffect(() => {
    let touchStartY = 0;
    let touchStartX = 0;
    const SWIPE_THRESHOLD = 50;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      const deltaX = touchStartX - e.changedTouches[0].clientX;

      // Prefer vertical swipes
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > SWIPE_THRESHOLD) {
        if (deltaY > 0) goNext(); // swipe up = next
        else goPrev();             // swipe down = prev
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [goNext, goPrev]);

  return {
    currentIndex,
    isLocked: isLockedRef.current,
    goNext,
    goPrev,
    isFirst: currentIndex === 0,
    isLast: currentIndex === totalPhases - 1,
  };
}
