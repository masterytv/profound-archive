/**
 * UAP Programs Index — Sort & Filter
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Fingerprint, ArrowRight, Film, ArrowDownWideNarrow, MessageSquare } from 'lucide-react';
import { UapDirectorySearch } from '@/components/uap/UapDirectorySearch';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Programs & Projects | UAP Research | Project Profound',
  description: 'Browse government programs, research projects, and investigations related to UAP/UFO phenomena — extracted from analyzed video testimony.',
};
export const revalidate = 3600;

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
  return `/uap/programs${s ? `?${s}` : ''}`;
}

async function getPrograms() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.from('uap_canonical_programs').select('*').order('total_mentions', { ascending: false });
  return data || [];
}

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ sort?: string; order?: string; q?: string }> }) {
  const { sort, order, q: searchQuery } = await searchParams;
  const validSort: SortValue = (SORT_OPTIONS.map(o => o.value) as string[]).includes(sort ?? '') ? (sort as SortValue) : 'mentions';
  const defaultAsc = validSort === 'name';
  const ascending = order === 'asc' ? true : order === 'desc' ? false : defaultAsc;
  const activeSearch = searchQuery?.trim() || null;

  let programs = await getPrograms();

  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    programs = programs.filter((p: { canonical_name: string; aliases?: string[] }) =>
      p.canonical_name.toLowerCase().includes(q) || p.aliases?.some((a: string) => a.toLowerCase().includes(q))
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  programs.sort((a: any, b: any) => {
    let cmp = 0;
    switch (validSort) {
      case 'videos': cmp = (a.linked_video_ids?.length || 0) - (b.linked_video_ids?.length || 0); break;
      case 'mentions': cmp = (a.total_mentions || 0) - (b.total_mentions || 0); break;
      case 'name': cmp = (a.canonical_name || '').localeCompare(b.canonical_name || ''); break;
    }
    return ascending ? cmp : -cmp;
  });

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
              <Fingerprint className="w-5 h-5 text-[var(--domain-accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--domain-accent)] uppercase tracking-wider">UAP Research</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-serif tracking-tight">Programs &amp; Projects</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
            {programs.length} government programs, research projects, and investigations mentioned across UAP video testimony.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-4 flex items-center gap-4">
          <Suspense><UapDirectorySearch basePath="/uap/programs" /></Suspense>
          <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block">{programs.length} programs</span>
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
          {programs.map((prog: { id: string; slug: string; canonical_name: string; program_type?: string; linked_video_ids?: string[]; total_mentions?: number; aliases?: string[] }, i: number) => (
            <Link key={prog.id} href={`/uap/programs/${prog.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover:shadow-lg hover:border-[var(--domain-accent)]/30 transition-all duration-300">
              {i < 5 && <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-[var(--domain-accent)]">#{i + 1}</div>}
              <h3 className="text-base font-semibold text-foreground group-hover:text-[var(--domain-accent)] transition-colors pr-10">{prog.canonical_name}</h3>
              {prog.program_type && <p className="text-xs text-muted-foreground mt-1 capitalize">{prog.program_type.replace(/_/g, ' ')}</p>}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Film className="w-3 h-3" />{prog.linked_video_ids?.length || 0} video{(prog.linked_video_ids?.length || 0) !== 1 ? 's' : ''}</div>
                {prog.total_mentions != null && <div className="flex items-center gap-1 text-xs text-muted-foreground">{prog.total_mentions} mention{prog.total_mentions !== 1 ? 's' : ''}</div>}
              </div>
              {prog.aliases && prog.aliases.length > 0 && <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">aka: {prog.aliases.join(', ')}</p>}
              <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-muted-foreground/30 group-hover:text-[var(--domain-accent)] transition-all group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        {programs.length === 0 && (
          <div className="text-center py-20">
            <Fingerprint className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{activeSearch ? 'No programs match your search.' : 'No programs indexed yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
