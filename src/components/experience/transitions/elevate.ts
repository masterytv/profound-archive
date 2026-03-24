/**
 * Transition: Elevate (Float Up)
 *
 * Outgoing phase drifts upward and fades, incoming phase rises from below.
 * Evokes the feeling of leaving the body / ascending.
 * Duration: 1.2s with 0.4s overlap.
 */

import { gsap } from 'gsap';
import { safeDuration } from '../utils/motion';

export function elevate(
  outEl: HTMLElement,
  inEl: HTMLElement,
  onComplete: () => void,
) {
  const d = safeDuration(1200);
  const tl = gsap.timeline({ onComplete });

  tl.set(inEl, { opacity: 0, y: 60, visibility: 'visible' })
    .to(outEl, {
      opacity: 0,
      y: -40,
      duration: d,
      ease: 'power2.inOut',
    })
    .to(
      inEl,
      {
        opacity: 1,
        y: 0,
        duration: d,
        ease: 'power2.out',
      },
      d > 0 ? '<0.4' : '<',
    )
    .set(outEl, { visibility: 'hidden', y: 0 });

  return tl;
}
