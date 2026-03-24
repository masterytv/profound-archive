'use client';

/**
 * ProgressIndicator — Phase Progress Dots
 *
 * Dot-based indicator showing current position in the experience.
 * Fixed bottom-center. Active dot is larger and glows.
 */

interface ProgressIndicatorProps {
  totalPhases: number;
  currentIndex: number;
  labels: string[];
}

export function ProgressIndicator({ totalPhases, currentIndex, labels }: ProgressIndicatorProps) {
  return (
    <nav
      className="experience-progress"
      role="navigation"
      aria-label="Experience progress"
    >
      <div className="experience-progress-dots">
        {Array.from({ length: totalPhases }, (_, i) => (
          <button
            key={i}
            className={`experience-progress-dot ${i === currentIndex ? 'experience-progress-dot--active' : ''} ${i < currentIndex ? 'experience-progress-dot--visited' : ''}`}
            aria-label={`Phase ${i + 1}: ${labels[i] ?? ''}`}
            aria-current={i === currentIndex ? 'step' : undefined}
            type="button"
            tabIndex={-1}
          />
        ))}
      </div>
      <p className="experience-progress-label">
        {labels[currentIndex] ?? ''}
      </p>
    </nav>
  );
}
