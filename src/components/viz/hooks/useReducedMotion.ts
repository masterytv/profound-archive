'use client';

import { useEffect, useState } from 'react';

/**
 * useReducedMotion — Respects prefers-reduced-motion media query.
 * When true, 3D visualizations should:
 * - Disable auto-rotation
 * - Use instant transitions instead of animated
 * - Skip particle effects and bloom
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
