"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GuestProminencePoint {
  year: string;
  /** Guest Prominence Index: composite of credibility + mentions */
  gpi: number;
  /** Number of unique guests that year */
  guestCount: number;
  /** Average credibility score (0-85) of guests with scores */
  avgCredibility: number | null;
  /** Average mentions count across all guests */
  avgMentions: number;
}

interface GuestTrajectoryProps {
  data: GuestProminencePoint[];
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
  const d = payload[0].payload as GuestProminencePoint;

  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl max-w-xs">
      <p className="text-sm font-bold text-white mb-2">{d.year}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-slate-400">Prominence Index</span>
        <span className="text-green-400 font-medium">{d.gpi.toFixed(1)}</span>
        <span className="text-slate-400">Guests Featured</span>
        <span className="text-slate-300">{d.guestCount}</span>
        {d.avgCredibility != null && (
          <>
            <span className="text-slate-400">Avg Credibility</span>
            <span className="text-blue-400 font-medium">{d.avgCredibility.toFixed(0)}</span>
          </>
        )}
        <span className="text-slate-400">Avg Cross-Archive Mentions</span>
        <span className="text-slate-300">{d.avgMentions.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ─── Trend Indicator ────────────────────────────────────────────────────────

function TrendIndicator({ data }: { data: GuestProminencePoint[] }) {
  if (data.length < 2) return null;

  const first = data[0].gpi;
  const last = data[data.length - 1].gpi;
  const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;

  if (Math.abs(pctChange) < 5) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Minus className="w-3 h-3" />
        Stable guest quality
      </span>
    );
  }

  if (pctChange > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-500">
        <TrendingUp className="w-3 h-3" />
        Guest quality trending up {pctChange.toFixed(0)}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
      <TrendingDown className="w-3 h-3" />
      Guest quality trending down {Math.abs(pctChange).toFixed(0)}%
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GuestTrajectory({ data }: GuestTrajectoryProps) {
  // Need at least 2 years of data for a meaningful trend
  if (data.length < 2) return null;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h4
          className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
        >
          Guest Quality Over Time
        </h4>
        <TrendIndicator data={data} />
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">
        Guest Prominence Index (GPI) — combines cross-archive credibility scores with mention frequency.
        Higher values indicate more prominent and credible guests.
      </p>

      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="gpiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
            />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="gpi"
              stroke="none"
              fill="url(#gpiGradient)"
            />
            <Line
              type="monotone"
              dataKey="gpi"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: "#16a34a", strokeWidth: 2, fill: "#22c55e" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
