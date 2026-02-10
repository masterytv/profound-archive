# Video Processing & Analysis Workflows

> This document covers the backend data pipelines for processing videos.

## Workflows

### 1. NDE Video Verification
**File:** `docs/n8n/NDE_Video_Verification.json`
**Purpose:** Verifies if a crawled video is actually an NDE.
**Logic:**
- Takes a video URL/ID.
- Fetches transcript/metadata.
- Uses LLM to check against NDE criteria (Greyson scale).
- Updates `isNde` status in `nde_vids`.

### 2. NDE Summary Creator
**File:** `docs/n8n/nde_summary_creator.json`
**Purpose:** Generates the HTML analysis report and summary.
**Logic:**
- Reads transcript.
- Generates summary, phenomenology list, and Greyson score breakdown.
- Writes to `nde_analysis`.

### 3. NDE Video Researcher 2
**File:** `docs/n8n/nde_video_researcher_2.json`
**Purpose:** Advanced research/crawling logic.

### 4. Punctuation & Embedding Pipelines
**Files:**
- `Punctuate_Transcripts_to_be_Vectorized...json`
- `Punctuate_and_Embed_TIMESTAMPED_subtitles.json`
- `Vector_Subtitles_for_NDE_Chatbot.json`
- `prepare_subtitles_to_be_vectorized.json`

**Purpose:**
These workflows form the ETL pipeline:
1. **Punctuate:** restore punctuation to raw YouTube auto-caps captions using an LLM or formatting tool.
2. **Chunk:** Split text into semantic chunks.
3. **Embed:** Generate vectors (OpenAI).
4. **Store:** Save to `nde_punctuated_embeddings` or `nde_chatbot_chunks`.

## Migration Plan
These are long-running processes. Attempting to run them in a standard Next.js API route (Serverless function) might timeout (10s-60s limit).

**Recommended Target:** **Supabase Edge Functions** (longer timeout) or a dedicated background worker (e.g., Inngest, Trigger.dev, or keeping them in n8n for now).
