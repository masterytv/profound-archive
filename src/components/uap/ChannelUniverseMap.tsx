"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Label,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChannelScorePoint {
  channel_id: string;
  channel_name: string;
  intelligence_value: number;
  credibility_score: number;
  subscriber_count: number | null;
  letter_grade: string | null;
  archetype_primary: string | null;
  personality_code: string | null;
  avatar_url: string | null;
}

interface ChannelUniverseMapProps {
  channels: ChannelScorePoint[];
  /** If provided, this channel pulses/glows on the map */
  highlightChannelId?: string;
  /** Whether to show in compact mode (for channel detail page embed) */
  compact?: boolean;
  /** Quadrant to highlight: topLeft, topRight, bottomLeft, bottomRight */
  highlightedQuadrant?: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const QUADRANT_LABELS = {
  topRight: "The Authorities",
  topLeft: "The Scholars",
  bottomRight: "The Broadcasters",
  bottomLeft: "The Explorers",
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "#16a34a",
  A: "#22c55e",
  "B+": "#3b82f6",
  B: "#60a5fa",
  "C+": "#f59e0b",
  C: "#94a3b8",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDotSize(isHighlighted: boolean): number {
  return isHighlighted ? 10 : 7;
}

function formatSubscribers(n: number | null): string {
  if (!n) return "Unknown";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChannelScorePoint & { x: number; y: number };

  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl max-w-xs">
      <p className="text-sm font-bold text-white mb-1 truncate">{d.channel_name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-slate-400">Intelligence</span>
        <span className="text-green-400 font-medium">{d.y.toFixed(1)}</span>
        <span className="text-slate-400">Credibility</span>
        <span className="text-blue-400 font-medium">{d.x.toFixed(1)}</span>
        <span className="text-slate-400">Subscribers</span>
        <span className="text-slate-300">{formatSubscribers(d.subscriber_count)}</span>

        {d.archetype_primary && (
          <>
            <span className="text-slate-400">Type</span>
            <span className="text-slate-300 truncate">{d.archetype_primary}</span>
          </>
        )}
        {d.personality_code && (
          <>
            <span className="text-slate-400">Code</span>
            <span className="text-amber-400 font-mono font-bold">{d.personality_code}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChannelUniverseMap({
  channels,
  highlightChannelId,
  compact = false,
  highlightedQuadrant = null,
}: ChannelUniverseMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Detect dark mode for inline stroke colors
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // Also check if the html element has the 'dark' class (Tailwind convention)
    const check = () => setIsDark(document.documentElement.classList.contains("dark") || mq.matches);
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mq.addEventListener("change", check);
    return () => { observer.disconnect(); mq.removeEventListener("change", check); };
  }, []);

  const highlightStroke = isDark ? "#ffffff" : "#1e293b";

  // Transform data for scatter chart
  const data = useMemo(
    () =>
      channels
        .filter((c) => c.credibility_score != null && c.intelligence_value != null)
        .map((c) => ({
          ...c,
          x: Number(c.credibility_score),
          y: Number(c.intelligence_value),
        })),
    [channels],
  );

  // Compute median lines for quadrant boundaries
  const medianX = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.x - b.x);
    return sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)].x : 30;
  }, [data]);

  const medianY = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.y - b.y);
    return sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)].y : 25;
  }, [data]);

  // Calculate domain with padding
  const xMin = Math.max(0, Math.min(...data.map((d) => d.x)) - 3);
  const xMax = Math.min(100, Math.max(...data.map((d) => d.x)) + 3);
  const yMin = Math.max(0, Math.min(...data.map((d) => d.y)) - 3);
  const yMax = Math.min(100, Math.max(...data.map((d) => d.y)) + 3);

  const height = compact ? 320 : 480;

  return (
    <div className="w-full">
      {/* Quadrant legend */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mb-4 text-[11px] text-slate-500 dark:text-slate-400">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
            {QUADRANT_LABELS.topLeft} (High Intel, Low Cred)
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
            {QUADRANT_LABELS.topRight} (High Intel, High Cred)
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
            {QUADRANT_LABELS.bottomLeft} (Low Intel, Low Cred)
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1.5" />
            {QUADRANT_LABELS.bottomRight} (Low Intel, High Cred)
          </span>
        </div>
      )}



      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
            />
            <XAxis
              type="number"
              dataKey="x"
              domain={[xMin, xMax]}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              tickLine={false}
            >
              <Label
                value="Speaker / Source Credibility →"
                position="bottom"
                offset={20}
                style={{ fontSize: 11, fill: "currentColor" }}
                className="text-slate-500 dark:text-slate-400"
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              tickLine={false}
            >
              <Label
                value="Intelligence Value →"
                angle={-90}
                position="insideLeft"
                offset={0}
                style={{ fontSize: 11, fill: "currentColor", textAnchor: "middle" }}
                className="text-slate-500 dark:text-slate-400"
              />
            </YAxis>

            {/* Quadrant dividers */}
            <ReferenceLine
              x={medianX}
              stroke="currentColor"
              strokeDasharray="6 4"
              className="text-slate-300 dark:text-slate-700"
            />
            <ReferenceLine
              y={medianY}
              stroke="currentColor"
              strokeDasharray="6 4"
              className="text-slate-300 dark:text-slate-700"
            />

            {/* Quadrant highlight overlay */}
            {highlightedQuadrant === "topLeft" && (
              <ReferenceArea x1={xMin} x2={medianX} y1={medianY} y2={yMax} fill="#22c55e" fillOpacity={0.08} />
            )}
            {highlightedQuadrant === "topRight" && (
              <ReferenceArea x1={medianX} x2={xMax} y1={medianY} y2={yMax} fill="#3b82f6" fillOpacity={0.08} />
            )}
            {highlightedQuadrant === "bottomLeft" && (
              <ReferenceArea x1={xMin} x2={medianX} y1={yMin} y2={medianY} fill="#f59e0b" fillOpacity={0.08} />
            )}
            {highlightedQuadrant === "bottomRight" && (
              <ReferenceArea x1={medianX} x2={xMax} y1={yMin} y2={medianY} fill="#94a3b8" fillOpacity={0.08} />
            )}

            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />

            <Scatter
              data={data}
              onMouseEnter={(_, index) => {
                if (typeof index === "number") setHoveredId(data[index].channel_id);
              }}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
            >
              {data.map((entry) => {
                const isHighlighted = entry.channel_id === highlightChannelId;
                const isHovered = entry.channel_id === hoveredId;
                const grade = entry.letter_grade ?? "C";
                const color = GRADE_COLORS[grade] ?? "#94a3b8";
                const size = getDotSize(isHighlighted || isHovered);

                return (
                  <Cell
                    key={entry.channel_id}
                    fill={color}
                    fillOpacity={isHighlighted ? 0.95 : isHovered ? 0.85 : 0.65}
                    stroke={isHighlighted ? highlightStroke : isHovered ? color : "transparent"}
                    strokeWidth={isHighlighted ? 3 : isHovered ? 2 : 0}
                    r={size}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Click hint */}
      {highlightChannelId && (
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2">
          This channel is highlighted with a dark ring. Hover over any dot for details.
        </p>
      )}
      {!highlightChannelId && (
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2">
          Hover over any channel for details. Dot size reflects subscriber count.
        </p>
      )}
    </div>
  );
}

// ─── Wrapper with Link Navigation ───────────────────────────────────────────

export function ChannelUniverseMapWithLinks({
  channels,
  highlightChannelId,
  compact = false,
  highlightedQuadrant = null,
}: ChannelUniverseMapProps) {
  // For the linked version, we wrap each scatter interaction with navigation
  // Recharts doesn't natively support clicking on scatter points to navigate,
  // so we use a wrapper that provides the same visual but adds click handling
  return (
    <div>
      <ChannelUniverseMap
        channels={channels}
        highlightChannelId={highlightChannelId}
        compact={compact}
        highlightedQuadrant={highlightedQuadrant}
      />
      {/* Channel list below the chart for accessibility and click-through */}
      {!compact && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {channels
            .filter((c) => c.credibility_score != null && c.intelligence_value != null)
            .sort((a, b) => a.channel_name.localeCompare(b.channel_name))
            .map((c) => (
              <Link
                key={c.channel_id}
                href={`/uap/channels/${c.channel_id}`}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      GRADE_COLORS[c.letter_grade ?? "C"] ?? "#94a3b8",
                  }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-green-700 dark:group-hover:text-green-400 truncate">
                  {c.channel_name}
                </span>

              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
