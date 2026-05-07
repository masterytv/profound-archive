import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Play, User, ExternalLink, FileText } from "lucide-react";

export const revalidate = 86400;

// ─── Client ─────────────────────────────────────────────────────────────────

function buildClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ─── Data ───────────────────────────────────────────────────────────────────

interface PersonMention {
  name: string;
  role: string | null;
  context: string | null;
}

interface VideoWithPerson {
  video_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  tier: number;
  mentions: PersonMention[];
}

async function getPersonData(slug: string) {
  const supabase = buildClient();

  // Fetch all analysis rows with people_mentioned
  const { data: analyses, error } = await supabase
    .from('uap_analysis')
    .select(`
      video_id,
      people_mentioned,
      uap_vids!inner(title, channel_name, thumbnail_url, tier)
    `)
    .not('people_mentioned', 'is', null);

  if (error || !analyses) return null;

  // Find all videos that mention someone matching this slug
  const matchingVideos: VideoWithPerson[] = [];
  let personName = '';

  for (const row of analyses as any[]) {
    const people = row.people_mentioned as PersonMention[];
    if (!Array.isArray(people)) continue;

    for (const person of people) {
      if (toSlug(person.name) === slug) {
        if (!personName) personName = person.name;
        matchingVideos.push({
          video_id: row.video_id,
          title: row.uap_vids?.title || '',
          channel_name: row.uap_vids?.channel_name || null,
          thumbnail_url: row.uap_vids?.thumbnail_url || null,
          tier: row.uap_vids?.tier || 2,
          mentions: [person],
        });
        break;
      }
    }
  }

  if (matchingVideos.length === 0) return null;

  // Deduplicate by video_id
  const seen = new Set<string>();
  const unique = matchingVideos.filter(v => {
    if (seen.has(v.video_id)) return false;
    seen.add(v.video_id);
    return true;
  });

  // Aggregate roles
  const roles = new Set<string>();
  for (const v of unique) {
    for (const m of v.mentions) {
      if (m.role) roles.add(m.role);
    }
  }

  return { name: personName, slug, videos: unique, roles: Array.from(roles) };
}

// ─── Static Params ──────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const supabase = buildClient();

  const { data: analyses } = await supabase
    .from('uap_analysis')
    .select('people_mentioned')
    .not('people_mentioned', 'is', null);

  if (!analyses) return [];

  const slugs = new Set<string>();
  for (const row of analyses as any[]) {
    const people = row.people_mentioned;
    if (!Array.isArray(people)) continue;
    for (const person of people) {
      if (person?.name) {
        slugs.add(toSlug(person.name));
      }
    }
  }

  return Array.from(slugs).map(slug => ({ slug }));
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPersonData(slug);
  if (!data) return { title: "Person Not Found | Project Profound" };

  const title = `${data.name} — UAP Research Figure | Project Profound`;
  const description = `${data.name} is mentioned in ${data.videos.length} video${data.videos.length !== 1 ? 's' : ''} across the Project Profound UAP archive. ${data.roles.length > 0 ? `Roles: ${data.roles.join(', ')}.` : ''}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPersonData(slug);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
        <Link
          href="/uap"
          className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:text-green-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          UAP Archive
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
            <User className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              {data.name}
            </h1>
            {data.roles.length > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {data.roles.join(' · ')}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Mentioned in{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {data.videos.length}
          </span>{' '}
          video{data.videos.length !== 1 ? 's' : ''} in the UAP archive.
          This page aggregates knowledge extracted from analyzed transcripts.
        </p>

        {/* Video List */}
        <div className="space-y-3">
          {data.videos.map((video) => (
            <Link
              key={video.video_id}
              href={`/uap/${video.tier === 1 ? 'encounters' : 'programs'}/${video.video_id}`}
              className="group flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 transition-colors"
            >
              <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                {video.thumbnail_url ? (
                  <Image
                    src={video.thumbnail_url}
                    alt={video.title}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{video.channel_name}</p>
                {video.mentions[0]?.context && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 italic">
                    &ldquo;{video.mentions[0].context}&rdquo;
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
