"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import Link from "next/link";
import { MapPin, FileText, Trophy } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CoverageItem {
  name: string;
  count: number;
  href: string;
  subtitle?: string;
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CoverageItem }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 max-w-[240px]">
      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
      {item.subtitle && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.subtitle}</p>
      )}
      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">
        {item.count} video{item.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ─── CoverageBarChart ───────────────────────────────────────────────────────

interface CoverageBarChartProps {
  items: CoverageItem[];
  accentColor: string;
  maxItems?: number;
}

export function CoverageBarChart({ items, accentColor, maxItems = 10 }: CoverageBarChartProps) {
  const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, maxItems);
  if (sorted.length === 0) return null;

  // Truncate long names for Y-axis display
  const truncated = sorted.map((item) => ({
    ...item,
    displayName: item.name.length > 25 ? item.name.slice(0, 23) + "…" : item.name,
  }));

  // Build a lookup from displayName → full name for hover tooltips
  const fullNameMap = new Map(truncated.map((item) => [item.displayName, item.name]));

  const chartHeight = Math.max(180, truncated.length * 44 + 20);

  // Custom Y-axis tick using foreignObject for reliable native hover tooltips
  function CustomYTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
    const display = payload.value;
    const fullName = fullNameMap.get(display) ?? display;
    const labelWidth = 145;
    return (
      <foreignObject
        x={x - labelWidth}
        y={y - 12}
        width={labelWidth}
        height={24}
      >
        <span
          title={fullName}
          style={{
            display: "block",
            width: "100%",
            textAlign: "right",
            fontSize: 11,
            lineHeight: "24px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "default",
          }}
          className="text-slate-600 dark:text-slate-400"
        >
          {display}
        </span>
      </foreignObject>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={truncated} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="displayName"
            width={150}
            tick={CustomYTick}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {truncated.map((item, i) => (
              <Cell key={item.name} fill={i === 0 ? accentColor : `${accentColor}66`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Clickable links below the chart */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {sorted.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 rounded-full px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-100 dark:border-white/10 truncate max-w-[160px]"
            title={item.name}
          >
            {item.name} →
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Top 3 Callout ──────────────────────────────────────────────────────────

function TopCallout({ items, icon: Icon }: { items: CoverageItem[]; icon: typeof MapPin }) {
  const top3 = items.slice(0, 3);
  if (top3.length === 0) return null;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-col gap-1 mb-3">
      {top3.map((item, i) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2 group"
        >
          <span className="text-sm">{medals[i]}</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
            {item.name}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {item.count} video{item.count !== 1 ? "s" : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ─── Combined Coverage Section ──────────────────────────────────────────────

export interface CoverageSectionData {
  events: CoverageItem[];
  programs: CoverageItem[];
}

export function EventProgramCoverageSection({ data }: { data: CoverageSectionData }) {
  const hasEvents = data.events.length > 0;
  const hasPrograms = data.programs.length > 0;

  if (!hasEvents && !hasPrograms) return null;

  const sortedEvents = [...data.events].sort((a, b) => b.count - a.count);
  const sortedPrograms = [...data.programs].sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            letterSpacing: "0.05em",
          }}
        >
          Program Intelligence Coverage
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Events and programs most frequently referenced in this channel&apos;s archived videos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {hasEvents && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Events ({sortedEvents.length})
              </p>
            </div>
            <TopCallout items={sortedEvents} icon={MapPin} />
            <CoverageBarChart items={sortedEvents} accentColor="#f59e0b" />
          </div>
        )}
        {hasPrograms && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Programs ({sortedPrograms.length})
              </p>
            </div>
            <TopCallout items={sortedPrograms} icon={FileText} />
            <CoverageBarChart items={sortedPrograms} accentColor="#f43f5e" />
          </div>
        )}
      </div>
    </div>
  );
}
