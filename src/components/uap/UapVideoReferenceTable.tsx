'use client';

/**
 * UapVideoReferenceTable — Sortable, paginated video reference table
 *
 * Replaces ad-hoc video card lists with a standardized, responsive table.
 * Desktop: proper table layout. Mobile: stacked card layout.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Play,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VideoRef {
  video_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  view_count: number | null;
  date: string | null;
  tier: number | null;
  content_type: string | null;
}

interface Props {
  videos: VideoRef[];
  pageSize?: number;
  title?: string;
  emptyMessage?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

type SortField = 'title' | 'views' | 'date' | 'tier';

function formatCount(n: number | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function tierLabel(tier: number | null) {
  if (tier === 1) return { text: 'Encounter', cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' };
  if (tier === 2) return { text: 'Research', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
  return { text: `Tier ${tier ?? '?'}`, cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UapVideoReferenceTable({
  videos,
  pageSize = 10,
  title,
  emptyMessage = 'No videos linked.',
}: Props) {
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...videos];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'views':
          cmp = (a.view_count ?? 0) - (b.view_count ?? 0);
          break;
        case 'date':
          cmp = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
          break;
        case 'tier':
          cmp = (a.tier ?? 99) - (b.tier ?? 99);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [videos, sortField, sortAsc]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setPage(0);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-[var(--domain-accent,#22c55e)]" />
      : <ChevronDown className="w-3 h-3 text-[var(--domain-accent,#22c55e)]" />;
  }

  if (videos.length === 0) {
    return (
      <section>
        {title && (
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 font-serif">
            <Play className="w-5 h-5 text-[var(--domain-accent,#22c55e)]" />
            {title}
          </h2>
        )}
        <p className="text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section>
      {title && (
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 font-serif">
          <Play className="w-5 h-5 text-[var(--domain-accent,#22c55e)]" />
          {title}
        </h2>
      )}

      {/* ── Desktop Table ──────────────────────────────────────────── */}
      <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-xs text-slate-500 dark:text-slate-400">
              <th className="py-2.5 pl-4 pr-2 w-20">
                <button onClick={() => toggleSort('tier')} className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Type <SortIcon field="tier" />
                </button>
              </th>
              <th className="py-2.5 px-2">
                <button onClick={() => toggleSort('title')} className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Title <SortIcon field="title" />
                </button>
              </th>
              <th className="py-2.5 px-2 hidden lg:table-cell">Channel</th>
              <th className="py-2.5 px-2 text-right">
                <button onClick={() => toggleSort('views')} className="inline-flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Views <SortIcon field="views" />
                </button>
              </th>
              <th className="py-2.5 px-2 pr-4 text-right">
                <button onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 ml-auto hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Date <SortIcon field="date" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paged.map((v) => {
              const tier = tierLabel(v.tier);
              return (
                <tr key={v.video_id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 pl-4 pr-2">
                    <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${tier.cls}`}>
                      {tier.text}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <Link
                      href={`/uap/video/${v.video_id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative w-16 h-10 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        {v.thumbnail_url ? (
                          <Image
                            src={v.thumbnail_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-[var(--domain-accent,#22c55e)] transition-colors line-clamp-2">
                        {v.title}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-slate-400 truncate max-w-[120px] hidden lg:table-cell">
                    {v.channel_name || '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatCount(v.view_count)}
                  </td>
                  <td className="py-2.5 px-2 pr-4 text-right text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(v.date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Card Layout ─────────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {/* Sort controls */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3 overflow-x-auto">
          <span className="shrink-0">Sort:</span>
          {(['views', 'date', 'title', 'tier'] as SortField[]).map((f) => (
            <button
              key={f}
              onClick={() => toggleSort(f)}
              className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-md border transition-colors shrink-0 ${
                sortField === f
                  ? 'border-[var(--domain-accent,#22c55e)]/40 bg-[var(--domain-accent,#22c55e)]/10 text-[var(--domain-accent,#22c55e)] font-medium'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {f === 'views' ? 'Views' : f === 'date' ? 'Date' : f === 'title' ? 'Title' : 'Type'}
              {sortField === f && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
          ))}
        </div>

        {paged.map((v) => {
          const tier = tierLabel(v.tier);
          return (
            <Link
              key={v.video_id}
              href={`/uap/video/${v.video_id}`}
              className="group flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60
                         border border-slate-200 dark:border-slate-800
                         hover:border-[var(--domain-accent,#22c55e)]/40 transition-all"
            >
              <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                {v.thumbnail_url ? (
                  <Image
                    src={v.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300
                              group-hover:text-[var(--domain-accent,#22c55e)] transition-colors line-clamp-2">
                  {v.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className={`px-1.5 py-0.5 rounded ${tier.cls} text-[10px] font-medium`}>
                    {tier.text}
                  </span>
                  {v.channel_name && <span className="truncate max-w-[100px]">{v.channel_name}</span>}
                  {v.view_count != null && v.view_count > 0 && (
                    <span>{formatCount(v.view_count)} views</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
