/**
 * Blog Pipeline — Tavily Research Module
 *
 * Calls Tavily Search API to fetch authoritative sources on a question.
 * Includes citation usage tracking to prevent the same studies from
 * appearing in every article.
 *
 * Migration history:
 * - 2026-05-04: Replaced Perplexity Sonar Pro with Tavily (free tier, 1K credits/mo).
 *   Perplexity quota exhausted; Tavily provides richer structured results
 *   (title + url + content per result) vs Perplexity's flat citation arrays.
 * - 2026-03-19: Temperature 0.2 → 0.4, domain list expanded, random rotation added.
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
    rawText: string; // full research response for the draft prompt
}

// ─── Domain Filter (expanded + rotated) ───────────────────────────────────────
// 15 high-authority domains. Each call picks 8 randomly to ensure
// different domains surface different articles across calls.

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
 * Ensures different Tavily calls search different domain subsets.
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

function getTavilyApiKey() {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error('Missing TAVILY_API_KEY environment variable');
    return apiKey;
}

// ─── Tavily Search Helper ─────────────────────────────────────────────────────

interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
    raw_content?: string | null;
}

interface TavilySearchResponse {
    query: string;
    answer?: string;
    results: TavilySearchResult[];
    response_time: string;
}

/**
 * Call Tavily Search API. Returns structured results with AI answer.
 * Basic search = 1 credit, Advanced = 2 credits.
 */
async function tavilySearch(params: {
    query: string;
    searchDepth?: 'basic' | 'advanced';
    maxResults?: number;
    includeDomains?: string[];
    includeAnswer?: boolean | 'basic' | 'advanced';
}): Promise<TavilySearchResponse> {
    const apiKey = getTavilyApiKey();

    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: params.query,
            search_depth: params.searchDepth ?? 'basic',
            max_results: params.maxResults ?? 10,
            include_domains: params.includeDomains,
            include_answer: params.includeAnswer ?? true,
            topic: 'general',
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<TavilySearchResponse>;
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
 * Research a question using Tavily Search.
 * Returns a structured brief with key findings and citations.
 */
export async function researchQuestion(question: string, consumerQuestion?: string): Promise<ResearchResult> {
    const domains = pickRandomDomains(DOMAINS_PER_CALL);

    console.log(`[research] Tavily search using ${domains.length} domains: ${domains.join(', ')}`);

    // Build the research prompt — same prompt used previously, now sent as the search query
    const researchPrompt = buildResearchPrompt(question, consumerQuestion);

    const data = await tavilySearch({
        query: researchPrompt,
        searchDepth: 'basic', // 1 credit per call
        maxResults: 10,
        includeDomains: domains,
        includeAnswer: true,
    });

    // The AI-generated answer serves as the research summary for Claude
    const rawText = data.answer ?? data.results.map(r => `${r.title}\n${r.content}`).join('\n\n');

    // Map Tavily results to our citation format
    const citations: ResearchCitation[] = data.results
        .filter(r => r.url && r.url.length > 0)
        .map(r => ({
            url: r.url,
            title: r.title || r.url,
            snippet: r.content || '',
        }));

    if (citations.length === 0) {
        // Fallback: extract URLs from the answer text
        const urlRegex = /https?:\/\/[^\s\])"']+/g;
        const foundUrls = [...new Set(rawText.match(urlRegex) ?? [])];
        citations.push(...foundUrls.map((url) => ({
            url,
            title: url,
            snippet: '',
        })));
        if (citations.length > 0) {
            console.log(`[research] Extracted ${citations.length} URLs from answer text (no structured results)`);
        }
    }

    // Extract key findings as bullet lines from the answer text
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
 * Uses advanced search depth for better relevance on broad topics.
 */
export async function researchGuideTopic(title: string, targetQuery: string): Promise<ResearchResult> {
    const domains = pickRandomDomains(DOMAINS_PER_CALL);

    const data = await tavilySearch({
        query: buildGuideResearchPrompt(title, targetQuery),
        searchDepth: 'advanced', // 2 credits — higher quality for comprehensive guides
        maxResults: 15,
        includeDomains: domains,
        includeAnswer: 'advanced',
    });

    const rawText = data.answer ?? data.results.map(r => `${r.title}\n${r.content}`).join('\n\n');

    // Same flexible parsing as researchQuestion
    let citations: ResearchCitation[] = data.results
        .filter(r => r.url && r.url.length > 0)
        .map(r => ({
            url: r.url,
            title: r.title || r.url,
            snippet: r.content || '',
        }));

    // Fallback: extract URLs from answer text if no structured results
    if (citations.length === 0) {
        const urlRegex = /https?:\/\/[^\s\])"']+/g;
        const foundUrls = [...new Set(rawText.match(urlRegex) ?? [])];
        citations = foundUrls.map((url) => ({
            url,
            title: url,
            snippet: '',
        }));
        if (citations.length > 0) {
            console.log(`[research-guide] Extracted ${citations.length} URLs from answer text (no structured results)`);
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
