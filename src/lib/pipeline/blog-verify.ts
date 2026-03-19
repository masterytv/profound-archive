/**
 * Blog Article Verification Pipeline
 *
 * Ported from the pillar pipeline (test-pipeline-v2.mjs).
 * Adds fact-checking, link validation, and citation accuracy to the
 * blog article pipeline without changing voice or tone.
 *
 * 3 stages:
 * 1. Claim extraction + fact-checking (GPT-4o-mini + Perplexity)
 * 2. Link validation (health + relevance + fix/strip)
 * 3. Correction pass (Claude Sonnet 4.5 — surgical fact fixes only)
 */

import OpenAI from 'openai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleReference {
    title: string;
    url: string | null;
    type: 'academic' | 'book' | 'site';
}

interface LinkInfo {
    text: string;
    url: string;
    source: 'body' | 'refs';
    status?: number;
    ok?: boolean;
    error?: string;
    skipped?: string;
}

interface VerifyResult {
    body_mdx: string;
    references: ArticleReference[];
    stats: {
        claims_extracted: number;
        claims_correct: number;
        claims_incorrect: number;
        claims_partial: number;
        claims_unverifiable: number;
        links_checked: number;
        links_ok: number;
        links_fixed: number;
        links_stripped: number;
    };
}

// ─── Clients ──────────────────────────────────────────────────────────────────

function getOpenRouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
    return new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
            'HTTP-Referer': 'https://projectprofound.org',
            'X-Title': 'Project Profound Blog Pipeline',
        },
    });
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Academic domains that block bots but are always valid
const TRUSTED_DOMAINS = [
    'pmc.ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov', 'doi.org',
    'med.virginia.edu', 'frontiersin.org', 'tandfonline.com',
    'springer.com', 'nature.com', 'sciencedirect.com', 'wiley.com',
    'journals.sagepub.com',
];

// Words too common to be useful for keyword overlap matching
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'of', 'in', 'to', 'and', 'is', 'for', 'on', 'with',
    'by', 'at', 'from', 'or', 'as', 'are', 'was', 'were', 'be', 'been',
    'its', 'it', 'this', 'that', 'these', 'their', 'not', 'but', 'has',
    'had', 'have', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'can', 'shall', 'no', 'so', 'if', 'than', 'into',
    'role', 'study', 'research', 'review', 'analysis', 'article', 'paper',
]);

/**
 * Deterministic keyword overlap check for PubMed/academic links.
 * Extracts significant keywords from both the claim/anchor text and the page title,
 * then checks if there is ANY meaningful overlap. Zero overlap = guaranteed mismatch.
 *
 * Why: GPT-4o-mini failed to catch "Role of hormones in puberty" being used for
 * "Van Lommel cardiac arrest Lancet study." A simple keyword check catches this trivially.
 */
function hasTitleKeywordOverlap(claimText: string, pageTitle: string): { overlaps: boolean; claimKeywords: string[]; titleKeywords: string[] } {
    const extractKeywords = (text: string): string[] =>
        text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    const claimKeywords = extractKeywords(claimText);
    const titleKeywords = extractKeywords(pageTitle);

    if (claimKeywords.length === 0 || titleKeywords.length === 0) {
        // Can't determine overlap with no keywords — assume OK
        return { overlaps: true, claimKeywords, titleKeywords };
    }

    const titleSet = new Set(titleKeywords);
    const overlapping = claimKeywords.filter(k => titleSet.has(k));
    return { overlaps: overlapping.length > 0, claimKeywords, titleKeywords };
}

// Sites that return 200 with error pages instead of proper 404s
const SOFT_404_PATTERNS = [
    { domain: 'amazon.com', bodyIndicators: ["Sorry, we couldn't find that page", "we couldn\u2019t find that page", 'id="noResultsTitle"'] },
    { domain: 'nderf.org', bodyIndicators: ['<title>404', 'Page Not Found', '<h1>Not Found</h1>'] },
];

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ─── Stage 1: Fact-Check ──────────────────────────────────────────────────────

async function extractAndVerifyClaims(
    article: string,
    refs: ArticleReference[],
): Promise<{
    correctedBody: string;
    correctedRefs: ArticleReference[];
    stats: VerifyResult['stats'];
}> {
    const openRouter = getOpenRouter();
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityKey) throw new Error('Missing PERPLEXITY_API_KEY');

    // ── Step 1a: Extract claims with GPT-4o-mini ──
    console.log('    [verify] Extracting factual claims...');

    const extractResponse = await openRouter.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are a meticulous fact-checking editor. Extract EVERY specific factual claim that can be verified. Look for: numbers, percentages, dates, study names, researcher attributions, book details, organization facts, medical/scientific assertions.

For each claim return:
- "claim": exact quote from the article
- "context": what needs to be verified
- "entities": key names for source searching

Return a JSON array. Be exhaustive — extract at least 20 claims.`,
            },
            { role: 'user', content: article },
        ],
        max_tokens: 12000,
        temperature: 0,
    });

    let claimsRaw = extractResponse.choices[0]?.message?.content ?? '[]';
    // Strip markdown code fences (GPT-4o-mini wraps JSON in ```json...```)
    claimsRaw = claimsRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    if (!claimsRaw.startsWith('[')) claimsRaw = '[' + claimsRaw;

    let claims: Array<{ claim: string; context: string; entities: string[] }>;
    try {
        claims = JSON.parse(claimsRaw);
    } catch {
        console.warn('    [verify] Claims JSON parse failed, skipping fact-check');
        return {
            correctedBody: article,
            correctedRefs: refs,
            stats: { claims_extracted: 0, claims_correct: 0, claims_incorrect: 0, claims_partial: 0, claims_unverifiable: 0, links_checked: 0, links_ok: 0, links_fixed: 0, links_stripped: 0 },
        };
    }

    console.log(`    [verify] Extracted ${claims.length} claims`);

    // ── Step 1b: Verify via Perplexity ──
    console.log('    [verify] Verifying claims via Perplexity...');

    const claimsList = claims.map((c, i) =>
        `[${i + 1}] CLAIM: "${c.claim}"\n    VERIFY: ${c.context}\n    SEARCH: ${c.entities?.join(', ') ?? 'none'}`
    ).join('\n\n');

    const verifyRes = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${perplexityKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
                { role: 'system', content: 'You are a meticulous fact-checker. Search academic databases and authoritative sources to verify each claim. Return valid JSON.' },
                {
                    role: 'user',
                    content: `Fact-check ${claims.length} claims from an NDE article. For EACH claim:
1. VERIFY accuracy (numbers, dates, attributions)
2. CORRECT if wrong
3. SOURCE: find primary URL (PubMed, journal, org homepage)
4. TYPE: "academic", "book", or "site"

CLAIMS:\n${claimsList}\n\nReturn JSON array: [{"claim_number": N, "status": "correct"|"incorrect"|"partially_correct"|"unverifiable", "correction": null or corrected info, "source_title": "...", "source_url": "...", "source_type": "...", "notes": "..."}]`,
                },
            ],
            return_citations: true,
            temperature: 0.1,
            max_tokens: 12000,
        }),
    });

    if (!verifyRes.ok) throw new Error(`Verify ${verifyRes.status}: ${await verifyRes.text()}`);
    const verifyData = await verifyRes.json();
    const verifyText = verifyData.choices[0]?.message?.content ?? '';
    const verifyCitations = verifyData.citations ?? [];

    // Parse verification results
    let verified: unknown;
    const jsonMatch = verifyText.match(/\[[\s\S]*\]/);
    if (jsonMatch) { try { verified = JSON.parse(jsonMatch[0]); } catch { /* */ } }
    if (!verified) verified = verifyText;

    const stats = { claims_extracted: claims.length, claims_correct: 0, claims_incorrect: 0, claims_partial: 0, claims_unverifiable: 0, links_checked: 0, links_ok: 0, links_fixed: 0, links_stripped: 0 };

    if (Array.isArray(verified)) {
        for (const v of verified as Array<{ status: string }>) {
            if (v.status === 'correct') stats.claims_correct++;
            else if (v.status === 'incorrect') stats.claims_incorrect++;
            else if (v.status === 'partially_correct') stats.claims_partial++;
            else stats.claims_unverifiable++;
        }
    }

    console.log(`    [verify] ✓${stats.claims_correct} ✗${stats.claims_incorrect} ~${stats.claims_partial} ?${stats.claims_unverifiable}`);

    // ── Step 1c: Apply corrections ──
    console.log('    [verify] Applying corrections...');

    const verificationText = typeof verified === 'string' ? verified : JSON.stringify(verified, null, 2);

    const correctResponse = await openRouter.chat.completions.create({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [
            {
                role: 'system',
                content: `You are an expert copy editor doing a final fact-check pass on a near-death experience article. You have three jobs:

1. CORRECT FACTS: For every claim marked "incorrect" or "partially_correct", surgically change ONLY the specific wrong detail. Do NOT change surrounding prose, voice, or structure.

2. SOFTEN UNVERIFIABLE CLAIMS: For "unverifiable" claims, replace specific numbers with hedging language UNLESS the verification data provides a likely source.

3. ADD MISSING INLINE LINKS: For sources in the verification data without inline links:
   - Studies → [study description](pubmed_url)
   - Organizations → [Org Name](homepage_url)
   - ⛔ Do NOT add links to books or Amazon
   - ⛔ Do NOT remove existing internal links (/video/, /questions/)
   - Do NOT link the same source more than twice

4. REFERENCES: Return refs containing ONLY sources cited in the body. If a book is mentioned by title/author, include it (url: null). Do NOT drop cited refs or add uncited ones.

CRITICAL RULES:
- Do NOT change voice, tone, or structure
- Do NOT add or remove sentences or em dashes
- Preserve all existing markdown links (external and internal)
- Preserve all ## and ### headings

OUTPUT FORMAT:
{
  "body_mdx": "the full corrected article",
  "references": [{"title": "Author (Year). Title.", "url": "https://... or null", "type": "academic"|"book"|"site"}]
}`,
            },
            {
                role: 'user',
                content: `ARTICLE:\n${article}\n\nEXISTING REFERENCES:\n${JSON.stringify(refs, null, 2)}\n\nVERIFICATION DATA:\n${verificationText}\n\n${verifyCitations.length ? `ADDITIONAL SOURCES:\n${verifyCitations.map((c: unknown, i: number) => `[${i + 1}] ${typeof c === 'string' ? c : JSON.stringify(c)}`).join('\n')}` : ''}`,
            },
            { role: 'assistant', content: '{' },
        ],
        max_tokens: 24000,
        temperature: 0.3,
    });

    const correctRaw = '{' + (correctResponse.choices[0]?.message?.content ?? '{}');
    const cleaned = correctRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let corrected: { body_mdx?: string; references?: ArticleReference[] };
    try {
        corrected = JSON.parse(cleaned);
    } catch {
        console.warn('    [verify] Correction parse failed, keeping original');
        return { correctedBody: article, correctedRefs: refs, stats };
    }

    return {
        correctedBody: corrected.body_mdx ?? article,
        correctedRefs: corrected.references ?? refs,
        stats,
    };
}

// ─── Stage 2: Link Validation ─────────────────────────────────────────────────

async function checkLink(link: LinkInfo): Promise<LinkInfo> {
    const softPatterns = SOFT_404_PATTERNS.find(p => link.url.includes(p.domain));
    const useGet = !!softPatterns;

    const doFetch = async (method: 'HEAD' | 'GET'): Promise<LinkInfo> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(link.url, {
            method,
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'User-Agent': BROWSER_UA },
        });
        clearTimeout(timeout);

        if (res.ok && softPatterns) {
            const body = await res.text();
            const bodyLower = body.toLowerCase();
            for (const indicator of softPatterns.bodyIndicators) {
                if (bodyLower.includes(indicator.toLowerCase())) {
                    return { ...link, status: res.status, ok: false, error: `soft-404: "${indicator}"` };
                }
            }
        }

        return { ...link, status: res.status, ok: res.ok };
    };

    try {
        return await doFetch(useGet ? 'GET' : 'HEAD');
    } catch {
        try {
            return await doFetch('GET');
        } catch (err) {
            return { ...link, status: 0, ok: false, error: (err as Error).message || 'timeout' };
        }
    }
}

async function getPageMetadata(link: LinkInfo): Promise<LinkInfo & { pageTitle?: string; pageAuthors?: string; pageSource?: string; pageDescription?: string }> {
    try {
        // PubMed: NCBI E-utilities API (free, no key)
        const pubmedMatch = link.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
        if (pubmedMatch) {
            const pmid = pubmedMatch[1];
            const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`);
            if (res.ok) {
                const data = await res.json();
                const paper = data.result?.[pmid];
                if (paper) {
                    const title = paper.title || '';
                    const authors = (paper.authors || []).map((a: { name: string }) => a.name).join(', ');
                    console.log(`    [links] PubMed ${pmid}: "${title.substring(0, 80)}" by ${authors.substring(0, 60)}`);
                    return { ...link, pageTitle: title, pageSource: paper.source || '', pageAuthors: authors };
                }
            }
        }

        // PMC: convert to PMID, then fetch
        const pmcMatch = link.url.match(/pmc\.ncbi\.nlm\.nih\.gov\/articles\/(PMC\d+)/);
        if (pmcMatch) {
            const convRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${pmcMatch[1]}[pmcid]&retmode=json`);
            if (convRes.ok) {
                const convData = await convRes.json();
                const pmid = convData.esearchresult?.idlist?.[0];
                if (pmid) {
                    const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`);
                    if (res.ok) {
                        const data = await res.json();
                        const paper = data.result?.[pmid];
                        if (paper) {
                            return { ...link, pageTitle: paper.title || '', pageSource: paper.source || '', pageAuthors: (paper.authors || []).map((a: { name: string }) => a.name).join(', ') };
                        }
                    }
                }
            }
        }

        // Other: fetch HTML <title>
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(link.url, { signal: controller.signal, headers: { 'User-Agent': BROWSER_UA } });
        clearTimeout(timeout);

        if (res.ok) {
            const html = await res.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
            return { ...link, pageTitle: titleMatch?.[1]?.trim() || '', pageDescription: descMatch?.[1]?.trim() || '' };
        }

        return { ...link, pageTitle: '' };
    } catch {
        return { ...link, pageTitle: '' };
    }
}

async function validateLinks(
    article: string,
    refs: ArticleReference[],
): Promise<{ body_mdx: string; references: ArticleReference[]; linksChecked: number; linksOk: number; linksFixed: number; linksStripped: number }> {
    const openRouter = getOpenRouter();
    const perplexityKey = process.env.PERPLEXITY_API_KEY;

    // Extract all external URLs
    const bodyLinks = [...(article.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g))].map(m => ({
        text: m[1], url: m[2], source: 'body' as const,
    }));
    const refLinks = (refs || []).filter(r => r.url).map(r => ({
        text: r.title, url: r.url!, source: 'refs' as const,
    }));

    const seen = new Set<string>();
    const allLinks: LinkInfo[] = [...bodyLinks, ...refLinks].filter(l => {
        if (seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
    });

    if (allLinks.length === 0) {
        return { body_mdx: article, references: refs, linksChecked: 0, linksOk: 0, linksFixed: 0, linksStripped: 0 };
    }

    // Separate trusted vs checkable
    const trustedLinks = allLinks.filter(l => TRUSTED_DOMAINS.some(d => l.url.includes(d)));
    const checkableLinks = allLinks.filter(l => !TRUSTED_DOMAINS.some(d => l.url.includes(d)));

    console.log(`    [links] ${trustedLinks.length} trusted, ${checkableLinks.length} to check`);

    // ── Health check ──
    const results: LinkInfo[] = trustedLinks.map(l => ({ ...l, status: 200, ok: true, skipped: 'trusted' }));
    const CONCURRENCY = 5;
    for (let i = 0; i < checkableLinks.length; i += CONCURRENCY) {
        const batch = checkableLinks.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map(checkLink));
        results.push(...batchResults);
    }

    // ── Relevance check ──
    const linksToVerify = results.filter(r => (r.ok && !r.skipped) || r.skipped);
    if (linksToVerify.length > 0) {
        console.log(`    [links] Checking ${linksToVerify.length} for relevance...`);

        const metadataResults = [];
        for (let i = 0; i < linksToVerify.length; i += 3) {
            const batch = linksToVerify.slice(i, i + 3);
            const batchResults = await Promise.all(batch.map(getPageMetadata));
            metadataResults.push(...batchResults);
            if (i + 3 < linksToVerify.length) await new Promise(r => setTimeout(r, 400));
        }

        const linksWithMeta = metadataResults.filter(l => l.pageTitle);

        // ── Deterministic PubMed/PMC title mismatch check ──
        // Catches obvious mismatches (e.g., "puberty study" for "cardiac arrest NDE")
        // without relying on an LLM. Zero keyword overlap = auto-flag.
        for (const link of linksWithMeta) {
            const isPubMed = link.url.includes('pubmed.ncbi.nlm.nih.gov') || link.url.includes('pmc.ncbi.nlm.nih.gov');
            if (!isPubMed || !link.pageTitle) continue;

            const { overlaps, claimKeywords, titleKeywords } = hasTitleKeywordOverlap(link.text, link.pageTitle);
            if (!overlaps) {
                const resultIdx = results.findIndex(r => r.url === link.url);
                if (resultIdx >= 0) {
                    results[resultIdx].ok = false;
                    results[resultIdx].error = `PubMed title mismatch: claim=[${claimKeywords.join(',')}] vs page=[${titleKeywords.join(',')}]`;
                }
                console.log(`    [links] ✗ PUBMED MISMATCH: "${link.text}" → page title: "${link.pageTitle}"`);
                console.log(`             claim keywords: [${claimKeywords.join(', ')}]`);
                console.log(`             title keywords: [${titleKeywords.join(', ')}]`);
            }
        }

        // ── LLM relevance check for remaining links (GPT-4o for better accuracy) ──
        const linksForLlmCheck = linksWithMeta.filter(l => {
            const resultEntry = results.find(r => r.url === l.url);
            // Skip links already flagged by deterministic check
            return resultEntry?.ok !== false;
        });

        if (linksForLlmCheck.length > 0) {
            try {
                const relResponse = await openRouter.chat.completions.create({
                    // GPT-4o (not mini) — mini failed to catch "puberty" vs "cardiac arrest"
                    model: 'openai/gpt-4o',
                    messages: [
                        { role: 'system', content: 'You are a citation accuracy checker. For each link, determine if the page content is actually about the topic claimed in the anchor text. Be STRICT: if the page title is about a completely different subject than what the link text claims, mark it irrelevant. Return JSON only.' },
                        {
                            role: 'user',
                            content: `Check if each link's page content matches the claim it's attached to.\n\nLINKS:\n${linksForLlmCheck.map((l, i) => `[${i + 1}] CLAIM: "${l.text}"\n    URL: ${l.url}\n    PAGE TITLE: "${l.pageTitle}"\n    ${l.pageAuthors ? `AUTHORS: ${l.pageAuthors}` : ''}\n    ${l.pageSource ? `JOURNAL: ${l.pageSource}` : ''}\n    ${l.pageDescription ? `DESCRIPTION: ${l.pageDescription}` : ''}`).join('\n\n')}\n\nReturn JSON: [{"index": N, "verdict": "relevant|irrelevant|uncertain", "reason": "..."}]`,
                        },
                    ],
                    temperature: 0,
                    max_tokens: 2000,
                });

                const relText = relResponse.choices[0]?.message?.content ?? '';
                const relMatch = relText.match(/\[[\s\S]*\]/);
                if (relMatch) {
                    const verdicts = JSON.parse(relMatch[0]) as Array<{ index: number; verdict: string; reason: string }>;
                    for (const v of verdicts) {
                        const link = linksForLlmCheck[v.index - 1];
                        if (!link || v.verdict !== 'irrelevant') continue;
                        const resultIdx = results.findIndex(r => r.url === link.url);
                        if (resultIdx >= 0) {
                            results[resultIdx].ok = false;
                            results[resultIdx].error = `irrelevant: ${v.reason}`;
                        }
                        console.log(`    [links] ✗ IRRELEVANT: "${link.text}" → ${link.pageTitle?.substring(0, 50)}`);
                    }
                }
            } catch {
                console.warn('    [links] Relevance check failed, continuing');
            }
        }
    }

    // ── Fix/strip broken links ──
    const bad = results.filter(r => !r.ok);
    let linksFixed = 0;
    let linksStripped = 0;
    let fixedArticle = article;
    let fixedRefs = [...refs];

    if (bad.length > 0 && perplexityKey) {
        console.log(`    [links] ${bad.length} broken/irrelevant, searching for replacements...`);

        const fixPrompt = `Fix these broken/irrelevant URLs from an NDE article:\n\n${bad.map((b, i) => `[${i + 1}] ${b.error?.startsWith('irrelevant') ? 'IRRELEVANT' : 'BROKEN'}: ${b.url}\n    TEXT: "${b.text}"\n    ERROR: ${b.error || 'HTTP ' + b.status}`).join('\n\n')}\n\nRules: Prefer HTTPS. For PubMed use https://pubmed.ncbi.nlm.nih.gov/PMID/. Do NOT link to Amazon (return null for books).\n\nReturn JSON: [{"broken_url": "...", "replacement_url": "... or null", "notes": "..."}]`;

        try {
            const fixRes = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${perplexityKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'sonar-pro',
                    messages: [
                        { role: 'system', content: 'Find working replacement URLs. Return valid JSON.' },
                        { role: 'user', content: fixPrompt },
                    ],
                    temperature: 0.1,
                    max_tokens: 4000,
                }),
            });

            if (fixRes.ok) {
                const fixData = await fixRes.json();
                const fixText = fixData.choices[0]?.message?.content ?? '';
                const fixMatch = fixText.match(/\[[\s\S]*\]/);
                if (fixMatch) {
                    const fixes = JSON.parse(fixMatch[0]) as Array<{ broken_url: string; replacement_url: string | null }>;

                    for (const fix of fixes) {
                        // Find the original bad link to get its claim text
                        const badLink = bad.find(b => b.url === fix.broken_url);

                        if (fix.replacement_url) {
                            // Reject if replacement is the same as the broken URL
                            if (fix.replacement_url === fix.broken_url) {
                                console.log(`    [links] ↻ Replacement same as broken, stripping: ${fix.broken_url}`);
                                fixedArticle = stripLink(fixedArticle, fix.broken_url);
                                fixedRefs = fixedRefs.filter(r => r.url !== fix.broken_url);
                                linksStripped++;
                                continue;
                            }

                            // Verify replacement: HTTP health check
                            const verifyResult = await checkLink({ url: fix.replacement_url, text: '', source: 'body' });
                            if (!verifyResult.ok) {
                                fixedArticle = stripLink(fixedArticle, fix.broken_url);
                                fixedRefs = fixedRefs.filter(r => r.url !== fix.broken_url);
                                linksStripped++;
                                continue;
                            }

                            // For PubMed replacements: also verify content relevance via title keyword overlap
                            const isPubMedReplacement = fix.replacement_url.includes('pubmed.ncbi.nlm.nih.gov') || fix.replacement_url.includes('pmc.ncbi.nlm.nih.gov');
                            if (isPubMedReplacement && badLink?.text) {
                                const metaResult = await getPageMetadata({ url: fix.replacement_url, text: badLink.text, source: 'body' });
                                if (metaResult.pageTitle) {
                                    const { overlaps } = hasTitleKeywordOverlap(badLink.text, metaResult.pageTitle);
                                    if (!overlaps) {
                                        console.log(`    [links] ✗ Replacement also mismatched: "${badLink.text}" → "${metaResult.pageTitle}"`);
                                        fixedArticle = stripLink(fixedArticle, fix.broken_url);
                                        fixedRefs = fixedRefs.filter(r => r.url !== fix.broken_url);
                                        linksStripped++;
                                        continue;
                                    }
                                }
                            }

                            // Replacement passed all checks — apply it
                            fixedArticle = fixedArticle.replaceAll(fix.broken_url, fix.replacement_url);
                            fixedRefs = fixedRefs.map(r => r.url === fix.broken_url ? { ...r, url: fix.replacement_url } : r);
                            linksFixed++;
                        } else {
                            // No replacement — strip
                            fixedArticle = stripLink(fixedArticle, fix.broken_url);
                            fixedRefs = fixedRefs.filter(r => r.url !== fix.broken_url);
                            linksStripped++;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn(`    [links] Fix search failed: ${err}`);
        }
    }

    const linksOk = results.filter(r => r.ok).length;
    console.log(`    [links] Summary: ${linksOk} OK, ${linksFixed} fixed, ${linksStripped} stripped`);

    return {
        body_mdx: fixedArticle,
        references: fixedRefs,
        linksChecked: allLinks.length,
        linksOk,
        linksFixed,
        linksStripped,
    };
}

function stripLink(article: string, url: string): string {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkRegex = new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, 'g');
    return article.replace(linkRegex, '$1');
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Run fact-checking + link validation on an article.
 * Returns the corrected article body and references.
 * Non-destructive to voice/tone — only fixes facts and links.
 */
export async function verifyArticle(
    bodyMdx: string,
    references: ArticleReference[],
): Promise<VerifyResult> {
    console.log('  [blog-verify] Starting verification pipeline...');

    // Stage 1: Fact-check + corrections
    const { correctedBody, correctedRefs, stats } = await extractAndVerifyClaims(bodyMdx, references);

    // Stage 2: Link validation
    const linkResult = await validateLinks(correctedBody, correctedRefs);
    stats.links_checked = linkResult.linksChecked;
    stats.links_ok = linkResult.linksOk;
    stats.links_fixed = linkResult.linksFixed;
    stats.links_stripped = linkResult.linksStripped;

    console.log(`  [blog-verify] Complete: ${stats.claims_correct}/${stats.claims_extracted} correct, ${stats.links_ok}/${stats.links_checked} links OK`);

    return {
        body_mdx: linkResult.body_mdx,
        references: linkResult.references,
        stats,
    };
}
