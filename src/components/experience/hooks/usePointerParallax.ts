'use client';

/**
 * usePointerParallax Hook
 *
 * Moves foreground layers slightly in response to
 * mouse position (desktop) or device orientation (mobile).
 * Disabled when prefers-reduced-motion is active.
 *
 * Multiplier controls how much each layer moves:
 *   0.01 = subtle, 0.04 = strong
 */

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../utils/motion';

interface ParallaxTarget {
  element: HTMLElement | null;
  multiplier: number;
}

export function usePointerParallax(targets: ParallaxTarget[]) {
  const rafId = useRef<number>(0);

  useEffect(() => {
    // Skip entirely if reduced motion
    if (prefersReducedMotion()) return;

    // Filter out null elements
    const validTargets = targets.filter(
      (t): t is { element: HTMLElement; multiplier: number } => t.element !== null,
    );

    if (validTargets.length === 0) return;

    const handleMove = (clientX: number, clientY: number) => {
      cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        // Normalize to -0.5 to 0.5 range (center = 0)
        const nx = (clientX / window.innerWidth) - 0.5;
        const ny = (clientY / window.innerHeight) - 0.5;

        for (const { element, multiplier } of validTargets) {
          const moveX = nx * multiplier * window.innerWidth;
          const moveY = ny * multiplier * window.innerHeight;
          element.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
      });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);

    // Device orientation (mobile tilt)
    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right (-90 to 90)
      const beta = e.beta ?? 0;    // front-back (-180 to 180)

      // Map to viewport coordinates
      const x = ((gamma + 45) / 90) * window.innerWidth;
      const y = ((beta + 90) / 180) * window.innerHeight;
      handleMove(x, y);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('deviceorientation', onOrientation, { passive: true });

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, [targets]);
}
