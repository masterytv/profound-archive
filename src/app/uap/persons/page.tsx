/**
 * UAP Persons Index
 *
 * /uap/persons — Browse all canonical persons extracted from UAP research.
 * Server component with ISR revalidation + URL-based sort/filter.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Users, ArrowRight, Shield, Film, ArrowDownWideNarrow, MessageSquare } from 'lucide-react';
import { UapDirectorySearch } from '@/components/uap/UapDirectorySearch';
import { UapPagination } from '@/components/uap/UapPagination';
import { Suspense } from 'react';

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'Persons of Interest | UAP Research | Project Profound',
  description:
    'Browse key figures in UAP/UFO research — whistleblowers, military officials, scientists, and experiencers extracted from analyzed video testimony.',
  openGraph: {
    title: 'UAP Persons of Interest | Project Profound',
    description: 'Key figures in UAP/UFO research extracted from analyzed video testimony.',
    type: 'website',
  },
};

export const revalidate = 86400; // ISR: revalidate once per day

// ─── Sort Options ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'videos', label: 'Videos', icon: 'Film' },
  { value: 'mentions', label: 'Mentions', icon: 'MessageSquare' },
  { value: 'credibility', label: 'Credibility', icon: 'Shield' },
  { value: 'name', label: 'Name', icon: null },
] as const;

type SortValue = typeof SORT_OPTIONS[number]['value'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || name).toLowerCase();
}

function buildUrl(overrides: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== null && v !== undefined) params.set(k, v);
  }
  const str = params.toString();
  return `/uap/persons${str ? `?${str}` : ''}`;
}

function getCredibilityColor(score: number | null) {
  if (score === null) return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  if (score >= 70) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
  if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
}

// ─── Data ───────────────────────────────────────────────────────────────────

async function getPersons() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Supabase caps at 1000 rows per request — paginate to get all
  const all: any[] = [];
  let offset = 0;
  const PAGE = 1000;

  while (true) {
    const { data } = await supabase
      .from('uap_canonical_persons')
      .select('*')
      .order('total_mentions', { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (!data || data.length === 0) break;
    all.push(...data);
    offset += PAGE;
    if (data.length < PAGE) break;
  }

  return all;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function PersonsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; order?: string; q?: string; page?: string }>;
}) {
  const { sort, order, q: searchQuery, page: pageParam } = await searchParams;

  // Validate sort
  const validSort: SortValue = (SORT_OPTIONS.map((o) => o.value) as string[]).includes(sort ?? '')
    ? (sort as SortValue)
    : 'mentions';

  // Default direction: desc for counts, asc for name
  const defaultAsc = validSort === 'name';
  const ascending = order === 'asc' ? true : order === 'desc' ? false : defaultAsc;

  const activeSearch = searchQuery?.trim() || null;

  let persons = await getPersons();

  // Text search on name + aliases
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    persons = persons.filter((p: { canonical_name: string; aliases?: string[] }) => {
      if (p.canonical_name.toLowerCase().includes(q)) return true;
      if (p.aliases?.some((a: string) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  // Sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  persons.sort((a: any, b: any) => {
    let cmp = 0;
    switch (validSort) {
      case 'videos':
        cmp = (a.linked_video_ids?.length || 0) - (b.linked_video_ids?.length || 0);
        break;
      case 'mentions':
        cmp = (a.total_mentions || 0) - (b.total_mentions || 0);
        break;
      case 'credibility':
        cmp = (a.avg_credibility_score || 0) - (b.avg_credibility_score || 0);
        break;
      case 'name':
        cmp = getLastName(a.canonical_name).localeCompare(getLastName(b.canonical_name));
        break;
    }
    return ascending ? cmp : -cmp;
  });

  // Pagination
  const totalCount = persons.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(totalPages || 1, parseInt(pageParam || '1', 10) || 1));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedPersons = persons.slice(startIdx, startIdx + PAGE_SIZE);

  // Params to preserve across pagination links
  const preservedParams: Record<string, string | null> = {
    sort: validSort !== 'mentions' ? validSort : null,
    order: ascending !== (validSort === 'name') ? (ascending ? 'asc' : 'desc') : null,
    ...(activeSearch ? { q: activeSearch } : {}),
  };

  const iconMap: Record<string, React.ReactNode> = {
    videos: <Film className="w-3.5 h-3.5" />,
    mentions: <MessageSquare className="w-3.5 h-3.5" />,
    credibility: <Shield className="w-3.5 h-3.5" />,
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="border-b border-border/60"
        style={{
          background: 'linear-gradient(135deg, var(--domain-accent-light, #DCFCE7)08, var(--background) 40%, var(--domain-accent-light, #DCFCE7)04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--domain-accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--domain-accent)] uppercase tracking-wider">
                UAP Research
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-serif tracking-tight">
                Persons of Interest
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
            {totalCount} key figures extracted from AI analysis of UAP video testimony —
            whistleblowers, military officials, scientists, researchers, and experiencers.
          </p>
        </div>
      </section>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Search */}
        <div className="mb-4 flex items-center gap-4">
          <Suspense>
            <UapDirectorySearch basePath="/uap/persons" />
          </Suspense>
          <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block">
            {totalCount} persons{totalPages > 1 ? ` · Page ${currentPage}/${totalPages}` : ''}
          </span>
        </div>

        {/* Sort Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">
            Sort by
          </span>
          {SORT_OPTIONS.map((opt) => {
            const isActive = validSort === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildUrl({
                  sort: opt.value,
                  order: opt.value === 'name' ? 'asc' : 'desc',
                  ...(activeSearch ? { q: activeSearch } : {}),
                })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
                }`}
              >
                {iconMap[opt.value]}
                {opt.label}
              </Link>
            );
          })}

          {/* Direction toggle */}
          <Link
            href={buildUrl({
              sort: validSort,
              order: ascending ? 'desc' : 'asc',
              ...(activeSearch ? { q: activeSearch } : {}),
            })}
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
          >
            <ArrowDownWideNarrow className={`w-3.5 h-3.5 transition-transform ${ascending ? 'rotate-180' : ''}`} />
            {validSort === 'name'
              ? (ascending ? 'A → Z' : 'Z → A')
              : (ascending ? 'Low → High' : 'High → Low')
            }
          </Link>
        </div>

        {/* Active search indicator */}
        {activeSearch && (
          <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-medium">
              Searching: &quot;{activeSearch}&quot;
              <Link
                href={buildUrl({ sort: validSort, order: ascending ? 'asc' : 'desc' })}
                className="hover:text-green-900 dark:hover:text-green-100"
              >
                ✕
              </Link>
            </span>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPersons.map((person: {
            id: string; slug: string; canonical_name: string; role?: string;
            affiliation?: string; linked_video_ids?: string[]; total_mentions: number;
            avg_credibility_score?: number | null; aliases?: string[];
          }, i: number) => (
            <div
              key={person.id}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5
                         hover:shadow-lg hover:border-[var(--domain-accent)]/30 transition-all duration-300"
            >
              {/* Stretched link overlay — covers entire card */}
              <Link
                href={`/uap/persons/${person.slug}`}
                className="absolute inset-0 z-0"
                aria-label={`View ${person.canonical_name}`}
              />

              {/* Rank badge for top 10 (only on page 1) */}
              {currentPage === 1 && i < 10 && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/30
                                flex items-center justify-center text-xs font-bold text-[var(--domain-accent)]">
                  #{i + 1}
                </div>
              )}

              <h3 className="text-base font-semibold text-foreground group-hover:text-[var(--domain-accent)] transition-colors pr-10">
                {person.canonical_name}
              </h3>

              {person.role && (
                <p className="text-xs text-muted-foreground mt-1">
                  {person.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  {person.affiliation && (() => {
                    try {
                      const parsed = JSON.parse(person.affiliation);
                      const str = Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
                      return ` · ${str}`;
                    } catch {
                      return ` · ${person.affiliation}`;
                    }
                  })()}
                </p>
              )}

              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Film className="w-3 h-3" />
                  {person.linked_video_ids?.length || 0} video{(person.linked_video_ids?.length || 0) !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {person.total_mentions} mention{person.total_mentions !== 1 ? 's' : ''}
                </div>
                {person.avg_credibility_score && (
                  <a
                    href="/uap/methodology/credibility"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="What is the credibility score?"
                    className="relative z-10 hover:opacity-80 transition-opacity"
                  >
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md cursor-help ${getCredibilityColor(person.avg_credibility_score)}`}>
                      Cred: {person.avg_credibility_score}
                    </span>
                  </a>
                )}
              </div>

              {person.aliases && person.aliases.length > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">
                  aka: {person.aliases.join(', ')}
                </p>
              )}

              <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground/30 group-hover:text-[var(--domain-accent)] transition-all group-hover:translate-x-0.5" />
            </div>
          ))}
        </div>

        <UapPagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/uap/persons"
          searchParams={preservedParams}
        />

        {totalCount === 0 && (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {activeSearch
                ? 'No persons match your search. Try a different term.'
                : 'No persons indexed yet. Run the entity resolution script to populate.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
