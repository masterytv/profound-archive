/**
 * UAP Events Index — Sort & Filter
 */
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { Calendar, MapPin, Play, Users, ChevronRight, Globe, ArrowDownWideNarrow } from "lucide-react";
import { UapDirectorySearch } from "@/components/uap/UapDirectorySearch";
import { UapPagination } from "@/components/uap/UapPagination";
import { Suspense } from "react";

const PAGE_SIZE = 48;

export const revalidate = 86400;

function buildClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export const metadata: Metadata = {
  title: "UAP Events | Project Profound",
  description: "A curated index of significant UAP events, sightings, and disclosure milestones — cross-referenced with video testimonies and experiencer profiles.",
  openGraph: { title: "UAP Events | Project Profound", description: "Curated UAP events cross-referenced with video testimonies and experiencer profiles.", type: "website" },
};

interface UapEvent {
  id: string; slug: string; name: string; event_date: string | null; year: number | null;
  location: string | null; country: string | null; description: string | null; event_type: string;
  source_count: number; witness_count: number | null; contactee_ids: string[] | null;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  mass_sighting: { label: "Mass Sighting", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  abduction: { label: "Abduction", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  crash_retrieval: { label: "Crash Retrieval", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  disclosure: { label: "Disclosure", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  military_encounter: { label: "Military Encounter", color: "bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300" },
  whistleblower: { label: "Whistleblower", color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  congressional: { label: "Congressional", color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
  contact: { label: "Contact", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  radar_visual: { label: "Radar-Visual", color: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300" },
  unknown: { label: "Unclassified", color: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" },
};

const SORT_OPTIONS = [
  { value: "sources", label: "Sources" },
  { value: "witnesses", label: "Witnesses" },
  { value: "year", label: "Year" },
  { value: "name", label: "Name" },
] as const;
type SortValue = typeof SORT_OPTIONS[number]["value"];

function buildUrl(o: Record<string, string | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) { if (v != null) p.set(k, v); }
  const s = p.toString();
  return `/uap/events${s ? `?${s}` : ""}`;
}

async function getEvents(): Promise<UapEvent[]> {
  const sb = buildClient();
  const all: any[] = [];
  let offset = 0;
  const FETCH_PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from("uap_events")
      .select("id, slug, name, event_date, year, location, country, description, event_type, source_count, witness_count, contactee_ids")
      .order("year", { ascending: false, nullsFirst: false })
      .range(offset, offset + FETCH_PAGE - 1);
    if (error) { console.error("[UAP Events] Fetch error:", error); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += FETCH_PAGE;
    if (data.length < FETCH_PAGE) break;
  }
  return all as UapEvent[];
}

function EventCard({ event }: { event: UapEvent }) {
  const typeConfig = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.unknown;
  return (
    <Link href={`/uap/events/${event.slug}`}
      className="group flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">{event.event_date || event.year || "Date Unknown"}</span>
        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full ${typeConfig.color}`}>{typeConfig.label}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors mb-1.5 flex items-center gap-1.5">
        {event.name}
        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </h3>
      {event.location && <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2"><MapPin className="w-3 h-3" />{event.location}</p>}
      {event.description && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-3">{event.description}</p>}
      <div className="mt-auto flex flex-wrap gap-3 text-xs text-slate-400 dark:text-slate-500">
        {event.source_count > 0 && <span className="flex items-center gap-1"><Play className="w-3 h-3 text-green-500" />{event.source_count} video{event.source_count !== 1 ? "s" : ""}</span>}
        {(event.contactee_ids?.length ?? 0) > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3 text-emerald-500" />{event.contactee_ids!.length} contactee{event.contactee_ids!.length !== 1 ? "s" : ""}</span>}
        {event.witness_count != null && event.witness_count > 0 && <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-blue-500" />{event.witness_count >= 1000 ? `${(event.witness_count / 1000).toFixed(0)}k+` : event.witness_count} witnesses</span>}
      </div>
    </Link>
  );
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ sort?: string; order?: string; q?: string; page?: string }> }) {
  const { sort, order, q: searchQuery, page: pageParam } = await searchParams;
  const validSort: SortValue = (SORT_OPTIONS.map(o => o.value) as string[]).includes(sort ?? "") ? (sort as SortValue) : "year";
  const defaultAsc = validSort === "name";
  const ascending = order === "asc" ? true : order === "desc" ? false : defaultAsc;
  const activeSearch = searchQuery?.trim() || null;

  let events = await getEvents();

  // Search on name + location
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    events = events.filter(e => e.name.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q) || e.country?.toLowerCase().includes(q));
  }

  events.sort((a, b) => {
    let cmp = 0;
    switch (validSort) {
      case "sources": cmp = (a.source_count || 0) - (b.source_count || 0); break;
      case "witnesses": cmp = (a.witness_count || 0) - (b.witness_count || 0); break;
      case "year": cmp = (a.year || 0) - (b.year || 0); break;
      case "name": cmp = a.name.localeCompare(b.name); break;
    }
    return ascending ? cmp : -cmp;
  });

  const eventTypes = new Set(events.map(e => e.event_type));
  const yearRange = events.length > 0
    ? { min: Math.min(...events.filter(e => e.year).map(e => e.year!)), max: Math.max(...events.filter(e => e.year).map(e => e.year!)) }
    : null;

  const iconMap: Record<string, React.ReactNode> = {
    sources: <Play className="w-3.5 h-3.5" />,
    witnesses: <Globe className="w-3.5 h-3.5" />,
    year: <Calendar className="w-3.5 h-3.5" />,
  };

  // Pagination
  const totalCount = events.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.max(1, Math.min(totalPages || 1, parseInt(pageParam || '1', 10) || 1));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedEvents = events.slice(startIdx, startIdx + PAGE_SIZE);

  const preservedParams: Record<string, string | null> = {
    sort: validSort !== 'year' ? validSort : null,
    order: ascending !== (validSort === 'name') ? (ascending ? 'asc' : 'desc') : null,
    ...(activeSearch ? { q: activeSearch } : {}),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/40"><Calendar className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400 tracking-wide uppercase">UAP Event Archive</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Significant UAP Events</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            A curated index of major UAP events, sightings, and disclosure milestones, cross-referenced with video testimonies and experiencer profiles from the archive.
          </p>
          <div className="flex flex-wrap gap-6 mt-6 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-green-500" /><strong className="text-slate-700 dark:text-slate-300">{totalCount}</strong> events</span>
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-green-500" /><strong className="text-slate-700 dark:text-slate-300">{eventTypes.size}</strong> categories</span>
            {yearRange && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-green-500" />{yearRange.min} &ndash; {yearRange.max}</span>}
          </div>
        </div>
      </section>

      {/* Controls + Grid */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="mb-4 flex items-center gap-4">
          <Suspense><UapDirectorySearch basePath="/uap/events" /></Suspense>
          <span className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block">
            {totalCount} events{totalPages > 1 ? ` · Page ${currentPage}/${totalPages}` : ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Sort by</span>
          {SORT_OPTIONS.map((opt) => (
            <Link key={opt.value} href={buildUrl({ sort: opt.value, order: opt.value === "name" ? "asc" : "desc", ...(activeSearch ? { q: activeSearch } : {}) })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${validSort === opt.value ? "bg-green-600 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15"}`}>
              {iconMap[opt.value]}{opt.label}
            </Link>
          ))}
          <Link href={buildUrl({ sort: validSort, order: ascending ? "desc" : "asc", ...(activeSearch ? { q: activeSearch } : {}) })}
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors cursor-pointer">
            <ArrowDownWideNarrow className={`w-3.5 h-3.5 transition-transform ${ascending ? "rotate-180" : ""}`} />
            {validSort === "name" ? (ascending ? "A → Z" : "Z → A") : (ascending ? "Low → High" : "High → Low")}
          </Link>
        </div>

        {activeSearch && (
          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-medium">
              Searching: &quot;{activeSearch}&quot;
              <Link href={buildUrl({ sort: validSort, order: ascending ? "asc" : "desc" })} className="hover:text-green-900 dark:hover:text-green-100">✕</Link>
            </span>
          </div>
        )}

        {paginatedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedEvents.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        ) : totalCount > 0 ? null : (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{activeSearch ? "No matching events" : "Events Coming Soon"}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {activeSearch ? "Try a different search term." : "UAP events are being extracted and curated from the analyzed video archive. Check back soon."}
            </p>
          </div>
        )}

        <UapPagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath="/uap/events"
          searchParams={preservedParams}
        />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "CollectionPage",
        name: "Significant UAP Events", description: "Curated index of major UAP events cross-referenced with video testimonies",
        url: "https://projectprofound.org/uap/events", numberOfItems: events.length,
      }) }} />
    </main>
  );
}
