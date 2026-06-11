import type { MetadataRoute } from 'next';
import { shouldNoindex } from '@/lib/seo/indexing';

/**
 * Robots.txt — allows all crawlers including AI bots.
 * GPTBot, ClaudeBot, PerplexityBot all respect this file.
 * Sitemap URL tells crawlers where to find all pages.
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
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: 'https://projectprofound.org/sitemap.xml',
    };
}
