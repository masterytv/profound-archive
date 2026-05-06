# PRD: UAP Vertical for Project Profound

> **Phase 1 | BMAD Methodology | Type A Development Project**
> Author: Antigravity Orchestrator | Date: 2026-05-05
> Status: ✅ APPROVED — Gate 1 passed 2026-05-05
> Source: `directives/DISCOVERY-CLAUDE.md` (Phase 0, approved)

---

## 1. Problem Statement

Project Profound has 4,195 UAP videos and 555,817 embeddings sitting in the database with zero frontend, zero analysis, and zero punctuation. The cultural moment for UAP/disclosure content is unprecedented. This PRD defines the UAP vertical MVP: all routes under `/uap/`, additive to the existing NDE site, zero changes to current pages or homepage.

## 2. Scope Boundaries

**In scope:** UAP vertical (`/uap/*` routes), UAP-specific pipelines, UAP chat, UAP blog, UAP questions, UAP channels, contactee profiles, timestamped search across UAP content.

**Out of scope (future phases):**
- Cross-domain comparison engine (`/compare/`)
- Hub homepage redesign
- NDE migration to `/nde/`
- Unified search across all domains
- Psychedelic, OBE, Psi verticals
- Community features, user-submitted accounts
- Social media / newsletter launch

References to these are included where relevant for architectural alignment only.

---

## 3. Dual-Track Content Strategy

### Track 1: First-Person Encounters (`/uap/encounters/`)

Videos where someone describes their own UFO/NHI experience (sighting, contact, abduction, CE-5, ongoing communication). Tier 1 content. Gets full Triad Analysis. Feeds the future cross-domain comparison engine.

### Track 2: Disclosure & Research (`/uap/program/`)

Investigative/documentary content about legacy UFO programs, government coverups, whistleblower testimony, technology analysis, and the consciousness-craft connection. Tier 2 content. Gets knowledge extraction pipeline (people, programs, claims, timeline events, consciousness connections).

### Content Tiers

| Tier | Type | Search | Chat | Analysis | Example |
|------|------|--------|------|----------|---------|
| **1** | First-person account | ✅ | ✅ | ✅ Full Triad | "I was taken aboard..." told by the person |
| **2** | Retold stories, research, disclosure | ✅ | ✅ | Knowledge extraction only | Researcher analyzing cases, disclosure testimony |
| **3** | Out of scope | ❌ | ❌ | ❌ | Cryptids, true crime, ghost hunting |

---

## 4. Three Core Capabilities (UAP Scope)

### 4.1 Timestamped Semantic Search (All UAP Content)

Search across all 555K+ UAP embeddings. Returns video moments with start times, linking directly to the timestamp in the video player.

**Acceptance Criteria:**
- [ ] User can search from `/uap/` and results span all UAP content (Tier 1 + Tier 2)
- [ ] Each result shows: video title, channel, matched transcript snippet, timestamp, thumbnail
- [ ] Clicking a result navigates to `/uap/encounters/video/[id]` or `/uap/program/video/[id]` at the correct timestamp
- [ ] Results display a subtle label for Tier 2 content ("Research" or "Retold Account")
- [ ] Tier 1 results rank above Tier 2 by default; toggle available to include/exclude Tier 2
- [ ] Search completes within 3 seconds (anon role timeout)
- [ ] Search uses existing `search_uap_embeddings` RPC (or new equivalent) with GIN/HNSW indexes

### 4.2 Triad Analysis (First-Person Encounters Only)

AI-powered scoring of each Tier 1 video across three axes, mirroring the NDE analysis pattern.

**Axis 1: Evidence (UAP-ESS, 0-28)**
Adapted from Vallee's SVP Credibility Index. Scores: multi-witness corroboration, physical/trace evidence, sensor data, source reliability.

**Axis 2: Experience (Contact Depth Scale, 0-28 + Hynek/Vallee classification)**
Seven dimensions: Proximity, Duration, Communication, Physical effects, Information transfer, Witness corroboration, Evidence artifacts. Plus Hynek type (CE1-CE5) and Vallee type (AN/MA/FB).

**Axis 3: Impact (NDE-TI, 0-50)**
Same Transformation Index used for NDEs. Validated by FREE Foundation survey showing identical spiritual/value shifts in UAP contactees and NDE experiencers.

**Acceptance Criteria:**
- [ ] `uap_analysis` table created with all Triad fields (see Section 10)
- [ ] Analysis pipeline produces scores for all three axes on Tier 1 videos
- [ ] Scores display on video detail page with breakdown visualization
- [ ] Radar chart (5-axis: Transformation, Intensity, Ineffability, Positive Tone, Entity Presence) renders on video detail and contactee profile pages
- [ ] Analysis only runs on videos classified as `first_person` (Tier 1)
- [ ] `experience_fingerprint` vector(1536) generated for future cross-domain comparison

### 4.3 Domain-Scoped AI Chat (`/uap/chat/`)

Conversational AI drawing on UAP transcript corpus. Same `<ChatInterface>` component as NDE chat, configured with UAP-specific RAG source and system prompt.

**Acceptance Criteria:**
- [ ] Chat at `/uap/chat/` queries `uap_embeddings` (or punctuated equivalent) only
- [ ] System prompt uses "curious UAP researcher" tone (not NDE's compassionate guide)
- [ ] Responses cite specific videos with timestamps
- [ ] Chat respects content safety guidelines (Section 12)
- [ ] Same async job pattern used for Cloud Run timeout compliance
- [ ] No cross-domain queries in V1 (scoped to UAP only; cross-domain deferred)

---

## 5. Route Architecture

All routes under `/uap/`. Zero changes to existing NDE routes.

```
src/app/uap/
  page.tsx                          # UAP landing/explore page
  layout.tsx                        # UAP layout with violet/slate accent theming

  encounters/                       # Track 1: First-person
    page.tsx                        # Browse/filter Tier 1 encounters
    video/[id]/page.tsx             # Encounter video detail + Triad scores
    experiencer/[id]/page.tsx       # Contactee profile (recurring experiencers)

  program/                          # Track 2: Disclosure/research
    page.tsx                        # Browse/filter program content
    video/[id]/page.tsx             # Program video detail + knowledge extraction
    person/[name]/page.tsx          # Knowledge graph person page (Elizondo, Grusch, etc.)
    timeline/page.tsx               # Navigable disclosure timeline

  channels/page.tsx                 # UAP channel list
  channel/[id]/page.tsx             # UAP channel detail

  chat/page.tsx                     # UAP-scoped AI chat
  questions/[slug]/page.tsx         # UAP "Big Questions"
  blog/[slug]/page.tsx              # UAP-specific blog posts
  search/page.tsx                   # UAP search (scoped to uap_embeddings)
```

**Naming convention:** `/uap/` in URLs. "UFO/UAP" in all visible text, page titles, and meta descriptions for SEO. Example: URL `/uap/encounters/` displays title "UFO & UAP Encounter Reports | Project Profound".

---

## 6. Features & Acceptance Criteria

### 6.1 UAP Landing Page (`/uap/`)

The entry point for the UAP vertical. Showcases both tracks.

- [ ] Hero section with UAP stats (total videos, analyzed encounters, channels)
- [ ] Two prominent cards: "Encounters" (violet accent) and "Programs & Disclosure" (slate accent)
- [ ] Featured/recent analyzed encounters (Tier 1) with scores
- [ ] Featured program content (Tier 2)
- [ ] Search bar scoped to UAP content
- [ ] Uses domain accent colors (violet-600 for encounters, slate-500 for program)
- [ ] Mobile responsive, follows existing design system tokens

### 6.2 Encounters Explore (`/uap/encounters/`)

Browse and filter first-person UAP encounter videos.

- [ ] Grid of video cards with thumbnails (hqdefault, Next.js `<Image>`, max 12 per page)
- [ ] Filter by: Hynek type (CE1-CE5), evidence score range, transformation score range, channel, entity type
- [ ] Sort by: date, evidence score, transformation score, view count
- [ ] Each card shows: thumbnail, title, channel, Hynek type badge, mini radar chart
- [ ] Pagination (server-side, 12 per page)
- [ ] "Analyzed" badge on videos with completed Triad analysis

### 6.3 Program Explore (`/uap/program/`)

Browse disclosure and research content.

- [ ] Grid of video cards
- [ ] Filter by: program mentioned, person mentioned, content type (disclosure, research, analysis)
- [ ] Sort by: date, view count, relevance
- [ ] Each card shows: thumbnail, title, channel, programs/people tags
- [ ] Links to person pages and timeline where applicable

### 6.4 Video Detail — Encounters (`/uap/encounters/video/[id]/`)

Reuses ~80% of NDE video detail page structure.

- [ ] YouTube player via `<YouTubePlayer>` (click-to-play, no raw iframe)
- [ ] Triad scores panel (Evidence, Experience, Impact) with breakdowns
- [ ] Radar chart (5-axis)
- [ ] Hynek/Vallee classification badges
- [ ] Transcript with timestamps (using `<TimestampLink>` for seeking)
- [ ] Entity descriptions, physical effects, message content (from analysis)
- [ ] Related encounters (by entity type, experience type, or phenomenology similarity)
- [ ] Contactee profile link (if experiencer has multiple videos)
- [ ] Content safety indicators where applicable
- [ ] `generateStaticParams` and `generateMetadata` use anon/service client (per LEARNINGS.md)

### 6.5 Video Detail — Program (`/uap/program/video/[id]/`)

- [ ] YouTube player via `<YouTubePlayer>`
- [ ] Knowledge extraction panel: people mentioned, programs, claims, timeline events
- [ ] Consciousness connection highlights (bridge points to encounter content)
- [ ] Transcript with timestamps
- [ ] Related program content
- [ ] Links to person pages for mentioned individuals

### 6.6 Contactee Profiles (`/uap/encounters/experiencer/[id]/`)

Mirrors NDE `experiencer_profiles` pattern for recurring UAP contactees.

- [ ] Profile header: name/alias, photo (if available), bio summary
- [ ] Experience summary: type, frequency (one-time/periodic/ongoing), entity types
- [ ] All videos by this contactee
- [ ] Aggregate scores (average Triad scores across videos)
- [ ] Core themes extracted from their accounts
- [ ] Content safety: option for anonymous/pseudonymous profiles

### 6.7 Person Pages — Program (`/uap/program/person/[name]/`)

Knowledge graph pages for prominent figures in disclosure/research.

- [ ] Person header: name, role/affiliation, brief bio
- [ ] All videos mentioning this person
- [ ] Programs associated with this person
- [ ] Key claims attributed to this person (with source videos)
- [ ] Timeline of their appearances/statements

### 6.8 Disclosure Timeline (`/uap/program/timeline/`)

Navigable timeline of disclosure events extracted from program content.

- [ ] Chronological event display with date, description, source video link
- [ ] Filter by: program, person, event type
- [ ] Expandable event details with transcript excerpts
- [ ] Mobile-friendly vertical timeline layout

### 6.9 UAP Channels (`/uap/channels/`, `/uap/channel/[id]/`)

- [ ] Channel list with: name, video count, track assignment (encounters/program/mixed), thumbnail
- [ ] Channel detail: all videos in channel, channel stats, track breakdown
- [ ] Respects `hidden` flag for soft-deleted channels (per LEARNINGS.md)

### 6.10 UAP Big Questions (`/uap/questions/[slug]/`)

AI-generated long-form answers to UAP-specific questions, using UAP corpus.

- [ ] Reuses existing Big Questions component/pipeline with UAP RAG source
- [ ] Example questions: "What do contactees report about telepathic communication?", "What physical evidence exists for UAP encounters?", "How does CE-5 contact differ from spontaneous encounters?"
- [ ] Generated via blog pipeline adapted for UAP domain
- [ ] 5-10 seed questions for launch

### 6.11 UAP Blog (`/uap/blog/[slug]/`)

- [ ] Reuses existing blog infrastructure with UAP-specific content
- [ ] 3-5 launch blog posts covering: platform introduction, disclosure timeline analysis, encounter patterns, consciousness-craft connection, cross-domain teaser
- [ ] Uses Tavily for research (per LEARNINGS.md)
- [ ] UAP-specific blog generation prompts

### 6.12 UAP Search (`/uap/search/`)

- [ ] Dedicated search page for UAP content
- [ ] Reuses search component with `domain: 'uap'` parameter
- [ ] Results from both Tier 1 and Tier 2, with tier labels
- [ ] Timestamp links to video moments

---

## 7. User Journeys

### Journey 1: Disclosure Seeker

> "I saw the congressional UAP hearings and want to go deeper."

1. Arrives via Google: "government UAP programs" → lands on `/uap/program/`
2. Browses program content, finds video about AAWSAP
3. Searches "consciousness craft interface" → timestamped results across program content
4. Clicks result, watches segment about psi-related craft interactions
5. Notices "Consciousness Connection" callout linking to encounter content
6. Follows link to `/uap/encounters/` → discovers first-person CE-5 accounts
7. Reads contactee profile → sees transformation scores similar to NDE experiencers
8. **Outcome:** Converted from casual disclosure interest to consciousness exploration engagement

### Journey 2: Contactee Explorer

> "I had an experience and want to find others like me."

1. Arrives via Google: "alien abduction experiences" → lands on `/uap/encounters/`
2. Filters by entity type (e.g., "mantis/insectoid") or experience type
3. Finds a video matching their experience, watches it
4. Opens `/uap/chat/` and asks: "What do people report about ongoing contact with mantis beings?"
5. Chat returns relevant transcript excerpts with timestamps from multiple videos
6. Browses contactee profiles of others with recurring experiences
7. Sees radar chart comparison of their experience type vs. others
8. **Outcome:** Feels validated, discovers community of similar experiencers, engages deeply

### Journey 3: Researcher

> "I want to analyze patterns in UAP contact reports."

1. Arrives at `/uap/encounters/` and filters by evidence score > 15
2. Sorts by transformation score to find high-impact cases
3. Opens several video detail pages, reviews Triad breakdowns
4. Searches "multi-witness UFO encounter physical trace evidence"
5. Uses timeline at `/uap/program/timeline/` to correlate program events with contact waves
6. **Outcome:** Uses platform as primary research tool, returns regularly

---

## 8. MVP Scope

### In V1 (This PRD)

- All `/uap/*` routes listed in Section 5
- Content classifier pipeline (assigns tier + content_type to all 4,195 videos)
- Punctuation pipeline run on all UAP videos
- Triad analysis pipeline for Tier 1 encounters
- Knowledge extraction pipeline for Tier 2 program content
- UAP-scoped chat
- UAP-scoped search
- UAP channels and channel detail
- Contactee profiles for recurring experiencers
- Person pages for prominent disclosure figures
- Disclosure timeline (basic)
- UAP Big Questions (5-10 seed questions)
- UAP Blog (3-5 launch posts)
- Domain accent colors (violet-600 encounters, slate-500 program)

### Explicitly NOT in V1

- Cross-domain comparison engine (`/compare/`)
- Cross-domain chat (unified RAG across NDE + UAP)
- Hub homepage redesign
- NDE route migration to `/nde/`
- Unified cross-domain search
- Hashtag-based ingestion (#alienabduction scraping)
- New channel ingestion (Mantis Encounters, Preston Dennett, etc.)
- Experience fingerprint matching ("Match My Experience")
- Social media accounts or newsletter
- Community features (comments, forums, user submissions)
- Psychedelic, OBE, Psi, STE verticals
- Any changes to existing NDE routes or homepage

---

## 9. Success Metrics (KPIs)

### Launch Gate (required before public announcement)

| Metric | Target |
|--------|--------|
| Tier 1 videos with complete Triad analysis | ≥ 100 |
| Tier 2 videos with knowledge extraction | ≥ 200 |
| All 4,195 videos classified (tier assigned) | 100% |
| All UAP videos punctuated | 100% |
| UAP search returns results in < 3s | ✅ |
| All routes render correctly (mobile + desktop) | ✅ |
| Content safety review passed | ✅ |
| NDE regression: existing routes (`/`, `/explore`, `/chat`, `/search`) function identically | ✅ |

### 30-Day Post-Launch

| Metric | Target |
|--------|--------|
| UAP page unique visitors | ≥ 1,000 |
| UAP search queries / day | ≥ 50 |
| UAP chat sessions / day | ≥ 20 |
| Avg. session duration on UAP pages | ≥ 3 min |
| UAP blog post organic impressions | ≥ 5,000 |
| Bounce rate on UAP landing | < 60% |
| Avg. chat conversation depth | ≥ 4 messages/session |
| Track 2 → Track 1 bridge conversion (program → encounters) | ≥ 10% of program sessions |

### 90-Day Post-Launch

| Metric | Target |
|--------|--------|
| UAP monthly unique visitors | ≥ 5,000 |
| UAP content indexed by Google | ≥ 500 pages |
| Returning visitor rate | ≥ 25% |
| Cross-referral (UAP → NDE pages) | ≥ 5% of UAP sessions |
| Track 2 → Track 1 bridge (sustained) | ≥ 15% of program sessions |

---

## 10. Schema Additions

### `uap_analysis` Table

```sql
CREATE TABLE uap_analysis (
  video_id TEXT PRIMARY KEY REFERENCES uap_vids(video_id),
  content_type TEXT NOT NULL,           -- first_person, retold_story, research_analysis, program_disclosure
  tier SMALLINT NOT NULL DEFAULT 2,     -- 1, 2, or 3

  -- Triad Axis 1: Evidence (Tier 1 only)
  evidence_score SMALLINT,             -- 0-28 (UAP-ESS)
  evidence_breakdown JSONB,

  -- Triad Axis 2: Experience (Tier 1 only)
  hynek_type TEXT,                     -- CE1, CE2, CE3, CE4, CE5, NL, DD
  vallee_type TEXT,                    -- AN1-5, MA1-5, FB1-3
  contact_depth_score SMALLINT,        -- 0-28
  contact_depth_breakdown JSONB,

  -- Triad Axis 3: Impact (Tier 1 only)
  transformation_score INTEGER,        -- 0-50 (same NDE-TI)
  transformation_breakdown JSONB,

  -- Shared phenomenological dimensions (Tier 1 only)
  experience_type TEXT,
  phenomenology JSONB,
  entities JSONB,
  overall_tone TEXT,
  physical_effects JSONB,
  technology_described JSONB,
  message_content JSONB,
  recurrence_pattern TEXT,             -- one-time, periodic, ongoing
  witness_count INTEGER,
  evidence_types TEXT[],               -- photo, video, radar, physical_trace

  -- Track 2 fields (Tier 2 program/disclosure)
  people_mentioned JSONB,
  programs_mentioned JSONB,
  claims JSONB,
  consciousness_connections JSONB,     -- Bridge points to experiencer content
  timeline_events JSONB,

  -- Content safety
  content_safety JSONB,

  -- Fingerprint for future cross-domain comparison (Tier 1 only)
  experience_fingerprint vector(1536),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_uap_analysis_content_type ON uap_analysis(content_type);
CREATE INDEX idx_uap_analysis_tier ON uap_analysis(tier);
CREATE INDEX idx_uap_analysis_hynek ON uap_analysis(hynek_type);
CREATE INDEX idx_uap_analysis_evidence ON uap_analysis(evidence_score);
CREATE INDEX idx_uap_analysis_transformation ON uap_analysis(transformation_score);
```

### `uap_channels` Table

```sql
CREATE TABLE uap_channels (
  channel_id TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  track TEXT NOT NULL DEFAULT 'mixed',  -- encounters, program, mixed
  description TEXT,
  thumbnail_url TEXT,
  video_count INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `uap_contactee_profiles` Table

```sql
CREATE TABLE uap_contactee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  summary TEXT,
  bio TEXT,
  video_ids TEXT[] NOT NULL DEFAULT '{}',
  channel_ids TEXT[] DEFAULT '{}',
  experience_type TEXT,                -- contact, abduction, CE-5, ongoing, mixed
  entity_types TEXT[] DEFAULT '{}',
  recurrence TEXT,                     -- one-time, periodic, ongoing
  core_themes TEXT[] DEFAULT '{}',
  avg_evidence_score NUMERIC(5,2),
  avg_contact_depth NUMERIC(5,2),
  avg_transformation_score NUMERIC(5,2),
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_uap_contactee_slug ON uap_contactee_profiles(slug);
```

### Column Addition to `uap_vids`

```sql
ALTER TABLE uap_vids
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS tier SMALLINT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'program';  -- encounters, program
```

---

## 11. Pipeline Requirements

### 11.1 Content Classifier (Priority: First)

Classifies all 4,195 existing UAP videos by content_type and tier. Must run before analysis pipelines.

- **Input:** Video title, description, channel, transcript (first 2000 chars)
- **Output:** `content_type` (first_person, retold_story, research_analysis, program_disclosure, out_of_scope), `tier` (1/2/3), `track` (encounters/program)
- **Method:** LLM classification with structured output (Claude, JSON forced via assistant prefill per LEARNINGS.md)
- **Volume:** 4,195 videos, batch processing
- **Constraint:** Must respect Cloud Run 300s / Cloudflare 100s limits. Use async job pattern.

### 11.2 Punctuation Pipeline

Run existing punctuation pipeline on all UAP videos (currently 0% punctuated).

- **Input:** `uap_vids.raw_timestamped_subtitles`
- **Output:** Punctuated, properly formatted transcripts in `uap_embeddings` or equivalent
- **Volume:** 4,195 videos
- **Note:** Reuse existing NDE punctuation pipeline code. Track via `timestamped_punctuation_status` column.

### 11.3 Triad Analysis Pipeline (Tier 1 Only)

Scores first-person encounters across Evidence, Experience, and Impact axes.

- **Input:** Full punctuated transcript + video metadata
- **Output:** All Triad fields in `uap_analysis` table
- **Method:** LLM analysis with domain-specific prompts and structured output schemas
- **Scales:** UAP-ESS (Evidence, 0-28), Contact Depth (Experience, 0-28) + Hynek/Vallee classification, NDE-TI (Impact, 0-50)
- **Volume:** Estimated 200-500 Tier 1 videos (after classification)
- **Generates:** `experience_fingerprint` vector for future comparison

### 11.4 Knowledge Extraction Pipeline (Tier 2)

Extracts structured knowledge from program/disclosure content.

- **Input:** Full punctuated transcript + video metadata
- **Output:** `people_mentioned`, `programs_mentioned`, `claims`, `consciousness_connections`, `timeline_events` in `uap_analysis`
- **Volume:** Estimated 2,000-3,000 Tier 2 videos
- **Critical field:** `consciousness_connections` identifies bridge points from Track 2 to Track 1

### Pipeline Execution Order

1. Content Classifier (all 4,195 videos)
2. Punctuation Pipeline (all 4,195 videos, can run in parallel with classifier)
3. Triad Analysis (Tier 1 videos only, after classification + punctuation)
4. Knowledge Extraction (Tier 2 videos, after classification + punctuation)

---

## 12. Content Safety

### Sensitivity Considerations

UAP content carries unique safety concerns beyond NDE content:

- **Trauma:** Abduction/contact experiences can involve trauma, fear, and distress
- **Mental health:** Some experiencers face stigma, relationship loss, or mental health challenges
- **Misinformation:** Disclosure space contains conspiracy theories and unverified claims
- **Privacy:** Some contactees wish to remain anonymous

### Safety Implementation

- [ ] Content safety JSONB field in `uap_analysis` flags sensitive content (trauma, distressing imagery descriptions, conspiracy-adjacent claims)
- [ ] Video detail pages show content warnings where flagged
- [ ] Chat system prompt includes: do not diagnose, do not confirm/deny reality of experiences, maintain compassionate neutrality, flag crisis resources for distressed users
- [ ] Contactee profiles support anonymous/pseudonymous display names
- [ ] Claims from Track 2 content display with source attribution, not as verified facts
- [ ] Timeline events from disclosure content labeled as "claimed" or "confirmed" based on evidence level
- [ ] Editorial boundary enforced: consciousness experiences only, no cryptids/true crime/ghost hunting

---

## 13. Shared Component Reuse

Target ~80% component reuse from existing NDE pages:

| Component | NDE Version | UAP Adaptation |
|-----------|------------|----------------|
| `<YouTubePlayer>` | Existing | No changes |
| `<TimestampLink>` | Existing | No changes |
| `<ChatInterface>` | NDE chat | Add `ragSource` config prop for domain scoping |
| Video card grid | `/explore` | New filter options (Hynek type, evidence score) |
| Video detail layout | `/video/[id]` | Swap NDE scores for Triad scores panel |
| Channel list/detail | `/channels`, `/channel/[id]` | Add track badge (encounters/program) |
| Experiencer profile | `/experiencer/[id]` | Rename fields, add UAP-specific data |
| Blog post layout | `/blog/[slug]` | No changes (content differs) |
| Questions layout | `/questions/[slug]` | No changes (content differs) |
| Search results | `/search` | Add tier labels, domain scoping |
| Radar chart | NDE scores | Reconfigure for 5-axis UAP dimensions |

**New components (UAP-specific):**
- Triad scores panel (Evidence + Experience + Impact breakdown)
- Hynek/Vallee classification badges
- Knowledge extraction panel (people, programs, claims, timeline)
- Disclosure timeline visualization
- Person page layout
- Content safety warning banner

---

## 14. Design & Theming

### Domain Accent Colors

| Context | Color | Usage |
|---------|-------|-------|
| Encounters (Track 1) | `violet-600` | Cards, badges, accent borders, radar chart |
| Program (Track 2) | `slate-500` | Cards, badges, accent borders |
| UAP landing | Gradient violet → slate | Hero section |

### Implementation

- All colors via CSS custom properties in `globals.css` (per LEARNINGS.md token system)
- UAP layout.tsx sets domain-specific CSS variables
- Dark mode variants required for all accent colors (`dark:` prefix)
- No hardcoded colors (per LEARNINGS.md)

### Typography & Layout

- Same font stack as NDE (Crimson Pro + Inter)
- Same spacing, card, and grid patterns
- UAP section distinguished by accent color, not layout divergence

---

## 15. SEO Strategy

### URL & Title Convention

- URLs: `/uap/` prefix (credible, government-standard)
- Titles: "UFO & UAP [topic] | Project Profound" (captures both search terms)
- Meta descriptions: Include both "UFO" and "UAP" terms

### Target Keywords

| Category | Keywords |
|----------|----------|
| Encounters | "alien abduction experiences", "UFO contact reports", "CE-5 encounters", "mantis being encounters" |
| Program | "government UAP program", "UFO disclosure timeline", "AATIP AAWSAP", "Luis Elizondo testimony" |
| Cross-cutting | "UAP witness testimony", "UFO experiencer accounts", "consciousness UFO connection" |

### Technical SEO

- [ ] `generateMetadata` on all UAP routes with domain-specific titles and descriptions
- [ ] `generateStaticParams` for video, channel, contactee, person, and question pages
- [ ] JSON-LD structured data (VideoObject for videos, Person for contactees/program figures)
- [ ] Sitemap inclusion for all UAP routes
- [ ] Canonical URLs to prevent duplicate content

---

## 16. Technical Constraints (from LEARNINGS.md)

These existing constraints apply to all UAP development:

1. **Server-First Fetching** — Fetch in Server Components, pass as props
2. **Click-to-Play YouTube** — Use `<YouTubePlayer>`, never raw iframes
3. **Timestamp Links** — Use `<TimestampLink>` for in-video seeking
4. **Image Optimization** — Next.js `<Image>`, `hqdefault`, max 12 per grid page
5. **Dark Mode** — All colors via tokens, no hardcoded colors
6. **Cloud Run Timeouts** — Async job pattern for pipelines > 100s
7. **Static Generation** — `generateStaticParams`/`generateMetadata` use anon/service client
8. **Claude JSON** — Assistant prefill for structured output
9. **GIN Index RPCs** — PL/pgSQL with IF/ELSE for search functions
10. **Soft-Delete Channels** — `hidden` flag, not RPC filtering

---

## Gate 1 Checklist

- [x] Core features defined with acceptance criteria (Sections 4, 6)
- [x] User journeys mapped (Section 7)
- [x] MVP scope bounded with explicit "not in V1" list (Section 8)
- [x] Success metrics defined (Section 9)
- [ ] **User approved PRD**
