/**
 * Transition: Push Through
 *
 * Current phase slides away while the next phase pushes in from below.
 * Used for the tunnel experience — creates a feeling of moving through.
 * Duration: 1.0s, simultaneous movement.
 */

import { gsap } from 'gsap';
import { safeDuration } from '../utils/motion';

export function pushThrough(
  outEl: HTMLElement,
  inEl: HTMLElement,
  onComplete: () => void,
) {
  const d = safeDuration(1000);
  const tl = gsap.timeline({ onComplete });

  tl.set(inEl, { opacity: 0, y: '100%', visibility: 'visible' })
    .to(outEl, {
      y: '-100%',
      opacity: 0.3,
      duration: d,
      ease: 'power3.inOut',
    })
    .to(
      inEl,
      {
        y: '0%',
        opacity: 1,
        duration: d,
        ease: 'power3.inOut',
      },
      '<',
    )
    .set(outEl, { visibility: 'hidden', y: 0, opacity: 1 });

  return tl;
}
