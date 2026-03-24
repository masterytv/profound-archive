'use client';

/**
 * NavigationButtons — Prev/Next Chevrons
 *
 * Always visible (unless at first/last phase).
 * Disabled during transitions (when locked).
 */

interface NavigationButtonsProps {
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  isLocked: boolean;
}

export function NavigationButtons({ onPrev, onNext, isFirst, isLast, isLocked }: NavigationButtonsProps) {
  return (
    <>
      {/* Previous button */}
      {!isFirst && (
        <button
          onClick={onPrev}
          disabled={isLocked}
          className="experience-nav experience-nav--prev"
          aria-label="Previous phase"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {!isLast && (
        <button
          onClick={onNext}
          disabled={isLocked}
          className="experience-nav experience-nav--next"
          aria-label="Next phase"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </>
  );
}
