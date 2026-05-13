/**
 * UapEntityLinkSection — Reusable cross-link panel
 *
 * Renders a titled section with a grid of entity cards linking to other
 * UAP entity pages (persons, programs, orgs, events, experiencers).
 * Description text appears as a tooltip on hover (desktop) or tap (mobile).
 */

import Link from 'next/link';
import { ChevronRight, Info, type LucideIcon } from 'lucide-react';
import type { LinkedEntity } from '@/lib/data/uap-entity-links';

interface Props {
  icon: LucideIcon;
  title: string;
  /** Tooltip shown when hovering/tapping the info icon — clarifies what "linked" means */
  description?: string;
  entities: LinkedEntity[];
  emptyMessage?: string;
}

export default function UapEntityLinkSection({
  icon: Icon,
  title,
  description,
  entities,
  emptyMessage,
}: Props) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {entities.map((entity) => (
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
      )}
    </section>
  );
}
