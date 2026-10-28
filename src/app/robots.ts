import type { MetadataRoute } from 'next';
import { shouldNoindex } from '@/lib/seo/indexing';
import { AI_BOTS } from '@/lib/seo/ai-bots';

/**
 * Robots.txt — allows search crawlers (Google, Bing, etc.) and disallows the
 * AI crawlers listed in src/lib/seo/ai-bots.ts, whose traffic was eating the
 * App Hosting spend cap (Oct 2026). Sitemap URL tells crawlers where to find
 * all pages.
 *
 * On staging (NOINDEX_SITE=true) it disallows everything instead, alongside
 * the X-Robots-Tag header and meta noindex set elsewhere.
 */
export default function robots(): MetadataRoute.Robots {
    if (shouldNoindex()) {
        return {
            rules: {
                userAgent: '*',
                disallow: '/',
            },
        };
    }
    return {
        rules: [
            { userAgent: AI_BOTS, disallow: '/' },
            { userAgent: '*', allow: '/' },
        ],
        sitemap: 'https://projectprofound.org/sitemap.xml',
    };
}
