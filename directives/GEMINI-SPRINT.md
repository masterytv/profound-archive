# Phase 3 Sprint Plan: UAP Vertical Expansion

> **Phase 3 | Project Profound Expansion | Gemini Analysis**
> **Project Type:** Type A (Development Project - Full BMAD)

## 0. Environment Setup

**Pre-requisites for Development:**
- **Supabase Local / Branch:** Ensure you are working on a dedicated Supabase branch or local environment before applying migrations. 
- **Environment Variables:** Verify `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `TAVILY_API_KEY` are configured in `.env.local`.
- **Database Backup:** Take a snapshot of the current production database. Although development is additive, `uap_vids` is an existing table being modified.

---

## Sprint 1: Foundation
**Goal:** Establish database schema, domain configuration, UI layouts, and execute batch classification on the existing 4,195 UAP videos.

### Epic 1: Database Foundation
- **Story 1.1: UAP Database Migrations (1 day)**
  - *Task 1.1.1:* Create migrations for `uap_analysis`, `uap_channels`, `uap_contactee_profiles`, `uap_chatbot_chunks`, and `uap_punctuated_embeddings`.
  - *Task 1.1.2:* Add `content_type`, `tier`, `track`, and `intake_status` to `uap_vids`. (Ensure these are **only** in `uap_vids` to avoid data duplication per architecture review).
  - *Task 1.1.3:* Add `domain` column to `favorites` and `saved_searches` tables.
  - *Task 1.1.4:* Create search RPCs with PL/pgSQL branching. Explicitly filter out `intake_status = 'out_of_scope'`.
  - *Done Criteria:* Migrations apply cleanly via `supabase db reset`. RPCs execute without errors.

### Epic 2: Core Domain Config & Layout
- **Story 1.2: Domain Configuration System (0.5 day)**
  - *Task 1.2.1:* Create `src/lib/config/domains.ts` containing the `DOMAIN_CONFIGS` dictionary mapping NDE and UAP specific properties.
  - *Done Criteria:* `DOMAIN_CONFIGS` is exported and type-checked, resolving correctly across the app.
- **Story 1.3: UAP Layout and Landing Page (0.5 day)**
  - *Task 1.3.1:* Create `src/app/uap/layout.tsx` defining CSS variables for the violet accent color.
  - *Task 1.3.2:* Create `src/app/uap/page.tsx` (stub landing page).
  - *Done Criteria:* Visiting `/uap` displays the stub page with appropriate violet accents.
- **Story 1.4: Admin Sidebar Integration (0.5 day)**
  - *Task 1.4.1:* Add UAP navigation group to the Admin sidebar in `src/app/admin/layout.tsx`.
  - *Done Criteria:* Admin panel correctly lists UAP routes alongside existing NDE links.

### Epic 3: Intake & Classification
- **Story 1.5: Content Classifier Pipeline (1 day)**
  - *Task 1.5.1:* Create `src/lib/ai/classify-uap.ts` utilizing `gpt-4o-mini` with JSON object response.
  - *Task 1.5.2:* Implement the Tier 3 gate to halt downstream steps for Out of Scope videos.
  - *Task 1.5.3:* Ensure the Zod schema exactly matches the TS interfaces to prevent silent stripping.
  - *Done Criteria:* Classifier reliably returns valid JSON against test videos.
- **Story 1.6: Batch Classification Execution (1 day)**
  - *Task 1.6.1:* Create `scripts/uap-batch-classify.ts` to iterate over 4,195 videos.
  - *Task 1.6.2:* Execute classification against the database.
  - *Task 1.6.3:* Create Admin Dashboard (`src/app/admin/uap/page.tsx`) to display pipeline stats.
  - *Done Criteria:* All 4,195 rows in `uap_vids` have `content_type`, `tier`, and `track` populated. Pipeline stats dashboard is active.

---

## Sprint 2: Pipeline
**Goal:** Run all remaining data pipelines on the classified videos, generating embeddings, punctuated transcripts, and deep AI analysis.

### Epic 4: Scoring Research
- **Story 2.1: UAP-ESS Scoring Rubric (1 day)**
  - *Task 2.1.1:* Document the UAP Evidence Strength Scale based on Vallee's SVP framework.
  - *Task 2.1.2:* Save to `docs/scales/UAP-ESS.md`.
  - *Done Criteria:* Rubric is fully documented, scaled 0-28, and approved.

### Epic 5: Punctuation & Embedding
- **Story 2.2: Punctuation Pipeline (1 day)**
  - *Task 2.2.1:* Create `scripts/uap-batch-punctuate.ts` for Tier 1 and 2 only (skipping Tier 3).
  - *Done Criteria:* Script successfully punctuates transcripts and saves to `subtitles_punctuated`.
- **Story 2.3: Embedding & Chat Chunk Generation (1 day)**
  - *Task 2.3.1:* Generate embeddings for `uap_punctuated_embeddings` (Tier 1+2).
  - *Task 2.3.2:* Generate contextual chunks for `uap_chatbot_chunks`.
  - *Done Criteria:* Tables populated with valid 1536-dimensional vectors.

### Epic 6: Triad & Knowledge Analysis
- **Story 2.4: Triad Analysis Pipeline (Tier 1) (1 day)**
  - *Task 2.4.1:* Implement `src/lib/ai/uap-triad/` modules (evidence, contact-depth, transformation).
  - *Task 2.4.2:* **CRITICAL:** Implement Claude Assistant Prefill (`{ role: 'assistant', content: '{' }`) for the Anthropic API calls.
  - *Task 2.4.3:* Batch execute analysis on Tier 1.
  - *Done Criteria:* `uap_analysis` populated with triad scores for Tier 1.
- **Story 2.5: Knowledge Extraction Pipeline (Tier 2) (1 day)**
  - *Task 2.5.1:* Implement `src/lib/ai/uap-knowledge.ts`.
  - *Task 2.5.2:* Batch execute extraction on Tier 2.
  - *Done Criteria:* `uap_analysis` populated with people, programs, and timeline events for Tier 2.

---

## Sprint 3: Core Pages
**Goal:** Build the user-facing web pages for video details, search, and channel discovery using the newly generated data.

### Epic 7: Video Experience
- **Story 3.1: Encounter & Program Video Detail Pages (1 day)**
  - *Task 3.1.1:* Build `/uap/encounters/video/[id]/page.tsx` and `/uap/program/video/[id]/page.tsx`.
  - *Task 3.1.2:* **CRITICAL:** Ensure `generateStaticParams` uses the `anon`/service client, not the authenticated server client.
  - *Done Criteria:* Both routes render statically and display the embedded YouTube player.
- **Story 3.2: Triad & Knowledge Panels (1 day)**
  - *Task 3.2.1:* Build `triad-scores-panel.tsx` and `uap-radar-chart.tsx`.
  - *Task 3.2.2:* Build `knowledge-panel.tsx` for Track 2.
  - *Done Criteria:* Video pages visually display dynamic analysis data based on the video's tier.

### Epic 8: Channels & Discovery
- **Story 3.3: Channel List & Detail (1 day)**
  - *Task 3.3.1:* Build public `/uap/channels/page.tsx` and `/uap/channel/[id]/page.tsx`.
  - *Task 3.3.2:* Build admin channel management `src/app/admin/uap/channels/page.tsx`.
  - *Done Criteria:* Users can browse channels; admins can hide/show and categorize them.

### Epic 9: Search
- **Story 3.4: UAP Search API & UI (1 day)**
  - *Task 3.4.1:* Build `/api/uap/search/route.ts` bridging to the UAP RPCs.
  - *Task 3.4.2:* Build `/uap/search/page.tsx` client component.
  - *Done Criteria:* Semantic and keyword search returns UAP-only results with clickable timestamps.

---

## Sprint 4: Profiles & Discovery
**Goal:** Aggregate the data into higher-level exploration tools, including contactee profiles, timelines, and the chat interface.

### Epic 10: Knowledge Graph UI
- **Story 4.1: Contactee & Person Pages (1 day)**
  - *Task 4.1.1:* Build `/uap/contactee/[slug]/page.tsx` for Tier 1 experiencers.
  - *Task 4.1.2:* Build `/uap/person/[name]/page.tsx` for Tier 2 researchers/whistleblowers.
  - *Done Criteria:* Profiles are accessible and correctly aggregate scores and claims.
- **Story 4.2: Disclosure Timeline (1 day)**
  - *Task 4.2.1:* Aggregate timeline events from `uap_analysis` and render at `/uap/program/timeline/page.tsx`.
  - *Done Criteria:* Displays a chronological, filterable list of events with deep links to source videos.

### Epic 11: Chat & Safety
- **Story 4.3: UAP Chat Interface (1 day)**
  - *Task 4.3.1:* Build Server Action for UAP-scoped RAG retrieval.
  - *Task 4.3.2:* Build `/uap/chat/page.tsx`.
  - *Done Criteria:* Users can query the chatbot and receive answers exclusively drawn from `uap_chatbot_chunks`.
- **Story 4.4: Content Safety Banners (0.5 day)**
  - *Task 4.4.1:* Implement `content-safety-banner.tsx`.
  - *Done Criteria:* Flagged videos display appropriate safety warnings in the UI.

---

## Sprint 5: Content & Polish
**Goal:** Generate initial content to populate the site, finalize SEO, update user dashboard routing, and complete regression testing before launch.

### Epic 12: Content Seeding
- **Story 5.1: Big Questions & Blog (1 day)**
  - *Task 5.1.1:* Generate 5-10 "Big Questions" for `/uap/questions/`.
  - *Task 5.1.2:* Generate 3-5 launch blog posts for `/uap/blog/`.
  - *Done Criteria:* Initial content is published and accurately formatted.

### Epic 13: User Features & SEO
- **Story 5.2: Domain-Aware Dashboard (1 day)**
  - *Task 5.2.1:* Update the unified `/dashboard` to group collections and favorites by domain.
  - *Done Criteria:* Users see UAP and NDE saved items separated or badged correctly, linking to the right routes.
- **Story 5.3: SEO Optimization (1 day)**
  - *Task 5.3.1:* Configure `generateMetadata` for UAP routes ("UFO & UAP").
  - *Task 5.3.2:* Add structured data (JSON-LD) and update the sitemap.
  - *Done Criteria:* Correct `<head>` tags reflect target keywords; sitemap is valid.

### Epic 14: Launch Prep
- **Story 5.4: Regression Testing & Launch Gate (1 day)**
  - *Task 5.4.1:* Perform manual testing of NDE homepage, chat, and search to ensure zero regressions.
  - *Task 5.4.2:* Complete Launch Gate checklist from the PRD.
  - *Done Criteria:* No regressions found; site is confirmed ready for launch.
