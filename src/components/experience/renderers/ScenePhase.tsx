'use client';

/**
 * ScenePhase Renderer
 *
 * Renders a layered scene: full-viewport background image,
 * optional color overlay with blend mode, foreground parallax layers,
 * and narrative text with glassmorphism backdrop.
 *
 * Used for: hospital room, OBE, garden/realm, return.
 */

import { useRef } from 'react';
import type { PhaseConfig } from '../types';
import { usePointerParallax } from '../hooks/usePointerParallax';

interface ScenePhaseProps {
  config: PhaseConfig;
  assetUrl: (key: string) => string;
}

export function ScenePhase({ config, assetUrl }: ScenePhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<HTMLDivElement[]>([]);

  // Set up parallax on foreground layers
  usePointerParallax(
    (config.foreground_layers ?? []).map((layer, i) => ({
      element: layerRefs.current[i],
      multiplier: layer.parallax_multiplier,
    })),
  );

  return (
    <div ref={containerRef} className="experience-phase">
      {/* Background layer */}
      <div
        className="experience-bg"
        style={{
          backgroundImage: `url(${assetUrl(config.background.asset_key)})`,
        }}
      />

      {/* Color overlay (optional) */}
      {config.background.color_overlay && (
        <div
          className="experience-overlay"
          style={{
            backgroundColor: config.background.color_overlay,
            mixBlendMode: (config.background.blend_mode as React.CSSProperties['mixBlendMode']) ?? 'multiply',
          }}
        />
      )}

      {/* Foreground parallax layers */}
      {config.foreground_layers?.map((layer, i) => (
        <div
          key={layer.asset_key}
          ref={(el) => {
            if (el) layerRefs.current[i] = el;
          }}
          className="experience-fg-layer"
          style={{
            backgroundImage: `url(${assetUrl(layer.asset_key)})`,
            left: layer.position.x,
            top: layer.position.y,
          }}
        />
      ))}

      {/* Narrative text overlay */}
      <div className={`experience-narrative experience-narrative--${config.narrative.position}`}>
        <div className="experience-narrative-glass">
          <p className="experience-narrative-text">
            {config.narrative.text}
          </p>
          {config.narrative.attribution && (
            <cite className="experience-narrative-attribution">
              {config.narrative.attribution}
            </cite>
          )}
        </div>
      </div>
    </div>
  );
}
