# Project Profound: Methodology Summary

**A Computational Framework for the Large-Scale Analysis of First-Person Accounts of Near-Death and Anomalous Experiences**

*Version 1.0 — May 2026*
*Project Profound Research Team, Mastery Television*

---

## Abstract

Project Profound is a computational research platform designed to extract, classify, and analyze first-person accounts of near-death experiences (NDEs) and unidentified anomalous phenomena (UAP) contact experiences from publicly available YouTube video testimony. Unlike traditional survey-based NDE research, this project operates on spontaneous, naturalistic first-person narratives—video testimony shared by experiencers in their own words, in their own time, without researcher intervention. The system employs a multi-pass pipeline of large language model (LLM) analysis to apply validated psychometric scales, extract phenomenological features, and generate structured datasets at a scale previously infeasible in experiential research.

This document describes the data acquisition pipeline, the analytical instruments employed, the computational methodology, the known limitations and error characteristics, and the research team's intentions for future validation and scaling.

---

## Table of Contents

1. [Philosophical Framing](#1-philosophical-framing)
2. [Data Characteristics and Corpus Design](#2-data-characteristics-and-corpus-design)
3. [Data Acquisition Pipeline](#3-data-acquisition-pipeline)
4. [NDE Analysis Instruments](#4-nde-analysis-instruments)
5. [UAP Contact Experience Analysis Instruments](#5-uap-contact-experience-analysis-instruments)
6. [Computational Pipeline Architecture](#6-computational-pipeline-architecture)
7. [Cross-Domain Comparative Framework](#7-cross-domain-comparative-framework)
8. [Embedding and Retrieval Architecture](#8-embedding-and-retrieval-architecture)
9. [Prompt Engineering Methodology](#9-prompt-engineering-methodology)
10. [Known Limitations and Error Analysis](#10-known-limitations-and-error-analysis)
11. [Ethical Considerations](#11-ethical-considerations)
12. [Future Research Directions](#12-future-research-directions)
13. [Technical Reference](#13-technical-reference)
14. [References](#14-references)

---

## 1. Philosophical Framing

### 1.1 A Novel Corpus

The corpus analyzed by Project Profound is fundamentally different from the datasets used in traditional NDE or anomalous experience research. Rather than structured questionnaires administered under controlled conditions (e.g., Greyson, 1983; Ring, 1980; van Lommel et al., 2001), the source material consists of **first-person video testimony**—voluntarily shared accounts recorded in naturalistic settings such as interviews, podcasts, and personal testimonials published to YouTube.

This distinction carries significant methodological implications:

- **No experimenter demand effects.** The experiencer is not responding to a researcher's questions or a pre-structured survey instrument. The narrative unfolds according to the experiencer's own priorities and emotional sequencing.
- **Rich phenomenological detail.** Video accounts frequently contain paralinguistic information (hesitation, emotional inflection, self-correction) that is absent from written questionnaire responses. While the current pipeline operates on text transcripts and does not analyze audio or video features, this richness is preserved in the raw data for future multimodal analysis.
- **Self-selection bias.** The corpus is composed of individuals who chose to share their experiences publicly. This likely overrepresents dramatic, positive, or culturally validated experiences and underrepresents distressing, fragmentary, or stigmatized accounts. This bias is acknowledged and documented throughout the analysis.
- **Uncontrolled provenance.** Unlike clinical samples drawn from cardiac arrest units or ICU populations, the trigger conditions, medical histories, and temporal distances from the experience are self-reported within the narrative and cannot be independently verified.

### 1.2 Consciousness as the Common Variable

A foundational insight of Project Profound is that near-death experiences and UAP contact experiences—despite their different phenomenological surfaces—share a common substrate: **first-person reports of anomalous states of consciousness**. Both involve narrative accounts of perceived reality shifts, entity encounters, information acquisition through non-ordinary means, and subsequent psychological transformation.

By building parallel analytical frameworks for NDE and UAP contact testimony, the project enables cross-domain phenomenological comparison at a scale that has never been attempted. The Greyson Scale has its UAP counterpart in the Contact Depth Scale; the NDE Transformation Index mirrors the UAP Contact Transformation Index; and the cvNDE (veridical perception) scale finds its analog in the UAP Evidence Strength Scale. This symmetry is deliberate and is discussed in §7.

---

## 2. Data Characteristics and Corpus Design

### 2.1 Source Selection

The NDE corpus is sourced from YouTube channels that primarily or frequently feature first-person NDE testimony. Channels are identified through manual curation and are stored in a persistent channel registry (`channels` table) with enriched metadata including subscriber counts, total video counts, and scanning status. As of this writing, the NDE archive contains analysis of 4,897 videos, and the UAP archive contains 4,151 videos across multiple channels.

A channel-level scanner periodically audits enabled channels for new uploads, discovers candidate videos, and queues them for intake processing. This scanner architecture ensures the corpus grows continuously without manual intervention.

### 2.2 Inclusion and Exclusion Criteria

**NDE Domain:**
- **Included:** First-person accounts of near-death experiences, out-of-body experiences (OBEs), shared death experiences (SDEs), after-death communications (ADCs), and spiritually transformative experiences (STEs).
- **Excluded:** Discussions *about* NDEs without a first-person account, documentary narration without experiencer testimony, guided meditations, fiction, entertainment content, news reports without experiencer accounts, book reviews, and academic lectures. YouTube Shorts (≤ 180 seconds) are also excluded, as they rarely contain sufficient narrative depth for meaningful analysis.

**UAP Domain:**
- **Included (Tier 1):** First-person encounter testimony, interviews with direct experiencers, detailed retold encounters from credible sources.
- **Included (Tier 2):** Research analysis, investigative journalism, documentary surveys, program disclosure content, and news commentary about UAP.
- **Excluded (Tier 3):** Entertainment, debunking content, unrelated conspiracy theories, and content with no substantive UAP information.

### 2.3 Transcript Acquisition

For each video, the system attempts to retrieve English-language captions via the YouTube subtitle API. Both manual (human-authored) and auto-generated (ASR-produced) captions are accepted, with the source type recorded. When captions are unavailable, the video is marked as `no_captions` and excluded from analysis.

Raw caption segments are processed through a transcript processor that:
1. Concatenates timed segments into continuous text.
2. Applies punctuation restoration (for auto-generated captions, which typically lack punctuation).
3. Produces a "cleaned" version (removing filler words and normalizing formatting) for embedding.
4. Chunks the transcript into overlapping segments for semantic search and RAG (Retrieval-Augmented Generation) applications.

---

## 3. Data Acquisition Pipeline

The intake pipeline is an automated, multi-stage orchestrator that processes a single YouTube video from URL to fully analyzed database record. The pipeline is designed as a pure function that can be invoked from an admin interface, a scheduled cron job, or a command-line script.

### 3.1 NDE Intake Pipeline

The NDE pipeline proceeds through the following stages:

| Step | Operation | Duration | Failure Behavior |
|------|-----------|----------|-------------------|
| 1 | **URL Parsing** — Extract YouTube video ID | < 1s | Fatal: invalid URL |
| 2 | **Deduplication Check** — Query database for existing records | < 1s | Skip if conclusively processed |
| 3 | **Metadata Scraping** — Fetch video and channel metadata via YouTube Data API | 2–5s | Fatal: video unavailable |
| 3b | **Shorts Gate** — Reject videos ≤ 180s duration | < 1s | Terminal: `is_short` |
| 4 | **Channel Enrichment** — Upsert channel metadata if new | 2–5s | Non-fatal |
| 5 | **Caption Retrieval** — Fetch and validate English captions | 3–10s | Terminal: `no_captions` or `caption_fetch_failed` |
| 6 | **Transcript Processing** — Punctuation, cleaning, chunking | < 1s | Fatal |
| 7 | **Record Insertion** — Upsert initial video record to database | < 1s | Fatal |
| 8 | **Experience Classification** — Lightweight AI gate (see §3.3) | 2–5s | Fatal |
| 9 | **Full Analysis Suite** — Seven parallel LLM analysis passes (see §4) | 30–90s | Partial: individual pass failures are non-fatal |
| 10 | **Result Persistence** — Save all analysis results to database | 1–3s | Fatal |
| 11 | **Embedding Generation** — Create search and chat vector embeddings | 10–30s | Non-fatal |
| 12 | **Experience Fingerprint** — Build 27-dimension similarity vector | < 1s | Non-fatal |
| 13 | **Experiencer Profile Sync** — Link to or create experiencer profile | 1–3s | Non-fatal |

Total pipeline execution time for a single video is typically **60–120 seconds**, dominated by the parallel LLM analysis calls in Step 9 and the sequential embedding insertions in Step 11.

### 3.2 UAP Intake Pipeline

The UAP pipeline follows a structurally similar architecture but with domain-specific differences:

- **Classification** uses a UAP-specific classifier with chain-of-thought (CoT) reasoning and few-shot examples to determine tier (1/2/3), track (encounters/research/excluded), content type, source type, and experiencer names.
- **Tier 3 Gate** replaces the NDE "not profound" gate — out-of-scope content is rejected.
- **Encounter Segmentation** — For multi-experiencer videos (common in UAP interview compilations), an LLM pass segments the transcript into per-encounter blocks, enabling independent analysis of each experiencer's account within a single video.
- **Dual Analysis Suite** — Program intelligence analysis (persons of interest, government programs, claims, evidence) runs on all Tier 1+2 videos. Encounter-level phenomenological analysis (Hynek classification, craft observation, entity encounters) and the CET triad scoring (see §5) run per encounter segment.
- **Name Deduplication** — ASR-induced misspellings of experiencer names are normalized using fuzzy matching and LLM-assisted deduplication.
- **Tier Reconciliation** — If encounter segmentation reveals first-person testimony that the classifier missed (common for long-form documentaries), the video is automatically promoted from Tier 2 to Tier 1.

### 3.3 Experience Classification Gate

Before running the computationally expensive full analysis suite, a lightweight classification pass screens each video transcript to determine whether it contains a genuine first-person account of a profound experience. This gate uses OpenAI GPT-4o-mini with a focused prompt, examining only the first ~15,000 characters of the transcript at a temperature of 0.1 for maximum consistency.

The classifier outputs:
- **Experience type:** NDE, OBE, SDE, ADC, STE, or none.
- **Confidence score:** 0–100.
- **NDE classification:** `clear_nde` (confidence ≥ 70), `possible_nde` (40–69), `not_nde`, or `insufficient_info` (confidence < 20).
- **Experiencer name:** Extracted via prompt rules that distinguish the experiencer from the interviewer, host, or narrator.
- **Justification:** A 1–2 sentence explanation of the classification decision.

Videos classified as "not profound" are persisted in the database with their classification metadata but are not subjected to further analysis, conserving API resources.

---

## 4. NDE Analysis Instruments

Each video that passes the classification gate is subjected to **seven parallel analysis passes**, each implemented as an independent LLM call with a domain-specific system prompt and structured JSON output schema. All passes use OpenAI GPT-4o-mini with `response_format: { type: "json_object" }` at low temperature (0.1–0.3) for scoring consistency.

### 4.1 Greyson NDE Scale

**Reference:** Greyson, B. (1983). "The Near-Death Experience Scale: Construction, Reliability, and Validity." *Journal of Nervous and Mental Disease*, 171(6), 369–375.

**Implementation:** The validated 16-item Greyson NDE Scale is the most widely used instrument in NDE research. Our implementation scores each of the 16 items (across 4 subscales: Cognitive, Affective, Paranormal, Transcendental) as 0 (not present), 1 (mildly/ambiguously present), or 2 (definitely present), yielding a total score of 0–32.

**Subscale items:**
- **Cognitive (4 items):** Time distortion, thought speed, life review, sudden understanding.
- **Affective (4 items):** Peace/pleasantness, joy, cosmic unity, brilliant light.
- **Paranormal (4 items):** Enhanced senses, ESP, precognition, out-of-body.
- **Transcendental (4 items):** Unearthly world, mystical being, spirits/deceased, border/point of no return.

**Classification thresholds:** Not NDE (0–6), Mild NDE (7–12), Moderate NDE (13–20), Deep NDE (21–32).

**Note:** The traditional Greyson Scale cut-off of ≥ 7 for NDE classification was designed for self-administered questionnaires where each item is presented as a direct question. In our application, the LLM scores are derived from unstructured narrative, which introduces an inherent measurement difference. Specifically, features not mentioned in the narrative are scored 0 (not present), but their absence from the account does not necessarily mean the experiencer did not have that feature—they may simply not have discussed it. This is a known limitation of applying structured instruments to unstructured text (see §10).

### 4.2 Claimed Veridical NDE Scale (cvNDE)

**Reference:** Custom scale developed for Project Profound, documented at `/scale/cvnde`.

**Purpose:** Evaluates the evidential strength of veridical perception claims—moments where the experiencer reports perceiving real-world information that should have been impossible to know given their medical state and physical position.

**Structure:** 7 criteria, each scored 1–4, yielding a total score of 7–28:

| Criterion | What It Measures |
|-----------|-----------------|
| Medical State Severity | Depth of unconsciousness during perceived veridical perception |
| Perceptual Access Impossibility | Physical impossibility of ordinary sensory perception |
| Specificity and Precision | Level of detail in reported perceptions |
| Unpredictability | Whether perceived information could have been inferred |
| Self-Reported Verification Quality | Nature and credibility of verification attempts |
| Verified Perception Weight | Ratio of verified to unverified claims |
| Temporal Precedence | When the perception was first reported relative to verification |

**Scoring levels:** Low (7–12), Moderate (13–17), High (18–22), Exceptional (23–28).

**Important caveat:** This scale measures the *claims* of veridical perception as reported in the experiencer's narrative. It does not constitute independent verification. The scale explicitly acknowledges this by using the prefix "claimed" (cv) and by evaluating the *structure of the claim* (specificity, verification methodology, temporal precedence) rather than asserting objective accuracy.

### 4.3 NDE Transformation Index (NDE-TI)

**Reference:** Custom scale developed for Project Profound, inspired by Ring's Life Changes Inventory (1984) and Greyson's NDE Aftereffects Scale.

**Purpose:** Measures the degree and breadth of self-reported transformation following the NDE, as described in the experiencer's account.

**Structure:** 10 domains, each scored 0–5, yielding a total score of 0–50:

| Domain | Code | Measures |
|--------|------|----------|
| Appreciation for Life | AL | Gratitude, wonder, awareness of beauty |
| Self-Perception & Identity | SI | Self-acceptance, inner peace, identity shift |
| Compassion & Concern for Others | CC | Empathy, desire to serve, unconditional love |
| Values & Priorities | VP | Materialism reduction, simplicity, authenticity |
| Spiritual Awareness | SA | Connection to divine, universal consciousness |
| Religious Orientation | RO | Relationship with organized religion (any direction) |
| Attitude Toward Death | AD | Fear reduction, afterlife belief, comfort |
| Psychic & Expanded Perception | PE | Intuition, precognition, healing, synchronicities |
| Relationships & Social Dynamics | RS | Partnership changes, alienation, deep connection |
| Purpose, Meaning & Life Direction | PD | Life purpose, mission, career changes |

Each domain also captures:
- **Direction indicator:** up, down, mixed, shifted, new, or N/A.
- **Evidence summary:** Brief explanation of the scoring rationale.
- **Key quote:** A direct quote from the transcript supporting the score.

**Aggregate metrics:**
- **Overall Transformation Score (0–50):** Sum of all domain scores.
- **Transformation Breadth (0–10):** Count of domains scoring ≥ 1.
- **Transformation Depth (1.0–5.0):** Mean of domains scoring ≥ 1.

**Scoring note:** Many NDE video accounts focus primarily on the experience itself rather than aftereffects. Low transformation scores are expected and normal in such cases—they indicate that transformation was not discussed, not necessarily that no transformation occurred.

### 4.4 Core Elements Analysis

**Reference:** Inspired by Moody (1975), Ring (1980), and the NDERF questionnaire elements.

**Purpose:** Extracts the presence or absence of 15 standard NDE phenomenological elements, the experience trigger, overall emotional tone, intensity rating, and content safety flags.

**15 core elements:**
`out_of_body`, `tunnel`, `bright_light`, `deceased_relatives`, `life_review`, `being_of_light`, `border_boundary`, `feelings_of_peace`, `cosmic_unity`, `time_distortion`, `enhanced_senses`, `telepathy`, `otherworldly_realm`, `knowledge_download`, `choice_to_return`.

Each element is scored as present/absent with a confidence rating (0–100) and a supporting transcript quote.

**Additional outputs:**
- **Experience type** (with confidence): NDE, OBE, SDE, ADC, STE, dream, meditation, or other.
- **Trigger category:** medical_crisis, accident, surgery, illness, cardiac_arrest, near_drowning, childbirth, combat, suicide_attempt, overdose, allergic_reaction, spontaneous, other, or unknown.
- **Overall tone:** very_positive, positive, neutral, negative, very_negative, or mixed.
- **Intensity rating:** 1–10.
- **Content safety flags:** suicide_related, self_harm, distressing_content, medical_graphic, child_death.

### 4.5 Phenomenology and Entity Encounters

**Purpose:** Provides fine-grained phenomenological quality assessment and detailed documentation of entity encounters.

**Phenomenology outputs:**
- **Reality comparison:** How the experience compares to waking reality (more_real, equally_real, dreamlike, surreal).
- **Vividness rating (1–10):** Based on descriptive language quality.
- **Sensory modalities (6 channels):** Visual, auditory, tactile, olfactory, gustatory, kinesthetic—each assessed for activity and extraordinariness (e.g., 360-degree vision, seeing through walls).
- **Emotional progression:** Chronologically ordered sequence of emotions with intensity ratings and context.
- **Altered cognition:** Thought clarity, speed, memory quality, and self-awareness changes.

**Entity encounter documentation:**
- For each encountered entity: identity, type (deceased_relative, religious_figure, being_of_light, guide, angel, shadow_figure, animal, group, unknown), appearance, gender, age appearance, luminosity, communication method, message content, emotional quality, and confidence rating.

### 4.6 Journey Flow Sequence

**Purpose:** Reconstructs the chronological sequence of phenomenological events during the experience, even when the experiencer narrates them non-linearly (common in spoken accounts).

**Taxonomy:** 25 elements organized across 6 phases:
- **Phase 1 — Initial Transition (4):** observing_body, void_darkness, tunnel, bright_light.
- **Phase 2 — Emotional/Sensory States (7):** peace_calm, joy_bliss, love_unconditional, fear_distress, enhanced_senses, celestial_music, time_distortion.
- **Phase 3 — Encounters (5):** deceased_relatives, beings_entities, being_of_light, religious_figure, unknown_presence.
- **Phase 4 — Realm/Environment (4):** otherworldly_realm, hellish_realm, cities_structures, nature_landscapes.
- **Phase 5 — Transformative Experiences (5):** life_review, knowledge_download, cosmic_unity, telepathy, future_visions.
- **Phase 6 — Return (5):** border_boundary, choice_to_return, forced_return, sudden_return, return_unclear.

Each element in the extracted sequence includes: chronological order, element name, supporting excerpt, and confidence score. An element synonym normalization layer handles LLM output variations (e.g., "darkness" → "void_darkness", "peace" → "peace_calm").

### 4.7 Factual Summary

**Purpose:** Generates a concise, objective, 80–150 word summary of the NDE account at a Grade 8 reading level, structured as Trigger → Experience → Aftermath. This summary is used for search result cards, social sharing previews, and accessibility purposes.

---

## 5. UAP Contact Experience Analysis Instruments

### 5.1 Contact Experience Triad (CET)

The UAP analysis employs a parallel triad framework to the NDE analysis, designed to enable cross-domain comparison:

| NDE Instrument | UAP Counterpart | What It Measures |
|----------------|-----------------|------------------|
| cvNDE (Veridical NDE Scale) | UAP-ESS (Evidence Strength Scale) | Evidential quality of claims |
| Greyson NDE Scale | UAP-CDS (Contact Depth Scale) | Depth/complexity of the experience |
| NDE-TI (Transformation Index) | UAP-CTI (Contact Transformation Index) | Post-experience transformation |

### 5.2 UAP Evidence Strength Scale (UAP-ESS)

**Score range:** 7–28 (7 criteria × 1–4 scale).

Evaluates the evidential quality of a contact experience across: witness credibility, physical/photographic evidence, multiple-witness corroboration, electromagnetic effects, official documentation, temporal consistency, and specificity of reported phenomena.

### 5.3 UAP Contact Depth Scale (UAP-CDS)

**Score range:** 0–32 (8 dimensions × 0–4 scale).

Measures the depth and complexity of the contact experience across: proximity to phenomenon, communication sophistication, information transfer, physical effects, temporal anomalies, consciousness state changes, multi-sensory engagement, and environmental effects.

### 5.4 UAP Contact Transformation Index (UAP-CTI)

**Score range:** 0–60 (12 domains × 0–5 scale).

Extends the NDE-TI framework with additional domains relevant to UAP contact: worldview expansion, relationship to secrecy/disclosure, mission/purpose activation, creative expression, ecological consciousness, and community connection—while retaining the core transformation domains shared with NDE aftereffects.

### 5.5 UAP-Specific Analysis Passes

In addition to the CET triad, UAP videos receive several domain-specific analysis passes:

- **Content Classification:** Tier, track, content type, source type, and speaker role determination.
- **Encounter Segmentation:** Multi-experiencer transcript splitting for per-encounter analysis.
- **UAP Phenomenology:** Hynek classification, craft observation details, entity encounter taxonomy, physical effects, and temporal anomalies.
- **Encounter Context:** Environmental conditions, temporal and geographic details, witness demographics.
- **Program Intelligence:** Extraction of government programs, persons of interest, key claims, evidence mentions, and analytical depth assessment.
- **UAP Summary:** Domain-appropriate factual summary generation.

### 5.6 Channel-Level Scoring

UAP channels receive computed aggregate scores that enable comparative analysis:

- **Intelligence Value (0–100):** Analytical depth and information richness, normalized from per-video intelligence scores.
- **Speaker Credibility (0–100):** Weighted composite of source diversity (40%), evidence quality (40%), and program depth (20%).
- **Encounter Depth (0–100):** Normalized average contact depth score across the channel's encounters.
- **Impact Score (0–100):** Normalized average transformation score across encounters.
- **Channel Archetype Classification:** Deep Intelligence, First Person Encounters, Documentary, News & Commentary, Interview Hub, or Advocacy & Disclosure.
- **Channel Personality Code (3-letter):** Intelligence/Encounters × Deep-dive/Breadth × Analytical/Narrative.

Scores are recomputed weekly via automated jobs.

---

## 6. Computational Pipeline Architecture

### 6.1 Infrastructure

- **Application:** Next.js 14+ (App Router), deployed to Vercel.
- **Database:** Supabase (PostgreSQL) with pgvector extension for similarity search.
- **LLM Provider:** OpenAI API (GPT-4o-mini for structured analysis; Claude for long-form synthesis where needed).
- **Embedding Model:** OpenAI `text-embedding-3-small` (1536-dimension vectors).
- **Transcript Source:** YouTube subtitle API via third-party caption service.
- **Video Metadata:** YouTube Data API v3 and scraping fallbacks.

### 6.2 Parallelism and Error Tolerance

All seven NDE analysis passes (and the corresponding UAP analysis passes) execute in parallel using `Promise.allSettled()`, meaning that the failure of any single pass does not prevent the others from completing. The pipeline records which passes succeeded and which failed, enabling selective re-analysis of failed passes without repeating successful ones.

### 6.3 Structured Output and Type Safety

All LLM analysis calls use OpenAI's `response_format: { type: "json_object" }` to enforce structured JSON output. Each analysis module defines a TypeScript type schema that the parsed output is cast to, enabling downstream code to interact with analysis results as strongly typed objects. The system prompts include explicit JSON schemas and extraction rules to minimize structural errors in the LLM output.

### 6.4 Temperature and Determinism

Scoring passes (Greyson, cvNDE, NDE-TI, CET triad) use a temperature of **0.1** to maximize scoring consistency across runs. Element detection and phenomenological analysis passes use a slightly higher temperature of **0.2** to allow for nuanced interpretation of ambiguous narrative content. Summary generation uses **0.3** for more natural writing.

### 6.5 Token Management

Transcripts are truncated to manage costs and stay within model context windows:
- **Classification gate:** First 15,000 characters (~3,750 tokens).
- **Analysis passes:** First 50,000 characters (~12,500 tokens), sufficient for most hour-long videos.
- **Summary generation:** First 30,000 characters.
- **Full-text embedding:** First 8,000 characters.

---

## 7. Cross-Domain Comparative Framework

### 7.1 Design Rationale

The parallel triad design (NDE scales ↔ UAP scales) is deliberate and is intended to enable the following research questions:

1. **Do NDE and UAP contact experiencers report similar phenomenological features?** The core elements taxonomy (NDE) and the contact depth/phenomenology framework (UAP) enable feature-level comparison.
2. **Do these experiences produce similar transformations?** The NDE-TI and UAP-CTI share a common core of transformation domains, enabling direct comparison of aftereffect profiles.
3. **What is the evidential quality of claims in each domain?** The cvNDE and UAP-ESS use analogous criteria adapted to the evidentiary characteristics of each domain.

### 7.2 Experience Fingerprint

The system generates a 27-dimension numerical vector ("experience fingerprint") for each analyzed NDE, encoding:
- **Dimensions 0–14:** Presence/absence of 15 core NDE elements (binary).
- **Dimension 15:** Intensity rating (normalized 0–1).
- **Dimensions 16–18:** Emotional tone (one-hot: positive, neutral, negative).
- **Dimensions 19–23:** Experience type (one-hot: NDE, OBE, SDE, ADC, other).
- **Dimensions 24–26:** Trigger category (one-hot: medical, accident, spontaneous).

These fingerprints are stored as pgvector columns and enable **cosine similarity search** for "Similar Experiences"—allowing researchers and users to find experiential accounts with similar phenomenological profiles.

---

## 8. Embedding and Retrieval Architecture

### 8.1 Vector Storage

Each video generates multiple embedding layers:

| Layer | Table | Chunk Size | Use Case |
|-------|-------|------------|----------|
| Timestamped search | `nde_punctuated_embeddings` | ~500 tokens | Semantic search with video timestamp |
| Chat/RAG chunks | `nde_chatbot_chunks` | ~1000 tokens | AI chatbot retrieval |
| Full text | `nde_vids.subtitles_embedding` | Full transcript (truncated to 8K chars) | Document-level similarity |
| Experience fingerprint | `nde_analysis.experience_fingerprint` | 27-dim vector | Phenomenological similarity |

### 8.2 Retrieval-Augmented Generation (RAG)

The platform includes a conversational AI interface that uses RAG to ground responses in actual experiencer testimony. The chatbot retrieves relevant transcript chunks via embedding similarity search and presents them alongside LLM-generated responses, maintaining fidelity to source material and enabling users to verify claims against original accounts.

---

## 9. Prompt Engineering Methodology

### 9.1 Iterative Development Process

Each analysis prompt underwent extensive iterative development:

1. **Initial design:** Prompts were drafted based on the academic literature and existing validated instruments (where applicable, e.g., the Greyson Scale).
2. **Manual testing:** Each prompt was tested against a diverse sample of transcripts spanning high-confidence NDEs, ambiguous cases, non-NDE content, and edge cases (e.g., child experiencers, distressing NDEs, cultural variations).
3. **Model comparison:** Multiple LLM providers and model sizes were evaluated for each analysis pass. GPT-4o-mini was selected for the primary analysis passes based on its balance of accuracy, cost, and structured output reliability.
4. **Error analysis:** Outputs were manually reviewed to identify systematic biases (e.g., inflation of transformation scores for emotionally expressive narratives, conflation of interviewer statements with experiencer claims) and prompt revisions were made to mitigate them.
5. **Schema refinement:** Output schemas were iteratively refined to capture the right level of granularity—detailed enough for meaningful analysis, structured enough for database storage, and constrained enough to minimize hallucination in the output structure.

### 9.2 Prompt Design Principles

All analysis prompts adhere to the following design principles:

- **Explicit scoring rubrics** with concrete examples at each score level, reducing subjective interpretation.
- **Negative examples** — prompts explicitly describe what does *not* qualify (e.g., "Do not infer transformation that is not mentioned", "Do not return the name of the host, interviewer, narrator, or commentator").
- **Grounding instructions** — "Score ONLY what is described or clearly implied in the account."
- **Calibration notes** — domain-specific expectations (e.g., "Many NDE video transcripts focus primarily on the NDE experience itself rather than aftereffects. Low transformation scores are expected and normal in such cases.").
- **Output safety** — "Output ONLY valid JSON. No markdown, no code blocks, no explanation."
- **Attribution requirements** — scoring decisions must include a `reasoning` or `evidence_summary` field with a supporting quote from the transcript, enabling auditability.

### 9.3 Post-Processing and Normalization

LLM outputs undergo post-processing to handle known failure modes:
- **Element synonym normalization:** A mapping table converts LLM output variations to canonical taxonomy terms (e.g., "darkness" → "void_darkness", "god" → "religious_figure").
- **Score bounds validation:** Scores are clamped to valid ranges.
- **Null handling:** Missing or malformed fields default to safe values rather than crashing the pipeline.
- **Timestamp matching:** For UAP encounter analysis, quotes from the LLM output are matched back to specific caption segments using deterministic string matching, enabling video timestamp linking without relying on the LLM for timestamp accuracy.

---

## 10. Known Limitations and Error Analysis

### 10.1 Measurement Validity

**The core validity concern** with this methodology is the application of structured psychometric instruments to unstructured narrative text via LLM intermediation. Traditional NDE scales were designed to be administered as direct questionnaires where the experiencer responds to each item. In our application:

- **Absence ≠ Non-occurrence.** If an experiencer does not mention "life review" in their video, the Greyson life_review item scores 0. But the experiencer may have had a life review and simply not mentioned it in that particular narrative. This systematically biases scores downward compared to direct questionnaire administration.
- **Narrative emphasis ≠ Experience intensity.** Articulate, emotionally expressive experiencers may receive higher scores than reserved or less verbal experiencers who had equally profound experiences.
- **Interviewer effects.** In interview-format videos, the interviewer's questions may steer the narrative toward certain topics (or away from others), affecting which elements appear in the scored transcript.

### 10.2 LLM Error Characteristics

Through manual review of a subset of analyzed videos, the following error patterns have been observed:

- **Slight score inflation.** LLMs tend to assign slightly higher scores than human raters on transformation and intensity measures, particularly for emotionally evocative narratives. This bias is consistent and approximately uniform across the corpus, meaning it affects absolute score levels but is less likely to distort relative rankings.
- **Experiencer/interviewer confusion.** In some interview formats, the LLM occasionally attributes interviewer statements to the experiencer, inflating element detection. The prompts now include explicit rules to address this (e.g., "Focus ONLY on the experiencer's first-person account. Ignore interviewer commentary."), which has substantially reduced but not eliminated this error.
- **Hallucinated quotes.** In rare cases (< 5% of outputs), the LLM produces a "key_quote" that paraphrases rather than directly quotes the transcript. This is a known LLM behavior and does not affect scoring accuracy but does affect the auditability of individual data points.
- **Cultural and linguistic bias.** The analysis pipeline operates on English-language transcripts processed by English-language LLMs. Cross-cultural phenomenological features may be differentially recognized depending on how they map to Western NDE/UAP frameworks.

### 10.3 Error Rate Comparison

Based on manual review of a sample of analyzed accounts, the LLM analysis produces slightly more errors than human expert raters would, but operates at a scale that makes manual analysis infeasible. The error rate is estimated at approximately **5–10% higher than human inter-rater disagreement** on the Greyson Scale (where human inter-rater reliability is typically r = 0.9+). However, the ability to process thousands of accounts in hours rather than years represents a fundamental capability shift for the field.

### 10.4 Corpus Biases

- **Selection bias:** The corpus overrepresents English-speaking experiencers who are comfortable appearing on video. This excludes populations who are unwilling or unable to share publicly, as well as non-English-speaking populations.
- **Platform bias:** YouTube's recommendation algorithm may preferentially surface certain types of NDE content (e.g., dramatic, positive, culturally resonant accounts), creating a non-representative sample.
- **Temporal bias:** The corpus reflects the state of YouTube content at the time of scraping. Videos may be deleted, made private, or altered after analysis.
- **Channel curation bias:** The initial channel selection was performed manually, introducing the research team's existing awareness of NDE/UAP content creators.

---

## 11. Ethical Considerations

### 11.1 Data Provenance

All analyzed content is publicly available on YouTube. The project does not access private, unlisted, or paywalled content. Video metadata, transcripts, and analysis results are stored in a secured database with role-based access control.

### 11.2 Experiencer Dignity

The analysis system is designed with explicit respect for experiencer accounts:
- Prompts include instructions to "Be faithful to the experiencer's own words and framing. Do not pathologize, judge, or reinterpret their experience."
- Content safety flags identify potentially sensitive content (suicide-related, self-harm, distressing, medically graphic, child death) to enable appropriate content warnings in the user interface.
- The platform's AI chatbot interface is designed as a "compassionate friend"—warm, non-judgmental, and grounded in actual testimony rather than speculation.

### 11.3 Research Transparency

This methodology document is published openly. The analysis instruments, prompt structures, scoring rubrics, and known limitations are fully documented. We do not claim that LLM-mediated analysis is equivalent to human expert assessment—rather, we present it as a complementary approach that enables scale at the cost of some precision.

---

## 12. Future Research Directions

### 12.1 Model Upgrade and Re-Analysis

Now that the analytical pipeline is built and validated, the research team intends to:

1. **Re-analyze the full corpus with more capable models.** The current pipeline uses GPT-4o-mini for cost efficiency during initial corpus processing. Re-analysis with GPT-4o, Claude 3.5 Sonnet, or Gemini 1.5 Pro—and comparison of results across models—would provide insight into model-dependent scoring variation and improve overall accuracy.
2. **Implement ensemble scoring.** Running multiple models on the same transcript and aggregating scores (e.g., via median or weighted average) would reduce model-specific biases.

### 12.2 Corpus Expansion

1. **Additional videos in current domains.** Continued channel scanning and manual intake of NDE and UAP content to grow the corpus toward statistical significance across subcategories.
2. **Additional experiential domains.** The pipeline architecture is designed for extension to additional domains of anomalous experience, including:
   - Psychedelic experiences (DMT, psilocybin, ayahuasca encounter reports)
   - Mystical/contemplative experiences
   - Reincarnation and past-life memory accounts
   - Abduction and high-strangeness contact reports
   Each new domain would require domain-specific classification rules and analytical instruments but would share the core pipeline infrastructure.

### 12.3 Validation Studies

1. **Human inter-rater reliability studies.** Recruiting NDE researchers to independently score a subset of transcripts using the same instruments, enabling direct comparison of human vs. LLM scoring.
2. **Test-retest reliability.** Running the same transcripts through the pipeline multiple times to quantify scoring variance under identical conditions.
3. **Convergent validity.** Comparing LLM-generated Greyson scores against scores obtained from the same experiencers via traditional self-administered questionnaires (where available).

### 12.4 Multimodal Analysis

The current pipeline operates exclusively on text transcripts. Future work could incorporate:
- **Audio analysis:** Prosodic features (speech rate, pitch variation, pausing patterns) as correlates of emotional intensity and narrative authenticity.
- **Visual analysis:** Facial expression and gesture analysis during video testimony.
- **Cross-modal consistency:** Comparing linguistic content with paralinguistic and visual features.

### 12.5 Collaborative Research

The research team seeks to bring on board established researchers in consciousness studies, NDE research, and related fields who can:
- Improve the analytical instruments based on domain expertise.
- Contribute to validation studies.
- Utilize the structured dataset for hypothesis testing and publication.
- Advise on ethical and methodological best practices for this novel research modality.

---

## 13. Technical Reference

### 13.1 Model Specifications

| Pass | Model | Temperature | Max Input | Response Format |
|------|-------|-------------|-----------|-----------------|
| Classification Gate | GPT-4o-mini | 0.1 | 15K chars | json_object |
| Greyson Scale | GPT-4o-mini | 0.1 | 50K chars | json_object |
| cvNDE Scale | GPT-4o-mini | 0.1 | 50K chars | json_object |
| NDE-TI | GPT-4o-mini | 0.1 | 50K chars | json_object |
| Core Elements | GPT-4o-mini | 0.2 | 50K chars | json_object |
| Phenomenology/Entities | GPT-4o-mini | 0.2 | 50K chars | json_object |
| Journey Flow | GPT-4o-mini | 0.2 | 50K chars | json_object |
| NDE Summary | GPT-4o-mini | 0.3 | 30K chars | json_object |
| UAP Classification | GPT-4o | 0.1 | 5K chars | json_object |
| UAP CET Triad | GPT-4o-mini | 0.1 | 50K chars | json_object |
| Embeddings | text-embedding-3-small | N/A | 8K tokens | vector (1536-dim) |

### 13.2 Database Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `nde_vids` | NDE video metadata + classifications | videoId, isNde, experiencerFullName, intake_status |
| `nde_analysis` | Detailed NDE analysis results | video_id, total_greyson_score, transformation_score, core_elements, journey_sequence, phenomenology, entities |
| `channels` | NDE YouTube channel metadata | channel_id, scanner_enabled, last_scanned_at |
| `uap_vids` | UAP video metadata + classifications | video_id, tier, track, content_type, source_type |
| `uap_encounters` | Per-encounter UAP analysis results | video_id, experiencer_name, evidence_score, contact_depth_score, transformation_score, phenomenology_breakdown |
| `uap_channels` | UAP YouTube channel metadata | channel_id, channel_name |
| `uap_video_stats` | Aggregated per-video UAP statistics | video_id, intelligence_value, persons_count, claims_count |
| `nde_punctuated_embeddings` | NDE timestamped search embeddings | video_id, content, embedding, start_time |
| `nde_chatbot_chunks` | NDE RAG chat embeddings | video_id, content, embedding |

### 13.3 Pipeline Source Code

All pipeline code is open for inspection:
- **NDE Intake Pipeline:** `src/lib/pipeline/intake.ts`
- **UAP Intake Pipeline:** `src/lib/pipeline/intake-uap.ts`
- **Analysis Modules:** `src/lib/ai/*.ts` (classify-experience, greyson, cvnde, transformation, core-elements, phenomenology-entities, journey-flow, nde-summary)
- **Scale Documentation:** `docs/scales/*.md` (UAP-CDS, UAP-ESS, UAP-CTI, UAP-CET)
- **Experience Fingerprint:** `src/lib/ai/fingerprint.ts`

---

## 14. References

Greyson, B. (1983). The near-death experience scale: Construction, reliability, and validity. *Journal of Nervous and Mental Disease*, 171(6), 369–375.

Moody, R. A. (1975). *Life After Life*. Mockingbird Books.

Ring, K. (1980). *Life at Death: A Scientific Investigation of the Near-Death Experience*. Coward, McCann & Geoghegan.

Ring, K. (1984). *Heading Toward Omega: In Search of the Meaning of the Near-Death Experience*. William Morrow.

van Lommel, P., van Wees, R., Meyers, A., & Groeneveld, I. (2001). Near-death experience in survivors of cardiac arrest: A prospective study in the Netherlands. *The Lancet*, 358(9298), 2039–2045.

Hynek, J. A. (1972). *The UFO Experience: A Scientific Inquiry*. Henry Regnery Company.

---

*This document was prepared by the Project Profound research team for academic and collaborative use. For questions, collaboration inquiries, or access to structured datasets, contact the research team at Mastery Television.*

*Last updated: May 27, 2026*
