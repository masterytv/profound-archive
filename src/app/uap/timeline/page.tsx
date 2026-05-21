import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Clock,
  Calendar,
  MapPin,
  Users,
  Play,
  ChevronRight,
  Search,
  Zap,
  Shield,
  Eye,
  FileText,
  Building2,
} from "lucide-react";
import { UfoIcon } from "@/components/icons/UfoIcon";

export const revalidate = 86400;

// ─── Client ─────────────────────────────────────────────────────────────────

function buildClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "UFO/UAP Timeline | Project Profound",
  description:
    "A chronological timeline of major UFO and UAP events — from Roswell (1947) to Congressional hearings (2023). Sightings, abductions, military encounters, and disclosure milestones.",
  openGraph: {
    title: "UFO/UAP Timeline | Project Profound",
    description: "Chronological timeline of major UFO/UAP events, sightings, and disclosure milestones.",
    type: "website",
  },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface UapEvent {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
  year: number | null;
  location: string | null;
  country: string | null;
  description: string | null;
  event_type: string;
  video_ids: string[];
  contactee_ids: string[];
  witness_count: number | null;
  source_count: number | null;
}

interface ContacteeRef {
  id: string;
  slug: string;
  display_name: string;
}

// ─── Event Type Config ──────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof Zap }> = {
  mass_sighting:      { label: "Mass Sighting",      color: "text-blue-400",    bgColor: "bg-blue-500/10",    borderColor: "border-blue-500/20",    icon: Eye },
  abduction:          { label: "Abduction",           color: "text-violet-400",  bgColor: "bg-violet-500/10",  borderColor: "border-violet-500/20",  icon: Zap },
  crash_retrieval:    { label: "Crash Retrieval",     color: "text-red-400",     bgColor: "bg-red-500/10",     borderColor: "border-red-500/20",     icon: UfoIcon },
  military_encounter: { label: "Military Encounter",  color: "text-amber-400",   bgColor: "bg-amber-500/10",   borderColor: "border-amber-500/20",   icon: Shield },
  contact:            { label: "Contact",             color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", icon: Users },
  disclosure:         { label: "Disclosure",          color: "text-cyan-400",    bgColor: "bg-cyan-500/10",    borderColor: "border-cyan-500/20",    icon: FileText },
  congressional:      { label: "Congressional",       color: "text-slate-300",   bgColor: "bg-slate-500/10",   borderColor: "border-slate-500/20",   icon: Building2 },
  whistleblower:      { label: "Whistleblower",       color: "text-orange-400",  bgColor: "bg-orange-500/10",  borderColor: "border-orange-500/20",  icon: FileText },
  radar_visual:       { label: "Radar-Visual",        color: "text-teal-400",    bgColor: "bg-teal-500/10",    borderColor: "border-teal-500/20",    icon: Eye },
  unknown:            { label: "Unknown",             color: "text-slate-400",   bgColor: "bg-slate-500/10",   borderColor: "border-slate-500/20",   icon: Search },
};

function getEventTypeConfig(type: string) {
  return EVENT_TYPE_CONFIG[type] ?? EVENT_TYPE_CONFIG.unknown;
}

// ─── Data ───────────────────────────────────────────────────────────────────

async function getTimelineData() {
  const supabase = buildClient();

  // Fetch all events from normalized table
  const { data: events, error } = await supabase
    .from("uap_events")
    .select("*")
    .order("year", { ascending: true, nullsFirst: false });

  if (error || !events) return { events: [], contactees: [] };

  // Collect all contactee IDs for cross-linking
  const allContacteeIds = new Set<string>();
  for (const e of events) {
    if (Array.isArray(e.contactee_ids)) {
      for (const id of e.contactee_ids) allContacteeIds.add(id);
    }
  }

  // Fetch contactee names for cross-links
  let contactees: ContacteeRef[] = [];
  if (allContacteeIds.size > 0) {
    const { data: cData } = await supabase
      .from("uap_contactee_profiles")
      .select("id, slug, display_name")
      .in("id", Array.from(allContacteeIds));
    contactees = (cData ?? []) as ContacteeRef[];
  }

  // Also fetch legacy timeline_events from uap_analysis for supplementary data
  const { data: analyses } = await supabase
    .from("uap_analysis")
    .select("video_id, timeline_events, uap_vids!inner(title)")
    .not("timeline_events", "is", null);

  const legacyEvents: UapEvent[] = [];
  if (analyses) {
    const seen = new Set(events.map((e: UapEvent) => `${e.year}:${e.name.toLowerCase()}`));

    for (const row of analyses as any[]) {
      const rawEvents = row.timeline_events;
      if (!Array.isArray(rawEvents)) continue;

      for (const event of rawEvents) {
        if (!event?.date && !event?.year) continue;
        const year = event.year || (event.date ? parseInt(event.date, 10) : null);
        if (!year || isNaN(year)) continue;
        const title = event.title || event.event || "Unnamed Event";
        const key = `${year}:${title.toLowerCase().trim()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        legacyEvents.push({
          id: `legacy-${row.video_id}-${year}`,
          slug: "",
          name: title,
          event_date: event.date || `${year}`,
          year,
          location: event.location || null,
          country: null,
          description: event.description || event.details || null,
          event_type: "unknown",
          video_ids: [row.video_id],
          contactee_ids: [],
          witness_count: null,
          source_count: 1,
        });
      }
    }
  }

  const allEvents = [...(events as UapEvent[]), ...legacyEvents].sort(
    (a, b) => (a.year ?? 9999) - (b.year ?? 9999),
  );

  return { events: allEvents, contactees };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatWitnessCount(count: number | null): string {
  if (!count) return "";
  if (count >= 10000) return `${(count / 1000).toFixed(0)}K+ witnesses`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K witnesses`;
  return `${count} witness${count !== 1 ? "es" : ""}`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function TimelinePage() {
  const { events, contactees } = await getTimelineData();
  const contacteeMap = new Map(contactees.map((c) => [c.id, c]));

  // Group by decade
  const decades = new Map<number, UapEvent[]>();
  for (const event of events) {
    const decade = Math.floor((event.year ?? 2020) / 10) * 10;
    if (!decades.has(decade)) decades.set(decade, []);
    decades.get(decade)!.push(event);
  }
  const sortedDecades = Array.from(decades.entries()).sort(([a], [b]) => b - a);

  // Stats
  const totalEvents = events.length;
  const canonicalEvents = events.filter((e) => e.slug !== "").length;
  const totalLinkedVideos = events.reduce((sum, e) => sum + (e.video_ids?.length ?? 0), 0);
  const uniqueCountries = new Set(events.map((e) => e.country).filter(Boolean)).size;

  // Unique event types present
  const eventTypesPresent = Array.from(new Set(events.map((e) => e.event_type))).sort();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_60%)]" />
        <div className="max-w-5xl mx-auto px-4 pt-24 pb-12 relative">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
            <Clock className="w-3.5 h-3.5" />
            UFO/UAP Archive
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
            UFO/UAP Timeline
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
            A chronological record of significant UFO and UAP events — from the Roswell crash to modern
            Congressional hearings — extracted from our analyzed video archive and normalized
            into canonical event records.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-emerald-400 font-bold">{totalEvents}</span>
              <span className="text-slate-400 ml-1.5">events</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-emerald-400 font-bold">{canonicalEvents}</span>
              <span className="text-slate-400 ml-1.5">canonical</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-emerald-400 font-bold">{totalLinkedVideos}</span>
              <span className="text-slate-400 ml-1.5">linked videos</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-emerald-400 font-bold">{uniqueCountries}</span>
              <span className="text-slate-400 ml-1.5">countries</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-emerald-400 font-bold">{sortedDecades.length}</span>
              <span className="text-slate-400 ml-1.5">decades</span>
            </div>
          </div>
        </div>
      </section>

      {/* Decade Filter Pills + Event Type Legend */}
      <section className="max-w-5xl mx-auto px-4 pb-4">
        {/* Decade pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {sortedDecades.map(([decade]) => (
            <a
              key={decade}
              href={`#decade-${decade}`}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-300 transition-all"
            >
              {decade}s
            </a>
          ))}
        </div>

        {/* Event type legend */}
        <div className="flex flex-wrap gap-2">
          {eventTypesPresent.map((type) => {
            const cfg = getEventTypeConfig(type);
            const Icon = cfg.icon;
            return (
              <span
                key={type}
                className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}`}
              >
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        {events.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center">
              <Clock className="w-8 h-8 text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-300">Timeline Coming Soon</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Timeline events will populate after the event seed and mass re-analysis complete.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {sortedDecades.map(([decade, decadeEvents]) => (
              <div key={decade} id={`decade-${decade}`} className="scroll-mt-20">
                {/* Decade header */}
                <div className="flex items-center gap-3 mb-6 sticky top-0 z-10 py-3 bg-gradient-to-r from-slate-950 via-slate-950/95 to-transparent backdrop-blur-sm">
                  <span className="text-2xl font-bold text-white">{decade}s</span>
                  <span className="text-sm text-slate-500">
                    {decadeEvents.length} event{decadeEvents.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                </div>

                {/* Events in this decade */}
                <div className="relative pl-6 md:pl-10 border-l-2 border-emerald-800/50 space-y-4">
                  {decadeEvents.map((event) => {
                    const cfg = getEventTypeConfig(event.event_type);
                    const Icon = cfg.icon;
                    const isCanonical = event.slug !== "";
                    const isMassEvent = (event.witness_count ?? 0) >= 50 || (event.source_count ?? 0) >= 3;

                    // Resolve contactee names
                    const linkedContactees = (event.contactee_ids ?? [])
                      .map((id) => contacteeMap.get(id))
                      .filter(Boolean) as ContacteeRef[];

                    return (
                      <div key={event.id} className="relative group">
                        {/* Timeline dot — larger for mass events */}
                        <div
                          className={`absolute top-3 w-3 h-3 rounded-full border-2 border-slate-950 ${
                            isMassEvent
                              ? "bg-emerald-400 w-4 h-4 -left-[calc(1.5rem+8px)] md:-left-[calc(2.5rem+8px)] shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              : "bg-emerald-600 -left-[calc(1.5rem+6px)] md:-left-[calc(2.5rem+6px)]"
                          }`}
                        />

                        {/* Card */}
                        <div
                          className={`rounded-xl border transition-all ${
                            isMassEvent
                              ? "bg-white/[0.07] border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                              : "bg-white/[0.04] border-white/10 hover:border-white/20"
                          } p-4 md:p-5`}
                        >
                          {/* Top row: date + type badge */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-semibold text-emerald-400">
                                {event.event_date || event.year}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}`}
                              >
                                <Icon className="w-2.5 h-2.5" />
                                {cfg.label}
                              </span>
                              {isMassEvent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                  ★ Major Event
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          {isCanonical ? (
                            <Link
                              href={`/uap/events/${event.slug}`}
                              className="text-base md:text-lg font-semibold text-white hover:text-emerald-300 transition-colors block"
                            >
                              {event.name}
                            </Link>
                          ) : (
                            <h3 className="text-base font-semibold text-white">
                              {event.name}
                            </h3>
                          )}

                          {/* Location */}
                          {event.location && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                              {event.country && <span>· {event.country}</span>}
                            </div>
                          )}

                          {/* Description */}
                          {event.description && (
                            <p className="text-sm text-slate-400 mt-2 leading-relaxed line-clamp-3">
                              {event.description}
                            </p>
                          )}

                          {/* Footer: witnesses, sources, contactees */}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            {event.witness_count && event.witness_count > 0 && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {formatWitnessCount(event.witness_count)}
                              </span>
                            )}
                            {(event.source_count ?? 0) > 0 && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                {event.source_count} video{(event.source_count ?? 0) !== 1 ? "s" : ""}
                              </span>
                            )}

                            {/* Linked contactees */}
                            {linkedContactees.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                {linkedContactees.map((c) => (
                                  <Link
                                    key={c.id}
                                    href={`/uap/experiencer/${c.slug}`}
                                    className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                                  >
                                    {c.display_name}
                                  </Link>
                                ))}
                              </div>
                            )}

                            {/* View details link for canonical events */}
                            {isCanonical && (
                              <Link
                                href={`/uap/events/${event.slug}`}
                                className="ml-auto text-[11px] text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                              >
                                Details <ChevronRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "UFO/UAP Timeline",
            description: "Chronological timeline of major UFO/UAP events, sightings, and disclosure milestones.",
            url: "https://projectprofound.org/uap/timeline",
            isPartOf: { "@type": "WebSite", name: "Project Profound", url: "https://projectprofound.org" },
            numberOfItems: totalEvents,
          }),
        }}
      />
    </main>
  );
}
