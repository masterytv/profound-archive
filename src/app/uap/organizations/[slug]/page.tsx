/**
 * UAP Organization Detail Page
 *
 * /uap/organizations/[slug] — Individual organization with linked videos and JSON-LD.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Building2, Film, ArrowLeft, ExternalLink } from 'lucide-react';

export const revalidate = 3600;

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

  let videos: any[] = [];
  if (org.linked_video_ids?.length > 0) {
    const { data } = await supabase
      .from('uap_vids')
      .select('video_id, title, tier, content_type, channel_name, thumbnail_url')
      .in('video_id', org.linked_video_ids);
    videos = data || [];
  }

  return { org, videos };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getOrg(slug);
  if (!result) return { title: 'Organization Not Found' };
  const { org } = result;
  return {
    title: `${org.canonical_name} | UAP Organization | Project Profound`,
    description: org.description || `${org.canonical_name} — referenced in ${org.linked_video_ids?.length || 0} UAP research videos.`,
  };
}

export async function generateStaticParams() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('uap_canonical_orgs')
    .select('slug')
    .order('total_mentions', { ascending: false })
    .limit(50);
  return (data || []).map(o => ({ slug: o.slug }));
}

export default async function OrgDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getOrg(slug);
  if (!result) notFound();

  const { org, videos } = result;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.canonical_name,
    alternateName: org.aliases,
    description: org.description || `${org.canonical_name} — organization referenced in UAP research`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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

        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-8">
          {org.description && (
            <section>
              <h2 className="text-lg font-semibold text-foreground font-serif mb-3">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{org.description}</p>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-foreground font-serif mb-4">Video References ({videos.length})</h2>
            <div className="space-y-3">
              {videos.map(video => (
                <Link key={video.video_id} href={`/uap/video/${video.video_id}`}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:shadow-md hover:border-[var(--domain-accent)]/30 transition-all">
                  {video.thumbnail_url && (
                    <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                      <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-[var(--domain-accent)] transition-colors truncate">{video.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">Tier {video.tier}</span>
                      {video.channel_name && <span className="text-[10px] text-muted-foreground/60 truncate">· {video.channel_name}</span>}
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
