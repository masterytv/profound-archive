# SPRINT: UAP Vertical for Project Profound

> Phase 3 | BMAD Methodology | Type A Development Project
> Date: 2026-05-05

## Sprint Status (Updated by AI after each task)

> **⚠️ MANDATORY RULE:** When a task checkbox `- [ ]` is completed, the AI MUST update it to `- [x]` in this file BEFORE ending the conversation. This file is the single source of truth for cross-conversation state. Brain artifacts are conversation-scoped and unreliable for handoff.

| Sprint | Status | Completed |
|--------|--------|-----------|
| Sprint 1: Foundation | ✅ Complete | 2026-05-06 |
| Sprint 2: Pipeline | 🔄 In Progress | — |
| Sprint 3: Core Pages | 🔲 Not Started | — |
| Sprint 4: Profiles & Discovery | 🔲 Not Started | — |
| Sprint 5: Content & Polish | 🔲 Not Started | — |

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
- [ ] Create `src/lib/ai/uap-evidence.ts` — sends punctuated transcript + UAP-ESS rubric to `gpt-4o-mini` (mirrors NDE cvnde.ts pattern), returns 7-criterion score (7-28) + rationale via JSON mode
- [ ] Use Zod schema `UAPEvidenceScoreSchema` for output validation
- [ ] Only processes Tier 1 videos (first-person encounter accounts)
- **Done when:** Unit test passes with a known encounter transcript returning a valid score and rationale.

#### Story 2.3.2: Build contact-depth analysis module (0.5d)
- [ ] Create `src/lib/ai/uap-contact-depth.ts` — scores contact depth per UAP-CDS rubric (16 items, 0-32) via `gpt-4o-mini` JSON mode
- [ ] Use Zod schema `UAPContactDepthScoreSchema`
- [ ] Tier 1 only
- **Done when:** Unit test passes; score stored in `uap_analysis.contact_depth_score`.

#### Story 2.3.3: Build transformation analysis module (0.5d)
- [ ] Create `src/lib/ai/uap-transformation.ts` — scores transformation per UAP-CTI rubric (12 domains, 0-60 full / 0-50 comparable) via `gpt-4o-mini` JSON mode
- [ ] Use Zod schema `UAPTransformationScoreSchema`
- [ ] Tier 1 only
- **Done when:** Unit test passes; score stored in `uap_analysis.transformation_score`.

#### Story 2.3.4: Build triad batch orchestrator (0.5d)
- [ ] Create `scripts/uap-batch-triad.ts` — runs all three triad modules sequentially per video, writes combined results to `uap_analysis`
- [ ] Processes only Tier 1 videos with punctuated subtitles and no existing analysis
- [ ] Checkpoint logging and resume support
- **Done when:** 5+ Tier 1 videos have all three scores in `uap_analysis`; script resumes correctly after interruption.

---

### Epic 2.4: Knowledge Extraction (Tier 2)

#### Story 2.4.1: Build knowledge extraction pipeline (1d)
- [ ] Create `src/lib/pipeline/uap-knowledge.ts` — extracts claims, entities, dates, and relationships from Tier 2 (program/investigative) content via Claude Sonnet (long-form extraction requires stronger model; mirrors blog-article.ts pattern)
- [ ] Use Zod schema `UAPKnowledgeSchema` for structured output
- [ ] Store extracted data as JSONB in `uap_analysis.raw_json` for Tier 2 videos
- [ ] Create batch script `scripts/uap-batch-knowledge.ts`
- **Done when:** 5+ Tier 2 videos have knowledge extraction results in `uap_analysis.raw_json`.

---

### Epic 2.5: Admin Classifier Review

#### Story 2.5.1: Build admin classifier review page (1d)
- [ ] Create `src/app/admin/uap/classifier/page.tsx` — table of all classified videos with tier, track, content_type, confidence columns
- [ ] Add filter controls: filter by tier (1/2/3), track, intake_status
- [ ] Add inline edit: click to override tier/track with confirmation modal
- [ ] Override writes to DB and logs the change with admin user ID
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

#### Story 3.1.1: Build encounter video detail page (1d)
- [ ] Create `src/app/uap/encounters/[slug]/page.tsx` — server component, fetches video + triad scores from DB
- [ ] Implement click-to-play video embed (no autoplay per LEARNINGS.md)
- [ ] Display punctuated transcript with expandable sections
- [ ] Add `generateMetadata` for SEO (title, description, OG image)
- **Done when:** `/uap/encounters/[slug]` renders with video, transcript, and metadata; click-to-play works; no autoplay.

#### Story 3.1.2: Build program video detail page (0.5d)
- [ ] Create `src/app/uap/programs/[slug]/page.tsx` — server component for Tier 2 content
- [ ] Display knowledge extraction panel instead of triad scores
- [ ] Reuse video embed and transcript components from Story 3.1.1 via domain config
- **Done when:** `/uap/programs/[slug]` renders with knowledge panel; shared components work for both route trees.

#### Story 3.1.3: Build triad scores panel component (0.5d)
- [ ] Create `src/components/uap/TriadScoresPanel.tsx` — displays evidence, contact-depth, transformation scores with labels and descriptions
- [ ] Add radar chart visualization using existing chart library (recharts)
- [ ] Component accepts scores as props, renders gracefully when scores are null (pending analysis)
- **Done when:** Panel renders on encounter detail page with real scores; null scores show "Analysis pending" state.

#### Story 3.1.4: Build knowledge panel component (0.5d)
- [ ] Create `src/components/uap/KnowledgePanel.tsx` — displays extracted claims, entities, dates from `raw_json`
- [ ] Render as structured cards: Claims list, Entity tags, Timeline of dates
- [ ] Handles empty/null state gracefully
- **Done when:** Panel renders on program detail page with real extracted data; empty state shows placeholder.

---

### Epic 3.2: Channel Pages

#### Story 3.2.1: Build channel list page (0.5d)
- [ ] Create `src/app/uap/channels/page.tsx` — server component, lists all channels with thumbnail, name, video count
- [ ] Sort by video count descending; use `get_uap_channel_stats` RPC
- [ ] Add `generateMetadata`
- **Done when:** `/uap/channels` renders all channels with accurate video counts from RPC.

#### Story 3.2.2: Build channel detail page (0.5d)
- [ ] Create `src/app/uap/channels/[handle]/page.tsx` — shows channel info + paginated video list
- [ ] Server-side fetch with cursor pagination (20 per page)
- [ ] Videos link to correct detail page based on track (encounter vs program)
- **Done when:** `/uap/channels/[handle]` renders channel with paginated videos; links route correctly by track.

---

### Epic 3.3: Search

#### Story 3.3.1: Build UAP search API route (0.5d)
- [ ] Create `src/app/api/uap/search/route.ts` — accepts query, mode (keyword/semantic), and filters (tier, track, content_type)
- [ ] Keyword mode calls `keyword_search_uap_videos` RPC; semantic mode calls `search_uap_punctuated_embeddings` RPC
- [ ] Both RPCs already enforce `tier != 3` — add server-side validation as defense-in-depth
- **Done when:** API returns results for keyword and semantic queries; Tier 3 videos never appear in results.

#### Story 3.3.2: Build UAP search page (1d)
- [ ] Create `src/app/uap/search/page.tsx` — search input, mode toggle (keyword/semantic), filter sidebar (tier, track, content_type via `uap_search_facets` RPC)
- [ ] Results display as video cards with title, channel, tier badge, score preview, and clickable timestamps linking to video position
- [ ] Implement URL-based search state (query params) for shareability
- [ ] Loading skeleton and empty state
- **Done when:** Search page returns results for both modes; filters work; timestamps deep-link into video; URL reflects search state; no Tier 3 results.

---

### Epic 3.4: Admin Channel Management

#### Story 3.4.1: Build admin channel management page (1d)
- [ ] Create `src/app/admin/uap/channels/page.tsx` — table of all channels with edit capability
- [ ] Add: sync channel metadata button (fetches latest from YouTube API)
- [ ] Add: channel visibility toggle (hide/show from public listings)
- [ ] Add: bulk action to re-classify all videos in a channel
- [ ] Display pipeline status per channel (classified/punctuated/analyzed counts)
- **Done when:** Admin can view all channels, toggle visibility, trigger metadata sync, and see per-channel pipeline progress.

#### Story 3.4.2: Build UAP scanner queue pages (0.5d)
- [ ] Create `src/app/admin/uap/scanner/queue/page.tsx` — table of pending/failed items from `uap_scan_queue` with retry and skip actions
- [ ] Create `src/app/admin/uap/scanner/pending/page.tsx` — filtered view of failed intake from `uap_vids`
- **Done when:** Admin can view queue items, retry failed, and skip no_captions.

---

## Sprint 4: Profiles & Discovery (Week 4)

**Goal:** Aggregate pipeline data into higher-level exploration tools — contactee profiles, timelines, chat interface — and add content safety guardrails.

### Epic 4.1: Contactee Profiles

#### Story 4.1.1: Build contactee profile data aggregation (0.5d)
- [ ] Create `src/lib/data/uap-contactee.ts` — aggregates all videos, triad scores, and knowledge data for a contactee
- [ ] Computes average triad scores across all Tier 1 videos
- [ ] Collects all extracted claims from Tier 2 videos mentioning this contactee
- **Done when:** Function returns complete profile data for a test contactee with multiple videos.

#### Story 4.1.2: Build contactee profile page (1d)
- [ ] Create `src/app/uap/contactees/[slug]/page.tsx` — server component with bio, key claims, video list, avg triad scores radar chart
- [ ] Add `generateMetadata` and `generateStaticParams` (use `buildClient()` per LEARNINGS.md)
- [ ] Link from video detail pages to contactee profile
- **Done when:** `/uap/contactees/[slug]` renders with aggregated data; static params generated at build; bidirectional links work.

#### Story 4.1.3: Build contactee list page (0.5d)
- [ ] Create `src/app/uap/contactees/page.tsx` — grid of contactee cards with photo, name, video count, avg evidence score
- [ ] Sort by video count; server-side fetch
- **Done when:** `/uap/contactees` renders grid with real data; cards link to detail pages.

---

### Epic 4.2: Person Pages & Timeline

#### Story 4.2.1: Build person/entity knowledge graph page (1d)
- [ ] Create `src/app/uap/people/[slug]/page.tsx` — aggregates all mentions of a person/entity across knowledge extractions
- [ ] Display: mention count, associated claims, source videos, related entities
- [ ] Server-side data aggregation from `uap_analysis.raw_json`
- **Done when:** `/uap/people/[slug]` renders with cross-referenced data from multiple videos.

#### Story 4.2.2: Build disclosure timeline page (1d)
- [ ] Create `src/app/uap/timeline/page.tsx` — chronological, filterable visualization of key UAP events extracted from knowledge pipeline
- [ ] Render as vertical timeline with date, event title, source video link; add filter controls for date range and topic/category
- [ ] Data sourced from `uap_analysis.raw_json` date extractions, deduplicated
- [ ] Add `generateMetadata`
- **Done when:** `/uap/timeline` renders chronological events with source links; filters narrow results correctly; no duplicate entries.

---

### Epic 4.3: Chat

#### Story 4.3.1: Build UAP chat server action (0.5d)
- [ ] Create `src/app/uap/actions.ts` — server action for chat, retrieves relevant chunks from `uap_chatbot_chunks` via vector search, sends to Claude with UAP system prompt
- [ ] Tier 3 gate enforced in chunk retrieval query
- [ ] Use streaming response pattern matching NDE chat implementation
- **Done when:** Server action returns streamed response grounded in UAP video content; no Tier 3 content in context.

#### Story 4.3.2: Build UAP chat page (1d)
- [ ] Create `src/app/uap/chat/page.tsx` — chat interface with message history, input, and streaming response display
- [ ] Use domain config to set UAP-specific system prompt and UI theming
- [ ] Add source citations (video title + link) in chat responses
- [ ] Add content safety disclaimer banner at top of chat
- **Done when:** Chat page sends messages, streams responses with citations, shows safety banner; responses reference real UAP content.

---

### Epic 4.4: Content Safety

#### Story 4.4.1: Add content safety banners (0.5d)
- [ ] Create `src/components/uap/ContentSafetyBanner.tsx` — dismissible banner explaining content nature and encouraging critical thinking
- [ ] Add to UAP layout (shows on all UAP pages) with localStorage-based dismiss persistence
- [ ] Separate variant for chat page with stronger disclaimer
- **Done when:** Banner appears on first visit to any UAP page; dismissing persists across page navigations; chat page shows enhanced variant.

---

### Epic 4.5: Admin Contactee Editor

#### Story 4.5.1: Build admin contactee editor (1d)
- [ ] Create `src/app/admin/uap/contactees/page.tsx` — table of all contactee profiles with edit/create/delete actions
- [ ] Edit form: name, slug, bio, key_claims (array editor), source_video_ids (multi-select)
- [ ] Slug auto-generated from name with manual override option
- [ ] Delete requires confirmation modal
- **Done when:** Admin can CRUD contactee profiles; changes persist to DB; slug generation works.

---

## Sprint 5: Content & Polish (Week 5)

**Goal:** Seed launch content (blog posts, Big Questions), wire up CI/CD via GitHub Actions, finalize SEO, domain-aware dashboard, and verify zero NDE regressions before launch.

### Epic 5.1: Blog Content

#### Story 5.1.1: Generate UAP Big Questions (1d)
- [ ] Create `scripts/uap-seed-questions.ts` — generates 5-10 "Big Questions" blog posts using the blog pipeline pattern from NDE
- [ ] Questions sourced from UAP-ESS rubric themes and common contactee claims
- [ ] Posts written to `blog_posts` table with `domain = 'uap'`
- [ ] Set up `uap-blog-questions.yml` GitHub Action mirroring NDE `scanner-*.yml` pattern
- **Done when:** 5+ UAP Big Question posts exist in DB with `domain = 'uap'`; Action YAML is valid.

#### Story 5.1.2: Generate UAP blog stories (1d)
- [ ] Create `scripts/uap-seed-stories.ts` — generates 3-5 launch blog posts analyzing specific encounters or disclosure events
- [ ] Each post references source videos with proper links
- [ ] Set up `uap-blog-stories.yml` GitHub Action
- **Done when:** 3+ UAP blog story posts in DB; each references at least one source video.

---

### Epic 5.2: GitHub Actions

#### Story 5.2.1: Create pipeline GitHub Actions (1d)
- [ ] Create `uap-scanner-discover.yml` — discovers new UAP videos from configured channels
- [ ] Create `uap-scanner-process.yml` — runs classify → punctuate → embed → chunk pipeline for new videos
- [ ] Create `uap-triad-cron.yml` — runs triad analysis on unanalyzed Tier 1 videos
- [ ] Create `uap-knowledge-cron.yml` — runs knowledge extraction on unanalyzed Tier 2 videos
- [ ] All Actions mirror NDE `.github/workflows/scanner-*.yml` patterns
- **Done when:** All 6 Action YAMLs (`uap-scanner-discover`, `uap-scanner-process`, `uap-blog-questions`, `uap-blog-stories`, `uap-triad-cron`, `uap-knowledge-cron`) are valid and pass `act` dry-run.

---

### Epic 5.3: Dashboard & Saved Searches

#### Story 5.3.1: Make dashboard domain-aware (0.5d)
- [ ] Update dashboard/collections components to filter by `domain` column on `favorites` and `saved_searches`
- [ ] Add domain toggle or tab UI if user has content in both NDE and UAP
- [ ] Ensure NDE-only users see no change in behavior
- **Done when:** User can save UAP videos to favorites with `domain = 'uap'`; dashboard shows domain-filtered collections; NDE dashboard unchanged.

#### Story 5.3.2: Implement UAP saved searches (0.5d)
- [ ] Extend saved searches to store domain, search mode, and filters
- [ ] UAP search page "Save Search" button writes to `saved_searches` with `domain = 'uap'`
- [ ] Dashboard displays saved UAP searches with re-run capability
- **Done when:** User can save and re-run a UAP search from the dashboard; search params preserved correctly.

---

### Epic 5.4: SEO

#### Story 5.4.1: Add generateMetadata to all UAP routes (0.5d)
- [ ] Audit all UAP pages and add/verify `generateMetadata` exports
- [ ] Ensure unique title, description, and OG image per page type
- [ ] Add canonical URLs for all UAP routes
- **Done when:** Every UAP route has `generateMetadata`; no duplicate titles; OG images render in social preview validator.

#### Story 5.4.2: Add JSON-LD and sitemap entries (0.5d)
- [ ] Add JSON-LD structured data to video detail pages (VideoObject schema), contactee profiles (Person schema), and channel pages (Organization schema)
- [ ] Update `src/app/sitemap.ts` to include all UAP routes (encounters, programs, channels, contactees, timeline)
- [ ] Use `buildClient()` for data fetching in sitemap generation
- **Done when:** JSON-LD validates in Google Rich Results Test; sitemap includes all UAP URLs; `buildClient()` used in sitemap.

---

### Epic 5.5: Regression & Launch Gate

#### Story 5.5.1: NDE regression testing (1d)
- [ ] Test NDE homepage — loads correctly, stats accurate, no UAP content leaking
- [ ] Test NDE explore — search returns only NDE results, no Tier 3 UAP content
- [ ] Test NDE search — keyword and semantic search work, performance unchanged
- [ ] Test NDE chat — responses reference only NDE content, no UAP context contamination
- **Done when:** All four NDE areas function identically to pre-UAP baseline; no cross-domain data leakage.

#### Story 5.5.2: Launch gate checklist (0.5d)
- [ ] Verify all Tier 3 videos excluded from search results (both keyword and semantic)
- [ ] Verify content safety banners display on all UAP pages
- [ ] Verify all 6 GitHub Actions are configured and pass dry-run
- [ ] Verify admin can access all UAP admin pages (dashboard, classifier, channels, contactees)
- [ ] Run `npm run build` — zero errors, zero type warnings
- [ ] Lighthouse audit on 3 key UAP pages (landing, search, encounter detail) — performance ≥ 80, accessibility ≥ 90
- **Done when:** All checklist items pass; team signs off on launch readiness.

---

## Gate 3 Checklist

- [x] Epics broken into stories (max 1 day each)
- [x] Stories ordered by dependency
- [x] Each story has "done" criteria
- [x] First sprint identified
- [x] Environment setup documented
