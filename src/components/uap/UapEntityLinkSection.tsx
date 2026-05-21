/**
 * UapEntityLinkSection — Reusable cross-link panel
 *
 * Renders a titled section with a paginated grid of entity cards linking to other
 * UAP entity pages (persons, programs, orgs, events, experiencers).
 * Description text appears as a tooltip on hover (desktop) or tap (mobile).
 *
 * NOTE: Uses string icon names instead of component refs because this is a
 * "use client" component rendered from server component pages. Functions
 * (like Lucide icons) can't cross the server→client boundary.
 */

"use client";

import { useState } from "react";
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  Info,
  Users,
  User,
  Calendar,
  Building2,
  Fingerprint,
  FileText,
  MapPin,
  Radio,
  Shield,
  Zap,
  Eye,
  type LucideIcon,
} from 'lucide-react';
import type { LinkedEntity } from '@/lib/data/uap-entity-links';

// ─── Icon resolver ──────────────────────────────────────────────────────────
// Maps string names to Lucide components so server pages can pass serializable
// props instead of function references.

const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  User,
  Calendar,
  Building2,
  Fingerprint,
  FileText,
  MapPin,
  Radio,
  Shield,
  Zap,
  Eye,
};

const ITEMS_PER_PAGE = 12;

interface Props {
  /** String name of a Lucide icon (e.g. "Users", "Calendar") */
  icon: string;
  title: string;
  /** Tooltip shown when hovering/tapping the info icon — clarifies what "linked" means */
  description?: string;
  entities: LinkedEntity[];
  emptyMessage?: string;
}

export default function UapEntityLinkSection({
  icon,
  title,
  description,
  entities,
  emptyMessage,
}: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(entities.length / ITEMS_PER_PAGE);
  const start = page * ITEMS_PER_PAGE;
  const visible = entities.slice(start, start + ITEMS_PER_PAGE);

  const Icon = ICON_MAP[icon] ?? Users;

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 font-serif">
        <Icon className="w-5 h-5 text-[var(--domain-accent,#22c55e)]" />
        {title}
        {description && (
          <span className="relative inline-flex">
            {/* Info button: hover on desktop, tap/focus on mobile */}
            <button
              type="button"
              className="peer p-0.5 rounded-full text-slate-300 dark:text-slate-600
                         hover:text-slate-500 dark:hover:text-slate-400
                         focus:text-slate-500 dark:focus:text-slate-400
                         focus:outline-none transition-colors"
              aria-label="More information"
              tabIndex={0}
            >
              <Info className="w-4 h-4" />
            </button>
            {/* Tooltip bubble */}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2
                         w-64 sm:w-72 px-3 py-2 rounded-lg text-xs font-normal leading-relaxed
                         bg-slate-800 dark:bg-slate-700 text-slate-200 dark:text-slate-300
                         shadow-lg border border-slate-700 dark:border-slate-600
                         opacity-0 invisible scale-95
                         peer-hover:opacity-100 peer-hover:visible peer-hover:scale-100
                         peer-focus:opacity-100 peer-focus:visible peer-focus:scale-100
                         transition-all duration-150 ease-out z-50"
            >
              {/* Arrow */}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2
                               bg-slate-800 dark:bg-slate-700 border-l border-t
                               border-slate-700 dark:border-slate-600 rotate-45" />
              {description}
            </span>
          </span>
        )}
      </h2>

      {entities.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">
          {emptyMessage || 'No connections found yet.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {visible.map((entity) => (
              <Link
                key={entity.slug}
                href={entity.href}
                className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60
                           border border-slate-200 dark:border-slate-800
                           hover:border-[var(--domain-accent,#22c55e)]/40
                           dark:hover:border-[var(--domain-accent,#22c55e)]/30
                           transition-all hover:shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300
                                group-hover:text-[var(--domain-accent,#22c55e)]
                                transition-colors truncate">
                    {entity.name}
                  </p>
                  {entity.subtitle && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate capitalize mt-0.5">
                      {entity.subtitle}
                    </p>
                  )}
                </div>
                {entity.count != null && entity.count > 0 && (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500
                                   bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                    {entity.count}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600
                                         group-hover:text-[var(--domain-accent,#22c55e)]
                                         transition-colors shrink-0" />
              </Link>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400
                           disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--domain-accent,#22c55e)]
                           transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {start + 1}–{Math.min(start + ITEMS_PER_PAGE, entities.length)} of {entities.length}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400
                           disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--domain-accent,#22c55e)]
                           transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
