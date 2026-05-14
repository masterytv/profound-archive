"use client";

/**
 * UapFilterSidebar — Collapsible accordion filter panel for /uap/video-explore.
 *
 * Four sections: Encounter, Program & Intel, Quality & Scoring, General.
 * Desktop: fixed left column (280px). Mobile: full-screen drawer via "Filters" button.
 * All filter state encoded in URL search params for shareable links.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Filter,
  X,
  Zap,
  Shield,
  Brain,
  Radio,
} from "lucide-react";
import type {
  ExploreFacets,
  FacetItem,
} from "./types";
import {
  VIDEO_TONE_LABELS,
  HYNEK_LABELS,
  ENTITY_TYPE_LABELS,
  CONTENT_TYPE_LABELS,
  RECURRENCE_LABELS,
  DECADE_LABELS,
} from "./types";

// ─── URL Param Helpers ───────────────────────────────────────────────────────

function getArrayParam(params: URLSearchParams, key: string): string[] {
  const val = params.get(key);
  if (!val) return [];
  return val.split(",").filter(Boolean);
}

function getBoolParam(params: URLSearchParams, key: string): boolean | null {
  const val = params.get(key);
  if (val === "true") return true;
  if (val === "false") return false;
  return null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AccordionSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200/60 dark:border-white/10 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-3 pb-3 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function FilterChips({
  items,
  selected,
  labels,
  onToggle,
}: {
  items: FacetItem[];
  selected: string[];
  labels: Record<string, string>;
  onToggle: (value: string) => void;
}) {
  if (items.length === 0) return (
    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
      No data yet — run analysis to populate
    </p>
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const isActive = selected.includes(item.value);
        const label = labels[item.value] || item.value;
        return (
          <button
            key={item.value}
            onClick={() => onToggle(item.value)}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
              isActive
                ? "bg-green-600 dark:bg-green-700 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            )}
          >
            <span>{label}</span>
            <span
              className={cn(
                "text-[10px] tabular-nums",
                isActive
                  ? "text-green-200"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FilterToggle({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean | null;
  onChange: (val: boolean | null) => void;
}) {
  return (
    <button
      onClick={() => {
        if (checked === null) onChange(true);
        else if (checked === true) onChange(false);
        else onChange(null);
      }}
      className={cn(
        "flex items-center justify-between gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
        checked === true
          ? "bg-green-600 dark:bg-green-700 text-white"
          : checked === false
          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
      )}
    >
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[10px] tabular-nums",
            checked === true
              ? "text-green-200"
              : checked === false
              ? "text-red-400"
              : "text-slate-400 dark:text-slate-500"
          )}
        >
          {count}
        </span>
        <span className="text-[10px]">
          {checked === true ? "✓ Yes" : checked === false ? "✗ No" : "Any"}
        </span>
      </span>
    </button>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
      {children}
    </p>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface UapFilterSidebarProps {
  facets: ExploreFacets;
  /** 'sidebar' = desktop fixed column, 'inline' = mobile collapsible panel */
  variant: "sidebar" | "inline";
  className?: string;
}

export function UapFilterSidebar({ facets, variant, className }: UapFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState(false);

  // ─── Read current filter state from URL ──────────────────────────
  const videoTones = getArrayParam(searchParams, "tones");
  const hynekTypes = getArrayParam(searchParams, "hynek");
  const entityTypes = getArrayParam(searchParams, "entities");
  const contentTypes = getArrayParam(searchParams, "ctypes");
  const decade = searchParams.get("decade") || "";
  const channel = searchParams.get("channel") || "";
  const recurrence = searchParams.get("recurrence") || "";
  const minIntelligence = parseInt(searchParams.get("minIntel") || "0", 10);
  const hasOath = getBoolParam(searchParams, "oath");
  const hasPsi = getBoolParam(searchParams, "psi");

  // Count active filters for badge
  const activeCount =
    videoTones.length +
    hynekTypes.length +
    entityTypes.length +
    contentTypes.length +
    (decade ? 1 : 0) +
    (channel ? 1 : 0) +
    (recurrence ? 1 : 0) +
    (minIntelligence > 0 ? 1 : 0) +
    (hasOath !== null ? 1 : 0) +
    (hasPsi !== null ? 1 : 0);

  // ─── URL update helper ───────────────────────────────────────────
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) {
          params.set(key, val);
        } else {
          params.delete(key);
        }
      }
      // Reset to page 1 on filter change
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // ─── Filter toggle helpers ──────────────────────────────────────
  const toggleArrayParam = (key: string, currentValues: string[], value: string) => {
    const next = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    updateParams({ [key]: next.join(",") });
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["tones", "hynek", "entities", "ctypes", "decade", "channel", "recurrence", "minIntel", "oath", "psi"].forEach(
      (k) => params.delete(k)
    );
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // ─── Filter accordion content (shared) ─────────────────────────
  const filterContent = (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-green-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Filters
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-[10px] text-white font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Section 1: Encounter Filters */}
      <AccordionSection
        title="Encounters"
        icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
        defaultOpen={entityTypes.length > 0 || hynekTypes.length > 0}
      >
        <div>
          <FilterLabel>Entity Type</FilterLabel>
          <FilterChips
            items={facets.entity_types}
            selected={entityTypes}
            labels={ENTITY_TYPE_LABELS}
            onToggle={(v) => toggleArrayParam("entities", entityTypes, v)}
          />
        </div>
        <div>
          <FilterLabel>Hynek Classification</FilterLabel>
          <FilterChips
            items={facets.hynek_types}
            selected={hynekTypes}
            labels={HYNEK_LABELS}
            onToggle={(v) => toggleArrayParam("hynek", hynekTypes, v)}
          />
        </div>
        <div>
          <FilterLabel>Recurrence</FilterLabel>
          {facets.recurrence_patterns.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {facets.recurrence_patterns.map((item) => (
                <button
                  key={item.value}
                  onClick={() =>
                    updateParams({
                      recurrence: recurrence === item.value ? "" : item.value,
                    })
                  }
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                    recurrence === item.value
                      ? "bg-green-600 dark:bg-green-700 text-white"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                  )}
                >
                  {RECURRENCE_LABELS[item.value] || item.value}
                  <span
                    className={cn(
                      "text-[10px]",
                      recurrence === item.value
                        ? "text-green-200"
                        : "text-slate-400"
                    )}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              No data yet
            </p>
          )}
        </div>
      </AccordionSection>

      {/* Section 2: Program & Intel */}
      <AccordionSection
        title="Program & Intel"
        icon={<Shield className="w-3.5 h-3.5 text-blue-500" />}
        defaultOpen={videoTones.length > 0 || hasOath !== null}
      >
        <div>
          <FilterLabel>Video Tone</FilterLabel>
          <FilterChips
            items={facets.video_tones}
            selected={videoTones}
            labels={VIDEO_TONE_LABELS}
            onToggle={(v) => toggleArrayParam("tones", videoTones, v)}
          />
        </div>
        <div className="space-y-1.5">
          <FilterLabel>Claims & Content</FilterLabel>
          <FilterToggle
            label="Under-Oath Claims"
            count={facets.toggle_counts.has_oath}
            checked={hasOath}
            onChange={(v) =>
              updateParams({ oath: v === null ? "" : String(v) })
            }
          />
          <FilterToggle
            label="Psi / Consciousness"
            count={facets.toggle_counts.has_psi}
            checked={hasPsi}
            onChange={(v) =>
              updateParams({ psi: v === null ? "" : String(v) })
            }
          />
        </div>
      </AccordionSection>

      {/* Section 3: Quality & Scoring */}
      <AccordionSection
        title="Quality & Scoring"
        icon={<Brain className="w-3.5 h-3.5 text-purple-500" />}
        defaultOpen={minIntelligence > 0}
      >
        <div>
          <FilterLabel>
            Min Intelligence Value: {minIntelligence || "Any"}
          </FilterLabel>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 leading-relaxed">
            Composite score (0-10) based on unique claims, named sources, referenced programs, and verifiable details.
          </p>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={minIntelligence}
            onChange={(e) =>
              updateParams({ minIntel: e.target.value === "0" ? "" : e.target.value })
            }
            className="w-full h-1.5 accent-green-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
            <span>Any</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>
      </AccordionSection>

      {/* Section 4: General */}
      <AccordionSection
        title="General"
        icon={<Radio className="w-3.5 h-3.5 text-green-500" />}
        defaultOpen={contentTypes.length > 0 || decade !== ""}
      >
        <div>
          <FilterLabel>Content Type</FilterLabel>
          <FilterChips
            items={facets.content_types}
            selected={contentTypes}
            labels={CONTENT_TYPE_LABELS}
            onToggle={(v) => toggleArrayParam("ctypes", contentTypes, v)}
          />
        </div>
        <div>
          <FilterLabel>Decade</FilterLabel>
          <div className="flex flex-wrap gap-1.5">
            {facets.decades.map((item) => (
              <button
                key={item.value}
                onClick={() =>
                  updateParams({
                    decade: decade === item.value ? "" : item.value,
                  })
                }
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                  decade === item.value
                    ? "bg-green-600 dark:bg-green-700 text-white"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                )}
              >
                {DECADE_LABELS[item.value] || item.value}
                <span
                  className={cn(
                    "text-[10px]",
                    decade === item.value ? "text-green-200" : "text-slate-400"
                  )}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <FilterLabel>Channel</FilterLabel>
          <select
            value={channel}
            onChange={(e) => updateParams({ channel: e.target.value })}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:[color-scheme:dark] cursor-pointer"
          >
            <option value="">All Channels</option>
            {facets.channels.map((ch) => (
              <option key={ch.value} value={ch.value}>
                {ch.value} ({ch.count})
              </option>
            ))}
          </select>
        </div>
      </AccordionSection>
    </div>
  );

  // ─── Inline variant: collapsible panel (mobile) ────────────────
  if (variant === "inline") {
    return (
      <div className={cn("w-full", className)}>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer",
            expanded
              ? "bg-green-600 dark:bg-green-700 text-white"
              : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10 shadow-sm"
          )}
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                  expanded
                    ? "bg-white/20 text-white"
                    : "bg-green-600 text-white"
                )}
              >
                {activeCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
        {expanded && (
          <div className="mt-3 bg-white dark:bg-white/[0.02] rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden">
            {filterContent}
          </div>
        )}
      </div>
    );
  }

  // ─── Sidebar variant: fixed column (desktop) ──────────────────
  return (
    <aside
      className={cn(
        "w-[280px] shrink-0 bg-white dark:bg-white/[0.02] rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden self-start sticky top-24",
        className
      )}
    >
      {filterContent}
    </aside>
  );
}

