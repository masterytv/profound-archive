/**
 * Transition Registry
 *
 * Maps transition type strings from config → transition functions.
 * The ExperienceShell orchestrator uses this to resolve which
 * animation to play between phases.
 */

import { fade } from './fade';
import { elevate } from './elevate';
import { pushThrough } from './push-through';
import { dissolve } from './dissolve';
import type { TransitionType, TransitionFn } from '../types';

export const transitionRegistry: Record<TransitionType, TransitionFn> = {
  fade,
  elevate,
  push_through: pushThrough,
  dissolve,
};
