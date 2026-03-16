import { createClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap — includes questions, blog posts, and experiencer profiles.
 * Visited by Google, Bing, and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.)
 * at /sitemap.xml
 *
 * Blog posts and experiencer profiles are added automatically on publish via ISR.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();

    // Active question pages
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

    // Published blog posts
    const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('slug, published_at, updated_at, category')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    const blogUrls: MetadataRoute.Sitemap = (blogPosts ?? []).map((p) => ({
        url: `https://projectprofound.org/blog/${p.slug}`,
        lastModified: p.updated_at ?? p.published_at ?? new Date().toISOString(),
        changeFrequency: 'monthly' as const,
        // Cluster (pillar) pages get highest priority, others slightly lower
        priority: p.category === 'guide' ? 0.9 : 0.75,
    }));

    // Published experiencer profiles
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

    // Static high-priority pages
    const staticUrls: MetadataRoute.Sitemap = [
        { url: 'https://projectprofound.org',                lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
        { url: 'https://projectprofound.org/questions',      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
        { url: 'https://projectprofound.org/blog',           lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
        { url: 'https://projectprofound.org/experiencer',    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
        { url: 'https://projectprofound.org/channels',       lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
        { url: 'https://projectprofound.org/resources',      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ];

    return [...staticUrls, ...questionUrls, ...blogUrls, ...experiencerUrls];
}
