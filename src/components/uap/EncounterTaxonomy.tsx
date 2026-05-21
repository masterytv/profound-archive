"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";

// ─── Hynek Type Config ──────────────────────────────────────────────────────

const HYNEK_CONFIG: Record<string, { label: string; shortLabel: string; description: string; color: string }> = {
  "CE1": {
    label: "CE-1 (Sighting)",
    shortLabel: "CE-1",
    description: "Close Encounter of the First Kind — Visual sighting within 150m",
    color: "#22c55e",
  },
  "CE2": {
    label: "CE-2 (Physical Effects)",
    shortLabel: "CE-2",
    description: "Close Encounter of the Second Kind — Physical effects left behind",
    color: "#3b82f6",
  },
  "CE3": {
    label: "CE-3 (Entities)",
    shortLabel: "CE-3",
    description: "Close Encounter of the Third Kind — Entity/occupant observed",
    color: "#a855f7",
  },
  "CE4": {
    label: "CE-4 (Abduction)",
    shortLabel: "CE-4",
    description: "Close Encounter of the Fourth Kind — Abduction or onboard experience",
    color: "#ef4444",
  },
  "CE5": {
    label: "CE-5 (Initiated Contact)",
    shortLabel: "CE-5",
    description: "Close Encounter of the Fifth Kind — Conscious, initiated contact",
    color: "#f59e0b",
  },
  "DD": {
    label: "Daylight Disc",
    shortLabel: "DD",
    description: "Distant / Daylight Disc — Sighting at significant distance",
    color: "#14b8a6",
  },
  "NL": {
    label: "Nocturnal Light",
    shortLabel: "NL",
    description: "Nocturnal Light — Unidentified light observed at night",
    color: "#8b5cf6",
  },
  "RV": {
    label: "Radar-Visual",
    shortLabel: "RV",
    description: "Radar-Visual confirmation — Observed on radar and visually",
    color: "#0ea5e9",
  },
};

const FALLBACK_COLOR = "#94a3b8";

/** Normalize DB keys like "CE-3" or "ce3" → "CE3" to match config */
function normalizeHynekKey(raw: string): string {
  return raw.replace(/-/g, "").toUpperCase();
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; description: string } }> }) {
  if (!active || !payload?.[0]) return null;
  const { name, value, description } = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 max-w-[240px]">
      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{name}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">{value} encounter{value !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ─── Encounter Type Donut ───────────────────────────────────────────────────

export interface EncounterTypeDonutProps {
  /** Map of hynek_type → count */
  distribution: Record<string, number>;
}

export function EncounterTypeDonut({ distribution }: EncounterTypeDonutProps) {
  // Normalize keys and filter out non-encounter types
  const normalized: Record<string, number> = {};
  for (const [rawKey, count] of Object.entries(distribution)) {
    if (count <= 0) continue;
    const key = normalizeHynekKey(rawKey);
    if (key === "NOT_STATED" || key === "NOTSTATED") continue;
    normalized[key] = (normalized[key] || 0) + count;
  }

  const entries = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, c]) => s + c, 0);
  const dominant = entries[0];
  const dominantConfig = HYNEK_CONFIG[dominant[0]];

  const data = entries.map(([type, count]) => ({
    name: HYNEK_CONFIG[type]?.label ?? type,
    value: count,
    description: HYNEK_CONFIG[type]?.description ?? type,
    fill: HYNEK_CONFIG[type]?.color ?? FALLBACK_COLOR,
  }));

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="w-[120px] h-[120px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            {total} encounter{total !== 1 ? "s" : ""} classified
          </p>
          {dominantConfig && (
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
              Primarily{" "}
              <span style={{ color: dominantConfig.color }}>{dominantConfig.label}</span>{" "}
              ({Math.round((dominant[1] / total) * 100)}%)
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {entries.map(([type, count]) => {
              const cfg = HYNEK_CONFIG[type];
              const pct = Math.round((count / total) * 100);
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg?.color ?? FALLBACK_COLOR }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {cfg?.label ?? type}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    — {count} ({pct}%)
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Entity Type Grid ───────────────────────────────────────────────────────

const ENTITY_ICONS: Record<string, string> = {
  humanoid: "👤",
  grey: "👽",
  nordic: "🧝",
  reptilian: "🦎",
  insectoid: "🪲",
  light_being: "✨",
  robotic: "🤖",
  shadow: "🌑",
  hybrid: "🧬",
  orb: "🔮",
  unknown: "❓",
};

export interface EntityTypeGridProps {
  /** Map of entity_type → count */
  distribution: Record<string, number>;
}

export function EntityTypeGrid({ distribution }: EntityTypeGridProps) {
  const entries = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  const dominant = entries[0];

  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        Most reported:{" "}
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {dominant[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>{" "}
        ({dominant[1]} encounter{dominant[1] !== 1 ? "s" : ""})
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {entries.map(([type, count]) => {
          const icon = ENTITY_ICONS[type.toLowerCase()] ?? ENTITY_ICONS["unknown"];
          const label = type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <div
              key={type}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border ${
                type === dominant[0]
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
                {label}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Combined Encounter Coverage Section ────────────────────────────────────

export interface EncounterCoverageData {
  hynekDistribution: Record<string, number>;
  entityDistribution: Record<string, number>;
}

export function EncounterCoverageSection({ data }: { data: EncounterCoverageData }) {
  const hasHynek = Object.values(data.hynekDistribution).some((v) => v > 0);
  const hasEntities = Object.values(data.entityDistribution).some((v) => v > 0);

  if (!hasHynek && !hasEntities) return null;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 mb-6">
      <h3
        className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4"
        style={{
          fontFamily: "'Crimson Pro', Georgia, serif",
          letterSpacing: "0.05em",
        }}
      >
        Encounter Coverage
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Types of encounters and entities reported across this channel&apos;s analyzed videos.
        Based on the{" "}
        <Link
          href="/uap/channels/methodology"
          className="text-green-600 dark:text-green-400 hover:underline"
        >
          Hynek classification system
        </Link>
        .
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {hasHynek && (
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Encounter Types
            </p>
            <EncounterTypeDonut distribution={data.hynekDistribution} />
          </div>
        )}
        {hasEntities && (
          <div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Entity Types Reported
            </p>
            <EntityTypeGrid distribution={data.entityDistribution} />
          </div>
        )}
      </div>
    </div>
  );
}
