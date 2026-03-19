/**
 * Blog Pipeline — NoeticMap Research Module
 *
 * Queries NoeticMap's semantic search API (869+ NDE papers indexed)
 * to find topic-relevant academic papers that Perplexity misses.
 *
 * Two endpoints used:
 *   1. /api/research/hub-search?q=...&limit=N  — semantic vector search
 *   2. Paper metadata includes: title, authors, journal, year, DOI, abstract
 *
 * Returns formatted citations with DOI-based links for the draft prompt.
 */

import type { ResearchCitation } from './blog-research';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoeticMapPaper {
    id: number;
    title: string;
    authors: string;
    journal: string;
    year: number | null;
    doi: string | null;
    abstract_preview: string;
    similarity?: number;
    evidence_tier?: number;
    triage_result?: string;
}

interface NoeticMapSearchResponse {
    papers: Array<{ paper: NoeticMapPaper; similarity: number }>;
    results?: Array<{ type: string; id: number; similarity: number; data: NoeticMapPaper }>;
    total: number;
    query: string;
}

// ─── DOI → URL Construction ──────────────────────────────────────────────────

function doiToUrl(doi: string | null): string | null {
    if (!doi) return null;
    // Some DOIs are already full URLs
    if (doi.startsWith('http')) return doi;
    // Standard DOI resolution
    return `https://doi.org/${doi}`;
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Query NoeticMap's semantic search for NDE papers relevant to a topic.
 * Returns formatted citations compatible with the Perplexity research format.
 *
 * @param query - The search query (article question or topic)
 * @param limit - Max papers to return (default 10)
 * @param excludeUrls - URLs already overused in previous articles
 */
export async function searchNoeticMap(
    query: string,
    limit = 10,
    excludeUrls: Set<string> = new Set(),
): Promise<{ citations: ResearchCitation[]; rawSummary: string }> {
    try {
        const encoded = encodeURIComponent(query);
        const response = await fetch(
            `https://www.noeticmap.com/api/research/hub-search?q=${encoded}&limit=${Math.min(limit + 5, 20)}`,
            {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(10_000), // 10s timeout — non-critical step
            },
        );

        if (!response.ok) {
            console.warn(`[noeticmap] API returned ${response.status}, skipping`);
            return { citations: [], rawSummary: '' };
        }

        const data = (await response.json()) as NoeticMapSearchResponse;
        const papers = data.papers ?? [];

        // Filter to papers only (not cases), with reasonable similarity
        const relevantPapers = papers
            .filter((p) => p.similarity > 0.5) // above 0.5 cosine = reasonably relevant
            .map((p) => p.paper)
            .filter((p) => {
                // Skip if this paper's DOI URL is already overused
                const url = doiToUrl(p.doi);
                return !url || !excludeUrls.has(url);
            })
            .slice(0, limit);

        // Format as citations
        const citations: ResearchCitation[] = relevantPapers.map((p) => ({
            url: doiToUrl(p.doi) ?? '',
            title: `${p.authors}${p.year ? ` (${p.year})` : ''}. ${p.title} ${p.journal ? `— ${p.journal}` : ''}`.trim(),
            snippet: p.abstract_preview ?? '',
        }));

        // Build a summary block for the draft prompt
        const rawSummary = relevantPapers.length > 0
            ? `\n\nADDITIONAL ACADEMIC PAPERS (from NoeticMap, 869+ indexed NDE studies):\n` +
              relevantPapers.map((p, i) => {
                  const url = doiToUrl(p.doi);
                  return [
                      `[NM-${i + 1}] ${p.authors}${p.year ? ` (${p.year})` : ''}. "${p.title}"`,
                      p.journal ? `  Journal: ${p.journal}` : null,
                      url ? `  URL: ${url}` : null,
                      p.abstract_preview ? `  Abstract: ${p.abstract_preview.slice(0, 200)}...` : null,
                  ].filter(Boolean).join('\n');
              }).join('\n\n')
            : '';

        console.log(`[noeticmap] Found ${relevantPapers.length} relevant papers for "${query.slice(0, 50)}..."`);
        return { citations, rawSummary };
    } catch (err) {
        // Non-fatal — if NoeticMap is down, we still have Perplexity
        console.warn(`[noeticmap] Search failed (non-fatal): ${err}`);
        return { citations: [], rawSummary: '' };
    }
}
