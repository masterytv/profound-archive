import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Clock, Play, Calendar, ChevronRight } from "lucide-react";

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
  title: "UAP Timeline | Project Profound",
  description:
    "A chronological timeline of UAP events, sightings, and disclosure milestones extracted from analyzed video testimonies.",
  openGraph: {
    title: "UAP Timeline | Project Profound",
    description: "Chronological timeline of UAP events extracted from analyzed testimony archives.",
    type: "website",
  },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineEvent {
  date: string;
  year: number;
  title: string;
  description: string | null;
  source_video_id: string;
  source_title: string;
  source_channel: string | null;
}

// ─── Data ───────────────────────────────────────────────────────────────────

async function getTimelineEvents(): Promise<TimelineEvent[]> {
  const supabase = buildClient();

  const { data: analyses, error } = await supabase
    .from('uap_analysis')
    .select(`
      video_id,
      timeline_events,
      uap_vids!inner(title, channel_name)
    `)
    .not('timeline_events', 'is', null);

  if (error || !analyses) return [];

  const events: TimelineEvent[] = [];

  for (const row of analyses as any[]) {
    const rawEvents = row.timeline_events;
    if (!Array.isArray(rawEvents)) continue;

    for (const event of rawEvents) {
      if (!event?.date && !event?.year) continue;

      const year = event.year || (event.date ? parseInt(event.date, 10) : null);
      if (!year || isNaN(year)) continue;

      events.push({
        date: event.date || `${year}`,
        year,
        title: event.title || event.event || 'Unnamed Event',
        description: event.description || event.details || null,
        source_video_id: row.video_id,
        source_title: row.uap_vids?.title || 'Unknown',
        source_channel: row.uap_vids?.channel_name || null,
      });
    }
  }

  // Sort chronologically
  events.sort((a, b) => a.year - b.year);

  // Deduplicate by title+year
  const seen = new Set<string>();
  return events.filter(e => {
    const key = `${e.year}:${e.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function TimelinePage() {
  const events = await getTimelineEvents();

  // Group by decade
  const decades = new Map<number, TimelineEvent[]>();
  for (const event of events) {
    const decade = Math.floor(event.year / 10) * 10;
    if (!decades.has(decade)) decades.set(decade, []);
    decades.get(decade)!.push(event);
  }

  const sortedDecades = Array.from(decades.entries()).sort(([a], [b]) => b - a);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/40">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400 tracking-wide uppercase">
              UAP Archive
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            UAP Timeline
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            A chronological compilation of significant UAP events, sightings,
            and disclosure milestones — extracted from analyzed video testimonies.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
            <Calendar className="w-4 h-4 inline mr-1" />
            {events.length} events across {sortedDecades.length} decades
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        {events.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              Timeline Coming Soon
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Timeline events will populate after knowledge extraction runs on
              the analyzed video archive.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {sortedDecades.map(([decade, decadeEvents]) => (
              <div key={decade}>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4 sticky top-0 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-950 dark:to-transparent py-2 z-10">
                  {decade}s
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({decadeEvents.length} event{decadeEvents.length !== 1 ? 's' : ''})
                  </span>
                </h2>

                <div className="relative pl-8 border-l-2 border-green-200 dark:border-green-800 space-y-4">
                  {decadeEvents.map((event, i) => (
                    <div key={`${event.year}-${i}`} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-[calc(2rem+5px)] w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-green-400 border-2 border-white dark:border-slate-900 top-2" />

                      <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                              {event.date}
                            </span>
                            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                              {event.title}
                            </h3>
                            {event.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-3">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/uap/video/${event.source_video_id}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 dark:hover:text-green-400 mt-2 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          {event.source_title}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
