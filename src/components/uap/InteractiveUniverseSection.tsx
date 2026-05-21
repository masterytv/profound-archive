"use client";

import { useState } from "react";
import { ChannelUniverseMapWithLinks } from "@/components/uap/ChannelUniverseMap";
import type { ChannelScorePoint, TrajectoryData } from "@/components/uap/ChannelUniverseMap";

// ─── Quadrant config ────────────────────────────────────────────────────────

const QUADRANTS = [
  {
    key: "topLeft",
    name: "The Scholars",
    desc: "High intelligence, lower sourcing breadth",
    pos: "Top-Left",
    color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    activeColor: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-300 dark:ring-emerald-700",
  },
  {
    key: "topRight",
    name: "The Authorities",
    desc: "High intelligence, high credibility",
    pos: "Top-Right",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    activeColor: "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-300 dark:ring-blue-700",
  },
  {
    key: "bottomLeft",
    name: "The Explorers",
    desc: "Narrative-driven, niche focus",
    pos: "Bottom-Left",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    activeColor: "bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-300 dark:ring-amber-700",
  },
  {
    key: "bottomRight",
    name: "The Broadcasters",
    desc: "Wide sourcing, accessible format",
    pos: "Bottom-Right",
    color: "bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700",
    activeColor: "bg-slate-200 dark:bg-slate-700/50 border-slate-400 dark:border-slate-500 ring-2 ring-slate-300 dark:ring-slate-600",
  },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function InteractiveUniverseSection({
  channels,
  trajectories,
}: {
  channels: ChannelScorePoint[];
  trajectories?: TrajectoryData;
}) {
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);

  return (
    <>
      {/* Quadrant cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {QUADRANTS.map((q) => {
          const isActive = hoveredQuadrant === q.key;
          return (
            <div
              key={q.key}
              className={`rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                isActive ? q.activeColor : q.color
              }`}
              onMouseEnter={() => setHoveredQuadrant(q.key)}
              onMouseLeave={() => setHoveredQuadrant(null)}
            >
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                {q.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{q.desc}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{q.pos}</p>
            </div>
          );
        })}
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-6">
        <ChannelUniverseMapWithLinks
          channels={channels}
          highlightedQuadrant={hoveredQuadrant}
          trajectories={trajectories}
        />
      </div>
    </>
  );
}
