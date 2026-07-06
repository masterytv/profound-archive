/**
 * Process & service registry (admin /admin/operations).
 *
 * The single declarative source of truth for "what runs, what it costs, and
 * which switch pauses it." The dashboard joins this against live spend from
 * api_usage_log (via /api/admin/operations) to show real usage vs quota.
 *
 * Adding a new paid process? Add it here and gate its entry point with the
 * matching SwitchKey — the dashboard picks it up automatically.
 */
import type { SwitchKey } from './switches';

export type CostModel = 'tokens' | 'quota' | 'flat';
export type QuotaPeriod = 'day' | 'month' | 'none';

export interface ServiceSpec {
    /** api_usage_log.provider value, when this service logs usage. */
    provider: string;
    label: string;
    /** Env var NAME holding the key (value never exposed — only a masked tail). */
    envVar?: string;
    costModel: CostModel;
    /** Allowance for the quota window, e.g. 10000 units/day, 100 credits/month. */
    quotaLimit?: number;
    quotaPeriod?: QuotaPeriod;
    unit?: string;
    /** Short note on how it's priced. */
    pricingNote?: string;
    /** For flat services: estimated fixed monthly USD. EDIT to match real bills. */
    flatMonthlyUsd?: number;
}

export interface ProcessSpec {
    key: string;
    label: string;
    description: string;
    /** Switch that pauses this process (null = cannot be paused, e.g. chat/search). */
    switchKey: SwitchKey | null;
    /** Human-readable schedule / trigger. */
    schedule: string;
    /** api_usage_log.operation prefixes that attribute spend to this process. */
    operationPrefixes: string[];
    services: ServiceSpec[];
}

// Quota defaults are conservative starting points — tune to the actual plan.
export const PROCESS_REGISTRY: ProcessSpec[] = [
    {
        key: 'video_ingestion',
        label: 'Daily Video Scrape',
        description: 'Discovers new videos from enabled YouTube channels and queues them. The cheap half of ingestion — only YouTube Data API quota.',
        switchKey: 'video_ingestion',
        schedule: 'Daily 3am ET (pg_cron) + hourly discover; Oracle crontab',
        operationPrefixes: ['scanner.discover', 'uap.discover', 'scanner.tick', 'uap.tick', 'youtube'],
        services: [
            { provider: 'youtube', label: 'Google YouTube Data API', envVar: 'YOUTUBE_API_KEY', costModel: 'quota', quotaLimit: 10000, quotaPeriod: 'day', unit: 'units', pricingNote: 'Free within 10,000 units/day. list calls = 1 unit, search = 100.' },
        ],
    },
    {
        key: 'video_analysis',
        label: 'Daily Video Analysis',
        description: 'Pulls queued videos through the full intake pipeline: fetch transcript (Supadata) then classify & extract (OpenAI). The most expensive process.',
        switchKey: 'video_analysis',
        schedule: 'Every 10 min (pg_cron → /process); Oracle crontab',
        operationPrefixes: ['scanner.process', 'uap.process', 'intake', 'intake-uap', 'classify', 'core-elements', 'transformation', 'journey-flow', 'greyson', 'phenomenology', 'uap-evidence', 'uap-program', 'uap-summary', 'embed', 'supadata'],
        services: [
            { provider: 'brightdata', label: 'Bright Data (transcripts)', envVar: 'BRIGHTDATA_API_KEY', costModel: 'quota', quotaLimit: 5000, quotaPeriod: 'month', unit: 'records', pricingNote: 'Primary transcript source. ~$0.75–1.50 / 1,000 records after free allowance.' },
            { provider: 'supadata', label: 'Supadata (transcript fallback)', envVar: 'SUPADATA_API_KEY', costModel: 'quota', quotaLimit: 100, quotaPeriod: 'month', unit: 'credits', pricingNote: 'Free tier — fallback only when Bright Data errors.' },
            { provider: 'openai', label: 'OpenAI (classify / extract / embed)', envVar: 'OPENAI_API_KEY', costModel: 'tokens', pricingNote: 'gpt-4o, gpt-4o-mini, text-embedding-3-small.' },
        ],
    },
    {
        key: 'uap_tier2_intake',
        label: 'UAP Tier-2 Full Processing',
        description: 'When paused, UAP intake stops tier-2 videos (research, commentary, news, documentaries) after classification — no analysis suite, no embeddings — to limit database growth. Tier-1 experiencer videos still process fully. Deferred videos are marked deferred_tier2 for later backfill.',
        switchKey: 'uap_tier2_intake',
        schedule: 'Gate inside UAP intake (rapid-process + scanner)',
        operationPrefixes: [],
        services: [],
    },
    {
        key: 'blog_generation',
        label: 'Blog & Story Generation',
        description: 'Generates blog articles and experiencer stories — Claude drafting + Tavily research + fact-check passes.',
        switchKey: 'blog_generation',
        schedule: 'Daily noon & 2pm ET (pg_cron → /api/cron/blog-*)',
        operationPrefixes: ['blog-story', 'blog-article', 'blog-verify', 'blog-research', 'uap-blog', 'blog-questions'],
        services: [
            { provider: 'openrouter', label: 'OpenRouter (Claude Sonnet)', envVar: 'OPENROUTER_API_KEY', costModel: 'tokens', pricingNote: 'anthropic/claude-sonnet-4-5 + gpt-4o-mini voice pass.' },
            { provider: 'tavily', label: 'Tavily (research)', envVar: 'TAVILY_API_KEY', costModel: 'quota', quotaLimit: 1000, quotaPeriod: 'month', unit: 'credits', pricingNote: '1 credit/query. 1,000 free/mo.' },
        ],
    },
    {
        key: 'image_generation',
        label: 'Hero Image Generation',
        description: 'Generates branded oil-painting hero images for blog articles via fal.ai FLUX.',
        switchKey: 'image_generation',
        schedule: 'Within blog generation (1–2 images/article)',
        operationPrefixes: ['blog-image', 'fal'],
        services: [
            { provider: 'fal', label: 'fal.ai (FLUX.1)', envVar: 'FAL_API_KEY', costModel: 'quota', quotaLimit: undefined, quotaPeriod: 'month', unit: 'images', pricingNote: '~$0.025 / image.' },
        ],
    },
    {
        key: 'email',
        label: 'Email CRM',
        description: 'Sends video digest emails to quiz subscribers, lead onboarding, and contact replies via Resend.',
        switchKey: 'email',
        schedule: 'Hourly (pg_cron → /api/email/cron), max 50/run',
        operationPrefixes: ['email', 'resend'],
        services: [
            { provider: 'resend', label: 'Resend (email)', envVar: 'RESEND_API_KEY', costModel: 'quota', quotaLimit: 3000, quotaPeriod: 'month', unit: 'emails', pricingNote: '100 free/day, then $0.30 / 1,000.' },
        ],
    },
    {
        key: 'chat_search',
        label: 'Chat & Search',
        description: 'User-facing semantic search and chat. Embedding tokens only — left running by design (the master switch never touches this).',
        switchKey: null,
        schedule: 'On user request',
        operationPrefixes: ['search', 'chat'],
        services: [
            { provider: 'openai', label: 'OpenAI embeddings', envVar: 'OPENAI_API_KEY', costModel: 'tokens', pricingNote: 'text-embedding-3-small — cheap.' },
        ],
    },
    {
        key: 'infrastructure',
        label: 'Always-on Infrastructure',
        description: 'Flat monthly fees that run regardless of feature switches.',
        switchKey: null,
        schedule: 'Continuous',
        operationPrefixes: [],
        services: [
            { provider: 'supabase', label: 'Supabase (database + storage)', costModel: 'flat', flatMonthlyUsd: 25, pricingNote: 'Paid plan — shared by staging & production. EDIT in registry.ts to match the real bill.' },
            { provider: 'firebase', label: 'Firebase App Hosting', costModel: 'flat', flatMonthlyUsd: 5, pricingNote: 'Cloud Run hosting + build minutes (estimate).' },
            { provider: 'n8n', label: 'n8n (awetomatic) automation', costModel: 'flat', flatMonthlyUsd: 0, pricingNote: 'Webhook automation host (set if billed).' },
        ],
    },
];

/**
 * Masked tail of a secret for admin display, e.g. "…_6d4k1". Computed
 * server-side from process.env; the full value is never returned. Returns null
 * if the env var is unset.
 */
export function maskKey(envVar?: string): string | null {
    if (!envVar) return null;
    const v = process.env[envVar];
    if (!v) return null;
    const tail = v.slice(-5);
    return `…${tail}`;
}
