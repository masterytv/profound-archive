"use client";

import { Layers } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DiversityIndexBadgeProps {
  /** Shannon diversity index, 0 to 1 */
  score: number | null;
  /** Rank among all channels (1 = most diverse) */
  rank?: number | null;
  totalChannels?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLabel(score: number): { label: string; color: string; desc: string } {
  if (score >= 0.8) return { label: "Very High", color: "text-emerald-600 dark:text-emerald-400", desc: "Extremely well-rounded coverage" };
  if (score >= 0.6) return { label: "High", color: "text-green-600 dark:text-green-400", desc: "Diverse content across multiple areas" };
  if (score >= 0.4) return { label: "Moderate", color: "text-amber-600 dark:text-amber-400", desc: "Balanced but with clear specializations" };
  if (score >= 0.2) return { label: "Low", color: "text-orange-600 dark:text-orange-400", desc: "Deep specialist in specific areas" };
  return { label: "Very Low", color: "text-red-600 dark:text-red-400", desc: "Highly focused on a narrow niche" };
}

function getBarColor(score: number): string {
  if (score >= 0.8) return "bg-emerald-500";
  if (score >= 0.6) return "bg-green-500";
  if (score >= 0.4) return "bg-amber-500";
  if (score >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DiversityIndexBadge({ score, rank, totalChannels }: DiversityIndexBadgeProps) {
  if (score == null) return null;

  const normalizedScore = Math.max(0, Math.min(1, score));
  const { label, color, desc } = getLabel(normalizedScore);
  const barColor = getBarColor(normalizedScore);
  const percentile = rank && totalChannels ? Math.round((1 - (rank - 1) / totalChannels) * 100) : null;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-amber-500" />
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            letterSpacing: "0.05em",
          }}
        >
          Content Diversity
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
        Measures how many different content formats, encounter types, and subject areas this channel covers.
        A high score means the channel explores a wide range of topics. A low score means it focuses deeply on a specific niche.
      </p>

      {/* Score display */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
          {(normalizedScore * 100).toFixed(0)}
        </span>
        <span className="text-sm text-slate-400 dark:text-slate-500">/100</span>
        <span className={`text-sm font-bold ${color} ml-auto`}>{label}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${normalizedScore * 100}%` }}
        />
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>

      {percentile != null && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          Top {100 - percentile}% in content diversity
          {rank && totalChannels && (
            <span> · Rank {rank} of {totalChannels}</span>
          )}
        </p>
      )}
    </div>
  );
}
