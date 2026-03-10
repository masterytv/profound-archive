import { createClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap including all active curated question pages.
 * Visited by Google, Bing, and AI crawlers (GPTBot, ClaudeBot, etc.)
 * at /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();

    const { data: questions } = await supabase
        .from('nde_questions')
        .select('slug, updated_at')
        .eq('is_active', true)
        .order('slug');

    const questionUrls: MetadataRoute.Sitemap = (questions ?? []).map((q) => ({
        url: `https://projectprofound.org/questions/${q.slug}`,
        lastModified: q.updated_at ?? new Date().toISOString(),
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    // Static high-priority pages
    const staticUrls: MetadataRoute.Sitemap = [
        { url: 'https://projectprofound.org',           lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
        { url: 'https://projectprofound.org/questions', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
        { url: 'https://projectprofound.org/channels',  lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: 'https://projectprofound.org/resources', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    ];

    return [...staticUrls, ...questionUrls];
}
