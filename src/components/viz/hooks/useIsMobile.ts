'use client';

import { useEffect, useState } from 'react';

/**
 * useIsMobile — Detects mobile viewport (< 768px).
 * Used to switch between desktop sidebar and mobile bottom sheet layouts,
 * and to apply mobile-specific 3D optimizations (frozen physics, reduced particles).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
