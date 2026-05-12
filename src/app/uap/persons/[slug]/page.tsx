/**
 * UAP Person Detail Page
 *
 * /uap/persons/[slug] — Individual person profile with video appearances,
 * credibility analysis, and JSON-LD structured data.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { User, Film, ArrowLeft, Shield, ExternalLink } from 'lucide-react';

export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function getPerson(slug: string) {
  const supabase = getSupabase();

  const { data: person } = await supabase
    .from('uap_canonical_persons')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!person) return null;

  // Fetch linked videos
  let videos: any[] = [];
  if (person.linked_video_ids?.length > 0) {
    const { data } = await supabase
      .from('uap_vids')
      .select('video_id, title, tier, content_type, channel_name, thumbnail_url')
      .in('video_id', person.linked_video_ids);
    videos = data || [];
  }

  return { person, videos };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPerson(slug);
  if (!result) return { title: 'Person Not Found' };

  const { person } = result;
  return {
    title: `${person.canonical_name} | UAP Person of Interest | Project Profound`,
    description: person.bio || `Profile of ${person.canonical_name} — ${person.total_mentions} mentions across ${person.linked_video_ids?.length || 0} UAP research videos.`,
    openGraph: {
      title: `${person.canonical_name} | UAP Research`,
      description: `${person.total_mentions} mentions across UAP video analysis.`,
      type: 'profile',
    },
  };
}

export async function generateStaticParams() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('uap_canonical_persons')
    .select('slug')
    .order('total_mentions', { ascending: false })
    .limit(50);

  return (data || []).map(p => ({ slug: p.slug }));
}

function getCredibilityColor(score: number | null) {
  if (score === null) return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  if (score >= 70) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
  if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
}

export default async function PersonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPerson(slug);
  if (!result) notFound();

  const { person, videos } = result;

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.canonical_name,
    alternateName: person.aliases,
    description: person.bio || `${person.canonical_name} — figure in UAP/UFO research`,
    ...(person.affiliation && {
      affiliation: { '@type': 'Organization', name: person.affiliation },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen">
        {/* Hero */}
        <section
          className="border-b border-border/60"
          style={{
            background: 'linear-gradient(135deg, var(--domain-accent-light, #DCFCE7)08, var(--background) 40%, var(--domain-accent-light, #DCFCE7)04)',
          }}
        >
          <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
            <Link
              href="/uap/persons"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--domain-accent)] transition-colors mb-6"
            >
              <ArrowLeft className="w-3 h-3" />
              All Persons
            </Link>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-[var(--domain-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-serif tracking-tight">
                  {person.canonical_name}
                </h1>
                {person.role && (
                  <p className="text-sm text-muted-foreground mt-1 capitalize">
                    {person.role.replace(/_/g, ' ')}
                    {person.affiliation && ` · ${Array.isArray(person.affiliation) ? person.affiliation.join(', ') : person.affiliation}`}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-sm">
                    <Film className="w-3.5 h-3.5 text-[var(--domain-accent)]" />
                    <span className="font-bold">{videos.length}</span>
                    <span className="text-muted-foreground text-xs">videos</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-sm">
                    <span className="font-bold">{person.total_mentions}</span>
                    <span className="text-muted-foreground text-xs">mentions</span>
                  </div>
                  {person.avg_credibility_score && (
                    <a
                      href="/uap/methodology/credibility"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="What is the credibility score?"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-sm hover:opacity-80 transition-opacity cursor-help"
                    >
                      <Shield className="w-3.5 h-3.5 text-[var(--domain-accent)]" />
                      <span className={`font-bold px-1.5 py-0.5 rounded-md text-xs ${getCredibilityColor(person.avg_credibility_score)}`}>
                        {person.avg_credibility_score}
                      </span>
                      <span className="text-muted-foreground text-xs">credibility</span>
                    </a>
                  )}
                </div>

                {/* Aliases */}
                {person.aliases?.length > 0 && (
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    Also known as: {person.aliases.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-8">

          {/* Bio */}
          {person.bio && (
            <section>
              <h2 className="text-lg font-semibold text-foreground font-serif mb-3">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{person.bio}</p>
            </section>
          )}

          {/* Video Appearances */}
          <section>
            <h2 className="text-lg font-semibold text-foreground font-serif mb-4">
              Video Appearances ({videos.length})
            </h2>
            <div className="space-y-3">
              {videos.map(video => (
                <Link
                  key={video.video_id}
                  href={`/uap/video/${video.video_id}`}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card
                             hover:shadow-md hover:border-[var(--domain-accent)]/30 transition-all"
                >
                  {/* Thumbnail */}
                  {video.thumbnail_url && (
                    <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-[var(--domain-accent)] transition-colors truncate">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        Tier {video.tier}
                      </span>
                      {video.content_type && (
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {video.content_type.replace(/_/g, ' ')}
                        </span>
                      )}
                      {video.channel_name && (
                        <span className="text-[10px] text-muted-foreground/60 truncate">
                          · {video.channel_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <ExternalLink className="w-4 h-4 text-muted-foreground/30 group-hover:text-[var(--domain-accent)] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
