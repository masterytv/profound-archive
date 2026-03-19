/**
 * Blog Pipeline — Perplexity Research Module
 *
 * Calls Perplexity Sonar Pro to fetch authoritative sources on a question.
 * Includes citation usage tracking to prevent the same studies from
 * appearing in every article.
 *
 * Changes (2026-03-19):
 * - Temperature 0.2 → 0.4 for more variety
 * - Domain list expanded from 10 → 15, randomly rotating 8 per call
 * - Added getOverusedCitationUrls() for filtering before draft step
 */

import { buildResearchPrompt } from './blog-prompts';
import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResearchCitation {
    url: string;
    title: string;
    snippet: string;
}

export interface ResearchResult {
    summary: string;
    keyFindings: string[];
    citations: ResearchCitation[];
    rawText: string; // full Perplexity response for the draft prompt
}

// ─── Domain Filter (expanded + rotated) ───────────────────────────────────────
// 15 high-authority domains. Each call picks 8 randomly to stay within
// Perplexity's limit while ensuring different domains surface different articles.

const ALL_RESEARCH_DOMAINS = [
    // Academic / journal
    'pubmed.ncbi.nlm.nih.gov',
    'pmc.ncbi.nlm.nih.gov',
    'frontiersin.org',
    'journals.sagepub.com',
    'thelancet.com',
    // NDE-specific research
    'iands.org',
    'nderf.org',
    'near-death.com',
    'med.virginia.edu',
    'brucegreyson.com',
    // Broader consciousness / afterlife
    'bigelowinstitute.org',
    'magiscenter.com',
    'noeticmap.com',
    // Popular science / psychology
    'psychologytoday.com',
    'scientificamerican.com',
];

const DOMAINS_PER_CALL = 8;

/**
 * Fisher-Yates shuffle + slice to pick N random domains per call.
 * Ensures different Perplexity calls search different domain subsets.
 */
function pickRandomDomains(count: number): string[] {
    const shuffled = [...ALL_RESEARCH_DOMAINS];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

// ─── Client ───────────────────────────────────────────────────────────────────

function getPerplexityClient() {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error('Missing PERPLEXITY_API_KEY environment variable');
    return apiKey;
}

// ─── Citation Usage Tracking ──────────────────────────────────────────────────

/**
 * Query all published blog_posts.refs to find URLs that have been cited
 * across existing articles. Returns a Map of url → usage count.
 *
 * This is used to filter out overused citations before passing research
 * to the Claude draft step — deterministic, not prompt-dependent.
 */
export async function getCitationUsageCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return counts;

        const supabase = createClient(url, key);
        const { data } = await supabase
            .from('blog_posts')
            .select('refs')
            .not('refs', 'is', null);

        for (const row of data ?? []) {
            const refs = row.refs as Array<{ url?: string | null }> | null;
            if (!Array.isArray(refs)) continue;
            for (const ref of refs) {
                if (ref.url) {
                    counts.set(ref.url, (counts.get(ref.url) ?? 0) + 1);
                }
            }
        }

        console.log(`[research] Citation usage: ${counts.size} unique URLs across ${(data ?? []).length} articles`);
    } catch (err) {
        console.warn(`[research] Failed to fetch citation usage (non-fatal): ${err}`);
    }
    return counts;
}

/**
 * Filter a list of citations to remove any that have been used ≥ maxUses times.
 * Guarantees at least minKeep citations remain (keeps least-used if filtering
 * would drop below the minimum).
 */
export function filterOverusedCitations(
    citations: ResearchCitation[],
    usageCounts: Map<string, number>,
    maxUses = 3,
    minKeep = 5,
): ResearchCitation[] {
    // Sort by usage count (ascending) so least-used come first
    const sorted = [...citations].sort((a, b) => {
        const countA = usageCounts.get(a.url) ?? 0;
        const countB = usageCounts.get(b.url) ?? 0;
        return countA - countB;
    });

    const filtered = sorted.filter((c) => (usageCounts.get(c.url) ?? 0) < maxUses);

    // If filtering dropped below minimum, keep least-used ones regardless
    if (filtered.length < minKeep) {
        return sorted.slice(0, Math.max(minKeep, filtered.length));
    }

    const removed = citations.length - filtered.length;
    if (removed > 0) {
        console.log(`[research] Filtered out ${removed} overused citation(s) (used ≥${maxUses} times)`);
    }
    return filtered;
}

/**
 * Get the set of overused citation URLs (≥3 uses) for exclusion in
 * downstream modules like NoeticMap search.
 */
export async function getOverusedUrls(maxUses = 3): Promise<Set<string>> {
    const counts = await getCitationUsageCounts();
    const overused = new Set<string>();
    for (const [url, count] of counts) {
        if (count >= maxUses) overused.add(url);
    }
    return overused;
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Research a question using Perplexity Sonar Pro.
 * Returns a structured brief with key findings and citations.
 */
export async function researchQuestion(question: string, consumerQuestion?: string): Promise<ResearchResult> {
    const apiKey = getPerplexityClient();
    const domains = pickRandomDomains(DOMAINS_PER_CALL);

    console.log(`[research] Perplexity search using ${domains.length} domains: ${domains.join(', ')}`);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
                {
                    role: 'system',
                    content: 'You are a compassionate research assistant for a blog about near-death experiences. You gather information from scientific research, popular websites and blogs, books about NDEs, and other high-authority sources. Be precise about sources and citations.',
                },
                {
                    role: 'user',
                    content: buildResearchPrompt(question, consumerQuestion),
                },
            ],
            search_domain_filter: domains,
            return_citations: true,
            search_recency_filter: 'month', // prefer recent but not limited to
            temperature: 0.4, // increased from 0.2 for more variety
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        citations?: Array<string | { url: string; title?: string; snippet?: string }>;
    };

    const rawText = data.choices[0]?.message?.content ?? '';

    // Parse citations from Perplexity's structured response
    // Perplexity sometimes returns citations as plain URL strings, sometimes as objects
    let citations: ResearchCitation[] = (data.citations ?? []).map((c) => {
        if (typeof c === 'string') {
            return { url: c, title: c, snippet: '' };
        }
        return {
            url: c.url ?? '',
            title: c.title ?? c.url ?? '',
            snippet: c.snippet ?? '',
        };
    }).filter(c => c.url.length > 0);

    // Fallback: if no structured citations, extract URLs from the raw text
    if (citations.length === 0) {
        const urlRegex = /https?:\/\/[^\s\])"']+/g;
        const foundUrls = [...new Set(rawText.match(urlRegex) ?? [])];
        citations = foundUrls.map((url) => ({
            url,
            title: url,
            snippet: '',
        }));
        if (citations.length > 0) {
            console.log(`[research] Extracted ${citations.length} URLs from raw text (no structured citations)`);
        }
    }

    // Extract key findings as bullet lines from the raw text
    const keyFindings = rawText
        .split('\n')
        .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line) => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 8);

    return {
        summary: rawText,
        keyFindings,
        citations,
        rawText,
    };
}

// ─── Guide Variant (broader coverage for pillar pages) ────────────────────────

import { buildGuideResearchPrompt } from './blog-prompts';

/**
 * Research a topic comprehensively for a pillar guide page.
 * Uses a broader prompt and higher max_tokens than single-question research.
 */
export async function researchGuideTopic(title: string, targetQuery: string): Promise<ResearchResult> {
    const apiKey = getPerplexityClient();
    const domains = pickRandomDomains(DOMAINS_PER_CALL);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
                {
                    role: 'system',
                    content: 'You are a comprehensive research assistant for a pillar guide about near-death experiences. This guide must be the most authoritative page on the internet for this topic. Gather data from scientific research, books, popular sources, and cultural perspectives. Be precise about sources and citations.',
                },
                {
                    role: 'user',
                    content: buildGuideResearchPrompt(title, targetQuery),
                },
            ],
            search_domain_filter: domains,
            return_citations: true,
            search_recency_filter: 'month',
            temperature: 0.4, // increased from 0.2
            max_tokens: 3000,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        citations?: Array<string | { url: string; title?: string; snippet?: string }>;
    };

    const rawText = data.choices[0]?.message?.content ?? '';

    // Same flexible parsing as researchQuestion — handles both string and object arrays
    let citations: ResearchCitation[] = (data.citations ?? []).map((c) => {
        if (typeof c === 'string') {
            return { url: c, title: c, snippet: '' };
        }
        return {
            url: c.url ?? '',
            title: c.title ?? c.url ?? '',
            snippet: c.snippet ?? '',
        };
    }).filter(c => c.url.length > 0);

    // Fallback: extract URLs from raw text if no structured citations
    if (citations.length === 0) {
        const urlRegex = /https?:\/\/[^\s\])"']+/g;
        const foundUrls = [...new Set(rawText.match(urlRegex) ?? [])];
        citations = foundUrls.map((url) => ({
            url,
            title: url,
            snippet: '',
        }));
        if (citations.length > 0) {
            console.log(`[research-guide] Extracted ${citations.length} URLs from raw text (no structured citations)`);
        }
    }

    const keyFindings = rawText
        .split('\n')
        .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line) => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 15); // more findings for guides

    return {
        summary: rawText,
        keyFindings,
        citations,
        rawText,
    };
}
