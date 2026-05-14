/**
 * UAP Person Detail Page
 *
 * /uap/persons/[slug] — Individual person profile with video appearances,
 * cross-entity links, credibility analysis, and JSON-LD structured data.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  User, Film, ArrowLeft, Shield, Building2, FileText,
  Calendar, Users, Radio,
} from 'lucide-react';
import UapVideoReferenceTable, { type VideoRef } from '@/components/uap/UapVideoReferenceTable';
import UapEntityLinkSection from '@/components/uap/UapEntityLinkSection';
import {
  findLinkedPrograms,
  findLinkedOrgs,
  findLinkedEvents,
  findLinkedExperiencers,
  findLinkedChannels,
} from '@/lib/data/uap-entity-links';

export const revalidate = 86400; // ISR: revalidate once per day

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

  // Fetch linked videos with full data for the table
  let videos: VideoRef[] = [];
  if (person.linked_video_ids?.length > 0) {
    const { data } = await supabase
      .from('uap_vids')
      .select('video_id, title, tier, content_type, channel_name, thumbnail_url, view_count, date')
      .in('video_id', person.linked_video_ids);
    videos = (data || []) as VideoRef[];
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
  const videoIds = person.linked_video_ids || [];

  // Parallel cross-entity link discovery
  const [
    linkedPrograms,
    linkedOrgs,
    linkedEvents,
    linkedExperiencers,
    linkedChannels,
  ] = await Promise.all([
    findLinkedPrograms(videoIds, slug),
    findLinkedOrgs(videoIds, slug),
    findLinkedEvents(videoIds, slug),
    findLinkedExperiencers(videoIds, slug),
    findLinkedChannels(videoIds),
  ]);

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
                  <p className="text-sm text-muted-foreground mt-1">
                    {person.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    {person.affiliation && (() => {
                      try {
                        const parsed = JSON.parse(person.affiliation);
                        const affiliations = Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
                        return ` · ${affiliations}`;
                      } catch {
                        return ` · ${person.affiliation}`;
                      }
                    })()}
                  </p>
                )}
                {person.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{person.bio}</p>
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
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-10">

          {/* Video Appearances (Standardized Table) */}
          <UapVideoReferenceTable
            videos={videos}
            title={`Video References (${videos.length})`}
            emptyMessage="No videos linked to this person yet."
          />

          {/* ── Standardized Cross-Entity Links (canonical order) ── */}
          <UapEntityLinkSection
            icon={Radio}
            title={`Featured on Channels (${linkedChannels.length})`}
            description="Channels that have published videos discussing this person."
            entities={linkedChannels.map((ch) => ({
              slug: ch.channel_id,
              name: ch.name,
              subtitle: `${ch.video_count} video${ch.video_count !== 1 ? 's' : ''}`,
              href: ch.href,
              count: ch.video_count,
            }))}
          />

          <UapEntityLinkSection
            icon={Users}
            title={`Linked Experiencers (${linkedExperiencers.length})`}
            description="These experiencers appear in the same videos where this person is discussed. This reflects topical co-occurrence, not a direct relationship."
            entities={linkedExperiencers}
          />

          <UapEntityLinkSection
            icon={Calendar}
            title={`Linked Events (${linkedEvents.length})`}
            description="These events are discussed in the same videos where this person is mentioned. This reflects topical co-occurrence, not confirmed involvement."
            entities={linkedEvents}
          />

          <UapEntityLinkSection
            icon={Building2}
            title={`Linked Organizations (${linkedOrgs.length})`}
            description="These organizations appear in the same videos where this person is discussed. This reflects topical co-occurrence, not a confirmed affiliation."
            entities={linkedOrgs}
          />

          <UapEntityLinkSection
            icon={FileText}
            title={`Linked Programs (${linkedPrograms.length})`}
            description="These programs appear in the same videos where this person is discussed. This reflects topical co-occurrence, not a confirmed affiliation."
            entities={linkedPrograms}
          />
        </div>
      </div>
    </>
  );
}
