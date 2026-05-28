import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap — includes all public content across NDE + UAP verticals.
 *
 * Uses the anon client directly (SSG-safe — no cookies() call) per LEARNINGS.md §1.
 * Visited by Google, Bing, and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.)
 * at /sitemap.xml
 */

const BASE = 'https://projectprofound.org';

function buildClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = buildClient();

    // ── Parallel data fetching ──────────────────────────────────────────────
    const [
        { data: questions },
        { data: blogPosts },
        { data: experiencers },
        { data: uapVids },
        { data: ndeVids },
        { data: contactees },
        { data: uapChannels },
        { data: uapEvents },
        { data: uapPersons },
        { data: uapOrgs },
        { data: uapPrograms },
    ] = await Promise.all([
        // NDE questions
        supabase
            .from('nde_questions')
            .select('slug, updated_at')
            .eq('is_active', true)
            .order('slug'),
        // Blog posts (NDE + UAP)
        supabase
            .from('blog_posts')
            .select('slug, domain, published_at, updated_at, category')
            .eq('status', 'published')
            .order('published_at', { ascending: false }),
        // NDE experiencer profiles
        supabase
            .from('experiencer_profiles')
            .select('slug, updated_at')
            .not('published_at', 'is', null)
            .order('slug'),
        // UAP video pages
        supabase
            .from('uap_vids')
            .select('video_id, updated_at')
            .in('tier', [1, 2])
            .not('transcript', 'is', null)
            .order('video_id'),
        // NDE video pages — no updated_at column, use date instead
        supabase
            .from('nde_vids')
            .select('videoId, date')
            .eq('isNde', 'clear_nde')
            .not('subtitles_punctuated', 'is', null)
            .order('videoId'),
        // UAP contactees
        supabase
            .from('uap_contactees')
            .select('slug, updated_at')
            .order('slug'),
        // UAP channels
        supabase
            .from('uap_channels')
            .select('handle, updated_at')
            .eq('hidden', false)
            .not('handle', 'is', null)
            .order('handle'),
        // UAP events
        supabase
            .from('uap_events')
            .select('slug, updated_at')
            .order('slug'),
        // UAP persons
        supabase
            .from('uap_canonical_persons')
            .select('slug, updated_at')
            .order('slug'),
        // UAP organizations
        supabase
            .from('uap_canonical_orgs')
            .select('slug, updated_at')
            .order('slug'),
        // UAP programs
        supabase
            .from('uap_canonical_programs')
            .select('slug, updated_at')
            .order('slug'),
    ]);

    // ── Build URL arrays ────────────────────────────────────────────────────

    const questionUrls: MetadataRoute.Sitemap = (questions ?? []).map((q) => ({
        url: `${BASE}/questions/${q.slug}`,
        lastModified: q.updated_at ?? new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    // Blog posts — route by domain (NDE → /blog, UAP → /uap/blog)
    const blogUrls: MetadataRoute.Sitemap = (blogPosts ?? []).map((p) => ({
        url: p.domain === 'uap'
            ? `${BASE}/uap/blog/${p.slug}`
            : `${BASE}/blog/${p.slug}`,
        lastModified: p.updated_at ?? p.published_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: p.category === 'guide' ? 0.9 : 0.75,
    }));

    const experiencerUrls: MetadataRoute.Sitemap = (experiencers ?? []).map((e) => ({
        url: `${BASE}/experiencer/${e.slug}`,
        lastModified: e.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    const uapVideoUrls: MetadataRoute.Sitemap = (uapVids ?? []).map((v) => ({
        url: `${BASE}/uap/video/${v.video_id}`,
        lastModified: v.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.65,
    }));

    const ndeVideoUrls: MetadataRoute.Sitemap = (ndeVids ?? []).map((v) => ({
        url: `${BASE}/video/${v.videoId}`,
        lastModified: v.date ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
    }));

    const contacteeUrls: MetadataRoute.Sitemap = (contactees ?? []).map((c) => ({
        url: `${BASE}/uap/experiencer/${c.slug}`,
        lastModified: c.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    const channelUrls: MetadataRoute.Sitemap = (uapChannels ?? []).map((ch) => ({
        url: `${BASE}/uap/channels/${ch.handle}`,
        lastModified: ch.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.55,
    }));

    const eventUrls: MetadataRoute.Sitemap = (uapEvents ?? []).map((e) => ({
        url: `${BASE}/uap/events/${e.slug}`,
        lastModified: e.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // NEW: UAP Persons, Organizations, Programs
    const personUrls: MetadataRoute.Sitemap = (uapPersons ?? []).filter(p => p.slug).map((p) => ({
        url: `${BASE}/uap/persons/${p.slug}`,
        lastModified: p.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    const orgUrls: MetadataRoute.Sitemap = (uapOrgs ?? []).filter(o => o.slug).map((o) => ({
        url: `${BASE}/uap/organizations/${o.slug}`,
        lastModified: o.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    const programUrls: MetadataRoute.Sitemap = (uapPrograms ?? []).filter(p => p.slug).map((p) => ({
        url: `${BASE}/uap/programs/${p.slug}`,
        lastModified: p.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // ── Static high-priority pages ──────────────────────────────────────────
    const now = new Date();
    const staticUrls: MetadataRoute.Sitemap = [
        // Homepage
        { url: BASE,                                    lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
        // NDE domain
        { url: `${BASE}/questions`,                     lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${BASE}/blog`,                          lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
        { url: `${BASE}/search3`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${BASE}/experiencer`,                   lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${BASE}/channels`,                      lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/compass`,                       lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/resources`,                     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/about`,                         lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        // UAP domain
        { url: `${BASE}/uap`,                           lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
        { url: `${BASE}/uap/search`,                    lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${BASE}/uap/video-explore`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${BASE}/uap/experiencer`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${BASE}/uap/intelligence`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/uap/channels`,                  lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/uap/timeline`,                  lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/uap/events`,                    lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
        { url: `${BASE}/uap/persons`,                   lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/uap/organizations`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/uap/programs`,                  lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/uap/blog`,                      lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
        { url: `${BASE}/uap/methodology`,               lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE}/uap/chat`,                      lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        // Research / Cross-domain
        { url: `${BASE}/research/methodology`,          lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE}/research/cross-domain`,         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        // Visualizations
        { url: `${BASE}/visualize`,                     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${BASE}/visualize/nde-elements`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/visualize/channel-constellation`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/visualize/geography`,           lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/visualize/hynek-space`,         lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/visualize/uap-intelligence`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/visualize/uap-phenomenology`,   lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE}/visualize/uap-timeline`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        // Explore pages
        { url: `${BASE}/explore/veridical`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/explore/greyson`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
        { url: `${BASE}/explore/transformation`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    ];

    return [
        ...staticUrls,
        ...questionUrls,
        ...blogUrls,
        ...experiencerUrls,
        ...uapVideoUrls,
        ...ndeVideoUrls,
        ...contacteeUrls,
        ...channelUrls,
        ...eventUrls,
        ...personUrls,
        ...orgUrls,
        ...programUrls,
    ];
}
