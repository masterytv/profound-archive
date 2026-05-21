"use client";

import Link from "next/link";
import { Info } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChannelFocusData {
  intelligence_value: number | null;
  credibility_score: number | null;
  encounter_depth: number | null;
  impact_score: number | null;
  encounter_score: number | null; // normalized ratio vs avg (1.0 = average)
  research_score: number | null; // normalized ratio vs avg (1.0 = average)
}

interface ChannelFocusChartProps {
  scores: ChannelFocusData;
}

// ─── Constants ──────────────────────────────────────────────────────────────

// Chart dimensions
const SIZE = 260;
const CENTER = SIZE / 2;
const MAX_RADIUS = 100; // max axis length in pixels
const GRID_STEPS = [25, 50, 75, 100]; // percentage grid lines

// Axis positions: rotated 45° so it's a square/diamond
// Left side = Encounter (Impact top-left, Depth bottom-left)
// Right side = Research (Intelligence top-right, Credibility bottom-right)
const AXES = [
  { key: "impact", label: "Impact", angle: 135, group: "encounter" },
  { key: "intelligence", label: "Intelligence", angle: 45, group: "research" },
  { key: "credibility", label: "Credibility", angle: -45, group: "research" },
  { key: "depth", label: "Depth", angle: -135, group: "encounter" },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function getPoint(angle: number, radius: number): { x: number; y: number } {
  const rad = toRadians(angle);
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER - radius * Math.sin(rad), // SVG y is inverted
  };
}

function formatRatio(ratio: number | null): string {
  if (ratio == null) return "—";
  return `${ratio.toFixed(1)}×`;
}

function getFocusLabel(
  encounter: number | null,
  research: number | null,
): { label: string; color: string } {
  if (encounter == null && research == null) return { label: "Pending", color: "text-slate-400" };
  const e = Number(encounter ?? 0);
  const r = Number(research ?? 0);
  const ratio = e / Math.max(r, 0.01);

  if (ratio > 1.5) return { label: "Encounter-Focused", color: "text-blue-600 dark:text-blue-400" };
  if (ratio > 1.1) return { label: "Encounter-Leaning", color: "text-blue-500 dark:text-blue-400" };
  if (ratio < 0.67) return { label: "Research-Focused", color: "text-emerald-600 dark:text-emerald-400" };
  if (ratio < 0.9) return { label: "Research-Leaning", color: "text-emerald-500 dark:text-emerald-400" };
  return { label: "Balanced", color: "text-amber-600 dark:text-amber-400" };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChannelFocusChart({ scores }: ChannelFocusChartProps) {
  const {
    intelligence_value,
    credibility_score,
    encounter_depth,
    impact_score,
    encounter_score,
    research_score,
  } = scores;

  const hasData =
    intelligence_value != null ||
    credibility_score != null ||
    encounter_depth != null ||
    impact_score != null;

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Channel Focus analysis pending
        </p>
      </div>
    );
  }

  // Map scores to 0-100 scale for chart radius
  const values: Record<string, number> = {
    impact: Number(impact_score ?? 0),
    intelligence: Number(intelligence_value ?? 0),
    credibility: Number(credibility_score ?? 0),
    depth: Number(encounter_depth ?? 0),
  };

  // Build polygon points
  const polygonPoints = AXES.map((axis) => {
    const radius = (values[axis.key] / 100) * MAX_RADIUS;
    return getPoint(axis.angle, radius);
  });

  const polygonPath = polygonPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const focus = getFocusLabel(encounter_score, research_score);

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
        >
          Channel Focus
        </h3>
        <Link
          href="/uap/channels/methodology"
          className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          title="How we calculate these scores"
        >
          <Info className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">How we calculate this</span>
        </Link>
      </div>

      {/* Focus label */}
      <p className={`text-xs font-semibold mb-4 ${focus.color}`}>{focus.label}</p>

      {/* SVG Diamond Chart */}
      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
          {/* Grid diamonds */}
          {GRID_STEPS.map((step) => {
            const radius = (step / 100) * MAX_RADIUS;
            const points = AXES.map((axis) => {
              const p = getPoint(axis.angle, radius);
              return `${p.x},${p.y}`;
            }).join(" ");
            return (
              <polygon
                key={step}
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-slate-200 dark:text-slate-700"
              />
            );
          })}

          {/* Vertical divider line (top to bottom through center) */}
          <line
            x1={CENTER}
            y1={CENTER - MAX_RADIUS - 8}
            x2={CENTER}
            y2={CENTER + MAX_RADIUS + 8}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4 3"
            className="text-slate-300 dark:text-slate-600"
          />

          {/* Group labels */}
          <text
            x={CENTER - MAX_RADIUS / 2 - 4}
            y={CENTER - MAX_RADIUS - 16}
            textAnchor="middle"
            className="text-slate-400 dark:text-slate-500"
            style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em" }}
            fill="currentColor"
          >
            ENCOUNTER
          </text>
          <text
            x={CENTER + MAX_RADIUS / 2 + 4}
            y={CENTER - MAX_RADIUS - 16}
            textAnchor="middle"
            className="text-slate-400 dark:text-slate-500"
            style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em" }}
            fill="currentColor"
          >
            RESEARCH
          </text>

          {/* Axis lines */}
          {AXES.map((axis) => {
            const end = getPoint(axis.angle, MAX_RADIUS);
            return (
              <line
                key={axis.key}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-slate-300 dark:text-slate-700"
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={polygonPath}
            fill="#16a34a"
            fillOpacity={0.15}
            stroke="#16a34a"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {AXES.map((axis) => {
            const radius = (values[axis.key] / 100) * MAX_RADIUS;
            const p = getPoint(axis.angle, radius);
            return (
              <circle
                key={axis.key}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill="#16a34a"
                stroke="white"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Axis labels */}
          {AXES.map((axis) => {
            const labelRadius = MAX_RADIUS + 18;
            const p = getPoint(axis.angle, labelRadius);
            const isLeft = axis.angle > 90 || axis.angle < -90;
            return (
              <text
                key={`label-${axis.key}`}
                x={p.x}
                y={p.y}
                textAnchor={isLeft ? "end" : "start"}
                dominantBaseline="central"
                className={
                  axis.group === "encounter"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }
                style={{ fontSize: 10, fontWeight: 600 }}
                fill="currentColor"
              >
                {axis.label}
              </text>
            );
          })}

          {/* Value labels near each point */}
          {AXES.map((axis) => {
            const radius = (values[axis.key] / 100) * MAX_RADIUS;
            const valP = getPoint(axis.angle, radius + 12);
            const isLeft = axis.angle > 90 || axis.angle < -90;
            return (
              <text
                key={`val-${axis.key}`}
                x={valP.x}
                y={valP.y}
                textAnchor={isLeft ? "end" : "start"}
                dominantBaseline="central"
                className="text-slate-500 dark:text-slate-400"
                style={{ fontSize: 9, fontWeight: 700 }}
                fill="currentColor"
              >
                {Math.round(values[axis.key])}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Encounter vs Research scores */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 text-center">
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            Encounter Score
          </p>
          <p className="text-xl font-black text-blue-700 dark:text-blue-300">
            {formatRatio(encounter_score)}
          </p>
          <p className="text-[9px] text-blue-500 dark:text-blue-400 mt-0.5">vs archive average</p>
        </div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-3 text-center">
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            Research Score
          </p>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
            {formatRatio(research_score)}
          </p>
          <p className="text-[9px] text-emerald-500 dark:text-emerald-400 mt-0.5">
            vs archive average
          </p>
        </div>
      </div>

      {/* Axis breakdown */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="space-y-1">
          <p className="text-[9px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider px-1">
            Encounter Elements
          </p>
          {AXES.filter((a) => a.group === "encounter").map((a) => (
            <div
              key={a.key}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50/50 dark:bg-blue-900/5"
            >
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{a.label}</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {Math.round(values[a.key])}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider px-1">
            Research Elements
          </p>
          {AXES.filter((a) => a.group === "research").map((a) => (
            <div
              key={a.key}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/5"
            >
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{a.label}</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {Math.round(values[a.key])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
