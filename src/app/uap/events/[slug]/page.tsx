import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Play,
  Users,
  Globe,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Shield,
} from "lucide-react";

export const revalidate = 86400;

// ─── Client ─────────────────────────────────────────────────────────────────

function buildClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface UapEvent {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  event_date: string | null;
  year: number | null;
  location: string | null;
  country: string | null;
  description: string | null;
  event_type: string;
  video_ids: string[];
  contactee_ids: string[];
  witness_count: number | null;
  source_count: number;
}

interface LinkedVideo {
  video_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  view_count: number | null;
}

interface LinkedContactee {
  id: string;
  slug: string;
  display_name: string;
  photo_url: string | null;
  experience_type: string | null;
}

// ─── Event Type Config ──────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  mass_sighting: { label: "Mass Sighting", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  abduction: { label: "Abduction", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  crash_retrieval: { label: "Crash Retrieval", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  disclosure: { label: "Disclosure", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  military_encounter: { label: "Military Encounter", color: "bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300" },
  congressional: { label: "Congressional", color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
  contact: { label: "Contact", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  unknown: { label: "Unclassified", color: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400" },
};

// ─── Data ───────────────────────────────────────────────────────────────────

async function getEvent(slug: string): Promise<UapEvent | null> {
  const supabase = buildClient();
  const { data, error } = await supabase
    .from("uap_events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as UapEvent;
}

async function getLinkedVideos(videoIds: string[]): Promise<LinkedVideo[]> {
  if (!videoIds || videoIds.length === 0) return [];
  const supabase = buildClient();
  const { data } = await supabase
    .from("uap_vids")
    .select("video_id, title, channel_name, thumbnail_url, view_count")
    .in("video_id", videoIds)
    .order("view_count", { ascending: false });
  return (data || []) as LinkedVideo[];
}

async function getLinkedContactees(ids: string[]): Promise<LinkedContactee[]> {
  if (!ids || ids.length === 0) return [];
  const supabase = buildClient();
  const { data } = await supabase
    .from("uap_contactee_profiles")
    .select("id, slug, display_name, photo_url, experience_type")
    .in("id", ids);
  return (data || []) as LinkedContactee[];
}

async function getRelatedEvents(currentSlug: string, year: number | null, eventType: string): Promise<UapEvent[]> {
  const supabase = buildClient();
  let query = supabase
    .from("uap_events")
    .select("id, slug, name, year, event_type, source_count, location")
    .neq("slug", currentSlug)
    .order("source_count", { ascending: false })
    .limit(6);

  // Prefer same era or same type
  if (year) {
    query = query.gte("year", year - 15).lte("year", year + 15);
  }

  const { data } = await query;
  return (data || []) as UapEvent[];
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event Not Found | Project Profound" };

  const title = `${event.name} | UAP Events | Project Profound`;
  const desc = event.description?.slice(0, 155) || `${event.name} - a significant UAP event in the Project Profound archive.`;

  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: "article" },
  };
}

// ─── Static Params ──────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const supabase = buildClient();
  const { data } = await supabase.from("uap_events").select("slug");
  return (data || []).map((e: { slug: string }) => ({ slug: e.slug }));
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const [linkedVideos, linkedContactees, relatedEvents] = await Promise.all([
    getLinkedVideos(event.video_ids),
    getLinkedContactees(event.contactee_ids),
    getRelatedEvents(event.slug, event.year, event.event_type),
  ]);

  const typeConfig = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.unknown;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 relative">
          {/* Breadcrumb */}
          <Link
            href="/uap/events"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 dark:hover:text-green-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Events
          </Link>

          {/* Type + Date */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            {event.event_date && (
              <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                {event.event_date}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            {event.name}
          </h1>

          {/* Description */}
          {event.description && (
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-6 text-sm text-slate-500 dark:text-slate-400">
            {event.source_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Play className="w-4 h-4 text-green-500" />
                <strong className="text-slate-700 dark:text-slate-300">{event.source_count}</strong> video references
              </span>
            )}
            {linkedContactees.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-green-500" />
                <strong className="text-slate-700 dark:text-slate-300">{linkedContactees.length}</strong> linked contactees
              </span>
            )}
            {event.witness_count != null && event.witness_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-500" />
                <strong className="text-slate-700 dark:text-slate-300">
                  {event.witness_count >= 1000
                    ? `${(event.witness_count / 1000).toFixed(0)}k+`
                    : event.witness_count}
                </strong> witnesses
              </span>
            )}
          </div>

          {/* Aliases */}
          {event.aliases && event.aliases.length > 0 && (
            <div className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Also known as: {event.aliases.join(", ")}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-12">
        {/* ── Linked Contactees ─────────────────────────────────── */}
        {linkedContactees.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Linked Experiencers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {linkedContactees.map((c) => (
                <Link
                  key={c.id}
                  href={`/uap/experiencer/${c.slug}`}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex-shrink-0 flex items-center justify-center">
                    {c.photo_url ? (
                      <Image
                        src={c.photo_url}
                        alt={c.display_name}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-sm font-bold text-green-600/60 dark:text-green-400/40">
                        {c.display_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 truncate transition-colors">
                      {c.display_name}
                    </p>
                    {c.experience_type && (
                      <p className="text-xs text-slate-400 capitalize">{c.experience_type}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Linked Videos ─────────────────────────────────────── */}
        {linkedVideos.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              Video References
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedVideos.map((v) => (
                <Link
                  key={v.video_id}
                  href={`/uap/video/${v.video_id}`}
                  className="group flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="relative w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-800">
                    {v.thumbnail_url ? (
                      <Image
                        src={v.thumbnail_url}
                        alt={v.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 line-clamp-2 transition-colors">
                      {v.title}
                    </h3>
                    {v.channel_name && (
                      <p className="text-xs text-slate-400 mt-0.5">{v.channel_name}</p>
                    )}
                    {v.view_count != null && v.view_count > 1000 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(v.view_count / 1000).toFixed(0)}k views
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Related Events ───────────────────────────────────── */}
        {relatedEvents.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Related Events
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {relatedEvents.map((e) => {
                const tc = EVENT_TYPE_CONFIG[e.event_type] || EVENT_TYPE_CONFIG.unknown;
                return (
                  <Link
                    key={e.id}
                    href={`/uap/events/${e.slug}`}
                    className="group p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {e.year || "—"}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${tc.color}`}>
                        {tc.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {e.name}
                    </p>
                    {e.source_count > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        {e.source_count} video ref{e.source_count !== 1 ? "s" : ""}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* ── JSON-LD ──────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: event.name,
            description: event.description,
            startDate: event.event_date || undefined,
            location: event.location
              ? { "@type": "Place", name: event.location, address: { "@type": "PostalAddress", addressCountry: event.country } }
              : undefined,
            url: `https://projectprofound.org/uap/events/${event.slug}`,
          }),
        }}
      />
    </main>
  );
}
