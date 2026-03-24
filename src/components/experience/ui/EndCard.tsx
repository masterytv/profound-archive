'use client';

/**
 * EndCard — Post-experience CTA
 *
 * Shown after the last phase. Links to the full video,
 * shows a brief disclaimer, and includes the 988 Lifeline.
 */

import Link from 'next/link';
import type { ExperienceMeta } from '../types';

interface EndCardProps {
  meta: ExperienceMeta;
}

export function EndCard({ meta }: EndCardProps) {
  return (
    <div className="experience-endcard">
      <div className="experience-endcard-content">
        {/* Completion message */}
        <div className="experience-endcard-header">
          <p className="experience-endcard-label">Experience Complete</p>
          <h2 className="experience-endcard-title">
            {meta.experiencer_name}&apos;s Story
          </h2>
        </div>

        {/* CTA: Watch full video */}
        <Link
          href={`/video/${meta.source_video_id}`}
          className="experience-endcard-cta"
        >
          Watch the Full Account
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Secondary actions */}
        <div className="experience-endcard-actions">
          <Link href="/chat" className="experience-endcard-link">
            Talk About It
          </Link>
          <Link href="/explore" className="experience-endcard-link">
            Explore More Experiences
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="experience-endcard-disclaimer">
          <p>
            This experience is a creative interpretation of a real person&apos;s
            near-death experience, drawn from their own words. It does not claim
            to prove or disprove any phenomenon.
          </p>
          <p className="experience-endcard-lifeline">
            If you or someone you know is in crisis, call{' '}
            <a href="tel:988">988</a> (Suicide & Crisis Lifeline)
          </p>
        </div>
      </div>
    </div>
  );
}
