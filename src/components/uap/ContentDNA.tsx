"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Dna, Clock, Activity, TrendingUp } from "lucide-react";

// ─── Content Type Labels ────────────────────────────────────────────────────

const CONTENT_LABELS: Record<string, string> = {
  first_person: "First Person",
  interview: "Interview",
  retold_encounter: "Retold",
  retold_story: "Retold",
  research_analysis: "Research",
  program_disclosure: "Disclosure",
  investigative_journalism: "Investigative",
  documentary_survey: "Documentary",
  news_commentary: "News",
  out_of_scope: "Other",
};

const CONTENT_COLORS: Record<string, string> = {
  first_person: "#22c55e",
  interview: "#3b82f6",
  retold_encounter: "#a855f7",
  retold_story: "#a855f7",
  research_analysis: "#f59e0b",
  program_disclosure: "#ef4444",
  investigative_journalism: "#0ea5e9",
  documentary_survey: "#8b5cf6",
  news_commentary: "#f97316",
  out_of_scope: "#6b7280",
};

// ─── 1. Content Type Radar ──────────────────────────────────────────────────

export interface ContentTypeRadarProps {
  /** Map of content_type → count */
  distribution: Record<string, number>;
}

export function ContentTypeRadar({ distribution }: ContentTypeRadarProps) {
  const entries = Object.entries(distribution).filter(([, v]) => v > 0);
  if (entries.length < 3) return null; // Need at least 3 axes for a meaningful radar

  const maxVal = Math.max(...entries.map(([, v]) => v));
  const data = entries.map(([type, count]) => ({
    subject: CONTENT_LABELS[type] ?? type.replace(/_/g, " "),
    value: count,
    fullMark: maxVal,
  }));

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="currentColor" className="text-slate-200 dark:text-white/10" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-slate-500 dark:text-slate-400"
          />
          <PolarRadiusAxis angle={30} domain={[0, maxVal]} tick={false} axisLine={false} />
          <Radar
            name="Videos"
            dataKey="value"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number) => [`${value} videos`, "Count"]}
            contentStyle={{
              backgroundColor: "var(--background, #fff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 2. Video Length Stats ───────────────────────────────────────────────────

export interface VideoLengthStatsProps {
  /** Average duration in minutes */
  avgDuration: number;
  /** Archive-wide average duration in minutes */
  archiveAvgDuration: number;
  /** Bucket breakdown */
  buckets: {
    quick: number; // <15m
    standard: number; // 15-30m
    deep: number; // 30-60m
    marathon: number; // 60m+
  };
}

const BUCKET_LABELS = [
  { key: "quick", label: "Quick (<15m)", color: "#22c55e" },
  { key: "standard", label: "Standard (15-30m)", color: "#3b82f6" },
  { key: "deep", label: "Deep Dive (30-60m)", color: "#a855f7" },
  { key: "marathon", label: "Marathon (60m+)", color: "#ef4444" },
] as const;

export function VideoLengthStats({ avgDuration, archiveAvgDuration, buckets }: VideoLengthStatsProps) {
  const total = buckets.quick + buckets.standard + buckets.deep + buckets.marathon;
  if (total === 0) return null;

  const data = BUCKET_LABELS.map((b) => ({
    name: b.label,
    value: buckets[b.key],
    color: b.color,
  })).filter((d) => d.value > 0);

  const ratio = archiveAvgDuration > 0 ? (avgDuration / archiveAvgDuration).toFixed(1) : null;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <div>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {avgDuration.toFixed(0)}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">min avg</span>
        </div>
        {ratio && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {Number(ratio) > 1 ? `${ratio}× longer` : `${ratio}× shorter`} than archive avg ({archiveAvgDuration.toFixed(0)}m)
          </span>
        )}
      </div>
      <div className="h-[80px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              className="text-slate-500 dark:text-slate-400"
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={14}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── 3. Content Timeline (Posting Activity) ────────────────────────────────

export interface ContentTimelineProps {
  /** Monthly video counts: { month: "2024-01", count: 5 }[] */
  monthlyActivity: { month: string; count: number }[];
  activeSince: string | null;
}

export function ContentTimeline({ monthlyActivity, activeSince }: ContentTimelineProps) {
  if (monthlyActivity.length < 2) return null;

  // Show last 24 months max
  const recent = monthlyActivity.slice(-24);

  return (
    <div>
      {activeSince && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Active in archive since <span className="font-bold text-slate-700 dark:text-slate-300">{activeSince}</span>
        </p>
      )}
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={recent} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              className="text-slate-400 dark:text-slate-500"
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => [`${value} video${value !== 1 ? "s" : ""}`, "Archived"]}
              labelFormatter={(label: string) => {
                const [y, m] = label.split("-");
                const date = new Date(parseInt(y), parseInt(m) - 1);
                return date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
              }}
              contentStyle={{
                backgroundColor: "var(--background, #fff)",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#activityGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── 4. Content Evolution Arc ───────────────────────────────────────────────

export interface ContentEvolutionProps {
  /** Year-by-year content type proportions: { year: "2020", first_person: 5, research_analysis: 3, ... }[] */
  yearlyBreakdown: Record<string, number | string>[];
  /** Which content types appear */
  activeTypes: string[];
}

export function ContentEvolutionArc({ yearlyBreakdown, activeTypes }: ContentEvolutionProps) {
  if (yearlyBreakdown.length < 2 || activeTypes.length === 0) return null;

  return (
    <div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={yearlyBreakdown} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              className="text-slate-400 dark:text-slate-500"
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background, #fff)",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
            />
            {activeTypes.map((type) => (
              <Area
                key={type}
                type="monotone"
                dataKey={type}
                name={CONTENT_LABELS[type] ?? type.replace(/_/g, " ")}
                stackId="1"
                stroke={CONTENT_COLORS[type] ?? "#6b7280"}
                fill={CONTENT_COLORS[type] ?? "#6b7280"}
                fillOpacity={0.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {activeTypes.map((type) => (
          <span key={type} className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: CONTENT_COLORS[type] ?? "#6b7280" }}
            />
            {CONTENT_LABELS[type] ?? type.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Combined Content DNA Section ───────────────────────────────────────────

export interface ContentDNAData {
  contentTypeDistribution: Record<string, number>;
  avgDuration: number;
  archiveAvgDuration: number;
  durationBuckets: { quick: number; standard: number; deep: number; marathon: number };
  monthlyActivity: { month: string; count: number }[];
  activeSince: string | null;
  yearlyBreakdown: Record<string, number | string>[];
  activeContentTypes: string[];
}

export function ContentDNASection({ data }: { data: ContentDNAData }) {
  const hasRadar = Object.values(data.contentTypeDistribution).filter(v => v > 0).length >= 3;
  const hasLength = data.durationBuckets.quick + data.durationBuckets.standard + data.durationBuckets.deep + data.durationBuckets.marathon > 0;
  const hasTimeline = data.monthlyActivity.length >= 2;
  const hasEvolution = data.yearlyBreakdown.length >= 2 && data.activeContentTypes.length > 0;

  if (!hasRadar && !hasLength && !hasTimeline && !hasEvolution) return null;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Dna className="w-4 h-4 text-purple-500" />
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            letterSpacing: "0.05em",
          }}
        >
          Content DNA
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        A fingerprint of this channel&apos;s content style, format, pacing, and evolution.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {hasRadar && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Dna className="w-3.5 h-3.5 text-green-500" />
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Content Fingerprint
              </p>
            </div>
            <ContentTypeRadar distribution={data.contentTypeDistribution} />
          </div>
        )}
        {hasLength && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Video Length
              </p>
            </div>
            <VideoLengthStats
              avgDuration={data.avgDuration}
              archiveAvgDuration={data.archiveAvgDuration}
              buckets={data.durationBuckets}
            />
          </div>
        )}
        {hasTimeline && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Posting Activity
              </p>
            </div>
            <ContentTimeline monthlyActivity={data.monthlyActivity} activeSince={data.activeSince} />
          </div>
        )}
        {hasEvolution && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Content Evolution
              </p>
            </div>
            <ContentEvolutionArc yearlyBreakdown={data.yearlyBreakdown} activeTypes={data.activeContentTypes} />
          </div>
        )}
      </div>
    </div>
  );
}
