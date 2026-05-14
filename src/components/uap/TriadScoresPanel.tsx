"use client";

import Link from "next/link";

import {
  TrendingUp,
  Brain,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CriterionDetail {
  score: number;
  reasoning: string;
}

interface EvidenceBreakdown {
  level: string;
  total_score: number;
  summary_reason: string;
  source_type: string;
  data_completeness: string;
  criteria: Record<string, CriterionDetail>;
}

interface ContactDepthBreakdown {
  level?: string;
  total_score?: number;
  summary_reason?: string;
  // New shape: categories wrapper
  categories?: Record<string, { items: Record<string, CriterionDetail>; subtotal: number }>;
  // Actual DB shape: flat category→items at top level
  observation?: Record<string, CriterionDetail>;
  entity_interaction?: Record<string, CriterionDetail>;
  transcendent_elements?: Record<string, CriterionDetail>;
  consciousness_alteration?: Record<string, CriterionDetail>;
}

interface TransformationDomain {
  name: string;
  score: number;
  direction: string;
  key_quote: string;
  evidence_summary: string;
}

interface TransformationBreakdown {
  level?: string;
  total_score?: number;
  summary_reason?: string;
  // Old shape
  domains?: Record<string, CriterionDetail>;
  // Actual DB shape
  domain_analysis?: Record<string, TransformationDomain>;
  quantitative_metrics?: {
    transformation_depth: number;
    transformation_breadth: number;
    full_transformation_score: number;
    comparable_transformation_score: number;
  };
  qualitative_profile?: {
    timeline_notes: string;
    dominant_themes: string[];
    unique_features: string;
    integration_notes: string;
  };
}

export interface TriadScores {
  evidence_score: number | null;
  evidence_breakdown: EvidenceBreakdown | null;
  contact_depth_score: number | null;
  contact_depth_breakdown: ContactDepthBreakdown | null;
  transformation_score: number | null;
  transformation_breakdown: TransformationBreakdown | null;
  hynek_type: string | null;
  vallee_type: string | null;
}

interface TriadScoresPanelProps {
  scores: TriadScores;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEvidenceLevel(score: number): string {
  if (score >= 22) return "High";
  if (score >= 15) return "Moderate";
  if (score >= 10) return "Low";
  return "Minimal";
}

function getContactLevel(score: number): string {
  if (score >= 24) return "Profound";
  if (score >= 16) return "Significant";
  if (score >= 8) return "Moderate";
  return "Minimal";
}

function getTransformationLevel(score: number): string {
  if (score >= 40) return "Profound";
  if (score >= 25) return "Significant";
  if (score >= 10) return "Moderate";
  return "Minimal";
}

function formatCriterionLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract usable categories from contact depth breakdown (handles both DB shapes) */
function getContactCategories(bd: ContactDepthBreakdown): Record<string, { items: Record<string, CriterionDetail>; subtotal: number }> {
  // If wrapped in a categories object, use that
  if (bd.categories) return bd.categories;
  // Otherwise, the 4 category keys are at the top level
  const categoryKeys = ['observation', 'entity_interaction', 'transcendent_elements', 'consciousness_alteration'] as const;
  const result: Record<string, { items: Record<string, CriterionDetail>; subtotal: number }> = {};
  for (const key of categoryKeys) {
    const items = bd[key];
    if (items && typeof items === 'object') {
      const subtotal = Object.values(items).reduce((sum, d) => sum + (d.score || 0), 0);
      result[key] = { items, subtotal };
    }
  }
  return result;
}

/** Compute total score from contact depth breakdown */
function getContactTotalScore(bd: ContactDepthBreakdown): number {
  if (bd.total_score != null) return bd.total_score;
  const cats = getContactCategories(bd);
  return Object.values(cats).reduce((sum, cat) => sum + cat.subtotal, 0);
}

/** Extract domains from transformation breakdown (handles both DB shapes) */
function getTransformationDomains(bd: TransformationBreakdown): Record<string, { score: number; reasoning: string; name?: string }> {
  if (bd.domains) return bd.domains;
  if (bd.domain_analysis) {
    const result: Record<string, { score: number; reasoning: string; name?: string }> = {};
    for (const [key, domain] of Object.entries(bd.domain_analysis)) {
      result[key] = {
        score: domain.score,
        reasoning: domain.evidence_summary || `${domain.direction} — ${domain.key_quote}`,
        name: domain.name,
      };
    }
    return result;
  }
  return {};
}

/** Compute total score from transformation breakdown */
function getTransformationTotalScore(bd: TransformationBreakdown): number {
  if (bd.total_score != null) return bd.total_score;
  if (bd.quantitative_metrics?.full_transformation_score != null) {
    return bd.quantitative_metrics.full_transformation_score;
  }
  const domains = getTransformationDomains(bd);
  return Object.values(domains).reduce((sum, d) => sum + (d.score || 0), 0);
}

// ─── Score Card ─────────────────────────────────────────────────────────────

function ScoreCard({
  icon: Icon,
  label,
  score,
  maxScore,
  level,
  description,
  accentBg,
  accentBorder,
  accentText,
  accentIcon,
  breakdown,
  methodologyHref,
}: {
  icon: typeof TrendingUp;
  label: string;
  score: number | null;
  maxScore: number;
  level: string;
  description: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  accentIcon: string;
  breakdown: React.ReactNode;
  methodologyHref: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = score !== null ? Math.round((score / maxScore) * 100) : null;

  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accentIcon}`} />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {pct !== null ? (
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{pct}%</span>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">Pending</span>
          )}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${accentText} bg-white/70 dark:bg-black/20`}>
            {level}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-white/40 dark:border-white/10">
          {/* Total score line: e.g., "Total Score: 12/28 (43%)" */}
          {score !== null && (
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-2 mb-1">
              Total Score: {score}/{maxScore} ({pct}%)
            </p>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-snug">
            {description}
          </p>
          {breakdown}
          <Link
            href={methodologyHref}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400 hover:underline mt-3"
          >
            Learn about this scale →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Criterion Grid ─────────────────────────────────────────────────────────

function CriterionGrid({ criteria, maxPerItem }: { criteria: Record<string, { score: number; reasoning: string; name?: string }>; maxPerItem?: number }) {
  const max = maxPerItem ?? 4;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {Object.entries(criteria).map(([key, detail]) => (
        <div
          key={key}
          className="bg-white/60 dark:bg-white/5 rounded-lg p-2.5 border border-white/40 dark:border-white/10"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {detail.name || formatCriterionLabel(key)}
            </span>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-white/10 px-1.5 py-0.5 rounded">
              {detail.score}/{max}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            {detail.reasoning}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function TriadScoresPanel({ scores }: TriadScoresPanelProps) {
  const hasAnyScore =
    scores.evidence_score !== null ||
    scores.contact_depth_score !== null ||
    scores.transformation_score !== null;

  if (!hasAnyScore) {
    return (
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
        >
          Contact Experience Triad
        </h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
          Analysis pending. This encounter has not yet been scored by our UAP research scales.
        </p>
      </div>
    );
  }

  // Radar chart data — normalize each score to 0-100 percentage
  const radarData = [
    {
      dimension: "Evidence",
      value: scores.evidence_score !== null ? Math.round((scores.evidence_score / 28) * 100) : 0,
      fullMark: 100,
    },
    {
      dimension: "Contact",
      value: scores.contact_depth_score !== null ? Math.round((scores.contact_depth_score / 32) * 100) : 0,
      fullMark: 100,
    },
    {
      dimension: "Impact",
      value: scores.transformation_score !== null ? Math.round((scores.transformation_score / 50) * 100) : 0,
      fullMark: 100,
    },
  ];

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
      <h3
        className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
      >
        Contact Experience Triad
      </h3>

      {/* Radar Chart */}
      <div className="w-full h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-slate-600 dark:text-slate-400"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              dataKey="value"
              stroke="#16a34a"
              fill="#16a34a"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Classification badges */}
      {(scores.hynek_type || scores.vallee_type) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {scores.hynek_type && (
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
              Hynek: {scores.hynek_type}
            </span>
          )}
          {scores.vallee_type && (
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
              Vallée: {scores.vallee_type}
            </span>
          )}
        </div>
      )}

      {/* Score Cards */}
      <div className="space-y-2">
        <ScoreCard
          icon={TrendingUp}
          label="Evidence Strength"
          score={scores.evidence_score}
          maxScore={28}
          level={scores.evidence_score !== null ? getEvidenceLevel(scores.evidence_score) : "Pending"}
          description={
            scores.evidence_breakdown?.summary_reason ??
            "Evaluates the strength of verifiable evidence in this encounter."
          }
          accentBg="bg-emerald-50 dark:bg-emerald-900/20"
          accentBorder="border-emerald-200 dark:border-emerald-800"
          accentText="text-emerald-700 dark:text-emerald-300"
          accentIcon="text-emerald-600 dark:text-emerald-400"
          methodologyHref="/uap/methodology/evidence-strength"
          breakdown={
            scores.evidence_breakdown?.criteria ? (
              <CriterionGrid criteria={scores.evidence_breakdown.criteria} />
            ) : null
          }
        />

        <ScoreCard
          icon={Brain}
          label="Contact Depth"
          score={scores.contact_depth_score ?? (scores.contact_depth_breakdown ? getContactTotalScore(scores.contact_depth_breakdown) : null)}
          maxScore={32}
          level={scores.contact_depth_score !== null ? getContactLevel(scores.contact_depth_score) : (scores.contact_depth_breakdown ? getContactLevel(getContactTotalScore(scores.contact_depth_breakdown)) : "Pending")}
          description={
            scores.contact_depth_breakdown?.summary_reason ??
            "Measures the depth and quality of the reported contact experience."
          }
          accentBg="bg-blue-50 dark:bg-blue-900/20"
          accentBorder="border-blue-200 dark:border-blue-800"
          accentText="text-blue-700 dark:text-blue-300"
          accentIcon="text-blue-600 dark:text-blue-400"
          methodologyHref="/uap/methodology/contact-depth"
          breakdown={
            scores.contact_depth_breakdown ? (() => {
              const cats = getContactCategories(scores.contact_depth_breakdown);
              return Object.keys(cats).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(cats).map(([catKey, cat]) => (
                    <div key={catKey}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                          {formatCriterionLabel(catKey)}
                        </span>
                        <span className="text-[10px] text-slate-500">{cat.subtotal}pts</span>
                      </div>
                      <CriterionGrid criteria={cat.items} maxPerItem={2} />
                    </div>
                  ))}
                </div>
              ) : null;
            })() : null
          }
        />

        <ScoreCard
          icon={Sparkles}
          label="Transformation"
          score={scores.transformation_score ?? (scores.transformation_breakdown ? getTransformationTotalScore(scores.transformation_breakdown) : null)}
          maxScore={50}
          level={scores.transformation_score !== null ? getTransformationLevel(scores.transformation_score) : (scores.transformation_breakdown ? getTransformationLevel(getTransformationTotalScore(scores.transformation_breakdown)) : "Pending")}
          description={
            scores.transformation_breakdown?.summary_reason ??
            "Assesses how deeply this experience transformed the witness's worldview and life."
          }
          accentBg="bg-rose-50 dark:bg-rose-900/20"
          accentBorder="border-rose-200 dark:border-rose-800"
          accentText="text-rose-700 dark:text-rose-300"
          accentIcon="text-rose-600 dark:text-rose-400"
          methodologyHref="/uap/methodology/transformation"
          breakdown={
            scores.transformation_breakdown ? (() => {
              const domains = getTransformationDomains(scores.transformation_breakdown);
              return Object.keys(domains).length > 0 ? (
                <CriterionGrid criteria={domains} maxPerItem={5} />
              ) : null;
            })() : null
          }
        />
      </div>
    </div>
  );
}
