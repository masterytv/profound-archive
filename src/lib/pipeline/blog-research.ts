/**
 * Blog Pipeline — Perplexity Research Module
 *
 * Calls Perplexity Sonar Pro to fetch authoritative sources on a question.
 * Uses a focused domain filter to ensure academic + high-authority results.
 */

import { buildResearchPrompt } from './blog-prompts';

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

// ─── Domain Filter ────────────────────────────────────────────────────────────
// High-authority academic, journal, news, and NDE-specific sources.
// Perplexity search_domain_filter accepts up to 10 domains — we pass the top ones
// and let the general query catch the rest.

const RESEARCH_DOMAINS = [
    'pubmed.ncbi.nlm.nih.gov',
    'iands.org',
    'nderf.org',
    'frontiersin.org',
    'sciencedirect.com',
    'apa.org',
    'nytimes.com',
    'scientificamerican.com',
    'theatlantic.com',
    'psychologytoday.com',
];

// ─── Client ───────────────────────────────────────────────────────────────────

function getPerplexityClient() {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error('Missing PERPLEXITY_API_KEY environment variable');
    return apiKey;
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Research a question using Perplexity Sonar Pro.
 * Returns a structured brief with key findings and citations.
 */
export async function researchQuestion(question: string): Promise<ResearchResult> {
    const apiKey = getPerplexityClient();

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
                    content: 'You are a research assistant producing structured research briefs for science journalists. Be precise, cite sources inline, and prioritize peer-reviewed evidence.',
                },
                {
                    role: 'user',
                    content: buildResearchPrompt(question),
                },
            ],
            search_domain_filter: RESEARCH_DOMAINS,
            return_citations: true,
            search_recency_filter: 'month', // prefer recent but not limited to
            temperature: 0.2, // low temp for factual research
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
        citations?: Array<{ url: string; title?: string; snippet?: string }>;
    };

    const rawText = data.choices[0]?.message?.content ?? '';

    // Parse citations from Perplexity's structured response
    const citations: ResearchCitation[] = (data.citations ?? []).map((c) => ({
        url: c.url ?? '',
        title: c.title ?? c.url ?? '',
        snippet: c.snippet ?? '',
    }));

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
