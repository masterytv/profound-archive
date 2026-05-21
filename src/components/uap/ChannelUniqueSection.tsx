"use client";

import { useState } from "react";
import { Star, User, MapPin, Building2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChannelUniqueData {
  exclusiveExperiencers: { name: string; slug: string }[];
  exclusiveEvents: { name: string; slug: string }[];
  exclusiveOrgs: { name: string; slug: string }[];
  exclusivePrograms: { name: string; slug: string }[];
  /** How many entities total the channel covers (for "first to cover" context) */
  totalEntitiesCovered: number;
}

const ITEMS_PER_PAGE = 12;

// ─── Paginated Pill List ────────────────────────────────────────────────────

function PaginatedPillList({
  items,
  basePath,
}: {
  items: { name: string; slug: string }[];
  basePath: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const start = page * ITEMS_PER_PAGE;
  const visible = items.slice(start, start + ITEMS_PER_PAGE);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((item) => (
          <Link
            key={item.slug}
            href={`${basePath}/${item.slug}`}
            className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-white/10 rounded-full px-2 py-0.5 hover:bg-white dark:hover:bg-white/20 transition-colors truncate max-w-[160px]"
            title={item.name}
          >
            {item.name}
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/30">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed hover:underline transition-opacity"
          >
            <ChevronLeft className="w-3 h-3" />
            Prev
          </button>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
            {start + 1}–{Math.min(start + ITEMS_PER_PAGE, items.length)} of {items.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed hover:underline transition-opacity"
          >
            Next
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChannelUniqueSection({ data }: { data: ChannelUniqueData }) {
  const {
    exclusiveExperiencers,
    exclusiveEvents,
    exclusiveOrgs,
    exclusivePrograms,
    totalEntitiesCovered,
  } = data;

  // Only show experiencers for now — events, orgs, and programs need
  // entity normalization before exclusive counts are meaningful.
  const totalExclusives = exclusiveExperiencers.length;

  // Don't render the section if nothing unique
  if (totalExclusives === 0) return null;

  const sections = [
    {
      key: "experiencers",
      icon: User,
      label: "Exclusive Experiencer",
      plural: "Exclusive Experiencers",
      items: exclusiveExperiencers,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      basePath: "/uap/experiencer",
    },
    // TODO: Re-enable after entity normalization is complete
    // Events, orgs, and programs have duplicate entries (e.g. "US Senate" vs
    // "U.S. Senate" vs "United States Senate") that inflate exclusive counts.
    // {
    //   key: "events",
    //   icon: MapPin,
    //   items: exclusiveEvents,
    //   ...
    // },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-4 h-4 text-amber-500" />
        <h3
          className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider"
          style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            letterSpacing: "0.05em",
          }}
        >
          What Makes This Channel Unique
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Experiencers covered exclusively by this channel — their stories are not found
        in any other channel&apos;s videos in the archive.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.key}
              className={`rounded-xl border p-3 ${section.bgColor} ${section.borderColor}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={`w-3.5 h-3.5 ${section.color}`} />
                <span className={`text-xs font-bold ${section.color}`}>
                  {section.items.length}{" "}
                  {section.items.length === 1 ? section.label : section.plural}
                </span>
              </div>
              <PaginatedPillList
                items={section.items}
                basePath={section.basePath}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
