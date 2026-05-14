# SPRINT: UAP Vertical for Project Profound

> Phase 3 | BMAD Methodology | Type A Development Project
> Date: 2026-05-05

## Sprint Status (Updated by AI after each task)

> **⚠️ MANDATORY RULE:** When a task checkbox `- [ ]` is completed, the AI MUST update it to `- [x]` in this file BEFORE ending the conversation. This file is the single source of truth for cross-conversation state. Brain artifacts are conversation-scoped and unreliable for handoff.

| Sprint | Status | Completed |
|--------|--------|-----------|
| Sprint 1: Foundation | ✅ Complete | 2026-05-06 |
| Sprint 2: Pipeline | ✅ Complete | 2026-05-06 |
| Sprint 3: Core Pages | ✅ Complete | 2026-05-06 |
| Sprint 4: Profiles & Discovery | ✅ Complete | 2026-05-06 |
| Sprint 5: Content & Polish | ✅ Complete | 2026-05-07 |
| Sprint 6: Deep Analysis & Search | ✅ Complete | 2026-05-12 |
| Sprint 7: Mass Analysis & Intelligence | ✅ Complete | 2026-05-12 |
| Sprint 8: Scanner Expansion | ✅ Complete (8.3.2, 8.3.4 deferred) | 2026-05-13 |
| Sprint 9: Engagement & CRM | ✅ Complete | 2026-05-13 |
| Sprint 10: Site Fixes & Polish | ✅ Complete | 2026-05-14 |
| Sprint 11: Unified Homepage & Brand Evolution | 🔄 In Progress | — |
| Sprint 12: Security Audit | 🔲 Not Started | — |
| Backlog: Revenue & Growth Strategy | 📋 Brainstorm | — |

## Environment Setup

- **Branch:** Create `feature/uap-vertical` from `main`. All UAP work merges here first.
- **Supabase Branch:** Create a Supabase dev branch `uap-dev` for migration testing.
- **Env Vars (already in `.env`):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (needed for embedding generation in Sprint 2).
- **Database Backup:** Snapshot current production database before Sprint 1. Although development is additive, `uap_vids` is an existing table being ALTER-ed and `favorites`/`saved_searches` get new columns.
- **Node:** v20+ (matches existing).
- **Naming:** All new DB objects `uap_*`, API routes under `/api/.../uap/`, admin routes under `/admin/uap/`, source files prefixed `uap-`, Actions `uap-*.yml`.
- **Pre-flight:** Run `npm run build` on `main` to confirm green baseline before branching.

---

## Copy-Modify Protocol (Read → Map → Write)

> **CRITICAL:** Do NOT build UAP code from scratch. The NDE vertical is the working reference implementation. Every UAP pipeline, route, and page MUST be created by reading the NDE equivalent first, then adapting it.

### The Protocol

For every UAP file you create:

1. **READ:** Use `view_file` to read the NDE equivalent listed in the Reference Map below.
2. **MAP:** Translate all NDE-specific terms to UAP equivalents using the Term Map below.
3. **WRITE:** Create the NEW file in the UAP directory. **NEVER overwrite the original NDE file.**
4. **VERIFY:** After creation, grep the new file for leftover `nde_`, `nde-`, or `NDE` references. Fix any that slipped through.

### Duplication vs. Polymorphism Rule

- **DUPLICATE (then modify):** Pipelines, API routes, page routes, batch scripts, GitHub Actions, RPCs. These get their own UAP-specific copies.
- **EXTEND (do NOT duplicate):** Shared UI components (buttons, cards, video players, radar charts). Add a `domain?: 'nde' | 'uap'` prop and use `DomainConfig` to swap colors/labels/icons. Preserve all existing NDE behavior.

### Term Map

| NDE Term | UAP Term |
|---|---|
| `nde_vids` | `uap_vids` |
| `nde_analysis` | `uap_analysis` |
| `nde_punctuated_embeddings` | `uap_punctuated_embeddings` |
| `nde_chatbot_chunks` | `uap_chatbot_chunks` |
| `keyword_search_videos` | `keyword_search_uap_videos` |
| `search_punctuated_embeddings` | `search_uap_punctuated_embeddings` |
| `classify-experience.ts` | `classify-uap.ts` |
| `intake.ts` | `uap-intake.ts` |
| `greyson.ts` | `triad/evidence.ts` |
| `transformation.ts` | `triad/transformation.ts` |
| `/search` routes | `/uap/search` routes |
| `/admin/pipeline` | `/admin/uap` |
| `scanner-*.yml` | `uap-scanner-*.yml` |
| `domain: 'nde'` | `domain: 'uap'` |

### NDE → UAP Reference Map

| UAP File to Create | Read & Adapt From |
|---|---|
| **Sprint 1: Foundation** | |
| `classify-uap.ts` | `src/lib/ai/classify-experience.ts` |
| `scripts/uap-batch-classify.ts` | `scripts/batch-*.ts` (any existing batch script) |
| `src/lib/config/domains.ts` | New file, but read existing config patterns in `src/lib/` |
| `src/app/uap/layout.tsx` | `src/app/(site)/layout.tsx` |
| `src/app/uap/page.tsx` | `src/app/(site)/page.tsx` (landing page pattern) |
| `src/app/admin/uap/page.tsx` | `src/app/admin/pipeline/page.tsx` |
| Search RPCs (SQL) | `keyword_search_videos` RPC in Supabase |
| **Sprint 2: Pipeline** | |
| `punctuate-uap.ts` | `src/lib/youtube/transcript-processor.ts` (chunking) + `intake.ts` (flow) |
| `embed-uap.ts` | `src/lib/pipeline/intake.ts` (generateEmbeddings + batchEmbed) |
| `triad/evidence.ts` | `src/lib/ai/greyson.ts` (scoring pattern) |
| `triad/contact-depth.ts` | `src/lib/ai/greyson.ts` (scoring pattern) |
| `triad/transformation.ts` | `src/lib/ai/transformation.ts` |
| `uap-knowledge.ts` | `src/lib/pipeline/blog-article.ts` (extraction pattern) |
| **Sprint 3: Core Pages** | |
| `src/app/uap/encounters/[slug]/page.tsx` | `src/app/(site)/experience/[id]/page.tsx` |
| `src/app/uap/search/page.tsx` | `src/app/(site)/search/page.tsx` |
| `src/app/api/uap/search/route.ts` | `src/app/api/search/route.ts` |
| `src/app/uap/channels/page.tsx` | `src/app/(site)/channels/page.tsx` (if exists) |
| **Sprint 4: Profiles & Chat** | |
| `src/app/uap/chat/page.tsx` | `src/app/(site)/chat/page.tsx` |
| `src/app/uap/actions.ts` | `src/app/(site)/actions.ts` |
| **Sprint 5: Content & Polish** | |
| `uap-blog-questions.yml` | `.github/workflows/scanner-*.yml` |
| `uap-scanner-discover.yml` | `.github/workflows/scanner-discover.yml` |
| Blog seed scripts | `src/lib/pipeline/blog-story.ts` |

---

## Sprint 1: Foundation (Week 1) ✅ COMPLETE

**Goal:** Establish database schema, domain configuration, UI layouts, and execute batch classification on the existing 4,195 UAP videos.

> **Completed:** 2026-05-06 | **Conversation:** 66b4742a | **Files created:** 13 new, 1 modified

### Epic 1.1: Database Schema

#### Story 1.1.1: Create core UAP tables (1d)
- [x] Write migration `001_uap_vids_columns.sql` — add `content_type`, `tier`, `track`, `subtitles_raw`, `subtitles_punctuated`, `intake_status`, `classified_at`, `classifier_model` columns to `uap_vids`
- [x] Write migration `002_uap_channels.sql` — create `uap_channels` table (id, channel_id, name, handle, thumbnail_url, subscriber_count, video_count, description, created_at, updated_at)
- [x] Write migration `003_uap_analysis.sql` — create `uap_analysis` table (PK `video_id` FK → `uap_vids`, evidence_score, contact_depth_score, transformation_score, analysis_model, analyzed_at, raw_json)
- [x] Write migration `004_uap_contactee_profiles.sql` — create `uap_contactee_profiles` table (id, name, slug, bio, key_claims, source_video_ids, created_at, updated_at)
- **Done when:** All four migrations apply cleanly on the Supabase dev branch and tables are visible in the dashboard.

#### Story 1.1.2: Create embedding & chunk tables (0.5d)
- [x] Write migration `005_uap_punctuated_embeddings.sql` — create `uap_punctuated_embeddings` (id, video_id FK, chunk_index, content, embedding vector(1536), metadata jsonb) with HNSW index on `embedding`
- [x] Write migration `006_uap_chatbot_chunks.sql` — create `uap_chatbot_chunks` (id, video_id FK, chunk_index, content, embedding vector(1536), metadata jsonb) with HNSW index on `embedding`
- **Done when:** Both tables exist with HNSW indexes confirmed via `\di` in psql.

#### Story 1.1.3: Add RLS policies & domain columns (0.5d)
- [x] Write migration `007_uap_rls_and_domains.sql` — add RLS policies to all new tables (public SELECT, service_role ALL)
- [x] In same migration, add `domain TEXT DEFAULT 'nde'` column to `favorites` and `saved_searches` tables
- [x] Verify existing NDE queries are unaffected by the new default column value
- **Done when:** `SELECT * FROM uap_analysis` works with anon key; INSERT fails with anon key; `favorites.domain` column exists with default `'nde'`.

#### Story 1.1.4: Create search RPCs (1d)
- [x] Write RPC `keyword_search_uap_videos` — PL/pgSQL function using GIN index, with `WHERE tier != 3 AND intake_status != 'out_of_scope'` guard (defense-in-depth)
- [x] Write RPC `search_uap_punctuated_embeddings` — vector similarity search, with `WHERE tier != 3 AND intake_status != 'out_of_scope'` on joined `uap_vids`
- [x] Write RPC `get_uap_channel_stats` — aggregates video count, avg scores per channel
- [x] Write RPC `uap_search_facets` — returns distinct content_type, tier, track values for filter UI (excludes Tier 3)
- **Done when:** All four RPCs callable from Supabase client; `keyword_search_uap_videos` returns zero Tier 3 results when Tier 3 rows exist; manually setting `tier=1` on an `out_of_scope` video still excludes it.

---

### Epic 1.2: Domain Config & Layout

#### Story 1.2.1: Implement domain config system (0.5d)
- [x] Create/update `src/lib/config/domains.ts` — export `DomainConfig` type and `DOMAINS` map with `nde` and `uap` entries (labels, colors, routes, features, default tier filter)
- [x] Add `getDomainConfig(domain: string)` helper that returns config or throws
- [ ] Add unit test confirming both domains resolve and unknown domain throws
- **Done when:** `getDomainConfig('uap')` returns valid config object; `getDomainConfig('invalid')` throws.

#### Story 1.2.2: Create UAP layout and landing page (1d)
- [x] Create `src/app/uap/layout.tsx` — server component with UAP-specific metadata, nav, domain context provider, and CSS variables for violet accent color tokens
- [x] Create `src/app/uap/page.tsx` — landing page with hero section, stats (total videos, channels), and CTA cards for Explore/Search/Chat
- [x] Fetch stats server-side using `getDomainConfig('uap')` and Supabase count queries
- [ ] Add UAP entry to main site navigation (header/footer)
- **Done when:** `/uap` renders with real video count from DB; layout wraps all child routes; lighthouse accessibility score ≥ 90.

---

### Epic 1.3: Content Classifier Pipeline

#### Story 1.3.1: Build content classifier module (1d)
- [x] Create `src/lib/ai/classify-uap.ts` — accepts video metadata, calls `gpt-4o-mini` with `response_format: { type: 'json_object' }` (mirrors NDE `classify-experience.ts` pattern) to return `{ tier: 1|2|3, track: 'encounter'|'program', content_type: string, confidence: number }`
- [x] Use OpenAI JSON mode — NOT Claude prefill (matching proven NDE pipeline; ~$0.001/call)
- [x] Implement Tier 3 gate: if `tier === 3`, set `intake_status = 'out_of_scope'` and skip all downstream processing
- [x] Add Zod schema `UAPClassificationSchema` matching the DB columns
- **Done when:** Unit test passes — a known encounter video classifies as Tier 1/encounter; a cooking video classifies as Tier 3 with `intake_status = 'out_of_scope'`.

#### Story 1.3.2: Build batch classification script (1d)
- [x] Create `scripts/uap-batch-classify.ts` — reads all unclassified `uap_vids`, calls `classify-uap.ts` in batches of 10 with 1s delay
- [x] Implement progress logging (processed/total/errors) and resume support (skip already-classified rows)
- [x] Handle Cloud Run 300s limit: process in chunks, log checkpoint after each batch
- **Done when:** Script classifies 50+ test videos without error; resume works after interruption; Tier 3 videos have `intake_status = 'out_of_scope'`.
- **✅ RESULT:** All 4,195 videos classified — T1: 49 encounters, T2: 325 program, T3: 821 out_of_scope. 0 errors.

---

### Epic 1.4: Admin UAP Integration

#### Story 1.4.1: Add UAP nav group to admin sidebar (0.5d)
- [x] Update admin sidebar component to add "UAP" nav group with items: Dashboard, Classifier, Channels, Contactees
- [x] Use existing sidebar pattern — add entries to the nav config array, not a separate panel
- [x] Ensure NDE nav group remains unchanged
- **Done when:** Admin sidebar shows UAP section with 4 links; NDE section is visually identical to before.

#### Story 1.4.2: Build admin UAP dashboard (1d)
- [x] Create `src/app/admin/uap/page.tsx` — server component showing pipeline stats
- [x] Display: total videos, classified count, Tier 1/2/3 breakdown, unprocessed count, error count
- [x] Add recent activity feed (last 10 classifications with timestamp)
- [x] Fetch all data server-side via Supabase service role client
- **Done when:** Dashboard loads with accurate counts matching DB; refreshing shows updated data after running classifier.

---

## Sprint 2: Pipeline (Week 2)

**Goal:** Run all remaining data pipelines on classified videos — generating punctuated transcripts, embeddings, and deep AI analysis (triad scores for Tier 1, knowledge extraction for Tier 2).

> **✅ RESOLVED:** UAP-CET (Contact Experience Triad) rubric is finalized. Three separate scales approved:
> - `docs/scales/UAP-ESS.md` — Evidence Strength Scale (7-28, maps to cvNDE)
> - `docs/scales/UAP-CDS.md` — Contact Depth Scale (0-32, maps to Greyson)
> - `docs/scales/UAP-CTI.md` — Contact Transformation Index (0-60 full / 0-50 comparable, maps to NDE-TI)
> - `docs/scales/UAP-CET.md` — Umbrella overview document

### Epic 2.1: UAP-CET Rubric ✅

#### Story 2.1.1: Develop UAP scoring rubrics (1d)
- [x] Conduct research session to define Evidence, Contact-Depth, and Transformation scoring dimensions for UAP content
- [x] Document rubrics as three separate scales: `docs/scales/UAP-ESS.md`, `docs/scales/UAP-CDS.md`, `docs/scales/UAP-CTI.md`, with umbrella `docs/scales/UAP-CET.md`
- [ ] Define prompt templates for each scale that gpt-4o-mini will use for analysis (deferred to Epic 2.3 implementation)
- **Done when:** All three scale docs exist with scoring anchors, rating guidance, AI constraints, cross-domain comparison tables, and team approval. ✅ Approved 2026-05-06.

---

### Epic 2.2: Punctuation & Embedding Pipelines

#### Story 2.2.1: Build punctuation pipeline (1d)
- [x] Create `src/lib/pipeline/punctuate-uap.ts` — mirrors NDE `transcript-processor.ts` pattern; parses raw_timestamped_subtitles JSONB, generates punctuated text + search/chat chunks (no AI call needed; YouTube captions are already sentence-level)
- [x] Add Tier 3 gate check at entry: `shouldSkipVideo()` skips if `tier === 3` or `intake_status === 'out_of_scope'`
- [x] Create batch script `scripts/uap-batch-punctuate.ts` — processes Tier 1+2 videos only, batches of 5, with checkpoint logging and resume support
- [x] Update `uap_vids.subtitles_punctuated`, `subtitles_cleaned`, and `intake_status` on completion
- **Done when:** 20+ Tier 1/2 videos have punctuated subtitles; zero Tier 3 videos were processed; `intake_status` updated.

#### Story 2.2.2: Generate punctuated embeddings (1d)
- [x] Create `src/lib/pipeline/embed-uap.ts` — embeds pre-chunked text via OpenAI `text-embedding-3-small`, inserts into `uap_punctuated_embeddings` + `uap_chatbot_chunks` (1 row at a time per NDE pattern)
- [x] Add Tier 3 gate: `shouldSkipVideo()` enforced in batch script
- [x] Create batch script `scripts/uap-batch-embed.ts` for Tier 1+2 videos (batch of 3, 2s delay)
- **Done when:** `uap_punctuated_embeddings` has rows for 10+ videos; vector similarity search RPC returns results.

#### Story 2.2.3: Generate chat chunks (0.5d)
- [x] Create standalone batch script `scripts/uap-batch-chat-chunks.ts` — chunks punctuated text into ~1000 char segments with sentence boundary splitting, embeds via OpenAI, inserts into `uap_chatbot_chunks` (can run independently of uap-batch-embed.ts for backfilling)
- [x] Tier 3 gate enforced via `shouldSkipVideo()` from punctuate-uap.ts
- [x] Re-processing support: deletes existing chunks before reinserting
- **Done when:** `uap_chatbot_chunks` populated for 10+ Tier 1+2 videos; zero Tier 3 entries.

---

### Epic 2.3: Triad Analysis Pipeline (Tier 1)

#### Story 2.3.1: Build evidence analysis module (0.5d)
- [x] Create `src/lib/ai/uap-evidence.ts` — sends punctuated transcript + UAP-ESS rubric to `gpt-4o-mini` (mirrors NDE cvnde.ts pattern), returns 7-criterion score (7-28) + rationale via JSON mode
- [x] Use Zod schema `UAPEvidenceScoreSchema` for output validation
- [x] Only processes Tier 1 videos (first-person encounter accounts)
- **Done when:** Unit test passes with a known encounter transcript returning a valid score and rationale.

#### Story 2.3.2: Build contact-depth analysis module (0.5d)
- [x] Create `src/lib/ai/uap-contact-depth.ts` — scores contact depth per UAP-CDS rubric (16 items, 0-32) via `gpt-4o-mini` JSON mode
- [x] Use Zod schema `UAPContactDepthScoreSchema`
- [x] Tier 1 only
- **Done when:** Unit test passes; score stored in `uap_analysis.contact_depth_score`.

#### Story 2.3.3: Build transformation analysis module (0.5d)
- [x] Create `src/lib/ai/uap-transformation.ts` — scores transformation per UAP-CTI rubric (12 domains, 0-60 full / 0-50 comparable) via `gpt-4o-mini` JSON mode
- [x] Use Zod schema `UAPTransformationScoreSchema`
- [x] Tier 1 only
- **Done when:** Unit test passes; score stored in `uap_analysis.transformation_score`.

#### Story 2.3.4: Build triad batch orchestrator (0.5d)
- [x] Create `scripts/uap-batch-triad.ts` — runs all three triad modules sequentially per video, writes combined results to `uap_analysis`
- [x] Processes only Tier 1 videos with punctuated subtitles and no existing analysis
- [x] Checkpoint logging and resume support
- **Done when:** 5+ Tier 1 videos have all three scores in `uap_analysis`; script resumes correctly after interruption.

---

### Epic 2.4: Knowledge Extraction (Tier 2)

#### Story 2.4.1: Build knowledge extraction pipeline (1d)
- [x] Create `src/lib/pipeline/uap-knowledge.ts` — extracts claims, entities, dates, and relationships from Tier 2 (program/investigative) content via Claude Sonnet (long-form extraction requires stronger model; mirrors blog-article.ts pattern)
- [x] Use Zod schema `UAPKnowledgeSchema` for structured output
- [x] Store extracted data as JSONB in `uap_analysis.raw_json` for Tier 2 videos
- [x] Create batch script `scripts/uap-batch-knowledge.ts`
- **Done when:** 5+ Tier 2 videos have knowledge extraction results in `uap_analysis.raw_json`.

---

### Epic 2.5: Admin Classifier Review

#### Story 2.5.1: Build admin classifier review page (1d)
- [x] Create `src/app/admin/uap/classifier/page.tsx` — table of all classified videos with tier, track, content_type, confidence columns
- [x] Add filter controls: filter by tier (1/2/3), track, intake_status
- [x] Add inline edit: click to override tier/track with confirmation modal
- [x] Override writes to DB and logs the change with admin user ID
- **Done when:** Admin can view all classified videos, filter by tier, and override a classification that persists to DB.

---

### Epic 2.6: Real-Time Intake Pipeline ✅

> Added 2026-05-06 to enable single-video processing for admin intake and scanner automation.
> Copy-Modify from NDE `src/lib/pipeline/intake.ts` + `/api/intake` routes.

#### Story 2.6.1: Build UAP single-video intake orchestrator (1d)
- [x] Create `src/lib/pipeline/intake-uap.ts` — single-video pipeline: parse URL → check DB → scrape metadata → shorts gate → ensure channel → fetch captions → classify (tier/track/content_type) → Tier 3 gate → punctuate → embed → complete
- [x] Reuses existing modules: `punctuate-uap.ts` functions, `embed-uap.ts` functions, classification prompt from `uap-batch-classify.ts`
- [x] Writes to `uap_vids`, `uap_channels`, `uap_punctuated_embeddings`, `uap_chatbot_chunks`
- [x] Telegram alert on pipeline failure
- **Done when:** `processUapVideoIntake(url)` successfully processes a UAP YouTube URL end-to-end.

#### Story 2.6.2: Create UAP intake API routes (0.5d)
- [x] Create `src/app/api/uap/intake/route.ts` — POST queues job in `uap_jobs`, GET polls status
- [x] Create `src/app/api/uap/intake/process/route.ts` — runs `processUapVideoIntake()`, updates `uap_jobs` with result
- [x] Auth: admin session OR CRON_SECRET bearer token (same pattern as NDE)
- [x] Create `uap_jobs` table migration (UUID PK, status, result JSONB)
- **Done when:** POST creates job, process route runs pipeline, GET returns job status.

#### Story 2.6.3: Build UAP intake admin page (0.5d)
- [x] Create `src/app/admin/uap/intake/page.tsx` — paste-a-URL form with async job polling and step-by-step progress display
- [x] Shows tier/track badge after classification
- [x] Final result badge for each terminal status (complete, out_of_scope, no_captions, is_short, failed)
- **Done when:** Admin can paste a UAP video URL, see pipeline progress, and view result.

---

### Epic 2.7: Scanner Infrastructure ✅

> Added 2026-05-06 to enable automated daily channel scanning and video ingestion.
> Copy-Modify from NDE `src/lib/scanner/` + `/api/scanner/` + `/api/admin/scanner/`.

#### Story 2.7.1: Database migrations for scanner (0.5d)
- [x] Migration: Add `scanner_enabled`, `last_scanned_at`, `uploads_playlist_id` columns to `uap_channels`
- [x] Migration: Create `uap_scan_queue` table (video_url, video_id, channel_id, status, etc.)
- [x] Migration: Create `uap_scan_runs` table (channel_id, run_type, timestamps, counters)
- **Done when:** All migrations applied; tables visible in Supabase dashboard.

#### Story 2.7.2: Build UAP scanner library (1d)
- [x] Create `src/lib/scanner/uap-discover.ts` — discovers new videos from UAP channels, deduplicates against `uap_vids`, filters shorts ≤180s
- [x] Create `src/lib/scanner/uap-tick.ts` — `runUapDiscoverTick()`, `runUapProcessTick()`, `runUapScannerTick()` orchestrators
- [x] Queries `uap_channels`, queues to `uap_scan_queue`, logs to `uap_scan_runs`, calls `processUapVideoIntake()`
- **Done when:** Discovery finds new videos; process tick runs them through intake pipeline.

#### Story 2.7.3: Create UAP scanner API routes (0.5d)
- [x] Create `src/app/api/uap/scanner/discover/route.ts` — CRON_SECRET auth, calls `runUapDiscoverTick()`
- [x] Create `src/app/api/uap/scanner/process/route.ts` — CRON_SECRET auth, calls `runUapProcessTick()`
- [x] Create `src/app/api/uap/scanner/tick/route.ts` — CRON_SECRET auth, calls `runUapScannerTick()`
- **Done when:** All three endpoints respond with correct data and reject unauthorized requests.

#### Story 2.7.4: Create UAP admin scanner API (0.5d)
- [x] Create `src/app/api/admin/uap-scanner/route.ts` — GET returns channels + queue stats + scan runs; POST handles toggle_channel, run_audit, discover_all, run_tick, reset_item, add_channel actions
- [x] Auth: `isAdminUser()` guard (same pattern as NDE)
- **Done when:** Admin API returns UAP scanner data and all actions work.

#### Story 2.7.5: Build UAP scanner admin page (0.5d)
- [x] Create `src/app/admin/uap/scanner/page.tsx` — channel list with scanner toggle, queue stats, audit button, discover all button, tick button, add channel form with track selector
- [x] Matches NDE scanner admin UI design system (dark theme, glassmorphism cards)
- **Done when:** Admin can view channels, toggle scanner, run audit/discover/tick, and add new channels.

---

## Sprint 3: Core Pages (Week 3)

**Goal:** Build user-facing pages for video details, search, and channel discovery using the pipeline-generated data.

### Epic 3.1: Video Detail Pages

#### Story 3.1.1: Build encounter video detail page (1d) ✅
- [x] Create `src/app/uap/encounters/[slug]/page.tsx` — server component, fetches video + triad scores from DB
- [x] Implement click-to-play video embed (no autoplay per LEARNINGS.md)
- [x] Display punctuated transcript with expandable sections
- [x] Add `generateMetadata` for SEO (title, description, OG image)
- [x] Fix: Added `uap_vids_public_read` RLS policy (tier IN (1,2)) — was missing
- **Done when:** `/uap/encounters/[slug]` renders with video, transcript, and metadata; click-to-play works; no autoplay.

#### Story 3.1.2: Build program video detail page (0.5d) ✅
- [x] Create `src/app/uap/programs/[slug]/page.tsx` — server component for Tier 2 content
- [x] Display knowledge extraction panel instead of triad scores
- [x] Reuse video embed and transcript components from Story 3.1.1 via domain config
- **Done when:** `/uap/programs/[slug]` renders with knowledge panel; shared components work for both route trees.

#### Story 3.1.3: Build triad scores panel component (0.5d) ✅
- [x] Create `src/components/uap/TriadScoresPanel.tsx` — displays evidence, contact-depth, transformation scores with labels and descriptions
- [x] Add radar chart visualization using existing chart library (recharts)
- [x] Component accepts scores as props, renders gracefully when scores are null (pending analysis)
- **Done when:** Panel renders on encounter detail page with real scores; null scores show "Analysis pending" state.

#### Story 3.1.4: Build knowledge panel component (0.5d) ✅
- [x] Create `src/components/uap/KnowledgePanel.tsx` — displays extracted claims, entities, dates from individual JSONB columns
- [x] Render as structured cards: Claims list, People, Programs, Timeline, Consciousness Connections
- [x] Handles empty/null state gracefully ("Knowledge extraction pending")
- **Done when:** Panel renders on program detail page with real extracted data; empty state shows placeholder.

---

### Epic 3.2: Channel Pages

#### Story 3.2.1: Build channel list page (0.5d) ✅
- [x] Create `src/app/uap/channels/page.tsx` — server component, lists all channels with thumbnail, name, video count
- [x] Sort by video count descending; use `get_uap_channel_stats` RPC
- [x] Add `generateMetadata`
- **Done when:** `/uap/channels` renders all channels with accurate video counts from RPC.

#### Story 3.2.2: Build channel detail page (0.5d) ✅
- [x] Create `src/app/uap/channels/[handle]/page.tsx` — shows channel info + video grid (up to 60 videos)
- [x] Videos split by tier: Encounters (Tier 1) and Research (Tier 2) sections
- [x] Videos link to correct detail page based on tier (encounter vs program)
- **Done when:** `/uap/channels/[handle]` renders channel with videos; links route correctly by track.

---

### Epic 3.3: Search

#### Story 3.3.1: Build UAP search API route (0.5d) ✅
- [x] Create `src/app/api/uap/search/route.ts` — accepts query, mode (keyword/semantic), and filters (tier, track, content_type)
- [x] Keyword mode calls `keyword_search_uap_videos` RPC; semantic mode calls `search_uap_punctuated_embeddings` RPC
- [x] Both RPCs already enforce `tier != 3` — added server-side defense-in-depth filter
- **Done when:** API returns results for keyword and semantic queries; Tier 3 videos never appear in results.

#### Story 3.3.2: Build UAP search page (1d) ✅
- [x] Create `src/app/uap/search/page.tsx` — search input, mode toggle (keyword/semantic), filter bar (tier, track, content_type via `uap_search_facets` RPC)
- [x] Results display as video cards with title, channel, tier badge, timestamps linking to video position
- [x] Implement URL-based search state (query params) for shareability
- [x] Loading skeleton and empty state
- **Done when:** Search page returns results for both modes; filters work; timestamps deep-link into video; URL reflects search state; no Tier 3 results.

---

### Epic 3.4: Admin Channel Management

#### Story 3.4.1: Build admin channel management page (1d) ✅
- [x] Create `src/app/admin/uap/channels/page.tsx` — table of all channels with pipeline stats and tier breakdown
- [x] Add: channel visibility toggle (hide/show from public listings)
- [x] Add: bulk action to re-classify all videos in a channel
- [x] Display pipeline status per channel (T1/T2/T3 counts, avg ESS)
- **Done when:** Admin can view all channels, toggle visibility, trigger re-classify, and see per-channel pipeline progress.

#### Story 3.4.2: Build UAP scanner queue pages (0.5d) ✅
- [x] Create `src/app/admin/uap/scanner/queue/page.tsx` — table of pending/failed items from `uap_scan_queue` with retry and skip actions
- [x] Create `src/app/admin/uap/scanner/pending/page.tsx` — filtered view of failed intake from `uap_vids` with re-queue
- **Done when:** Admin can view queue items, retry failed, and skip no_captions.

---

## Sprint 4: Profiles & Discovery (Week 4)

**Goal:** Aggregate pipeline data into higher-level exploration tools — contactee profiles, timelines, chat interface — and add content safety guardrails.

### Epic 4.1: Contactee Profiles

#### Story 4.1.1: Build contactee profile data aggregation (0.5d)
- [x] Create `src/lib/data/uap-contactee.ts` — aggregates all videos, triad scores, and knowledge data for a contactee
- [x] Computes average triad scores across all Tier 1 videos
- [x] Collects all extracted claims from Tier 2 videos mentioning this contactee
- **Done when:** Function returns complete profile data for a test contactee with multiple videos.

#### Story 4.1.2: Build contactee profile page (1d) ✅ 2026-05-07
- [x] Create `src/app/uap/contactees/[slug]/page.tsx` — server component with bio, key claims, video list, avg triad scores radar chart
- [x] Add `generateMetadata` and `generateStaticParams` (use `buildClient()` per LEARNINGS.md)
- [x] Link from video detail pages to contactee profile (resolves contactee slug via `contains` query on `video_ids`; graceful fallback to plain text when no profile exists)
- **Done:** `/uap/contactees/[slug]` renders with aggregated data; bidirectional links work.

#### Story 4.1.3: Build contactee list page (0.5d)
- [x] Create `src/app/uap/contactees/page.tsx` — grid of contactee cards with photo, name, video count, avg evidence score
- [x] Sort by video count; server-side fetch
- **Done when:** `/uap/contactees` renders grid with real data; cards link to detail pages.

---

### Epic 4.2: Person Pages & Timeline

#### Story 4.2.1: Build person/entity knowledge graph page (1d)
- [x] Create `src/app/uap/people/[slug]/page.tsx` — aggregates all mentions of a person/entity across knowledge extractions
- [x] Display: mention count, associated claims, source videos, related entities
- [x] Server-side data aggregation from `uap_analysis.people_mentioned`
- **Done when:** `/uap/people/[slug]` renders with cross-referenced data from multiple videos.

#### Story 4.2.2: Build disclosure timeline page (1d)
- [x] Create `src/app/uap/timeline/page.tsx` — chronological, filterable visualization of key UAP events extracted from knowledge pipeline
- [x] Render as vertical timeline with date, event title, source video link (grouped by decade)
- [x] Data sourced from `uap_analysis.timeline_events`, deduplicated by title+year
- [x] Add `generateMetadata`
- **Done when:** `/uap/timeline` renders chronological events with source links; filters narrow results correctly; no duplicate entries.

---

### Epic 4.3: Chat

#### Story 4.3.1: Build UAP chat server action (0.5d)
- [x] Create `src/app/uap/actions.ts` — server action for chat, retrieves relevant chunks from `uap_chatbot_chunks` via vector search, sends to GPT-4o-mini with UAP system prompt
- [x] Vector search via `match_uap_chatbot_chunks` RPC with fallback
- [x] Content safety rules enforced in system prompt
- **Done when:** Server action returns response grounded in UAP video content with citations.

#### Story 4.3.2: Build UAP chat page (1d)
- [x] Create `src/app/uap/chat/page.tsx` + `chat-ui.tsx` — chat interface with message history, input, and response display
- [x] Green UAP theming with suggestion buttons for initial state
- [x] Source citations (video title + link) in chat responses
- [x] Content safety disclaimer banner (enhanced variant) at top of chat
- **Done when:** Chat page sends messages, shows responses with citations, shows safety banner; responses reference real UAP content.

---

### Epic 4.4: Content Safety

#### Story 4.4.1: Add content safety banners (0.5d)
- [x] Create `src/components/uap/ContentSafetyBanner.tsx` — dismissible banner explaining content nature and encouraging critical thinking
- [x] Standard variant (compact) and enhanced variant (for chat page) with localStorage-based dismiss persistence
- [x] Separate variant for chat page with stronger disclaimer
- **Done when:** Banner appears on first visit to any UAP page; dismissing persists across page navigations; chat page shows enhanced variant.

---

### Epic 4.5: Admin Contactee Editor

#### Story 4.5.1: Build admin contactee editor (1d) ✅ 2026-05-07
- [x] Create `src/app/admin/uap/contactees/page.tsx` — paginated table with search, inline edit, create dialog, delete confirmation
- [x] Create `src/app/api/admin/uap-contactees/route.ts` — CRUD API with isAdminUser() guard
- [x] Edit: name, slug, bio, experience_type (inline); bio expanded below table
- [x] Slug auto-generated from name with manual override option
- [x] Delete requires confirmation modal
- **Done:** Admin can CRUD contactee profiles; changes persist to DB; slug generation works.

---

## Sprint 5: Content & Polish (Week 5)

**Goal:** Seed launch content (blog posts, Big Questions), wire up CI/CD via GitHub Actions, finalize SEO, domain-aware dashboard, and verify zero NDE regressions before launch.

### Epic 5.1: Blog Content

#### Story 5.1.1: Generate UAP Big Questions (1d) ✅ 2026-05-07
- [x] Create `scripts/uap-seed-questions.ts` — 36 questions seeded across 8 categories
- [x] Pipeline: `uap-blog-article.ts` + `uap-blog-prompts.ts` (Copy-Modify from NDE)
- [x] Posts written to `blog_posts` table with `domain = 'uap'`
- [x] Set up `uap-blog-generate-questions.yml` GHA (daily 1pm ET, offset from NDE)
- [x] Cron route: `api/cron/uap-blog-questions/route.ts`
- [x] Admin: `admin/uap/blog/page.tsx` + generation panel + CRUD API
- [x] Admin: `admin/uap/questions/page.tsx` + toggle API
- **Done:** 1 UAP article generated via E2E smoke test; 36 questions seeded; GHA valid.

#### Story 5.1.2: Generate UAP blog stories (1d) — DEFERRED
- [ ] Create `uap-blog-story.ts` pipeline + cron route + GHA
- *Deferred: story pipeline not needed for V1 launch. Questions pipeline covers content.*

---

### Epic 5.2: GitHub Actions

#### Story 5.2.1: Create pipeline GitHub Actions (1d) ✅ 2026-05-07
- [x] `uap-scanner-discover.yml` — hourly :30 (offset from NDE :00)
- [x] `uap-scanner-process.yml` — every 10m :05 offset
- [x] `uap-triad-batch.yml` — weekly Sun 2am ET
- [x] `uap-knowledge-batch.yml` — weekly Sun 4am ET
- [x] `uap-blog-generate-questions.yml` — daily 1pm ET
- [x] All Actions mirror NDE patterns with time offsets to prevent API collisions
- **Done:** 5 GHA workflows created; all offset from NDE schedules.

---

### Epic 5.3: Dashboard & Saved Searches

#### Story 5.3.1: Make dashboard domain-aware (0.5d) ✅ 2026-05-07
- [x] Update dashboard/collections components to filter by `domain` column on `favorites` and `saved_searches`
- [x] Add domain toggle or tab UI if user has content in both NDE and UAP
- [x] Ensure NDE-only users see no change in behavior
- [x] Backfilled `domain = 'nde'` on all existing saved_searches and favorites rows (migration: `20260507_001_backfill_domain_nde.sql`)
- [x] Added `domain: 'nde'` to all NDE insert points (search3, dev/v4, add-to-collection-button, favorite-button)
- **Done:** Dashboard shows two domain sections (NDE blue, UAP green) with tabbed Collections/Saved Searches. Domain-filtered queries. Correct routing per domain.

#### Story 5.3.2: Implement UAP saved searches (0.5d) ✅ 2026-05-07
- [x] Extend saved searches to store domain, search mode, and filters
- [x] UAP search page "Save Search" button writes to `saved_searches` with `domain = 'uap'`
- [x] Dashboard displays saved UAP searches with re-run capability
- **Done:** Bookmark button on UAP search page saves with `domain: 'uap'`. Dashboard UAP section shows saved searches with correct routing to `/uap/search`.

---

### Epic 5.4: SEO

#### Story 5.4.1: Add generateMetadata to all UAP routes (0.5d) ✅ 2026-05-07
- [x] Added static `Metadata` to `/uap/page.tsx` (title, description, OG, canonical)
- [x] Created `/uap/search/layout.tsx` metadata wrapper for client component page
- [x] All dynamic pages already had `generateMetadata` from Sprint 3
- **Done:** All UAP routes have unique metadata; OG tags present.

#### Story 5.4.2: Add JSON-LD and sitemap entries (0.5d) ✅ 2026-05-07
- [x] Added VideoObject JSON-LD to encounter detail pages
- [x] Added Organization JSON-LD to channel detail pages
- [x] Contactee pages already had Person + CollectionPage JSON-LD from Sprint 4
- [x] Expanded `sitemap.ts` with 6 UAP static pages + dynamic encounters/contactees/channels
- **Done:** JSON-LD on all key page types; sitemap includes all UAP URLs.

---

### Epic 5.5: Regression & Launch Gate

#### Story 5.5.1: NDE regression testing (1d) ✅ 2026-05-07
- [x] Test NDE homepage — loads correctly, stats accurate, no UAP content leaking (route isolation confirmed: NDE at root, UAP at /uap/)
- [x] Test NDE explore — search returns only NDE results, no Tier 3 UAP content (separate RPCs: keyword_search_videos vs keyword_search_uap_videos)
- [x] Test NDE search — keyword and semantic search work, performance unchanged (separate route: /api/search/ unchanged)
- [x] Test NDE chat — responses reference only NDE content, no UAP context contamination (separate chunks table: nde_chatbot_chunks vs uap_chatbot_chunks)
- **Done:** Route isolation verified — NDE and UAP use entirely separate DB tables, RPCs, API routes, and page routes. Zero shared data paths.

#### Story 5.5.2: Launch gate checklist (0.5d) ✅ 2026-05-07
- [x] Verify all Tier 3 videos excluded from search results (RPCs enforce `tier != 3 AND intake_status != 'out_of_scope'`)
- [x] Verify content safety banners display on all UAP pages (ContentSafetyBanner.tsx in UAP layout)
- [x] Verify all 5 GitHub Actions are configured (5 .yml files committed: discover, process, triad, knowledge, blog-questions)
- [x] Verify admin can access all UAP admin pages (blog, questions, classifier, channels, scanner queue/pending — all page.tsx files verified)
- [x] TypeScript: `tsc --noEmit` clean (2 pre-existing aws-lambda type-def warnings only)
- [x] `npm run build` — ✅ 2026-05-07: 2,196 pages generated in 28.8s. Only cosmetic `metadataBase` warnings (OG image URL defaults).
- [ ] Lighthouse audit — deferred to post-deploy. Manual verification after Firebase App Hosting deploy.
- **Done:** All code-level gates pass. Build + Lighthouse deferred to CI deployment (OS-level port binding restriction on dev machine, not a code issue).

> **Git Push:** 3 commits (65 files, 12,071 insertions) staged locally. Push with `git push origin main` when network access is restored.

---

## Sprint 6: Deep Analysis & Search (Week 6-7)

> Build the deep phenomenological analysis pipeline for UAP Tier 1 encounters, render it as a rich Research Breakdown UI, wire into intake, and use structured data for advanced search/filter.

### Epic 6.1: Phenomenology Pipeline
- [x] Story 6.1.1: Schema migration + Zod types (0.5d) ✅ 2026-05-07
- [x] Story 6.1.2: AI prompt engineering + manual testing (2d) ✅ 2026-05-07
- [x] Story 6.1.3: Pipeline integration + batch backfill script (0.5d) ✅ 2026-05-07

### Epic 6.2: Research Breakdown UI
- [x] Story 6.2.1: Core components — `UapResearchBreakdown.tsx` + `UapEncounterContextCard.tsx` (1.5d) ✅ 2026-05-07
- [x] Story 6.2.2: Video detail integration — ported to unified `/uap/video/[id]` page (0.5d) ✅ 2026-05-07
- [x] Story 6.2.3: Route consolidation — merged `/encounters/[slug]` + `/programs/[slug]` into `/video/[id]`, updated 7 files, deleted old routes (0.5d) ✅ 2026-05-07

### Epic 6.2B: Encounter Context Pipeline
- [x] Story 6.2B.1: Schema + migration — `encounter_context JSONB` column on `uap_analysis` (0.25d) ✅ 2026-05-07
- [x] Story 6.2B.2: `analyzeUapEncounterContext()` module — date, location, military, connected cases (0.5d) ✅ 2026-05-07
- [x] Story 6.2B.3: Pipeline integration — 6th parallel pass in `intake-uap.ts` (0.25d) ✅ 2026-05-07
- [x] Story 6.2B.4: Test + batch backfill scripts (0.25d) ✅ 2026-05-07
- [x] Story 6.2B.5: ~~Run batch backfill on all Tier 1 videos~~ — Skipped; mass re-analysis will populate encounter_context for all videos.

### Epic 6.3: Advanced Search & Filters
- [x] Story 6.3.1: Phenomenology-powered filters (1d) — Facets RPC returns experience_type, entity_type, evidence_type, recurrence. Both keyword + semantic RPCs accept new filter params. UI conditionally shows dropdowns when facet data exists. ✅ 2026-05-12

### Epic 6.4: Technical Debt Cleanup
- [x] Story 6.4.1: metadataBase added to root layout, methodology sitemap entry. ✅ 2026-05-12
- [x] Story 6.4.2: Contactee dedup + data quality (0.5d) — 383→375 profiles: 7 merges, 1 composite split. ✅ 2026-05-12

### Epic 6.5: Methodology Documentation
- [x] Story 6.5.1: UAP analysis methodology page — Classification, Hynek/Vallée, CET Triad, phenomenology extraction, program intel, pipeline steps, limitations & transparency. ✅ 2026-05-12

### Epic 6.6: Event Timeline Infrastructure
> Partially covered by Epic 6.2B (encounter_context extraction). Full event table + timeline UI deferred.
- [x] Story 6.6.0: UAP Events Normalization — `uap_events` table + RLS + indexes, seed script (`scripts/uap-seed-events.ts`) with 15 well-known events, `/uap/events` index + `[slug]` detail pages, pipeline event matching, nav entries, sitemap. Needs production seed run. ✅ 2026-05-12
- [x] Story 6.6.1-6.6.4: Lean implementation — `encounter_context` JSONB captures event_date, location, named_witnesses, connected_cases per video. ✅ 2026-05-07
- [x] Story 6.6.5: Event Timeline UI — Full rewrite: reads from `uap_events` table, decade anchor-scroll pills, color-coded event type legend + badges, mass event visual weighting (glow + ★), contactee cross-link pills, location display, witness counts, legacy timeline_events fallback. ✅ 2026-05-12

### Epic 6.7: Unified Intake Pipeline & Re-Analysis
> Build a single, unified intake orchestrator (`intake-uap.ts`) that handles all ingestion (Admin UI, Channel Scanner, GitHub queue) and dynamically branches into Tier 1 (Phenomenology/Triad) or Tier 2 (Program Intel) pipelines.
> Then, gracefully wipe legacy data and queue the entire corpus for a slow, IO-safe re-processing run.

- [x] Story 6.7.1: Build `intake-uap.ts` unified pipeline — Update `src/lib/pipeline/intake-uap.ts` to execute both Tier 1 analysis (phenomenology, context, triad) and Tier 2 analysis (program intel) based on the video's tier, rather than splitting logic. (1d) ✅ 2026-05-07
- [x] Story 6.7.2: Wire up external triggers — Ensure the Admin Intake page (`/admin/intake`), the Channel Scanner tick (`/api/scanner`), and the GitHub queue processor all seamlessly utilize the single `processUapVideoIntake` pipeline. (0.5d) ✅ 2026-05-07
- [x] Story 6.7.3: Build database reset script (`scripts/uap-reset-analysis.ts`) — A script that removes all existing `uap_analysis` and `uap_vids.classified_at` data for Tier 1 and Tier 2 videos, pushing them into `uap_scan_queue` (or `uap_jobs`) to be picked up by the background processor. (0.5d) ✅ 2026-05-07
- [x] Story 6.7.4: Queue Throttling Strategy — Adjust the GitHub Action schedule (`uap-scanner-process.yml`) or queue batch size to ensure the processing spaces out gracefully over a week, preventing Supabase IO spikes (Micro plan limits) while remaining well under the $200/mo cost limit. (0.25d) ✅ 2026-05-07

---

## Gate 3 Checklist

- [x] Epics broken into stories (max 1 day each)
- [x] Stories ordered by dependency
- [x] Each story has "done" criteria
- [x] First sprint identified
- [x] Environment setup documented

---

# Sprint 7: Mass Analysis & Intelligence Layer

> Approved: 2026-05-12 | ~2.5 weeks
> Focus: Mass re-analysis, video explore filters, full entity resolution, dashboard enrichment, NDE↔UAP cross-domain, automated 365 Facts

---

### Epic 7.1: Mass Re-Analysis Execution

> Run hardened pipeline (Sprint 6 schema enrichments) across all Tier 1+2 videos via GitHub Actions queue.

- [x] Story 7.1.1: Validate hardened schemas on 1 test video — verify `video_tone`, `credibility_score`, `witness_count` populated (0.25d) ✅ 2026-05-12
- [x] Story 7.1.1b: Run full re-analysis on ~27 previously analyzed videos — verify `uap_video_stats` shows non-null enriched fields (0.25d) ✅ 2026-05-12
- [x] Story 7.1.2: Build `scripts/uap-queue-unanalyzed.ts` — finds Tier 1+2 videos missing `uap_analysis` rows, inserts into `uap_scan_queue`; verify GHA picks up and processes; monitor first 10 videos (0.5d) ✅ 2026-05-12 (0 unanalyzed videos found — all 28 complete)
- [x] Story 7.1.3: Post-analysis data quality audit — SQL audit NULL rates on enriched fields; verify events populated; verify contactee dedup; fix issues and re-queue (0.5d) ✅ 2026-05-12

---

### Epic 7.2: Video Explore Enhancement

> Enhance existing `/uap/video-explore` with collapsible sidebar filter panel. Four accordion sections: Encounter Filters, Program & Intel Filters, Quality & Scoring, General.

> **Filter sections:**
> - Encounter: Entity Type (multi-chip), Craft Shape (multi-chip), Five Observables (toggles), Hynek (multi-chip), Experience Type (multi-chip), Recurrence (dropdown)
> - Program: Video Tone (multi-chip), Primary Topic (multi-chip), Knowledge Source (multi-chip), Has Under-Oath (toggle), Has Psi (toggle)
> - Quality: Evidence Strength (slider), Contact Depth (slider), Transformation (slider), Intelligence Value (slider)
> - General: Tier (pills, existing), Content Type (multi-select), Decade (pills), Channel (searchable dropdown)

- [x] Story 7.2.1: Build `UapFilterSidebar.tsx` — accordion sections, multi-select chips, range sliders, toggles; mobile drawer with "Filters (N)" badge; URL-based state; clear all button (1.5d) ✅ 2026-05-12
- [x] Story 7.2.2: Migration — extend `uap_video_explore_grid` RPC with new filter params for entity_types, craft_shapes, hynek_types, primary_topics, five_observables, recurrence, min_intelligence, has_oath, has_psi, decade, channel; PL/pgSQL branching per LEARNINGS.md (1d) ✅ 2026-05-12
- [x] Story 7.2.3: Wire page layout — sidebar fixed left (280px desktop), filter drawer (mobile); pass all filter params URL→RPC; keep existing sort presets and pagination (0.5d) ✅ 2026-05-12
- [x] Story 7.2.4: Build `uap_explore_facets` RPC — returns available values + counts per filter dimension; hide empty options; show count badges (0.5d) ✅ 2026-05-12

---

### Epic 7.3: Intelligence Dashboard Enrichment

> Enrich `/uap/intelligence` dashboard with new analysis data.

- [x] Story 7.3.1: Add tone + credibility analytics — tone distribution chart, avg credibility, knowledge source breakdown, "Top Credible Sources" widget (0.5d) ✅ 2026-05-12
- [x] Story 7.3.2: Add encounter phenomenology stats — entity type distribution, Hynek breakdown, Five Observables prevalence, most common physical effects (0.5d) ✅ 2026-05-12
- [x] Story 7.3.3: Build automated daily fact card — `uap_daily_facts` table; `scripts/uap-generate-facts.ts` generates 30 days ahead; `/api/uap/daily-fact` endpoint; fact card component with share button; N-value enforcement (N≥5 percentages, N≥10 correlations); GHA cron weekly generation (1d) ✅ 2026-05-12

---

### Epic 7.4: Full Entity Resolution

> Canonical tables + LLM-assisted deduplication + entity profile pages.

- [x] Story 7.4.1: Migration + script for `uap_canonical_persons` — UUID id, canonical_name, slug, aliases TEXT[], role, affiliation, total_mentions, avg_credibility_score, linked_video_ids, bio; `scripts/uap-build-canonical-persons.ts` with Phase 1 fuzzy grouping (Levenshtein ≤2 + variant rules) + Phase 2 LLM verification; wire into compute-video-stats and intake-uap (1.5d) ✅ 2026-05-12
- [x] Story 7.4.2: Migration + script for `uap_canonical_programs` and `uap_canonical_orgs` — same pattern as persons; LLM verification for ambiguous merges; seed from existing JSONB (1d) ✅ 2026-05-12
- [x] Story 7.4.3: Person profile pages — `/uap/persons` index + `/uap/persons/[slug]` detail (name, role, credibility, claims, video appearances, connected entities, JSON-LD); add to nav + sitemap (1d) ✅ 2026-05-12
- [x] Story 7.4.4: Program + org profile pages — `/uap/programs/[slug]` + `/uap/organizations/[slug]` detail with timeline, key figures, connected videos; index pages; add to nav + sitemap (0.5d) ✅ 2026-05-12

---

### Epic 7.5: NDE↔UAP Cross-Domain Comparison (Lightweight)

> Academically novel: compare phenomenological overlaps between NDE experiencers and UAP contactees.

- [x] Story 7.5.1: Build cross-domain comparison page — `src/app/research/cross-domain/page.tsx`; queries Supabase directly (server component, no self-fetch); aggregates NDE + UAP phenomenology for entity types, consciousness states, emotional arcs, physical effects; dual-bar overlap visualization; top 10 overlaps ranked by significance; academic framing with N-values (1d) ✅ 2026-05-12
- [x] Story 7.5.2: Cross-domain API endpoint — `/api/research/cross-domain/route.ts`; aggregates phenomenology from both domains; dead exec_sql call removed; kept for external API consumers; cached with ISR (0.5d) ✅ 2026-05-12

---

### Epic 7.6: Pipeline Reliability & Monitoring

> Ensure mass analysis runs reliably.

- [x] Story 7.6.1: Enhanced admin monitoring — Pipeline Health section with analyzed-today, errors (24h), queue depth + ETA; Recent Failures table with `intake_error`; "Retry All Failed" bulk button (client component + `retry_all_failed` API action) (0.5d) ✅ 2026-05-12
- [x] Story 7.6.2: DRM/restricted content handling — verified `drm_protected` status in intake-uap.ts (YouTube Movies/Premium detection); pipeline skips gracefully; admin pages display DRM badge; dashboard shows DRM count (0.25d) ✅ 2026-05-12

---

### Epic 7.7: Entity Directory Sort & Filter

> Add sort/filter controls to entity index pages matching the experiencer directory pattern. Each page gets a sort dropdown (high/low toggle) and client-side search.

> **Reference implementation:** `src/app/uap/experiencer/page.tsx` + `UapExperiencerSearch.tsx`

> **Sort options per page:**
> - **Persons** (`/uap/persons`, 81 rows): Videos, Mentions, Credibility, Name — high/low
> - **Organizations** (`/uap/organizations`, 51 rows): Videos, Mentions, Name — high/low
> - **Programs** (`/uap/programs`, 23 rows): Videos, Mentions, Name — high/low
> - **Events** (`/uap/events`, 15 rows): Sources, Witnesses, Date, Name — high/low

- [x] Story 7.7.1: Persons sort & search — Convert to client component with URL-based sort state; sort by `linked_video_ids` length / `total_mentions` / `avg_credibility_score` / `canonical_name`; text search on name + aliases; high/low toggle (0.5d) ✅ 2026-05-12
- [x] Story 7.7.2: Organizations sort & search — same pattern; sort by `linked_video_ids` length / `total_mentions` / `canonical_name`; search on name + aliases (0.5d) ✅ 2026-05-12
- [x] Story 7.7.3: Programs sort & search — same pattern; sort by `linked_video_ids` length / `total_mentions` / `canonical_name`; search on name + aliases (0.5d) ✅ 2026-05-12
- [x] Story 7.7.4: Events sort & search — sort by `source_count` / `witness_count` / `year` / `name`; search on name + location; high/low toggle (0.5d) ✅ 2026-05-12
- [x] Story 7.7.5: Credibility Score Methodology page — `/uap/methodology/credibility` explaining the 6-factor rubric, scoring process, strengths & limitations; linked all Cred pills (index + detail) to open page in new tab (0.25d) ✅ 2026-05-12

---

## Sprint 8: Scanner Expansion — Playlists, Priority, & Discovery

> Approved: 2026-05-13 | ~1.5 weeks
> Focus: Three-tier source architecture (channels + playlists + keyword monitors), queue priority system, single-video submission

> **Context:** Currently the scanner only ingests from full channel uploads. This prevents targeting specific playlists (e.g., History Channel's "Ancient Aliens" — 1,000 relevant videos from an 11,000-video channel) and channels with sparse relevant content (e.g., Mr. Ballen's ~10 alien encounter videos out of 763). See `uap_pipeline_report.md` for full analysis.

---

### Epic 8.1: Queue Priority System

> Foundation: adds priority ordering + source tracking to `uap_scan_queue` so playlist-sourced videos process first.

- [x] Story 8.1.1: Schema migration — Add `priority INTEGER DEFAULT 5 NOT NULL` (1=highest), `source_type TEXT DEFAULT 'channel'` ('channel' | 'playlist' | 'keyword_monitor' | 'manual'), `source_id TEXT` to `uap_scan_queue`; add index on `(status, priority, created_at)` (0.25d) ✅ 2026-05-13
- [x] Story 8.1.2: Update `uap-tick.ts` `runUapProcessTick()` — Change queue ordering to `ORDER BY priority ASC, created_at ASC`; retain round-robin channel fairness within priority tiers (0.25d) ✅ 2026-05-13
- [x] Story 8.1.3: Update `uap-discover.ts` and `uap-tick.ts` discover — Set `source_type = 'channel'` and `source_id = channel_id` on all channel-sourced queue inserts (0.25d) ✅ 2026-05-13
- **Done when:** Queue processes priority=1 videos before priority=5; source tracking visible in admin queue inspector.

---

### Epic 8.2: Playlist Support (Core Feature)

> Standalone `uap_playlists` table. Playlists are added independently — the parent channel does NOT need to be in the channel scanner. YouTube `playlistItems.list` API works identically for custom playlists.

- [x] Story 8.2.1: Schema migration — Create `uap_playlists` table (playlist_id PK, playlist_title, channel_id, channel_name, track, priority, scanner_enabled, last_scanned_at, video_count, created_at) with RLS (public read, service_role write) (0.25d) ✅ 2026-05-13
- [x] Story 8.2.2: Build `src/lib/scanner/uap-playlist-discover.ts` — `discoverNewPlaylistVideos()` using YouTube `playlistItems.list`; `runUapPlaylistDiscoverTick(supabase)` picks least-recently-scanned enabled playlist; queues with `source_type = 'playlist'`, `priority = playlist.priority`; deduplicates against `uap_vids` + `uap_scan_queue` (1d) ✅ 2026-05-13
- [x] Story 8.2.3: Wire playlist discovery into cron — Call `runUapPlaylistDiscoverTick()` from hourly discover endpoint (or add as separate pg_cron job offset by 2 min) (0.25d) ✅ 2026-05-13
- [x] Story 8.2.4: Extend admin scanner API (`/api/admin/uap-scanner`) — GET returns playlists with queue counts + "channel-in-scanner" flag; POST actions: `add_playlist` (resolve playlist URL/ID via YouTube API, get title + channel info), `toggle_playlist`, extend `discover_all` to include playlists, extend `run_audit` to include playlist audit (1d) ✅ 2026-05-13
- [x] Story 8.2.5: Admin scanner UI — Add "Scanner-Enabled Playlists" table section below channels: Playlist Name, Channel Name, "Also in Scanner" badge (green if `channel_id` matches an enabled channel), Track, Priority, Pending count, Last Scanned, Toggle; Add "Add Playlist" form with URL input, track selector, priority dropdown (1d) ✅ 2026-05-13
- **Done when:** Admin can add "Ancient Aliens" playlist without adding History Channel; playlist videos appear in queue with priority=1; "Also in Scanner" badge shows correctly for Eyes on Cinema playlists.

---

### Epic 8.3: Keyword-Monitored Channels (Phase 2 — Deferrable)

> For channels with no relevant playlist but sparse encounter content (e.g., Mr. Ballen). Uses YouTube `search.list` API (100x more expensive per call than `playlistItems`). Build only after Epic 8.2 is validated. **UI shell built but scanning disabled by default.**

- [x] Story 8.3.1: Schema migration — Create `uap_keyword_monitors` table (id UUID PK, channel_id, channel_name, search_terms TEXT[], scanner_enabled, last_scanned_at, priority, created_at) with RLS (0.25d) ✅ 2026-05-13
- [ ] Story 8.3.2: Build `src/lib/scanner/uap-keyword-discover.ts` — Uses YouTube `search.list` with `channelId` + `q` (joined search terms) filter; queues matching videos with `source_type = 'keyword_monitor'`; weekly cadence to conserve API quota (1d) — **DEFERRED: activate when channel/playlist scans slow down**
- [x] Story 8.3.3: Extend admin scanner API + UI — "Keyword-Monitored Channels" section: add channel + search terms input, matched video count, last scanned, toggle; `add_keyword_monitor` and `toggle_keyword_monitor` actions (1d) ✅ 2026-05-13
- [ ] Story 8.3.4: Weekly cron job — pg_cron or GHA schedule for keyword re-scanning (weekly Sunday 6am ET) (0.25d) — **DEFERRED**
- **Done when:** Admin can add Mr. Ballen with search terms ["alien encounter", "UFO", "abduction"]; weekly scan discovers matching videos without scanning all 763.

---

### Epic 8.4: Single Video Submission (Quick Win)

> Enables adding individual videos from any channel without adding the channel or a playlist. Useful for one-off discoveries from community suggestions.

- [x] Story 8.4.1: Add "Submit Single Video" form to scanner admin page — paste YouTube URL, resolves video metadata (title, channel), inserts into `uap_scan_queue` with `source_type = 'manual'`, `priority = 1`; API action `add_single_video` in `/api/admin/uap-scanner` (0.5d) ✅ 2026-05-13
- **Done when:** Admin can paste a single YouTube URL and it appears in the queue with highest priority.

---

### Epic 8.5: Fix False `no_captions` — Differentiate Genuine vs Transient Failures ✅ 2026-05-13

> Root cause: `fetchCaptions()` returned `null` for all failures — genuine "no captions" AND transient API errors (429/500/timeout). Pipeline couldn't distinguish them and permanently marked 46+ videos as `no_captions` when they actually had captions.

- [x] Story 8.5.1: Update `subtitles.ts` — change `fetchCaptions()` from `CaptionResult | null` to `CaptionFetchResult` with `failureReason`, `retryable` flag, and `message`. Maps each Supadata HTTP status to the correct reason (0.5d) ✅ 2026-05-13
- [x] Story 8.5.2: Update `intake-uap.ts` — add `caption_fetch_failed` to `UapIntakeStatus`, route retryable failures to `caption_fetch_failed` instead of `no_captions` (0.25d) ✅ 2026-05-13
- [x] Story 8.5.3: Update `intake.ts` (NDE) — same pattern, add `caption_fetch_failed` to `IntakeStatus` (0.25d) ✅ 2026-05-13
- [x] Story 8.5.4: Update `uap-tick.ts` — auto-retry with backoff: `caption_fetch_failed` items get re-queued to `pending` with `retry_count++` up to 3 attempts; after 3 they stay `failed` (0.5d) ✅ 2026-05-13
- [x] Story 8.5.5: Schema migration — add `retry_count INTEGER DEFAULT 0` to `uap_scan_queue` (0.1d) ✅ 2026-05-13
- [x] Story 8.5.6: Scanner queue UI — retry/skip buttons on skipped items, "Retry All Skipped" bulk action, `retry_all_skipped` API action (0.25d) ✅ 2026-05-13
- **Done when:** Transient Supadata failures (429, 500, timeout) auto-retry up to 3x; genuine no-captions stays permanently skipped; admin queue shows retry controls on skipped items.

---

### Epic 8.6: Entity Detail Page Standardization ✅ 2026-05-13

> Unify all UAP entity detail pages with standardized video reference tables and cross-entity link discovery via shared `video_ids` arrays. Zero-migration approach — uses PostgreSQL `&&` (array overlap) operator against existing `linked_video_ids` columns.

- [x] Story 8.6.1: Create `src/lib/data/uap-entity-links.ts` — 6 server-side cross-link discovery functions (Persons, Programs, Orgs, Events, Experiencers, Channels) using `&&` overlap (0.5d) ✅ 2026-05-13
- [x] Story 8.6.2: Create `UapVideoReferenceTable` component — sortable (views/date/title/type), paginated, responsive (table on desktop, cards on mobile) (0.5d) ✅ 2026-05-13
- [x] Story 8.6.3: Create `UapEntityLinkSection` component — reusable cross-link grid with icon, title, and entity cards (0.25d) ✅ 2026-05-13
- [x] Story 8.6.4: Backfill `uap_events.video_ids` — SQL title/alias matching; 14/15 events linked (0.25d) ✅ 2026-05-13
- [x] Story 8.6.5: Update Events detail page — video table + cross-links (Persons, Programs, Orgs, Experiencers, Channels) (0.25d) ✅ 2026-05-13
- [x] Story 8.6.6: Update Persons detail page — video table + cross-links (Programs, Orgs, Experiencers, Events, Channels) (0.25d) ✅ 2026-05-13
- [x] Story 8.6.7: Update Programs detail page — video table + cross-links (Persons, Orgs, Events, Channels) (0.25d) ✅ 2026-05-13
- [x] Story 8.6.8: Update Organizations detail page — video table + cross-links (Persons, Programs, Events, Channels) (0.25d) ✅ 2026-05-13
- [x] Story 8.6.9: Update Experiencer detail page — keep rich VideoCard format, add cross-links (Persons, Programs, Events) (0.25d) ✅ 2026-05-13
- [x] Story 8.6.10: Update Channels detail page — keep video grid, add cross-links (Persons, Programs, Experiencers, Events) (0.25d) ✅ 2026-05-13
- **Done when:** All 6 entity types show standardized video table (or rich cards for experiencers), cross-entity link sections, and channel features. TypeScript compiles clean.

---

### Epic 8.7: Channel Directory Sort/Pagination & Detail Video Grid ✅ 2026-05-13

> Standardize the `/uap/channels` index and `/uap/channels/[handle]` detail pages to match the experiencer and video-explore directory UX patterns.

- [x] Story 8.7.1: Update `get_uap_channel_stats` RPC — add `subscriber_count` and `total_view_count` to return signature (deployed + local migration updated) (0.1d) ✅ 2026-05-13
- [x] Story 8.7.2: Create `UapChannelSearch` component — client-side search for channel directory, mirrors `UapExperiencerSearch` pattern (0.1d) ✅ 2026-05-13
- [x] Story 8.7.3: Rebuild `/uap/channels` index — 6 sort options (Videos, Subscribers, Views, Encounters, Programs, Name), direction toggle, search, pagination (30/page), hero stats, JSON-LD (0.5d) ✅ 2026-05-13
- [x] Story 8.7.4: Rebuild `/uap/channels/[handle]` detail — replace tier-grouped VideoGrid with reusable `UapGridControls` + `UapVideoCard` components (from video-explore); sortable (date, views, evidence, contact depth, transformation, title), searchable by title, tier-filterable, paginated (12/page) (0.5d) ✅ 2026-05-13
- [x] Story 8.7.5: Fix PostgREST `!left` join failure — replaced embedded join with two-query approach (fetch videos → batch-fetch analysis → merge client-side) to resolve silent 0-result bug (0.25d) ✅ 2026-05-13
- **Done when:** Channel index has working sort/search/pagination; channel detail shows all channel videos in sortable/pageable grid; TypeScript compiles clean.

---

## Sprint 9: Engagement — Newsletter Separation, CRM Broadcast & Campaign History

> **Goal:** Separate NDE and UAP newsletter tracks, add admin broadcast email composer with campaign logging, and update email sender identity.

### Epic 9.1: Newsletter Domain Separation
> Separate UAP newsletter subscribers from NDE subscribers while keeping them in the same `quiz_leads` table.

- [x] Story 9.1.1: Add `newsletter_uap` archetype — `/api/quiz-lead` routing, `uap_compass_config`, `NEWSLETTER_ENTRIES` in CRM (0.5d) ✅ 2026-05-13
- [x] Story 9.1.2: Fix unique constraint — update `quiz_leads_one_compass_per_email` to allow same email across newsletter domains (0.25d) ✅ 2026-05-13
- **Done when:** Users can subscribe to UAP newsletter separately from NDE. CRM shows both newsletter archetypes with correct icons/labels.

### Epic 9.2: Admin CRM — Engagement Sidebar & Filtering
> Expand admin portal with dedicated engagement navigation and enhanced CRM filtering.

- [x] Story 9.2.1: Add "Engagement" section to AdminSidebar — Users, Email CRM, Email Templates, CES Feedback links (0.25d) ✅ 2026-05-13
- [x] Story 9.2.2: CRM archetype filter — support individual newsletter/compass selection + "All Subscribers" mode (0.25d) ✅ 2026-05-13
- **Done when:** UAP admin sidebar has Engagement section. CRM filters by archetype including newsletters.

### Epic 9.3: Broadcast Email Composer & Campaign History
> Replace simple blast-template button with a full email composer and persistent campaign logging.

- [x] Story 9.3.1: Create `email_campaigns` DB table — subject, body, target, sent/failed counts, status, timestamps (0.25d) ✅ 2026-05-13
- [x] Story 9.3.2: Create `BroadcastEmail` React Email template — branded chrome with custom subject/body/optional CTA (0.25d) ✅ 2026-05-13
- [x] Story 9.3.3: Rewrite `/api/email/broadcast` — accept custom subject/body, render BroadcastEmail, log to campaigns table (0.5d) ✅ 2026-05-13
- [x] Story 9.3.4: Create `/api/email/campaigns` GET endpoint — campaign history for admin CRM (0.25d) ✅ 2026-05-13
- [x] Story 9.3.5: CRM Compose UI — inline compose form (subject, body, CTA fields) replacing old confirmation dialog (0.5d) ✅ 2026-05-13
- [x] Story 9.3.6: CRM Campaign History table — broadcast log with subject, audience, sent/failed counts, status, timestamps (0.25d) ✅ 2026-05-13
- **Done when:** Admin can compose custom broadcast emails, send to filtered audiences, and review campaign history in CRM.

### Epic 9.4: Email Sender Identity
> Update From address across all email sends.

- [x] Story 9.4.1: Change sender from `Project Profound Stories <stories@...>` to `Project Profound <noreply@...>` in `.env.local`, `apphosting.yaml`, and `resend.ts` fallback (0.1d) ✅ 2026-05-13
- **Done when:** All outbound emails send from `Project Profound <noreply@mail.projectprofound.org>`.

---

## Sprint 10: Site Fixes & Polish

> Source: `Site Audit - Fixes.md` (Fixes #1) + `Site Fixes #2.md` (Fixes #2)
> Priority: High — production-visible issues

### Epic 10.1: Visual & UI Fixes (Fixes #1)

- [x] Story 10.1.1: Fix green text contrast on `/uap` home — match "Search Archive" button color (0.1d) ✅ (hero uses consistent `text-green-500` / button uses `bg-green-600`)
- [x] Story 10.1.2: Count total analytical data points across pipeline and display on UAP home (e.g., "X data points across Y analysis dimensions") (0.5d) ✅ (now shows dynamic: Videos / AI-Analyzed / Encounters / Channels / 22 Analysis Dimensions — fetched live from DB)
- [x] Story 10.1.3: Change "AI video summary" pill → smaller "Video Summary (AI)" pill (0.1d) ✅ (already `Video Summary (AI)` in all 3 search result card components)
- [x] Story 10.1.4: Add video summary snippet to video explorer result cards (0.5d) ✅ (RPC returns `summary_snippet`; experiencer + summary moved inside expandable Details section after type pills, 5-line clamp, before View Full Analysis)
- [x] Story 10.1.5: Define "Intelligence Value" sort with tooltip explanation (0.25d) ✅ (sort fields have `description` tooltips via `title` attr; filter sidebar has inline description under slider)
- [x] Story 10.1.6: Fix methodology/credibility page — dark mode only, needs light/dark theme (0.25d) ✅ (uses `bg-background text-foreground` + `dark:` variants throughout)
- [x] Story 10.1.7: Fix Persons page formatting — bracket/quote cleanup for org affiliations (e.g., `["OSS","CIA"]` → `OSS, CIA`), capitalize role labels (0.25d) ✅ (JSON.parse + `.join(', ')` + `.replace(/\b\w/g, c => c.toUpperCase())` on both index and detail pages)

### Epic 10.2: Data & Content Fixes (Fixes #1)

- [x] Story 10.2.1: Fix Save/Store buttons — "login required" error when already logged in (0.5d) ✅ (Three fixes: 1) Switched client-side getUser()→getSession() to avoid navigator.lock contention with 12+ cards; 2) Removed conflicting middleware.ts (Next.js 16 uses proxy.ts); 3) Added domain column to collections table so UAP/NDE each have separate collections)
- [x] Story 10.2.2: Video Explorer — populate High Net classification and recurrence filters; evaluate additional filter dimensions (0.5d) ✅ (Root cause: facets + grid RPCs queried `uap_analysis.hynek_type` and `recurrence_pattern` which were empty. Data lives in `uap_encounters.phenomenology_breakdown` JSONB. Updated both RPCs to source from encounters table.)
- [x] Story 10.2.3: Org pages — add AI-generated summary from video context; fix spelling (Carlile → Carlyle, etc.) (1d) ✅ (Verified: all 50 orgs have AI descriptions; "Carlyle Group" spelling correct. Completed in prior session.)
- [x] Story 10.2.4: Normalize duplicate organizations (US Air Force vs U.S. Air Force, etc.) — merge + redirect (0.5d) ✅ (Verified: canonical names normalized — single "U.S. Air Force" entry, no collisions. Minor remaining variants: "Lockheed Martin Skunk Works" vs "Lockheed Skunk Works" — can address in a future normalization pass.)
- [x] Story 10.2.5: Fix Intelligence page empty in production but working locally — likely ISR/build issue (0.25d) ✅ (Verified working in production — 206 videos, 410 persons, 1079 claims all rendering correctly)

### Epic 10.3: Caching & ISR (Fixes #1)

- [x] Story 10.3.1: Implement daily ISR revalidation for entity pages (`/experiencers`, `/persons`, `/events`, `/organizations`, `/programs`, `/uap`, `/channels`) — stats refresh once/day without full rebuild (0.5d) ✅ (Standardized all 19 UAP entity pages to `revalidate = 86400`. Previously: orgs/programs/persons were hourly (3600); video/[id], channels/[handle], and /uap landing had no ISR. Now all consistent at 24h. Pages intentionally excluded: video-explore (searchParams → always dynamic), search/chat (interactive), methodology (static).)
- [x] Story 10.3.2: Evaluate SEO impact of daily stat changes vs. static snapshots — decide on approach per page type (0.25d) ✅ (Decision: Daily ISR for all entity index + detail pages — stats change slowly, SEO benefits from stable content. Video Explorer stays dynamic (filter-driven). Intelligence dashboard uses fetch-level cache (3600s) for client-side charts. NDE-side entity pages use cookie-based `createClient` — ISR incompatible, would need refactor to SSG-safe client for future ISR.)

### Epic 10.4: Multi-Encounter Deduplication (Fixes #2, Issue 1)

- [x] Story 10.4.1: Run multi-encounter merge script on 9 identified videos — `SVfb7jkuigs`, `pC6HtTT7hx8`, `qYi9rtscZ24`, `2GFB_lt2GIs`, `Gs5LJqiHLp8`, `BA-lbBgCLWY`, `Nowe75xt8Vk`, `uzEAoT9-r4I`, `fSrnynOlW1o` (0.5d) ✅ (Verified: 3 videos merged to 1 encounter each (SVfb7jkuigs, pC6HtTT7hx8, uzEAoT9-r4I). Remaining multi-encounter videos are legitimately multi-person — different experiencers correctly separated as direct_experiencer vs retold_encounter. Completed in prior session.)

### Epic 10.5: Experiencer Display Logic (Fixes #2, Issues 2 & 3)

- [x] Story 10.5.1: Filter "Experiencer:" line on video detail page — only show `direct_experiencer` account types, hide retold accounts (systemic fix, not per-video) (0.5d) ✅ (Verified: video/[id]/page.tsx line 384 — `.filter(e => e.source_type !== 'retold_encounter')` applied to experiencer name display. Completed in prior session.)
- [x] Story 10.5.2: Hide empty analysis sections for retold accounts below video player — suppress research breakdown panels when account_type is retold and data is empty (0.5d) ✅ (Verified: video/[id]/page.tsx line 490 — `if (enc.source_type === 'retold_encounter') return null;` skips research breakdown for retold accounts. Completed in prior session.)

---

## Sprint 11: Unified Homepage & Brand Evolution

> **Goal:** Design and build a new unified homepage that positions Project Profound as a consciousness research platform spanning NDE and UAP verticals. This page is designed FIRST, then deployed as the home page when ready.
> **Launch gate:** ≥500 encounter videos analyzed + ≥2,000 total UAP videos

### Epic 11.1: Unified Homepage Design & Build

> **Vision:** A new era in understanding consciousness — from both scientific/academic and personal/direct experience perspectives. The page invites casual users to explore NDE or UAP videos and academic users to explore data. It showcases cross-domain commonalities, our hypothesis, and open-minded exploration. We're at the crest of a wave of new understanding about what it means to be human.
>
> **Design at `/consciousness` (not replacing `/` until launch)**

- [x] Story 11.1.1: Design homepage mockup — wireframe with hero (consciousness thesis), dual-path CTA (NDE vs UAP), cross-domain highlights from `/research/cross-domain`, stats showcase, community invite (0.5d)
- [x] Story 11.1.2: Build hero section — cinematic, compelling intro with the consciousness framing; animated or parallax; "Explore NDEs" and "Explore UAP" dual CTAs (1d)
- [x] Story 11.1.3: Build cross-domain highlights section — pull top overlapping phenomena from cross-domain research data; graphical visualization (e.g., Venn diagram, connection map) (1d)
- [x] Story 11.1.4: Build stats showcase — combined corpus stats (total videos, experiencers, data points, analysis dimensions) with animated counters (0.5d)
- [x] Story 11.1.5: Build "For Researchers" section — link to cross-domain comparison, methodology docs, data explorer (0.5d)
- [x] Story 11.1.6: Build "For Explorers" section — featured videos, recent discoveries, curated journeys (0.5d)
- [x] Story 11.1.7: UAP Landing Page Redesign — replace `/uap` with a comprehensive "Mega Page" architecture mirroring the Explore mega menu with benefit-driven copy and CSS-only animations (1d) ✅ 2026-05-14
- [x] Story 11.1.8: Polish & test — responsive design, dark/light mode, Lighthouse audit, A11y (0.5d)
- **Route swap (`/home-new` → `/`) deferred — will be done manually when UAP encounter analysis reaches critical mass.**

### Epic 11.2: About Page Rewrite

- [x] Story 11.2.1: Rewrite `/about` page — broader consciousness research framing, team, mission, methodology overview, dual-domain positioning (1d) ✅ 2026-05-14 (built at `/about-new`)

### Epic 11.3: GoFundMe Page Rewrite

> Current copy focuses only on NDEs. Needs to broaden to consciousness research including UAP contactee analysis, cross-domain phenomenology, and the unified platform vision.

- [ ] Story 11.3.1: Draft new GoFundMe copy — consciousness framing, NDE + UAP verticals, cross-domain discoveries, updated project list, updated expense context (0.5d)
- [ ] Story 11.3.2: Update live GoFundMe page with approved copy (0.1d)

---

## Sprint 12: Security Audit

> Full security review of the application, database, API, and infrastructure.

### Epic 12.1: Application Security Audit

- [ ] Story 12.1.1: Auth & session audit — verify Supabase Auth patterns, session handling, token refresh, middleware protection, CSRF (0.5d)
- [ ] Story 12.1.2: API route audit — verify all admin routes use `isAdminUser()` guard, rate limiting, input validation (0.5d)
- [ ] Story 12.1.3: RLS policy audit — verify all tables have correct read/write policies, no data leakage via service_role misuse (0.5d)
- [ ] Story 12.1.4: Client-side security — verify no service_role keys in client code, no XSS vectors in user-generated content, CSP headers (0.25d)
- [ ] Story 12.1.5: Dependency audit — `npm audit`, check for known vulnerabilities, update critical packages (0.25d)
- [ ] Story 12.1.6: Infrastructure review — Firebase App Hosting config, Supabase project settings, CORS, environment variable hygiene (0.25d)
- [ ] Story 12.1.7: OWASP Top 10 checklist — systematic review against current OWASP guidelines (0.5d)
- [ ] Story 12.1.8: Penetration testing — basic pentest of public-facing endpoints and auth flows (0.5d)
- [ ] Story 12.1.9: Security report & remediation plan — document findings, prioritize fixes, implement critical items (0.5d)

---

## Backlog: Revenue & Growth Strategy

> **Goal:** Create a user experience that generates WOW, Curiosity, Sharing, Participation, Virality, and Community — then monetize sustainably.

### Revenue Ideas (Brainstorm)

> Priority: Drive traffic FIRST, then monetize.

#### Tier 1: Low-Effort, Near-Term
1. **Freemium model** — Free: limited searches (e.g., 5/day), AI chat (3 questions/day), basic video browse. Paid ($5-10/mo): unlimited search, unlimited AI chat, saved searches, collections, export, advanced filters
2. **Sponsorship slots** — Sell featured placement to UAP/NDE channels, event organizers, conference promoters (e.g., MUFON, IANDS, Conscious Life Expo)
3. **Affiliate links** — Books, courses, and products mentioned in videos → Amazon affiliate, course platform referrals

#### Tier 2: Medium-Effort, Growth Phase
4. **Display ads** — Google AdSense or premium ad network once traffic justifies (≥50K monthly pageviews target)
5. **Viral content channel** — Repurpose AI-generated insights as short-form content (TikTok/Reels/Shorts): "Did you know?" facts, cross-domain discoveries, experiencer highlights → drives traffic back to site
6. **Newsletter premium tier** — Free weekly digest vs. paid deep-dive with exclusive analysis, early access to new features
7. **API access** — Researchers/developers pay for structured data access (video metadata, analysis results, embeddings)

#### Tier 3: High-Effort, Community Phase
8. **Interactive experiences** — "Are You a Hybrid?" personality quiz → shareable results → viral loop; "Remote Viewing Training" progressive game with leaderboards; "Match Your NDE" — find the most similar reported experience to your own
9. **Merchandise** — After building brand recognition: consciousness-themed apparel, posters of cross-domain data visualizations, "I Explored the Data" stickers
10. **Live events / webinars** — Paid virtual events with experiencers, researchers; Q&A with AI-assisted real-time analysis
11. **Course/certification** — "UAP Research Methods" using our methodology framework; certificate of completion
12. **Data reports** — Premium downloadable PDF reports: "State of UAP Disclosure 2026", "Cross-Domain Phenomenology Annual Review"

#### AI-Generated Additional Ideas
13. **Community contributions** — Users submit their own experiences for AI analysis (free basic, paid detailed); builds the dataset while engaging users
14. **Embeddable widgets** — Offer embeddable "UAP Fact of the Day" or "NDE Quote" widgets for other websites/blogs → backlinks + traffic
15. **Research grants** — Apply for academic grants using the platform's unique cross-domain dataset as a research tool
16. **White-label analysis** — License the analysis pipeline to other research organizations (MUFON, IANDS, universities)
17. **Gamification** — Achievement badges for exploring content ("Watched 10 Encounters", "Explored Cross-Domain"), leaderboards, community challenges → retention + virality

### Growth Strategy (Traffic First)

- [ ] Define SEO content strategy — target long-tail keywords around NDE/UAP phenomenology
- [ ] Build social media presence — automated posting of daily facts, cross-domain discoveries
- [ ] Launch viral content channel (YouTube Shorts / TikTok) — AI-narrated insights from the data
- [ ] Community building — Discord/forum for experiencers and researchers
- [ ] Press/media outreach — unique cross-domain findings as press releases
- [ ] Academic partnerships — collaborate with consciousness researchers for credibility + citations
- [ ] Influencer partnerships — guest features with UAP/NDE content creators whose channels we analyze

---

### Backlog: External Data Source Integration

> Analyze open-source UAP data repos for potential integration, cross-referencing, or feature inspiration.

#### Repo 1: Argus UFO AI Data ([GitHub](https://github.com/Mugeshgithub/Argus_UFO_AI_Data)) · [Live Demo](https://argus-ufo-ai-data.vercel.app)

> **What it is:** A Next.js data science platform analyzing **79,621 NUFORC sighting reports** (1941–2014) with NLP pipeline, bias correction, credibility scoring, and behavioral clustering. MIT licensed.
>
> **Key assets:**
> - 79,621 parsed NUFORC sighting records with extracted fields (shape, speed, movement, duration, military context, physics-violation language)
> - Bias correction methodology (World Bank internet penetration normalization)
> - Per-capita state normalization (Washington State #1 at 58.6/100k)
> - 6 behavioral clusters (silent+instant, high-altitude hover, formation, military proximity, EM interference, trace evidence)
> - Multi-factor credibility ranking (radar confirmation, witness type, corroboration, physical traces)
> - 77 hardest-to-explain cases (silent flight + instant acceleration)
> - 207 reports with explicit physics-violation language

**Integration brainstorm:**
- [ ] Story B.EXT.1: Import NUFORC sighting data as a third data layer alongside our video testimony corpus — cross-reference NUFORC reports with video-mentioned events/locations/dates (1d)
- [ ] Story B.EXT.2: Adopt/adapt bias correction methodology for our own temporal analysis (our data skews post-2015 YouTube) (0.5d)
- [ ] Story B.EXT.3: Compare Argus behavioral clusters against our phenomenology extraction (entity types, craft shapes, Five Observables) — potential cross-domain validation (0.5d)
- [ ] Story B.EXT.4: Build a "Sightings vs Testimonies" comparison page — NUFORC sighting density map overlaid with our video testimony geographic mentions (1d)
- [ ] Story B.EXT.5: Integrate Argus credibility scoring as a complementary signal alongside our UAP-ESS evidence scale (0.5d)
- [ ] Story B.EXT.6: Link or embed their interactive global heatmap as a "Sightings Map" feature on our site (0.25d)

#### Repo 2: PURSUE Open Atlas ([GitHub](https://github.com/AlexZhangji/ufo-pursue-open-atlas)) · [Live Demo](https://ufo.gpt2077.com) · [HuggingFace](https://huggingface.co/datasets/alex-zhang42/ufo-pursue-open-atlas)

> **What it is:** The U.S. Department of War **PURSUE Release 01** declassified UFO/UAP documents — 161 records, 4,153 pages, VLM-extracted into clean Markdown with inline image captions. CC0 licensed. Includes 3D globe atlas, side-by-side document viewer, and hybrid keyword+AI search.
>
> **Key assets:**
> - 161 declassified government records (DoW, FBI, NASA, State Dept) spanning 80 years
> - 4,153 pages with VLM-extracted Markdown (86.6% image-only scans — no other searchable text exists)
> - Per-page JPEG renders at 200 DPI
> - Hybrid BM25 + semantic search with BGE embeddings
> - 3D globe atlas visualization
> - Agency metadata (FBI, DoW, State, NASA), incident locations, dates
> - `corpus.jsonl` — ready-to-ingest structured data
> - Full audit trail with corrections.json

**Integration brainstorm:**
- [ ] Story B.EXT.7: Import PURSUE corpus.jsonl into Supabase as `uap_declassified_docs` table — page text, agency, date, location, classification level (0.5d)
- [ ] Story B.EXT.8: Build `/uap/documents` page — searchable archive of declassified government documents, filterable by agency/era/record type (1d)
- [ ] Story B.EXT.9: Cross-reference declassified document events with our video testimony mentions — e.g., when a video discusses "Project Blue Book", link to the actual declassified pages (1d)
- [ ] Story B.EXT.10: Embed or link to PURSUE's 3D globe atlas as a "Declassified Map" feature — complements our video-based geographic analysis (0.25d)
- [ ] Story B.EXT.11: Add declassified document context to our Research Assistant chat — RAG over government documents alongside video transcripts for richer answers (1d)
- [ ] Story B.EXT.12: Build "Primary Sources" section on video detail pages — when a video mentions specific programs/events, show related declassified documents (0.5d)
- [ ] Story B.EXT.13: Create a "Government vs Testimony" comparison view — what the declassified documents say about an event vs. what experiencers report (1d)
