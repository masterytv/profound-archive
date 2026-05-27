'use client';

import { ExternalLink, X } from 'lucide-react';

/**
 * VizNodeTooltip — Floating tooltip for 3D graph node/edge hover/click.
 * Positioned via absolute coordinates passed from the graph's raycaster.
 * When `href` is provided, clicking the tooltip opens the link in a new tab.
 */

export interface TooltipData {
  /** Type of element being inspected */
  type: 'node' | 'edge';
  /** Display title */
  title: string;
  /** Key-value stats to display */
  stats: Array<{ label: string; value: string | number }>;
  /** Optional description */
  description?: string;
  /** URL to open when tooltip body is clicked. Opens in a new tab. */
  href?: string;
  /** Screen position (from graph raycaster) */
  x: number;
  y: number;
}

interface VizNodeTooltipProps {
  data: TooltipData | null;
  onClose: () => void;
}

export function VizNodeTooltip({ data, onClose }: VizNodeTooltipProps) {
  if (!data) return null;

  // Keep tooltip within viewport bounds
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(data.x + 12, window.innerWidth - 280),
    top: Math.min(data.y - 10, window.innerHeight - 200),
    zIndex: 60,
  };

  const handleBodyClick = () => {
    if (data.href) {
      window.open(data.href, '_blank', 'noopener');
    }
  };

  return (
    <div
      style={style}
      className={`w-64 bg-black/80 backdrop-blur-xl border border-white/15
        rounded-xl shadow-2xl p-3 animate-in fade-in duration-150
        ${data.href ? 'cursor-pointer hover:border-white/30 hover:bg-black/90 transition-colors' : ''}`}
      onClick={handleBodyClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-white/90 leading-tight">
          {data.title}
        </h4>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="shrink-0 w-5 h-5 flex items-center justify-center
            rounded text-white/40 hover:text-white/70 hover:bg-white/10
            transition-colors cursor-pointer"
          aria-label="Close tooltip"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Description */}
      {data.description && (
        <p className="text-xs text-white/50 mb-2 leading-relaxed">
          {data.description}
        </p>
      )}

      {/* Stats */}
      <div className="space-y-1">
        {data.stats.map((stat, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-white/40">{stat.label}</span>
            <span className="text-white/80 font-medium tabular-nums">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Link affordance */}
      {data.href && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10 text-[10px] text-white/40">
          <ExternalLink className="w-3 h-3" />
          <span>Click to open</span>
        </div>
      )}
    </div>
  );
}
