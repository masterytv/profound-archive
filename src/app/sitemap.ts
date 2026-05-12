import { createClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap — includes NDE questions, blog posts, experiencer profiles,
 * and UAP encounters, contactees, channels, and programs.
 *
 * Visited by Google, Bing, and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.)
 * at /sitemap.xml
 *
 * Blog posts and experiencer profiles are added automatically on publish via ISR.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();

    // ── NDE: Active question pages ──────────────────────────────────────────
    const { data: questions } = await supabase
        .from('nde_questions')
        .select('slug, updated_at')
        .eq('is_active', true)
        .order('slug');

    const questionUrls: MetadataRoute.Sitemap = (questions ?? []).map((q) => ({
        url: `https://projectprofound.org/questions/${q.slug}`,
        lastModified: q.updated_at ?? new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    // ── Published blog posts (NDE + UAP — domain-agnostic) ──────────────────
    const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('slug, published_at, updated_at, category')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    const blogUrls: MetadataRoute.Sitemap = (blogPosts ?? []).map((p) => ({
        url: `https://projectprofound.org/blog/${p.slug}`,
        lastModified: p.updated_at ?? p.published_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: p.category === 'guide' ? 0.9 : 0.75,
    }));

    // ── NDE: Published experiencer profiles ─────────────────────────────────
    const { data: experiencers } = await supabase
        .from('experiencer_profiles')
        .select('slug, updated_at')
        .not('published_at', 'is', null)
        .order('slug');

    const experiencerUrls: MetadataRoute.Sitemap = (experiencers ?? []).map((e) => ({
        url: `https://projectprofound.org/experiencer/${e.slug}`,
        lastModified: e.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // ── UAP: Video pages (Tier 1 encounters + Tier 2 research/programs) ───────
    const { data: uapEncounters } = await supabase
        .from('uap_vids')
        .select('video_id, updated_at')
        .in('tier', [1, 2])
        .not('transcript', 'is', null)
        .order('video_id');

    const uapEncounterUrls: MetadataRoute.Sitemap = (uapEncounters ?? []).map((v) => ({
        url: `https://projectprofound.org/uap/video/${v.video_id}`,
        lastModified: v.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.65,
    }));

    // ── UAP: Contactee profiles ─────────────────────────────────────────────
    const { data: contactees } = await supabase
        .from('uap_contactees')
        .select('slug, updated_at')
        .order('slug');

    const contacteeUrls: MetadataRoute.Sitemap = (contactees ?? []).map((c) => ({
        url: `https://projectprofound.org/uap/experiencer/${c.slug}`,
        lastModified: c.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // ── UAP: Channel pages ──────────────────────────────────────────────────
    const { data: uapChannels } = await supabase
        .from('uap_channels')
        .select('handle, updated_at')
        .eq('hidden', false)
        .not('handle', 'is', null)
        .order('handle');

    const channelUrls: MetadataRoute.Sitemap = (uapChannels ?? []).map((ch) => ({
        url: `https://projectprofound.org/uap/channels/${ch.handle}`,
        lastModified: ch.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.55,
    }));

    // ── UAP: Event pages ────────────────────────────────────────────────────
    const { data: uapEvents } = await supabase
        .from('uap_events')
        .select('slug, updated_at')
        .order('slug');

    const eventUrls: MetadataRoute.Sitemap = (uapEvents ?? []).map((e) => ({
        url: `https://projectprofound.org/uap/events/${e.slug}`,
        lastModified: e.updated_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // ── Static high-priority pages ──────────────────────────────────────────
    const staticUrls: MetadataRoute.Sitemap = [
        // NDE domain
        { url: 'https://projectprofound.org',                lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
        { url: 'https://projectprofound.org/questions',      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
        { url: 'https://projectprofound.org/blog',           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
        { url: 'https://projectprofound.org/experiencer',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
        { url: 'https://projectprofound.org/channels',       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
        { url: 'https://projectprofound.org/resources',      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        // UAP domain
        { url: 'https://projectprofound.org/uap',            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
        { url: 'https://projectprofound.org/uap/search',     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
        { url: 'https://projectprofound.org/uap/experiencer', lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
        { url: 'https://projectprofound.org/uap/channels',   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
        { url: 'https://projectprofound.org/uap/timeline',   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
        { url: 'https://projectprofound.org/uap/events',       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
        { url: 'https://projectprofound.org/uap/methodology',  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
        { url: 'https://projectprofound.org/uap/chat',         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ];

    return [
        ...staticUrls,
        ...questionUrls,
        ...blogUrls,
        ...experiencerUrls,
        ...uapEncounterUrls,
        ...contacteeUrls,
        ...channelUrls,
        ...eventUrls,
    ];
}
