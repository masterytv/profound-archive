import {
  Microscope,
  Mic,
  Film,
  Newspaper,
  Megaphone,
  Users,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChannelIdentityData {
  archetype_primary: string | null;
  archetype_secondary: string | null;
  archetype_tertiary: string | null;
  personality_code: string | null;
}

// ─── Archetype Config ───────────────────────────────────────────────────────

const ARCHETYPE_CONFIG: Record<
  string,
  {
    icon: typeof Microscope;
    color: string;
    bg: string;
    border: string;
    description: string;
  }
> = {
  "Deep Intelligence": {
    icon: Microscope,
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    description: "In-depth research and investigative analysis",
  },
  "First Person Encounters": {
    icon: Users,
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    description: "Direct experiencer accounts and testimonies",
  },
  Documentary: {
    icon: Film,
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800",
    description: "Documentary-style coverage and surveys",
  },
  "News & Commentary": {
    icon: Newspaper,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    description: "News reporting and editorial commentary",
  },
  "Interview Hub": {
    icon: Mic,
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800",
    description: "Interview-driven content with guests",
  },
  "Advocacy & Disclosure": {
    icon: Megaphone,
    color: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    border: "border-cyan-200 dark:border-cyan-800",
    description: "Disclosure advocacy and program exposure",
  },
};

// ─── Archetype Badges Component ─────────────────────────────────────────────

export function ChannelArchetypeBadges({
  primary,
  secondary,
  tertiary,
}: {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
}) {
  if (!primary) return null;

  const archetypes = [
    { type: primary, tier: "Primary" },
    ...(secondary ? [{ type: secondary, tier: "Secondary" }] : []),
    ...(tertiary ? [{ type: tertiary, tier: "Tertiary" }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {archetypes.map(({ type, tier }) => {
        const config = ARCHETYPE_CONFIG[type];
        if (!config) return null;

        const Icon = config.icon;

        return (
          <span
            key={type}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}
            title={`${tier}: ${config.description}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {type}
            {tier === "Primary" && (
              <span className="ml-0.5 opacity-60 text-[9px]">●</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Compact Archetype Pill (for index cards) ───────────────────────────────

export function ArchetypePill({ type }: { type: string | null }) {
  if (!type) return null;
  const config = ARCHETYPE_CONFIG[type];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}
      title={config.description}
    >
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
}

// ─── Personality Code Component ─────────────────────────────────────────────

const CODE_EXPLANATIONS: Record<string, { full: string; desc: string }> = {
  I: { full: "Intelligence", desc: "Focuses on research, programs, and analysis" },
  E: { full: "Encounters", desc: "Focuses on experiencer stories and interviews" },
  D: { full: "Deep-dive", desc: "Focused depth on fewer topics or case studies" },
  B: { full: "Breadth", desc: "Covers many different subjects and angles" },
  A: { full: "Analytical", desc: "Higher intelligence value than the median" },
  N: { full: "Narrative", desc: "Story-driven, narrative content style" },
};

export function ChannelPersonalityBadge({
  code,
  showExplanation = false,
}: {
  code: string | null;
  showExplanation?: boolean;
}) {
  if (!code || code.length !== 3) return null;

  const letters = code.split("");

  return (
    <div className="inline-flex flex-col items-start">
      <div className="flex items-center gap-0.5">
        {letters.map((letter, i) => (
          <span
            key={i}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 dark:bg-white/10 text-white dark:text-slate-100 font-mono font-black text-sm shadow"
            title={CODE_EXPLANATIONS[letter]?.full ?? letter}
          >
            {letter}
          </span>
        ))}
      </div>
      {showExplanation && (
        <div className="mt-2 space-y-0.5">
          {letters.map((letter, i) => {
            const exp = CODE_EXPLANATIONS[letter];
            if (!exp) return null;
            return (
              <p key={i} className="text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">{letter}</span>
                {" = "}
                {exp.full} — {exp.desc}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
