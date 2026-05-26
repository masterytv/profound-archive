'use client';

import { ReactNode } from 'react';

/**
 * VizLegend — Color-coded legend with toggles for 3D visualizations.
 * Used inside VizPageShell's control panel slot.
 */

export interface LegendItem {
  id: string;
  label: string;
  color: string;  // hex or CSS color
  count?: number;
  enabled: boolean;
}

interface VizLegendProps {
  title?: string;
  items: LegendItem[];
  onToggle: (id: string) => void;
  children?: ReactNode;
}

export function VizLegend({ title = 'Legend', items, onToggle, children }: VizLegendProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg
              text-left text-sm transition-all duration-200 cursor-pointer
              ${item.enabled
                ? 'text-white/90 bg-white/5 hover:bg-white/10'
                : 'text-white/30 hover:text-white/50 hover:bg-white/5'
              }`}
          >
            {/* Color dot */}
            <span
              className="w-3 h-3 rounded-full shrink-0 transition-opacity duration-200"
              style={{
                backgroundColor: item.color,
                opacity: item.enabled ? 1 : 0.3,
              }}
            />
            {/* Label */}
            <span className="truncate flex-1">{item.label}</span>
            {/* Count badge */}
            {item.count !== undefined && (
              <span className="text-xs text-white/40 tabular-nums">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
