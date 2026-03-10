import type { MetadataRoute } from 'next';

/**
 * Robots.txt — allows all crawlers including AI bots.
 * GPTBot, ClaudeBot, PerplexityBot all respect this file.
 * Sitemap URL tells crawlers where to find all pages.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: 'https://projectprofound.org/sitemap.xml',
    };
}
