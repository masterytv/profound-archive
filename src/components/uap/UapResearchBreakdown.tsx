"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Radar,
  Eye,
  Ear,
  Hand,
  Brain,
  Zap,
  Heart,
  AlertTriangle,
  Skull,
  Users,
  Shield,
  ShieldCheck,
} from "lucide-react";
import type {
  UapPhenomenologyResult,
  EncounterFlowPhase,
  UapEntityEncounter,
  CraftObservation,
  ConsciousnessAlteration,
  PhysicalEffects,
  EmotionEntry,
  SensoryChannel,
} from "@/lib/ai/uap-phenomenology";
import { TimestampLink } from "@/components/video/TimestampLink";
import { formatTimestamp } from "@/lib/ai/format-timestamped-transcript";

// ─── Display Helper ─────────────────────────────────────────────────────────
// Old batch runs stored free-text fields with underscores instead of spaces.
// This helper cleans them for display while preserving readability.
function cleanText(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/_/g, " ");
}

// ─── Collapsible Section ────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-100 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-green-500" />}
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {title}
          </h4>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

// ─── Encounter Flow Timeline ────────────────────────────────────────────────

function EncounterFlowTimeline({ phases }: { phases: EncounterFlowPhase[] }) {
  const activePhases = phases.filter((p) => p.present);
  if (!phases || activePhases.length === 0) return <p className="text-xs text-slate-400 p-3 italic">The analysis found no relevant content for this section.</p>;

  const phaseColors: Record<string, string> = {
    precursor: "from-slate-400 to-slate-500",
    onset: "from-amber-400 to-amber-500",
    approach: "from-orange-400 to-orange-500",
    immersion: "from-green-400 to-green-500",
    communication: "from-cyan-400 to-cyan-500",
    separation: "from-blue-400 to-blue-500",
    aftermath: "from-purple-400 to-purple-500",
  };

  return (
    <div className="space-y-2">
      {activePhases.map((phase, i) => (
        <div key={phase.phase} className="flex gap-3">
          {/* Timeline dot + connector */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-3 h-3 rounded-full bg-gradient-to-br shrink-0 mt-1",
                phaseColors[phase.phase] || "from-slate-400 to-slate-500"
              )}
            />
            {i < activePhases.length - 1 && (
              <div className="w-px flex-1 bg-slate-200 dark:bg-white/10 mt-1" />
            )}
          </div>
          {/* Content */}
          <div className="pb-3 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {cleanText(phase.label)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {phase.duration_estimate}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              {cleanText(phase.description)}
            </p>
            {phase.key_quote && (
              <div className="flex items-start gap-1.5 mt-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-500 italic border-l-2 border-green-300 dark:border-green-700 pl-2">
                  &ldquo;{cleanText(phase.key_quote)}&rdquo;
                </p>
                {phase.key_quote_timestamp_seconds != null && (
                  <TimestampLink
                    seconds={phase.key_quote_timestamp_seconds}
                    label={`[${formatTimestamp(phase.key_quote_timestamp_seconds)}]`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sensory Channels Grid ──────────────────────────────────────────────────

const SENSORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  visual: Eye,
  auditory: Ear,
  tactile: Hand,
  noetic: Brain,
  electromagnetic: Zap,
  proprioceptive: AlertTriangle,
};

function SensoryChannelsGrid({
  channels,
}: {
  channels: Record<string, SensoryChannel>;
}) {
  const activeChannels = Object.entries(channels).filter(
    ([, ch]) => ch.active
  );
  if (!channels || activeChannels.length === 0) return <p className="text-xs text-slate-400 p-3 italic">The analysis found no relevant content for this section.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {activeChannels.map(([name, ch]) => {
        const Icon = SENSORY_ICONS[name] || Eye;
        return (
          <div
            key={name}
            className="bg-slate-50 dark:bg-white/5 rounded-lg p-2.5 border border-slate-100 dark:border-white/10"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {name}
                </span>
                {ch.extraordinary && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                    extraordinary
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {ch.intensity}/10
              </span>
            </div>
            {/* Intensity bar */}
            <div className="h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
                style={{ width: `${ch.intensity * 10}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              {cleanText(ch.description)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Entity Encounters ──────────────────────────────────────────────────────

function EntityList({ entities }: { entities: UapEntityEncounter[] }) {
  if (!entities || entities.length === 0) return <p className="text-xs text-slate-400 p-3 italic">The analysis found no relevant content for this section.</p>;

  const typeEmoji: Record<string, string> = {
    grey: "👽", tall_grey: "👽", mantis: "🦗", insectoid_other: "🦗",
    reptilian: "🦎", nordic: "👤", tall_white: "👤", humanoid: "🧑",
    hybrid: "🧬", light_being: "✨", blue_being: "🔵", angelic: "👼",
    demonic: "😈", shadow_entity: "👤", hooded_cloaked: "🧥",
    robotic: "🤖", amorphous: "💨", unknown: "❓",
  };

  return (
    <div className="space-y-2">
      {entities.map((entity) => (
        <div
          key={entity.order}
          className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 border border-slate-100 dark:border-white/10"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeEmoji[entity.entity_type] || "❓"}</span>
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {entity.entity_type.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-slate-400 ml-1.5">
                  ({entity.count})
                </span>
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 font-mono">
              {entity.confidence}%
            </span>
          </div>

          <div className="mt-2 space-y-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
              <span className="text-slate-400">Demeanor</span>
              <span className="text-slate-600 dark:text-slate-300 capitalize">{entity.demeanor.replace(/_/g, " ")}</span>
              <span className="text-slate-400">Communication</span>
              <span className="text-slate-600 dark:text-slate-300 capitalize">{entity.communication_method.replace(/_/g, " ")}</span>
              <span className="text-slate-400">Interaction</span>
              <span className="text-slate-600 dark:text-slate-300 capitalize">{entity.interaction_type.replace(/_/g, " ")}</span>
              {entity.height_estimate && entity.height_estimate !== "not_stated" && (
                <>
                  <span className="text-slate-400">Height</span>
                  <span className="text-slate-600 dark:text-slate-300">{entity.height_estimate}</span>
                </>
              )}
            </div>
            {entity.appearance && entity.appearance !== "not_stated" && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <strong className="text-slate-600 dark:text-slate-300">Appearance:</strong> {cleanText(entity.appearance)}
              </p>
            )}
            {entity.message_summary && entity.message_summary !== "none" && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                <strong className="text-slate-600 dark:text-slate-300">Message:</strong> {cleanText(entity.message_summary)}
              </p>
            )}
            {entity.message_quote && (
              <div className="flex items-start gap-1.5">
                <p className="text-[11px] italic text-slate-400 border-l-2 border-green-300 dark:border-green-700 pl-2">
                  &ldquo;{cleanText(entity.message_quote)}&rdquo;
                </p>
                {entity.message_quote_timestamp_seconds != null && (
                  <TimestampLink
                    seconds={entity.message_quote_timestamp_seconds}
                    label={`[${formatTimestamp(entity.message_quote_timestamp_seconds)}]`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Craft Observation ──────────────────────────────────────────────────────

function CraftPanel({ craft }: { craft: CraftObservation }) {
  if (!craft || !craft.observed) return <p className="text-xs text-slate-400 p-3 italic">The analysis found no relevant content for this section.</p>;

  const observables = Object.entries(craft.five_observables);
  const activeCount = observables.filter(([, v]) => v).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: "Shape", value: craft.shape },
          { label: "Size", value: craft.size_estimate },
          { label: "Color", value: craft.color },
          { label: "Luminosity", value: craft.luminosity?.replace(/_/g, " ") },
          { label: "Sound", value: craft.sound?.replace(/_/g, " ") },
          { label: "Movement", value: craft.movement?.join(", ") || "none" },
        ].filter(item => item.value && item.value !== "not_stated" && item.value !== "none").map((item) => (
          <div key={item.label} className="bg-slate-50 dark:bg-white/5 rounded-lg p-2 border border-slate-100 dark:border-white/10">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
              {item.label}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium capitalize">
              {item.value?.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>

      {/* Five Observables */}
      <div>
        <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Five Observables ({activeCount}/5)
        </h5>
        <div className="flex flex-wrap gap-1.5">
          {observables.map(([key, active]) => (
            <span
              key={key}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                active
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"
              )}
            >
              {active ? "✓" : "✗"} {key.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      {craft.description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {cleanText(craft.description)}
        </p>
      )}
    </div>
  );
}

// ─── Consciousness Alteration ───────────────────────────────────────────────

function ConsciousnessPanel({ data }: { data: ConsciousnessAlteration }) {
  const fields = [
    { label: "State", value: data.state_of_consciousness },
    { label: "Time Perception", value: data.time_perception },
    { label: "Thought Clarity", value: data.thought_clarity },
    { label: "Memory Quality", value: data.memory_quality },
    { label: "Agency", value: data.agency },
    { label: "Reality Assessment", value: data.reality_assessment },
  ].filter((f) => f.value && f.value !== "not_stated");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {fields.map((f) => (
          <div key={f.label} className="bg-slate-50 dark:bg-white/5 rounded-lg p-2 border border-slate-100 dark:border-white/10">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
              {f.label}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium capitalize">
              {f.value.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>

      {/* Special markers */}
      <div className="flex flex-wrap gap-2">
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-medium border",
            data.oz_factor
              ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
              : "bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"
          )}
        >
          {data.oz_factor ? "✓" : "✗"} Oz Factor
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
          Ontological Shock: {data.ontological_shock_rating}/10
        </span>
        {data.screen_memory_details && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Screen Memory
          </span>
        )}
      </div>

      {data.reality_quote && (
        <div className="flex items-start gap-1.5">
          <p className="text-[11px] italic text-slate-500 dark:text-slate-400 border-l-2 border-green-300 dark:border-green-700 pl-2">
            &ldquo;{cleanText(data.reality_quote)}&rdquo;
          </p>
          {data.reality_quote_timestamp_seconds != null && (
            <TimestampLink
              seconds={data.reality_quote_timestamp_seconds}
              label={`[${formatTimestamp(data.reality_quote_timestamp_seconds)}]`}
            />
          )}
        </div>
      )}
      {data.screen_memory_details && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          <strong>Screen Memory:</strong> {cleanText(data.screen_memory_details)}
        </p>
      )}
    </div>
  );
}

// ─── Physical Effects ───────────────────────────────────────────────────────

function PhysicalEffectsPanel({ effects }: { effects: PhysicalEffects }) {
  const categories = [
    { label: "Physiological", items: effects.witness_physiological ?? [], color: "red" },
    { label: "Vehicle / Equipment", items: effects.vehicle_equipment ?? [], color: "amber" },
    { label: "Environmental", items: effects.environmental ?? [], color: "blue" },
    { label: "Temporal", items: effects.temporal ?? [], color: "purple" },
  ].filter((c) => c.items.length > 0);

  if (categories.length === 0 && !effects.details) {
    return <p className="text-xs text-slate-400">No physical effects reported</p>;
  }

  const colorMap: Record<string, string> = {
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  };

  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <div key={cat.label}>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {cat.label}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {cat.items.map((item) => (
              <span
                key={item}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                  colorMap[cat.color]
                )}
              >
                {item.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      ))}
      {effects.details && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {cleanText(effects.details)}
        </p>
      )}
    </div>
  );
}

// ─── Emotional Progression ──────────────────────────────────────────────────

function EmotionalProgressionBar({
  emotions,
  dominant,
}: {
  emotions: EmotionEntry[];
  dominant: string;
}) {
  if (!emotions || emotions.length === 0) return <p className="text-xs text-slate-400 p-3 italic">The analysis found no relevant content for this section.</p>;

  return (
    <div className="space-y-1.5">
      {emotions.map((em, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs w-20 text-right text-slate-600 dark:text-slate-300 font-medium capitalize truncate">
            {em.emotion}
          </span>
          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600"
              style={{ width: `${em.intensity * 10}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono w-8">{em.intensity}/10</span>
        </div>
      ))}
      <p className="text-[10px] text-slate-400 mt-1">
        Dominant: <strong className="text-slate-600 dark:text-slate-300 capitalize">{dominant}</strong>
      </p>
    </div>
  );
}

// ─── Evidence Summary ───────────────────────────────────────────────────────

export interface EvidenceBreakdown {
  level: string;
  source_type: string;
  total_score: number;
  data_completeness?: string;
  summary_reason: string;
  criteria: Record<string, { score: number; reasoning: string }>;
}

const CRITERIA_LABELS: Record<string, { label: string; icon: string }> = {
  witness_credibility: { label: "Witness Credibility", icon: "🎖️" },
  corroboration: { label: "Corroboration", icon: "👥" },
  physical_effects: { label: "Physical Evidence", icon: "⚡" },
  specificity: { label: "Detail & Specificity", icon: "🔍" },
  perceptual_clarity: { label: "Perceptual Clarity", icon: "👁️" },
  temporal_precedence: { label: "Timely Reporting", icon: "⏱️" },
  unpredictability: { label: "Unpredictability", icon: "🎲" },
};

function scoreTier(score: number): { color: string; label: string } {
  if (score >= 3) return { color: "text-green-600 dark:text-green-400", label: "Strong" };
  if (score >= 2) return { color: "text-amber-600 dark:text-amber-400", label: "Moderate" };
  return { color: "text-slate-400", label: "Weak" };
}

function levelColor(level?: string): string {
  const l = (level || "").toLowerCase();
  if (l.includes("high") || l.includes("strong")) return "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
  if (l.includes("moderate")) return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  return "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10";
}

function EvidencePanel({ evidence }: { evidence: EvidenceBreakdown }) {
  const maxScore = 3; // Each criterion is scored 1-3
  const criteriaEntries = Object.entries(evidence?.criteria || {});

  return (
    <div className="space-y-3">
      {/* Level + Score header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full border",
          levelColor(evidence?.level)
        )}>
          {evidence?.level || "Unknown"}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
          Score: {evidence?.total_score || 0}/21
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 capitalize">
          {evidence?.source_type?.replace(/_/g, " ") || "Unknown"}
        </span>
      </div>

      {/* Criteria bars */}
      <div className="space-y-1.5">
        {criteriaEntries.map(([key, criterion]) => {
          const meta = CRITERIA_LABELS[key] || { label: key.replace(/_/g, " "), icon: "📋" };
          const tier = scoreTier(criterion.score);
          return (
            <div key={key} className="group">
              <div className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{meta.icon}</span>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 w-32 truncate">
                  {meta.label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      criterion.score >= 3 ? "bg-green-500" :
                      criterion.score >= 2 ? "bg-amber-500" : "bg-slate-400"
                    )}
                    style={{ width: `${(criterion.score / maxScore) * 100}%` }}
                  />
                </div>
                <span className={cn("text-[10px] font-mono w-12 text-right", tier.color)}>
                  {criterion.score}/{maxScore}
                </span>
              </div>
              {/* Reasoning tooltip on hover */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 pl-7 mt-0.5 hidden group-hover:block leading-snug">
                {cleanText(criterion.reasoning)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {evidence.summary_reason && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/10 pt-2">
          {cleanText(evidence.summary_reason)}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface UapResearchBreakdownProps {
  data?: UapPhenomenologyResult | null;
  evidenceBreakdown?: EvidenceBreakdown | null;
  className?: string;
}

export function UapResearchBreakdown({ data, evidenceBreakdown, className }: UapResearchBreakdownProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
        <Radar className="w-4 h-4 text-green-500" />
        <h2
          className="text-lg font-bold text-slate-900 dark:text-slate-100"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          Encounter Research Breakdown
        </h2>
        <span className="text-[10px] text-slate-400 ml-auto">
          Phenomenological Analysis
        </span>
      </div>

      {/* Classification badges */}
      <div className="px-6 pt-4 pb-2 flex flex-wrap gap-2">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
          {data?.encounter_modality?.replace(/_/g, " ") || "encounter"}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
          {data?.hynek_classification || "Unknown Classification"}
        </span>
        {data?.encounter_duration_estimate && data.encounter_duration_estimate !== "unknown" && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
            Duration: {data.encounter_duration_estimate}
          </span>
        )}
        {data?.entity_count && data.entity_count > 0 ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            {data.entity_count} {data.entity_count === 1 ? "entity" : "entities"} — {data.dominant_entity_type?.replace(/_/g, " ")}
          </span>
        ) : null}
      </div>

      {/* Sections */}
      <div className="px-6 pb-6 space-y-3">
        {/* Evidence Summary — first section for credibility context */}
        <Section title="Evidence Summary" icon={ShieldCheck} defaultOpen={true}>
          {evidenceBreakdown ? (
            <EvidencePanel evidence={evidenceBreakdown} />
          ) : (
            <p className="text-xs text-slate-400 p-3 italic">The analysis found no relevant content for this section.</p>
          )}
        </Section>

        {/* Encounter Flow */}
        <Section title="Encounter Flow" icon={Radar} defaultOpen={true}>
          <EncounterFlowTimeline phases={data?.encounter_flow || []} />
        </Section>

        {/* Sensory Channels */}
        <Section title="Sensory Channels" icon={Eye} defaultOpen={true}>
          <SensoryChannelsGrid channels={data?.sensory_channels || {}} />
        </Section>

        {/* Entities */}
        <Section title={`Entity Encounters (${data?.entity_count || 0})`} icon={Users} defaultOpen={true}>
          <EntityList entities={data?.entities || []} />
        </Section>

        {/* Craft Observation */}
        <Section title="Craft Observation" icon={Radar} defaultOpen={data?.craft_observation?.observed || false}>
          <CraftPanel craft={data?.craft_observation || { observed: false, shape: 'none', size_estimate: 'unknown', color: 'unknown', luminosity: 'not_stated', sound: 'not_stated', movement: [], five_observables: { instantaneous_acceleration: false, hypersonic_velocity: false, low_observability: false, trans_medium_travel: false, positive_lift: false }, description: '' }} />
        </Section>

        {/* Consciousness Alteration */}
        <Section title="Consciousness Alteration" icon={Brain} defaultOpen={false}>
          <ConsciousnessPanel data={data?.consciousness_alteration || { state_of_consciousness: 'not_stated', time_perception: 'not_stated', thought_clarity: 'not_stated', memory_quality: 'not_stated', screen_memory_details: '', agency: 'not_stated', reality_assessment: 'not_stated', reality_quote: '', oz_factor: false, ontological_shock_rating: 5 }} />
        </Section>

        {/* Physical Effects */}
        <Section title="Physical Effects" icon={Zap} defaultOpen={false}>
          <PhysicalEffectsPanel effects={data?.physical_effects || { witness_physiological: [], vehicle_equipment: [], environmental: [], temporal: [], details: '' }} />
        </Section>

        {/* Emotional Progression */}
        <Section title="Emotional Arc" icon={Heart} defaultOpen={false}>
          <EmotionalProgressionBar
            emotions={data?.emotional_progression || []}
            dominant={data?.dominant_emotion || ""}
          />
        </Section>

        {/* Distinguishing Features */}
        {data?.distinguishing_features && (
          <div className="bg-green-50/40 dark:bg-green-900/10 rounded-lg p-3 border border-green-100 dark:border-green-800/30">
            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider block mb-1">
              What makes this encounter unique
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {cleanText(data.distinguishing_features)}
            </p>
          </div>
        )}

        {/* AI disclaimer */}
        <div className="border-t border-slate-50 dark:border-white/5 pt-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            ✦ AI-extracted phenomenological analysis — verify against source testimony
          </span>
        </div>
      </div>
    </div>
  );
}
