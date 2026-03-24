/**
 * NDE Experience Engine — Motion Utilities
 *
 * Accessibility-safe helpers for animation durations.
 * All GSAP transitions and parallax effects MUST use these
 * to respect `prefers-reduced-motion`.
 */

/**
 * Returns true if the user has requested reduced motion
 * via their OS accessibility settings.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns the animation duration in seconds, respecting reduced motion.
 * If the user prefers reduced motion, returns 0 (instant cut).
 *
 * @param normalMs - Duration in milliseconds under normal conditions
 * @returns Duration in seconds (for GSAP) or 0 if reduced motion
 */
export function safeDuration(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs / 1000;
}

/**
 * Returns 0 stagger if reduced motion, otherwise the provided value.
 * Use for GSAP stagger animations.
 */
export function safeStagger(normalStagger: number): number {
  return prefersReducedMotion() ? 0 : normalStagger;
}
