/**
 * UAP Organizations Index — Sort, Filter & Paginate
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Building2, ArrowRight, Film, ArrowDownWideNarrow, MessageSquare } from 'lucide-react';
import { UapDirectorySearch } from '@/components/uap/UapDirectorySearch';
import { UapPagination } from '@/components/uap/UapPagination';
import { Suspense } from 'react';

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: 'Organizations | UAP Research | Project Profound',
  description: 'Browse government agencies, research institutions, and organizations connected to UAP/UFO phenomena.',
};
export const revalidate = 86400; // ISR: revalidate once per day

const SORT_OPTIONS = [
  { value: 'videos', label: 'Videos' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'name', label: 'Name' },
] as const;
type SortValue = typeof SORT_OPTIONS[number]['value'];

function buildUrl(o: Record<string, string | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) { if (v != null) p.set(k, v); }
  const s = p.toString();
  return `/uap/organizations${s ? `?${s}` : ''}`;
}

async function getOrgs() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const all: any[] = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await sb.from('uap_canonical_orgs').select('*').order('total_mentions', { ascending: false }).range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += PAGE;
    if (data.length < PAGE) break;
  }
  return all;
}

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ sort?: string; order?: string; q?: string; page?: string }> }) {
  const { sort, order, q: searchQuery, page: pageParam } = await searchParams;
  const validSort: SortValue = (SORT_OPTIONS.map(o => o.value) as string[]).includes(sort ?? '') ? (sort as SortValue) : 'mentions';
  const defaultAsc = validSort === 'name';
  const ascending = order === 'asc' ? true : order === 'desc' ? false : defaultAsc;
  const activeSearch = searchQuery?.trim() || null;

  let orgs = await getOrgs();

  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    orgs = orgs.filter((o: { canonical_name: string; aliases?: string[] }) =>
      o.canonical_name.toLowerCase().includes(q) || o.aliases?.some((a: string) => a.toLowerCase().includes(q))
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orgs.sort((a: any, b: any) => {
    let cmp = 0;
    switch (validSort) {
      case 'videos': cmp = (a.linked_video_ids?.length || 0) - (b.linked_video_ids?.length || 0); break;
      case 'mentions': cmp = (a.total_mentions || 0) - (b.total_mentions || 0); break;
      case 'name': cmp = (a.canonical_name || '').localeCompare(b.canonical_name || ''); break;
    }
    return ascending ? cmp : -cmp;
  });

  // Pagination
  const totalCount = orgs.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(totalPages || 1, parseInt(pageParam || '1', 10) || 1));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedOrgs = orgs.slice(startIdx, startIdx + PAGE_SIZE);

  const preservedParams: Record<string, string | null> = {
    sort: validSort !== 'mentions' ? validSort : null,
    order: ascending !== (validSort === 'name') ? (ascending ? 'asc' : 'desc') : null,
    ...(activeSearch ? { q: activeSearch } : {}),
  };

  const iconMap: Record<string, React.ReactNode> = {
    videos: <Film className="w-3.5 h-3.5" />,
    mentions: <MessageSquare className="w-3.5 h-3.5" />,
  };

  return (
    <div className="min-h-screen">
      <section className="border-b border-border/60" style={{ background: 'linear-gradient(135deg, var(--domain-accent-light, #DCFCE7)08, var(--background) 40%, var(--domain-accent-light, #DCFCE7)04)' }}>
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--domain-accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--domain-accent)] uppercase tracking-wider">UAP Research</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-serif tracking-tight">Organizations</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
            {totalCount} agencies, institutions, and organizations referenced across UAP video testimony.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-4 flex items-center gap-4">
          <Suspense><UapDirectorySearch basePath="/uap/organizations" /></Suspense>
          <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block">
            {totalCount} organizations{totalPages > 1 ? ` · Page ${currentPage}/${totalPages}` : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Sort by</span>
          {SORT_OPTIONS.map((opt) => (
            <Link key={opt.value} href={buildUrl({ sort: opt.value, order: opt.value === 'name' ? 'asc' : 'desc', ...(activeSearch ? { q: activeSearch } : {}) })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${validSort === opt.value ? 'bg-green-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'}`}>
              {iconMap[opt.value]}{opt.label}
            </Link>
          ))}
          <Link href={buildUrl({ sort: validSort, order: ascending ? 'desc' : 'asc', ...(activeSearch ? { q: activeSearch } : {}) })}
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer">
            <ArrowDownWideNarrow className={`w-3.5 h-3.5 transition-transform ${ascending ? 'rotate-180' : ''}`} />
            {validSort === 'name' ? (ascending ? 'A → Z' : 'Z → A') : (ascending ? 'Low → High' : 'High → Low')}
          </Link>
        </div>

        {activeSearch && (
          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-medium">
              Searching: &quot;{activeSearch}&quot;
              <Link href={buildUrl({ sort: validSort, order: ascending ? 'asc' : 'desc' })} className="hover:text-green-900 dark:hover:text-green-100">✕</Link>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedOrgs.map((org: { id: string; slug: string; canonical_name: string; linked_video_ids?: string[]; total_mentions?: number; aliases?: string[] }, i: number) => (
            <Link key={org.id} href={`/uap/organizations/${org.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover:shadow-lg hover:border-[var(--domain-accent)]/30 transition-all duration-300">
              {currentPage === 1 && i < 5 && <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-[var(--domain-accent)]">#{i + 1}</div>}
              <h3 className="text-base font-semibold text-foreground group-hover:text-[var(--domain-accent)] transition-colors pr-10">{org.canonical_name}</h3>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Film className="w-3 h-3" />{org.linked_video_ids?.length || 0} video{(org.linked_video_ids?.length || 0) !== 1 ? 's' : ''}</div>
                {org.total_mentions != null && <div className="flex items-center gap-1 text-xs text-muted-foreground">{org.total_mentions} mention{org.total_mentions !== 1 ? 's' : ''}</div>}
              </div>
              {org.aliases && org.aliases.length > 0 && <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">aka: {org.aliases.join(', ')}</p>}
              <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground/30 group-hover:text-[var(--domain-accent)] transition-all group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        <UapPagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/uap/organizations"
          searchParams={preservedParams}
        />

        {totalCount === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{activeSearch ? 'No organizations match your search.' : 'No organizations indexed yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
