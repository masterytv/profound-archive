/**
 * AI crawlers / agents we turn away. Search crawlers (Googlebot, Bingbot) are
 * deliberately NOT here — none of these tokens appear in their user agents.
 *
 * Consumed by robots.ts (polite bots obey). Hard blocking happens at
 * Cloudflare (Security → Configure AI bot policies), NOT in the app: App
 * Hosting rewrites every request's User-Agent to "Google" before it reaches
 * Next, so user-agent checks in proxy.ts can never match (docs/LEARNINGS.md).
 * Google-Extended and Applebot-Extended are robots.txt-only tokens — they opt
 * out of AI training without touching Google/Apple search.
 */
export const AI_BOTS = [
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
    'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Applebot-Extended',
    'CCBot', 'Bytespider', 'Amazonbot', 'meta-externalagent', 'meta-externalfetcher', 'FacebookBot',
    'Diffbot', 'cohere-ai', 'cohere-training-data-crawler', 'YouBot', 'Timpibot', 'ImagesiftBot',
    'omgili', 'PetalBot', 'AI2Bot', 'Kangaroo Bot', 'PanguBot', 'Scrapy',
    // Heavy SEO-tool crawlers — not search engines, just load.
    'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'DataForSeoBot', 'BLEXBot',
];
