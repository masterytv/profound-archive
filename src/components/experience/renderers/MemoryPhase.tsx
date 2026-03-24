'use client';

/**
 * MemoryPhase Renderer
 *
 * CSS Grid of quote cards with staggered GSAP entrance animations.
 * Soft glow borders, responsive grid. Used for life review scenes.
 *
 * Falls back to immediate display (no stagger) when prefers-reduced-motion.
 */

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import type { PhaseConfig } from '../types';
import { safeStagger, safeDuration } from '../utils/motion';

interface MemoryPhaseProps {
  config: PhaseConfig;
  assetUrl: (key: string) => string;
}

export function MemoryPhase({ config, assetUrl }: MemoryPhaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Staggered entrance animation
  useEffect(() => {
    if (!containerRef.current) return;

    const cards = containerRef.current.querySelectorAll('.memory-card');
    if (cards.length === 0) return;

    const tween = gsap.from(cards, {
      opacity: 0,
      y: 30,
      scale: 0.95,
      duration: safeDuration(600),
      ease: 'power2.out',
      stagger: {
        each: safeStagger(0.12),
        from: 'start',
      },
    });

    return () => {
      tween.kill();
    };
  }, []);

  const cards = config.memory_cards ?? [];

  return (
    <div className="experience-phase">
      {/* Background image */}
      <div
        className="experience-bg"
        style={{
          backgroundImage: `url(${assetUrl(config.background.asset_key)})`,
        }}
      />

      {/* Color overlay */}
      {config.background.color_overlay && (
        <div
          className="experience-overlay"
          style={{
            backgroundColor: config.background.color_overlay,
            mixBlendMode: (config.background.blend_mode as React.CSSProperties['mixBlendMode']) ?? 'multiply',
          }}
        />
      )}

      {/* Memory cards grid */}
      <div ref={containerRef} className="memory-grid">
        {cards.map((card, i) => (
          <div key={i} className="memory-card">
            <blockquote className="memory-card-text">
              {card.text}
            </blockquote>
            {card.subtext && (
              <p className="memory-card-subtext">{card.subtext}</p>
            )}
          </div>
        ))}
      </div>

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
