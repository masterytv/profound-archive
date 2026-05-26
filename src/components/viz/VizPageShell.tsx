'use client';

import { ReactNode, useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import Link from 'next/link';

/**
 * VizPageShell — Dark immersive full-screen layout for 3D visualizations.
 * 
 * This is a DOM-only wrapper (not a Three.js context). Each visualization
 * page renders its own canvas inside the `children` slot. The shell provides:
 * - Dark background matching the dark theme
 * - Minimal transparent header with back navigation
 * - Responsive control panel slot (sidebar on desktop, bottom sheet on mobile)
 * - Loading state management
 */

interface VizPageShellProps {
  /** The 3D visualization content (canvas) */
  children: ReactNode;
  /** Title shown in the minimal header */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Domain for accent coloring */
  domain?: 'nde' | 'uap' | 'cross';
  /** Control panel content (filters, legends, etc.) */
  controlPanel?: ReactNode;
  /** Whether the viz is still loading */
  isLoading?: boolean;
}

export function VizPageShell({
  children,
  title,
  subtitle,
  domain = 'nde',
  controlPanel,
  isLoading = false,
}: VizPageShellProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  // Domain accent colors using CSS variable overrides
  const accentClass = domain === 'uap' ? 'text-green-400' 
    : domain === 'cross' ? 'text-purple-400' 
    : 'text-blue-400';

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#030014]">
      {/* ─── Minimal Header ─── */}
      <nav className="fixed top-0 z-50 w-full bg-[#030014]/95 backdrop-blur-md border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            {/* Back + Title */}
            <div className="flex items-center gap-3">
              <Link
                href="/visualize"
                className="flex items-center justify-center w-8 h-8 rounded-lg
                  bg-white/5 hover:bg-white/10 text-white/70 hover:text-white
                  transition-colors duration-200"
                aria-label="Back to visualizations"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="min-w-0">
                <h1 className={`text-sm font-semibold truncate ${accentClass}`}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-white/40 truncate">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Control panel toggle (mobile) */}
            {controlPanel && (
              <button
                onClick={() => setPanelOpen(!panelOpen)}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg
                  bg-white/10 hover:bg-white/20 text-white
                  transition-colors duration-200"
                aria-label={panelOpen ? 'Close controls' : 'Open controls'}
              >
                {panelOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── 3D Canvas Area ─── */}
      <div className="absolute inset-0 pt-14">
        {isLoading ? (
          <VizLoadingState />
        ) : (
          children
        )}
      </div>

      {/* ─── Control Panel: sidebar on desktop, bottom sheet on mobile ─── */}
      {controlPanel && (
        <>
          {/* Desktop sidebar */}
          <aside className="hidden md:block fixed right-4 top-20 z-40 w-72
            bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl
            shadow-2xl overflow-y-auto max-h-[calc(100dvh-6rem)]">
            <div className="p-4">
              {controlPanel}
            </div>
          </aside>

          {/* Mobile bottom sheet */}
          <div
            className={`md:hidden fixed inset-x-0 bottom-0 z-40
              bg-black/80 backdrop-blur-xl border-t border-white/10
              rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out
              max-h-[70dvh] overflow-y-auto
              ${panelOpen ? 'translate-y-0' : 'translate-y-full'}`}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="p-4 pb-safe">
              {controlPanel}
            </div>
          </div>

          {/* Mobile floating "Filters" pill — appears when panel is closed */}
          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              className="md:hidden fixed bottom-20 right-4 z-40
                flex items-center gap-2 px-4 py-2.5 rounded-full
                bg-blue-500/90 backdrop-blur-md shadow-lg shadow-blue-500/25
                text-white text-xs font-medium
                active:scale-95 transition-transform duration-150"
              aria-label="Open filters and controls"
            >
              <Menu className="w-3.5 h-3.5" />
              Filters & Legend
            </button>
          )}

          {/* Mobile backdrop */}
          {panelOpen && (
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/40"
              onClick={() => setPanelOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Loading state shown while 3D canvas initializes */
function VizLoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full
          border-2 border-white/20 border-t-blue-400" />
        <p className="text-white/50 text-sm">Loading 3D visualization...</p>
      </div>
    </div>
  );
}
