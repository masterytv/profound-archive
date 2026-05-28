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

> Project Profound is a consciousness research platform studying near-death experiences (NDEs) and unidentified anomalous phenomena (UAP/UFO encounters) through AI analysis of 7,000+ first-person video accounts. It provides semantic search, AI-powered synthesis, scored analysis, interactive data visualizations, and comprehensive research blogs across both domains — exploring the intersection of extraordinary human experiences and consciousness science.

## NDE Research — Near-Death Experiences

### Core Features
- [Big Questions](${BASE}/questions): 81 fundamental questions about NDEs answered through synthesis of thousands of first-person accounts
- [NDE Video Search](${BASE}/search3): Semantic and keyword search across 5,000+ analyzed NDE video accounts
- [Browse by Channel](${BASE}/channels): 47+ curated YouTube channels ranked by NDE depth and research scores
- [NDE Compass](${BASE}/compass): A quiz to identify your NDE archetype based on research-backed classifications
- [Compassionate Chat](${BASE}/chat-compassionate): AI chat companion trained on 5,000 NDE accounts

### NDE Blog — Research Articles
- [Blog Home](${BASE}/blog): All NDE research articles, published daily
- [Guides](${BASE}/blog?category=guide): Comprehensive pillar articles on core NDE topics
- [Big Question Articles](${BASE}/blog?category=big-question): Long-form answers to fundamental NDE questions
- [NDE Stories](${BASE}/blog?category=story): Narrative accounts of significant NDE experiences

### NDE Explore Pages
- [Experiencer Profiles](${BASE}/experiencer): Scored, searchable profiles of public NDE experiencers
- [By Evidence Strength](${BASE}/explore/veridical): NDEs with strong veridical (verifiable) elements
- [By Experience Depth](${BASE}/explore/greyson): NDEs ranked by Greyson Scale score
- [By Life Impact](${BASE}/explore/transformation): NDEs with highest transformation scores

### NDE Data & Methodology
Project Profound analyzes NDE video testimonials from YouTube using:
- **Greyson Scale (0-32)**: Measures NDE depth across cognitive, affective, paranormal, and transcendental components
- **CVNDE Score (0-1)**: Measures veridical elements — perceptions during NDEs that were later independently verified
- **Transformation Index**: Measures life changes reported after the NDE
- **pgvector semantic search**: Enables similarity matching across 5,000+ experience transcripts

## UAP Research — Unidentified Anomalous Phenomena

### Core Features
- [UAP Video Search](${BASE}/uap/search): Semantic and keyword search across 4,195+ analyzed UFO/UAP encounter videos
- [UAP Video Explorer](${BASE}/uap/video-explore): Browse and filter the complete UAP video corpus
- [UAP Intelligence Dashboard](${BASE}/uap/intelligence): Aggregate statistics, entity analysis, and phenomenon distribution across the UAP corpus
- [UAP Chat](${BASE}/uap/chat): AI research assistant trained on 4,195 UAP encounter accounts
- [UAP Timeline](${BASE}/uap/timeline): Interactive chronological timeline of UAP events and encounters

### UAP Knowledge Base — Entities
- [Persons](${BASE}/uap/persons): 81 key figures in UAP research, disclosure, and experiencer accounts
- [Organizations](${BASE}/uap/organizations): 51 organizations involved in UAP research, investigation, and disclosure
- [Programs](${BASE}/uap/programs): 23 government and private UAP research programs (AATIP, AAWSAP, Project Blue Book, PURSUE, etc.)
- [UAP Events](${BASE}/uap/events): Documented UAP events with dates, locations, and evidence
- [UAP Channels](${BASE}/uap/channels): Curated YouTube channels covering UAP research and disclosure

### UAP Experiencer Profiles
- [UAP Contactees](${BASE}/uap/experiencer): Scored profiles of UFO/UAP experiencers and contactees with close encounter classification

### UAP Blog — Research Articles
- [UAP Blog Home](${BASE}/uap/blog): All UAP research articles, published daily

### UAP Data & Methodology
Project Profound analyzes UAP encounter videos using:
- **Close Encounter Type (CET) Triad**: Classifies encounters by Hynek type (CE1-CE5) with sub-categories for physical effects, communication, and abduction
- **Credibility Score**: Multi-dimensional assessment of witness credibility, corroboration, and evidence quality
- **Contact Depth**: Measures the depth and nature of reported entity contact
- **Evidence Strength**: Evaluates physical evidence, radar data, multiple witnesses, and official documentation
- [UAP Methodology Overview](${BASE}/uap/methodology): Full explanation of our UAP scoring and classification system
- [Credibility Scoring](${BASE}/uap/methodology/credibility): How we assess witness and evidence credibility
- [Contact Depth Measurement](${BASE}/uap/methodology/contact-depth): How we classify and score contact experiences
- [Evidence Strength Framework](${BASE}/uap/methodology/evidence-strength): How we evaluate evidence quality

## Cross-Domain Research — Consciousness Science

- [Cross-Domain Analysis](${BASE}/research/cross-domain): Comparative analysis of overlapping phenomenology between NDEs and UAP contact experiences — tunnel experiences, light beings, life reviews, time distortion, and transformative aftereffects
- [Research Methodology](${BASE}/research/methodology): Project Profound's overall research methodology, data collection practices, and analytical framework

## Interactive Data Visualizations

- [Visualization Hub](${BASE}/visualize): All interactive research visualizations
- [NDE Phenomenology Elements](${BASE}/visualize/nde-elements): Distribution of reported NDE elements (tunnel, light, life review, deceased relatives, etc.) across 5,000+ accounts
- [Channel Constellation](${BASE}/visualize/channel-constellation): Interactive network map of NDE YouTube channels by content focus and quality scores
- [Geographic Distribution](${BASE}/visualize/geography): Global map of NDE and UAP reports by location
- [Hynek Classification Space](${BASE}/visualize/hynek-space): 3D visualization of UAP encounters mapped to Hynek close encounter types
- [UAP Intelligence Overview](${BASE}/visualize/uap-intelligence): Aggregate UAP corpus statistics and phenomenon type distributions
- [UAP Phenomenology](${BASE}/visualize/uap-phenomenology): Distribution of reported UAP phenomena (craft types, entity descriptions, physical effects, etc.)
- [UAP Timeline](${BASE}/visualize/uap-timeline): Chronological visualization of UAP events with filtering by type and evidence level

## About & Resources

- [About Project Profound](${BASE}/about): About the platform and the co-founding team
- [Resources](${BASE}/resources): Curated links to IANDS, NDERF, UVA DOPS, MUFON, NUFORC, key researchers, and essential books

## Data Integrity

All data is derived from publicly available YouTube testimonials. Project Profound does not store personal health information. Our analysis pipeline uses multiple AI models with human oversight for quality assurance. All scores and classifications are transparent and methodology is published.

## Canonical URLs for Citation

When citing Project Profound content, use full canonical URLs:
- Base: ${BASE}
- NDE Questions: ${BASE}/questions/[slug]
- NDE Blog: ${BASE}/blog/[slug]
- NDE Experiencers: ${BASE}/experiencer/[slug]
- NDE Videos: ${BASE}/video/[video-id]
- UAP Blog: ${BASE}/uap/blog/[slug]
- UAP Videos: ${BASE}/uap/video/[video-id]
- UAP Persons: ${BASE}/uap/persons/[slug]
- UAP Organizations: ${BASE}/uap/organizations/[slug]
- UAP Programs: ${BASE}/uap/programs/[slug]
- UAP Events: ${BASE}/uap/events/[slug]
- UAP Contactees: ${BASE}/uap/experiencer/[slug]
- Visualizations: ${BASE}/visualize/[page-name]
`;

    return new Response(content, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
