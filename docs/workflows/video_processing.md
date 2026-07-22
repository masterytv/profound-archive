# Video Processing & Analysis Pipelines

> This document covers the backend data pipelines for processing videos.

These are long-running processes and deliberately do **not** run in Next.js API
routes, which sit behind Cloudflare's 100s timeout. They run on the Oracle VM
worker, driven by crontab. See `docs/ARCHITECTURE.md`.

## Pipelines

### 1. Video Intake
**Code:** `src/lib/pipeline/intake.ts` (NDE), `src/lib/pipeline/intake-uap.ts` (UAP)
**Purpose:** Scrape → classify → analyse → embed a newly discovered video.
Classification decides whether a crawled video actually qualifies, before any
expensive analysis passes run.

### 2. Analysis Passes
**Code:** `src/lib/ai/` — `greyson.ts`, `cvnde.ts`, `core-elements.ts`,
`journey-flow.ts`, `phenomenology-entities.ts`, `transformation.ts`
**Driver:** `scripts/nde-batch-analysis.ts`
**Purpose:** Produce the scored breakdowns written to `nde_analysis`.

### 3. Summary Generation
**Code:** `src/lib/ai/nde-summary.ts`
**Purpose:** 80–150 word summary structured as Trigger → Experience → Aftermath.

### 4. Punctuation & Embedding
**Code:** `src/lib/pipeline/punctuate-uap.ts`, `src/lib/pipeline/embed-uap.ts`,
`src/lib/pipeline/insert-embedding-rows.ts`
**Drivers:** `scripts/uap-batch-punctuate.ts`, `scripts/uap-batch-embed.ts`
**Purpose:** The ETL chain:
1. **Punctuate:** restore punctuation to raw YouTube auto-caption text via an LLM.
2. **Chunk:** split text into semantic chunks.
3. **Embed:** generate vectors (OpenAI).
4. **Store:** write to `nde_punctuated_embeddings` or `nde_chatbot_chunks`.

## Gap

**NDE Video Verification** — a standalone verification pass that updated `isNde`
on `nde_vids` previously ran on the retired automation platform. Classification
now happens inside intake, but no direct replacement for the standalone
verification pass was identified. Confirm before assuming it runs.
