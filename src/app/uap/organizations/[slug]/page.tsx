/**
 * UAP Organization Detail Page
 *
 * /uap/organizations/[slug] — Individual organization with video references,
 * cross-entity links, and JSON-LD structured data.
 */

import { serializeJsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  Building2, Film, ArrowLeft, User, Users, Fingerprint, Calendar, Radio,
} from 'lucide-react';
import UapVideoReferenceTable, { type VideoRef } from '@/components/uap/UapVideoReferenceTable';
import UapEntityLinkSection from '@/components/uap/UapEntityLinkSection';
import {
  findLinkedPersons,
  findLinkedPrograms,
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

async function getOrg(slug: string) {
  const supabase = getSupabase();
  const { data: org } = await supabase
    .from('uap_canonical_orgs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!org) return null;

  let videos: VideoRef[] = [];
  if (org.linked_video_ids?.length > 0) {
    const { data } = await supabase
      .from('uap_vids')
      .select('video_id, title, tier, content_type, channel_name, thumbnail_url, view_count, date')
      .in('video_id', org.linked_video_ids);
    videos = (data || []) as VideoRef[];
  }

  return { org, videos };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getOrg(slug);
  if (!result) return { title: 'Organization Not Found' };
  const { org } = result;
  return {
    title: `${org.canonical_name} | UFO/UAP Organization | Project Profound`,
    description: org.description || `${org.canonical_name} — referenced in ${org.linked_video_ids?.length || 0} UFO/UAP research videos.`,
  };
}

// No generateStaticParams — pages render on-demand with fresh DB data,
// cached for 24h via ISR (revalidate = 86400 above).

export default async function OrgDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getOrg(slug);
  if (!result) notFound();

  const { org, videos } = result;
  const videoIds = org.linked_video_ids || [];

  // Parallel cross-entity link discovery
  const [
    linkedPersons,
    linkedPrograms,
    linkedEvents,
    linkedExperiencers,
    linkedChannels,
  ] = await Promise.all([
    findLinkedPersons(videoIds, slug),
    findLinkedPrograms(videoIds, slug),
    findLinkedEvents(videoIds, slug),
    findLinkedExperiencers(videoIds),
    findLinkedChannels(videoIds),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.canonical_name,
    alternateName: org.aliases,
    description: org.description || `${org.canonical_name} — organization referenced in UFO/UAP research`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="min-h-screen">
        <section
          className="border-b border-border/60"
          style={{ background: 'linear-gradient(135deg, var(--domain-accent-light, #DCFCE7)08, var(--background) 40%, var(--domain-accent-light, #DCFCE7)04)' }}
        >
          <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
            <Link href="/uap/organizations" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--domain-accent)] transition-colors mb-6">
              <ArrowLeft className="w-3 h-3" /> All Organizations
            </Link>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-[var(--domain-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-serif tracking-tight">{org.canonical_name}</h1>
                {org.org_type && (
                  <p className="text-sm text-muted-foreground mt-1"><span className="font-semibold capitalize">{org.org_type.replace(/_/g, ' ')}</span></p>
                )}
                {org.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{org.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-sm">
                    <Film className="w-3.5 h-3.5 text-[var(--domain-accent)]" />
                    <span className="font-bold">{videos.length}</span>
                    <span className="text-muted-foreground text-xs">videos</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-sm">
                    <span className="font-bold">{org.total_mentions}</span>
                    <span className="text-muted-foreground text-xs">mentions</span>
                  </div>
                </div>
                {org.aliases?.length > 0 && (
                  <p className="text-xs text-muted-foreground/70 mt-3">Also known as: {org.aliases.join(', ')}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-10">

          {/* Video References (Standardized Table) */}
          <UapVideoReferenceTable
            videos={videos}
            title={`Video References (${videos.length})`}
            emptyMessage="No videos linked to this organization yet."
          />

          {/* ── Standardized Cross-Entity Links (canonical order) ── */}
          <UapEntityLinkSection
            icon="Radio"
            title={`Featured on Channels (${linkedChannels.length})`}
            description="Channels that have published videos discussing this organization."
            entities={linkedChannels.map((ch) => ({
              slug: ch.channel_id,
              name: ch.name,
              subtitle: `${ch.video_count} video${ch.video_count !== 1 ? 's' : ''}`,
              href: ch.href,
              count: ch.video_count,
            }))}
          />

          <UapEntityLinkSection
            icon="Users"
            title={`Linked Experiencers (${linkedExperiencers.length})`}
            description="These experiencers are discussed in the same videos that mention this organization. This reflects topical co-occurrence, not a confirmed affiliation."
            entities={linkedExperiencers}
          />

          <UapEntityLinkSection
            icon="User"
            title={`Linked Persons of Interest (${linkedPersons.length})`}
            description="These individuals are discussed in the same videos that mention this organization. This reflects topical co-occurrence, not a confirmed affiliation."
            entities={linkedPersons}
          />

          <UapEntityLinkSection
            icon="Calendar"
            title={`Linked Events (${linkedEvents.length})`}
            description="These events are discussed in the same videos that mention this organization. This reflects topical co-occurrence, not confirmed involvement."
            entities={linkedEvents}
          />

          <UapEntityLinkSection
            icon="Fingerprint"
            title={`Linked Programs (${linkedPrograms.length})`}
            description="These programs are discussed in the same videos that mention this organization. This reflects topical co-occurrence, not a confirmed partnership."
            entities={linkedPrograms}
          />
        </div>
      </div>
    </>
  );
}
