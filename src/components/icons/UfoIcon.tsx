/**
 * Custom UFO / flying saucer icon matching Lucide icon conventions.
 * 24×24 viewBox, currentColor stroke, no fill, rounded caps.
 */
export function UfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Dome */}
      <path d="M15 11c0-1.66-1.34-4-3-4s-3 2.34-3 4" />
      {/* Saucer body */}
      <ellipse cx="12" cy="12" rx="8" ry="3" />
      {/* Beam rays */}
      <line x1="10" y1="15" x2="8" y2="19" />
      <line x1="14" y1="15" x2="16" y2="19" />
      <line x1="12" y1="15" x2="12" y2="19" />
    </svg>
  );
}
