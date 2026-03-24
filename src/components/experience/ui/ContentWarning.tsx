'use client';

/**
 * ContentWarning — Pre-experience Gate
 *
 * Shown before the experience starts. Displays a content warning
 * and requires the user to click "Begin Journey" to proceed.
 * This is where audio opt-in happens (via user gesture).
 */

import type { ExperienceMeta } from '../types';

interface ContentWarningProps {
  meta: ExperienceMeta;
  onBegin: () => void;
}

export function ContentWarning({ meta, onBegin }: ContentWarningProps) {
  return (
    <div className="experience-gate">
      <div className="experience-gate-content">
        {/* Title section */}
        <div className="experience-gate-header">
          <h1 className="experience-gate-title">{meta.title}</h1>
          <p className="experience-gate-subtitle">
            An immersive experience based on{' '}
            <span className="experience-gate-name">{meta.experiencer_name}</span>&apos;s
            near-death experience
          </p>
        </div>

        {/* Content warning */}
        {meta.content_warning && (
          <div className="experience-gate-warning">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p>{meta.content_warning}</p>
          </div>
        )}

        {/* Duration + NDE type */}
        <div className="experience-gate-meta">
          <span>{meta.duration_estimate}</span>
          <span className="experience-gate-dot">·</span>
          <span>{meta.nde_type.replace(/_/g, ' ')}</span>
        </div>

        {/* Begin button */}
        <button
          onClick={onBegin}
          className="experience-gate-begin"
          type="button"
        >
          Begin Journey
        </button>

        {/* 988 Lifeline */}
        <p className="experience-gate-lifeline">
          If you or someone you know is in crisis, call{' '}
          <a href="tel:988" className="experience-gate-link">988</a>{' '}
          (Suicide & Crisis Lifeline)
        </p>
      </div>
    </div>
  );
}
