/**
 * Transition: Dissolve (Clip Path)
 *
 * Incoming phase is revealed through an expanding circular clip-path,
 * while the outgoing phase fades beneath it.
 * Used for realm/otherworldly reveals.
 * Duration: 1.2s.
 */

import { gsap } from 'gsap';
import { safeDuration } from '../utils/motion';

export function dissolve(
  outEl: HTMLElement,
  inEl: HTMLElement,
  onComplete: () => void,
) {
  const d = safeDuration(1200);
  const tl = gsap.timeline({ onComplete });

  tl.set(inEl, {
    opacity: 1,
    visibility: 'visible',
    clipPath: 'circle(0% at 50% 50%)',
  })
    .to(inEl, {
      clipPath: 'circle(100% at 50% 50%)',
      duration: d,
      ease: 'power2.inOut',
    })
    .to(outEl, { opacity: 0, duration: d * 0.33 }, d > 0 ? '<' + (d * 0.5) : '<')
    .set(outEl, { visibility: 'hidden', opacity: 1, clipPath: 'none' });

  return tl;
}
