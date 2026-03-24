/**
 * Phase Registry
 *
 * Maps PhaseConfig.type → React renderer component.
 * The ExperienceShell uses this to dynamically render the
 * correct component for each phase in the config.
 *
 * To add a new phase type:
 *   1. Create a renderer in renderers/
 *   2. Add type to PhaseConfig['type'] union in types.ts
 *   3. Add Zod enum value in schema.ts
 *   4. Register here
 */

import { ScenePhase } from './renderers/ScenePhase';
import { CanvasPhase } from './renderers/CanvasPhase';
import { MemoryPhase } from './renderers/MemoryPhase';
import type { PhaseConfig } from './types';
import type { ComponentType } from 'react';

interface RendererProps {
  config: PhaseConfig;
  assetUrl: (key: string) => string;
}

export const phaseRegistry: Record<
  PhaseConfig['type'],
  ComponentType<RendererProps>
> = {
  scene: ScenePhase,
  canvas: CanvasPhase,
  memory: MemoryPhase,
};

export function resolveRenderer(type: PhaseConfig['type']): ComponentType<RendererProps> {
  const Renderer = phaseRegistry[type];
  if (!Renderer) {
    throw new Error(
      `Unknown phase type: "${type}". Add it to registry.ts and create a renderer component.`,
    );
  }
  return Renderer;
}
