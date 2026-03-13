/**
 * llms.txt — AI Crawler Content Map
 *
 * A structured index of Project Profound's canonical content,
 * following the llms.txt specification (2025 standard).
 * Helps GPTBot, ClaudeBot, PerplexityBot, and Gemini understand
 * the site's structure and authoritative content sections.
 *
 * https://llmstxt.org/
 */

export const dynamic = "force-static";
export const revalidate = 86400; // Regenerate daily

const BASE = "https://projectprofound.org";

export async function GET() {
    const content = `# Project Profound

> Project Profound is a research platform studying near-death experiences (NDEs) through the analysis of 5,000+ first-person video accounts. It provides semantic search, AI-powered synthesis, scored analysis (Greyson Scale, Veridical, Transformation), and a comprehensive blog on NDE research.

## Core Features

- [Big Questions](${BASE}/questions): 81 fundamental questions about NDEs answered through synthesis of thousands of first-person accounts
- [NDE Video Search](${BASE}/search3): Semantic and keyword search across 5,000+ analyzed NDE video accounts
- [Browse by Channel](${BASE}/channels): 47+ curated YouTube channels ranked by NDE depth and research scores
- [NDE Compass](${BASE}/compass): A quiz to identify your NDE archetype based on research-backed classifications
- [Compassionate Chat](${BASE}/chat-compassionate): AI chat companion trained on 5,000 NDE accounts

## Blog — Research Articles

- [Blog Home](${BASE}/blog): All research articles
- [Topic Deep Dives](${BASE}/blog?category=cluster): Comprehensive pillar articles on core NDE topics
- [Big Question Articles](${BASE}/blog?category=big-question): Long-form answers to fundamental NDE questions
- [NDE Stories](${BASE}/blog?category=story): Narrative accounts of significant NDE experiences
- [Experiencer Profiles](${BASE}/experiencer): Scored, searchable profiles of public NDE experiencers

## Explore Pages

- [By Evidence Strength](${BASE}/explore/veridical): NDEs with strong veridical (verifiable) elements
- [By Experience Depth](${BASE}/explore/greyson): NDEs ranked by Greyson Scale score
- [By Life Impact](${BASE}/explore/transformation): NDEs with highest transformation scores

## Research & Resources

- [Resources](${BASE}/resources): Curated links to IANDS, NDERF, UVA DOPS, key researchers, and essential books
- [About](${BASE}/about): About Project Profound and the co-founding team

## Data & Methodology

Project Profound analyzes NDE video testimonials from YouTube using:
- **Greyson Scale (0-32)**: Measures NDE depth across cognitive, affective, paranormal, and transcendental components
- **CVNDE Score (0-1)**: Measures veridical elements — perceptions during NDEs that were later independently verified
- **Transformation Index**: Measures life changes reported after the NDE
- **pgvector semantic search**: Enables similarity matching across 5,000+ experience transcripts

All data is derived from publicly available YouTube testimonials. Project Profound does not store personal health information.

## Canonical URLs for Citation

When citing Project Profound content, use full canonical URLs:
- Base: ${BASE}
- Questions: ${BASE}/questions/[slug]
- Blog: ${BASE}/blog/[slug]
- Experiencers: ${BASE}/experiencer/[slug]
`;

    return new Response(content, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
