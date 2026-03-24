'use client';

/**
 * CanvasPhase Renderer
 *
 * 2D Canvas for tunnel/particle effects. Uses requestAnimationFrame
 * for the render loop. Disabled entirely when prefers-reduced-motion.
 *
 * The canvas draws concentric expanding rings to simulate
 * a tunnel of light effect. Narrative text overlays on top.
 *
 * Used for: tunnel experience (between earthly and otherworldly).
 */

import { useRef, useEffect } from 'react';
import type { PhaseConfig } from '../types';
import { prefersReducedMotion } from '../utils/motion';

interface CanvasPhaseProps {
  config: PhaseConfig;
  assetUrl: (key: string) => string;
}

export function CanvasPhase({ config, assetUrl }: CanvasPhaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number>(0);
  const startTime = useRef<number>(0);

  // Canvas tunnel animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Accessibility: skip animation entirely for reduced motion
    if (prefersReducedMotion()) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw a single static frame: dark center with light edge
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.6,
        );
        gradient.addColorStop(0, 'rgba(10, 10, 30, 1)');
        gradient.addColorStop(0.7, 'rgba(50, 60, 100, 0.8)');
        gradient.addColorStop(1, 'rgba(200, 210, 255, 0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    startTime.current = performance.now();

    const drawTunnel = (time: number) => {
      const elapsed = (time - startTime.current) * 0.001;
      const { width, height } = canvas;
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.max(width, height) * 0.8;
      const rings = 14;

      ctx.clearRect(0, 0, width, height);

      // Dark background
      ctx.fillStyle = 'rgba(5, 5, 20, 1)';
      ctx.fillRect(0, 0, width, height);

      // Draw expanding concentric rings
      for (let i = rings; i >= 0; i--) {
        const t = ((elapsed * 0.3 + i * 0.07) % 1);
        const radius = Math.max(0.01, t * maxRadius);
        const alpha = (1 - t) * 0.35;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180, 200, 255, ${alpha})`;
        ctx.lineWidth = 2 + (1 - t) * 5;
        ctx.stroke();
      }

      // Central white glow
      const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
      glowGradient.addColorStop(0, 'rgba(255, 255, 240, 0.6)');
      glowGradient.addColorStop(0.5, 'rgba(200, 210, 255, 0.2)');
      glowGradient.addColorStop(1, 'rgba(200, 210, 255, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(cx - 100, cy - 100, 200, 200);

      rafId.current = requestAnimationFrame(drawTunnel);
    };

    rafId.current = requestAnimationFrame(drawTunnel);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="experience-phase">
      <canvas
        ref={canvasRef}
        className="experience-canvas"
        aria-hidden="true"
      />

      {/* Narrative text overlay (floats above canvas) */}
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
