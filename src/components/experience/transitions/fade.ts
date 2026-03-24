/**
 * Transition: Fade (Crossfade)
 *
 * Smooth opacity crossfade between two phases.
 * Duration: 0.8s per direction, 0.3s overlap.
 */

import { gsap } from 'gsap';
import { safeDuration } from '../utils/motion';

export function fade(
  outEl: HTMLElement,
  inEl: HTMLElement,
  onComplete: () => void,
) {
  const d = safeDuration(800);
  const tl = gsap.timeline({ onComplete });

  tl.set(inEl, { opacity: 0, visibility: 'visible' })
    .to(outEl, { opacity: 0, duration: d, ease: 'power2.inOut' })
    .to(inEl, { opacity: 1, duration: d, ease: 'power2.inOut' }, d > 0 ? '<0.3' : '<')
    .set(outEl, { visibility: 'hidden' });

  return tl;
}
