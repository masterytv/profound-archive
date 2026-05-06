# Discovery: Multi-Domain Consciousness Exploration Platform

> **Phase 0 | Project Profound Expansion | Claude Analysis**
> Researched: 2026-05-05 | Status: ✅ APPROVED
> Synthesizes Claude research + Gemini analysis (`DISCOVERY-GEMINI.md`) + user feedback.

---

## Executive Summary

Project Profound has a unique opportunity to become **the** data-driven consciousness exploration platform. The cultural moment (UAP disclosure, psychedelic mainstreaming, AI consciousness debate, post-pandemic meaning-seeking) is unprecedented. Our existing infrastructure (5,000+ analyzed NDEs, 200K+ embeddings, validated scales, RAG chat, blog pipeline) gives us a massive head start.

**Key recommendations:**
1. **Single site, subfolder architecture** (`/nde/`, `/ufo/encounters/`, `/ufo/program/`, `/psychedelics/`)
2. **Single database, parallel tables** (extend existing `uap_vids`/`uap_embeddings` pattern)
3. **Unified brand, segmented messaging** ("Project Profound" umbrella, domain-specific entry points)
4. **UFO vertical first** with dual-track content (4,195 videos already ingested, 555K embeddings ready)
5. **Three core product capabilities:** timestamped semantic search (all content) + validated analysis (first-person only) + AI chat (domain-scoped + cross-domain)

---

## The Three Core Product Capabilities

Every piece of content on the platform serves at least one of these capabilities:

### Capability 1: Timestamped Semantic Search (All Content)
Find exact moments in any video. "Thomas Townsend Brown" in a UAP program documentary. "Machine elves" in a psychedelic trip report. "Shame in a life review" in an NDE account. "Navy experiments" in a remote viewing discussion. "Mindsight" in a psi research interview.

This works across ALL video content regardless of type. It is the universal feature.

### Capability 2: Validated Analysis & Comparison (First-Person Experiences Only)
Score each first-person account against domain-specific validated scales. Compare phenomenology across domains. Generate "consciousness fingerprints." This only applies to videos where someone is describing their own experience.

### Capability 3: AI Chat — Compassionate Exploration (Domain-Scoped + Cross-Domain)
Conversational AI that draws on the full transcript corpus to answer questions, surface connections, and guide exploration. Currently exists for NDEs using `nde_chatbot_chunks` (379K chunks, 6.8 GB).

**The architecture decision: domain-scoped, unified, or both?**

| Approach | Pros | Cons |
|----------|------|------|
| **Domain-scoped only** (chat on each section) | Best retrieval quality (no cross-domain noise). Domain-appropriate system prompt and tone. Simpler RAG. | Can't do cross-domain comparisons. User must know which domain to ask. |
| **Unified only** (one chat for everything) | Cross-domain queries work naturally ("how do NDE entities compare to UAP entities?"). Single entry point. Embodies the convergence thesis. | Larger context pool = lower signal-to-noise. Harder to maintain domain-appropriate tone. More tokens per query. |
| **Both** (recommended) | Best of both worlds. Contextual chat in each section + an "Explorer" chat for cross-domain questions. | More prompts to maintain (though the component is identical, just different RAG config). |

**Recommendation: Both.** Same chat component, different RAG source configuration per route:

| Location | RAG Source | System Prompt Flavor | Example Query |
|----------|-----------|---------------------|---------------|
| `/nde/chat` | `nde_chatbot_chunks` | Compassionate NDE guide | "What do experiencers say about the life review?" |
| `/ufo/chat` | `uap_embeddings` | Curious UAP researcher | "What do contactees report about telepathic communication?" |
| `/chat` (main nav) | Unified view across ALL embedding tables | Consciousness explorer | "How do entity descriptions compare across NDEs, UFO contact, and DMT?" |
| `/compare/` page | Unified + analysis data | Cross-domain analyst | "What's the average transformation score for CE-5 vs. deep NDE?" |

This is architecturally simple: one `<ChatInterface>` component that accepts a `ragSource` config prop. The RAG API endpoint accepts a `domain` parameter that determines which embedding tables to query (single domain table, or the UNION view for cross-domain).

**The cross-domain chat IS the conversational version of the comparison engine.** It's the same thesis ("these experiences are connected") delivered through a different modality — some users prefer radar charts, others prefer asking questions.

### Editorial Boundary

> **Project Profound explores consciousness through first-person extraordinary experiences.** We include any experience domain where the core phenomenon involves a subjective alteration of consciousness (NDEs, UAP contact, psychedelics, OBEs, psi). We exclude phenomena that are primarily observational/physical without a consciousness component (cryptids, true crime, conventional ghost hunting).

### The Three-Tier Content Hierarchy

Not all content gets the same treatment. The classifier assigns every video to a tier that determines which capabilities it feeds:

| Tier | Content Type | Search | Chat | Analysis | Compare | Example |
|------|-------------|--------|------|----------|---------|--------|
| **Tier 1** | First-person account (experiencer speaking) | ✅ | ✅ | ✅ Full Triad | ✅ | "I was taken aboard..." told by the person it happened to |
| **Tier 2** | Retold stories, research, disclosure, analysis | ✅ | ✅ | ❌ (knowledge extraction only) | ❌ | Narrator repackaging accounts, researcher analyzing cases, disclosure testimony |
| **Tier 3** | Out of scope (non-consciousness phenomena) | ❌ | ❌ | ❌ | ❌ | Bigfoot, true crime, ghost hunting entertainment |

**Why Tier 2 stays in search/chat but not analysis:**
- Retelling channels often organize experiences by entity type or theme — valuable for search discovery
- Chat RAG benefits from more context (retellings add detail even if they're not scoreable)
- But you can't score a transformation index on a narrator's retelling — analysis stays pure with Tier 1 only
- Brand claim: "X,000 AI-analyzed first-person accounts" — clean, credible, not inflated by retellings

**UI differentiation:** Tier 2 results in search should show a subtle label ("Research" or "Retold Account") and rank below Tier 1 by default, with a toggle to include/exclude.

---

## A. Architecture Recommendation

### Site Structure: Single Site with Domain Sections (Subfolders)

`projectprofound.org/nde/...`, `projectprofound.org/ufo/...`, etc.

**Why this wins:**

| Factor | Subfolder (Recommended) | Subdomain | Separate Sites |
|--------|------------------------|-----------|----------------|
| **SEO authority** | All backlinks compound on one domain | Treated as semi-independent by Google | Start from zero each time |
| **Dev cost** | Shared components, one deploy | Multiple Next.js configs or complex routing | N codebases to maintain |
| **Auth/users** | Single Supabase Auth, one session | Complex SSO needed | Totally separate accounts |
| **Cross-domain search** | Single API, single embedding space | Requires cross-origin coordination | Application-layer joins |
| **Code reuse** | ~80% shared (cards, search, chat, admin) | ~60% shared (needs separate deploys) | ~40% shared (npm packages) |
| **Adding domain #6** | Add a route folder + config | New subdomain + deploy config | New site + hosting + domain |
| **Brand coherence** | Natural discovery flow | Feels like separate products | Brand confusion guaranteed |

**Naming convention:** URLs use `/uap/` (credible, government-standard, future-proof). All visible text, titles, and meta descriptions use "UFO/UAP" to capture both search terms. Example: URL `/uap/encounters/` → page title "UFO & UAP Encounter Reports | Project Profound".

**Implementation approach:**
```
src/app/
  page.tsx                    # UNCHANGED during dev (current NDE homepage)
                              # Eventually becomes /nde/ homepage when hub launches

  # --- NDE (stays at root, untouched during UAP build) ---
  explore/                    # NDE browse/filter
  video/[id]/                 # NDE video detail
  experiencer/[id]/           # NDE experiencer profile
  channel/[id]/               # NDE channel page
  channels/                   # NDE channel list
  chat/                       # NDE-scoped chat
  questions/                  # NDE "Big Questions"
  blog/                       # NDE-specific blog
  search/                     # NDE search (current)
  scale/                      # NDE scale explainer

  # --- UAP (new, all new routes) ---
  uap/
    encounters/               # First-person UFO/UAP contact (Tier 1)
      explore/
      video/[id]/
      experiencer/[id]/       # Recurring contactee profiles
    program/                  # Government programs, disclosure (Tier 2)
      explore/
      video/[id]/
      person/[name]/          # Knowledge graph (Elizondo, Grusch, etc.)
      timeline/               # Navigable disclosure timeline
    channels/                 # UAP channel list
    channel/[id]/             # UAP channel page
    chat/                     # UAP-scoped chat
    questions/                # UAP "Big Questions"
    blog/                     # UAP-specific blog

  # --- Future domains ---
  psychedelics/               # First-person accounts
  obe/                        # First-person accounts
  psi/                        # Remote viewing, telepathy, psi research

  # --- Cross-domain (root level, future) ---
  compare/                    # Cross-domain comparison engine
  search/                     # Unified search across ALL content (with domain filters)
  # blog/consciousness/       # Future: cross-domain consciousness blog
  # page.tsx (hub)            # Future: replaces NDE homepage at root
```

**Development approach:** Build `/uap/` routes as purely additive — zero changes to existing NDE routes or homepage. The current homepage stays untouched until the hub launch phase.

**Migration sequence (future):**
1. Build `/uap/` (now) — additive, no risk
2. Build hub homepage + `/compare/` + unified `/search/` — new root pages
3. Move NDE to `/nde/` — 301 redirects from old URLs, swap current homepage to hub

### Database Structure: Single Database, Parallel Tables

Keep `nde_vids`, `uap_vids`, add future domain tables as needed.

**Why this wins:**

| Factor | Shared Schema | Parallel Tables (Rec.) | Separate DBs |
|--------|--------------|----------------------|--------------|
| **Migration from current** | Massive refactor of 5K+ rows + all RPCs | Zero migration (pattern exists) | Move data between projects |
| **Schema evolution** | Every domain change affects all | Each domain evolves independently | Independent but complex ops |
| **Cross-domain queries** | Simple WHERE clause | UNION views (moderate) | Application-layer joins (hard) |
| **Embedding search** | One index (fast) | Multiple indexes via UNION (moderate) | Cross-project API calls (slow) |
| **Cost** | One project ($25/mo) | One project ($25/mo) | N x $25/mo |

**Current database reality:**

| Metric | Value |
|--------|-------|
| Total DB size | **27 GB** |
| Pro plan included | 8 GB |
| Overage rate | $0.125/GB |
| Current overage cost | ~$2.38/mo |
| NDE embeddings | 15 GB (865K rows) |
| NDE chatbot chunks | 6.8 GB (379K rows) |
| UAP embeddings | 4.5 GB (555K rows) |

Each new domain with ~4K videos and embeddings adds ~5 GB. Must disable spend cap and budget accordingly.

**Cross-domain query strategy:**
```sql
CREATE VIEW all_experiences AS
  SELECT video_id, 'nde' AS domain, title, ... FROM nde_vids
  UNION ALL
  SELECT video_id, 'ufo' AS domain, title, ... FROM uap_vids;

CREATE VIEW all_embeddings AS
  SELECT id, video_id, 'nde' AS domain, content, embedding FROM nde_punctuated_embeddings
  UNION ALL
  SELECT id, video_id, 'ufo' AS domain, content, embedding FROM uap_embeddings;
```

---

## B. UFO Vertical Blueprint

### Dual-Track Content Strategy

The UAP vertical serves two audiences with two content types, unified by the consciousness thesis.

#### Track 1: First-Person Encounters (`/ufo/encounters/`)
Videos where someone describes their own UFO/NHI experience (sighting, contact, abduction, CE-5, ongoing communication). Gets the full Triad Analysis pipeline (see below). Feeds the cross-domain comparison engine.

**Target channels:** Preston Dennett, experiencer interviews from That UFO Podcast, Danny Jones, community-submitted accounts.

#### Track 2: Disclosure & Consciousness Research (`/ufo/program/`)
Investigative and documentary content about the legacy UFO program, government coverups, technology analysis, whistleblower testimony, and the consciousness-craft connection. Gets a different analysis pipeline focused on knowledge extraction.

**Target channels (already ingested):**
- UAP Gerb (51 videos) - detailed government program analysis
- American Alchemy / Jesse Michels (329 videos) - investigative journalism
- Richard Dolan (841 videos) - program history and analysis
- Jeremy Corbell (367 videos) - disclosure focus
- Lehto Files (698 videos) - news/analysis mix

**The Consciousness Bridge:** Many program/disclosure videos contain moments where the discussion touches psi, consciousness-craft interfaces, remote viewing, CE-5, or telepathy. These moments are the on-ramps from Track 2 (attractor content) to Track 1 (core phenomenology product) and to the broader consciousness exploration thesis.

```
Audience Funnel:

"Are UFOs real?" / "Government UFO coverup" (Google/YouTube)
    --> /ufo/program/ (Government programs, disclosure, technology)
        --> "Wait, these craft respond to consciousness?"
            --> /ufo/encounters/ (First-person CE-5, telepathic contact)
                --> "This sounds like what NDE experiencers describe..."
                    --> /compare/ (Cross-domain comparison engine)
                        --> Core product engagement + community
```

### Current State (Already in Database)

| Asset | Status | Count |
|-------|--------|-------|
| `uap_vids` table | Populated | 4,195 videos |
| `uap_embeddings` table | Populated, all with vectors | 555,817 chunks |
| Punctuation pipeline | Not run | 0% punctuated |
| Analysis pipeline | Not built | No UAP-specific analysis |
| Frontend | Not built | No UFO pages |

**Existing channels:**
- Richard Dolan (841) - Researcher/analyst → Track 2
- Eyes On Cinema (738) - Archive footage + testimony → Mixed
- Lehto Files (698) - News/analysis → Track 2
- Jeremy Corbell (367) - Disclosure → Track 2
- Dr. Steven Greer (350) - CE-5, disclosure → Mixed
- Jesse Michels (329) - Long-form interviews → Track 2
- Stellar Productions (286) - Mixed content
- UAP Gerb (51) - Detailed program analysis → Track 2
- Others (535 total)

### Channels to Add (First-Person Focus for Track 1)

- **Mantis Encounters** ([@MantisEncounters-n8l](https://www.youtube.com/@MantisEncounters-n8l)) - First-person mantis/insectoid entity encounter accounts → Track 1
- **Paranormal Spirituality** — [Alien Abduction True Stories playlist](https://www.youtube.com/playlist?list=PLIS23o4q1kqRqjJstj9RUUAR0yMFjcCGH) - First-person abduction accounts (playlist-based ingest) → Track 1
- **Preston Dennett** - Hundreds of firsthand UFO/entity contact case studies
- **That UFO Podcast** (Andy McGrillen) - Regular experiencer interviews
- **Engaging The Phenomenon** - (Gemini recommendation, needs investigation)
- **Experiencer channels** from r/Experiencers, r/UFOs communities
- **MUFON witness testimony** videos
- **Danny Jones** - Deep long-form experiencer interviews
- **The Why Files** - Well-researched case studies, high production value

### Hashtag-Based Ingestion (New Discovery Pattern)

Beyond channel-based scanning, YouTube hashtags offer a massive pool of first-person encounter content that isn't concentrated in any single channel.

| Hashtag | Est. Videos | Ingest Target | Content Type |
|---------|-------------|---------------|--------------|
| [`#alienabduction`](https://www.youtube.com/hashtag/alienabduction) | ~22,000 | Top 5,000 by popularity | Mostly Track 1 (first-person) |
| *Future:* `#nde`, `#neardeathexperience` | TBD | TBD | Track 1 |
| *Future:* `#ufocontact`, `#ce5` | TBD | TBD | Track 1 |
| *Future:* `#dmttrip`, `#ayahuasca` | TBD | TBD | Track 1 (psychedelics domain) |
| *Future:* `#outofbodyexperience`, `#astral` | TBD | TBD | Track 1 (OBE domain) |

**Pipeline implication:** Hashtag results are noisier than curated channels. The content classifier becomes critical here — many results will be clickbait, compilations, reactions, or debunking videos rather than genuine first-person accounts. The classifier must run early in the pipeline (before expensive embedding/analysis) to filter aggressively.

**Technical note:** The existing channel scanner discovers videos by channel. Hashtag-based discovery requires a new ingestion path: YouTube hashtag search API → deduplicate against existing `uap_vids` → classify → ingest. This is a pipeline extension, not a replacement.

### Content Classifier

Each video gets classified into a content type and assigned to a tier. The classifier should run early in the pipeline (before expensive embedding) to skip Tier 3 content.

| Type | Tier | Description | Pipeline | Route |
|------|------|-------------|----------|-------|
| `first_person` | 1 | Experiencer describing their own experience | Full: embed → punctuate → Triad analysis → fingerprint | `/ufo/encounters/` |
| `retold_story` | 2 | Narrator repackaging others' experiences | Embed → punctuate → search/chat only | `/ufo/encounters/` (labeled) |
| `research_analysis` | 2 | Researchers discussing cases or theory | Embed → punctuate → knowledge extraction → search/chat | `/ufo/program/` or `/ufo/encounters/` |
| `program_disclosure` | 2 | Government programs, whistleblowers, hearings | Embed → punctuate → knowledge extraction → search/chat | `/ufo/program/` |
| `psi_research` | 2 | Remote viewing, CE-5, psi research | Embed → punctuate → search/chat | `/psi/` (future) |
| `out_of_scope` | 3 | Cryptids, true crime, ghost hunting, non-consciousness content | **Skip entirely** (no embed, no storage) | — |

### Analysis Framework: The Triad Architecture

(Adopted from Gemini analysis for its architectural elegance. Enables clean cross-domain symmetry.)

For **first-person encounters only**, every domain is analyzed across three parallel axes:

#### Axis 1: Evidence (How well-corroborated is this?)
- **NDE equivalent:** Revised Veridical NDE Scale (cvNDE, 0-28)
- **UAP equivalent:** UAP Evidence Strength Scale (UAP-ESS), adapted from Vallee's SVP Credibility Index (Source reliability, Site Visit, Probability). Scores multi-witness corroboration, physical/trace evidence, sensor data, source reliability.

#### Axis 2: Experience (What happened and how strange was it?)
- **NDE equivalent:** Greyson NDE Scale (0-32)
- **UAP equivalent:** Vallee Classification (CE1-CE5, FB, MA, AN) + Contact Depth Scale (0-28). Seven dimensions: Proximity, Duration, Communication, Physical effects, Information transfer, Witness corroboration, Evidence artifacts.

#### Axis 3: Impact (How did it change the person?)
- **NDE equivalent:** NDE-TI (0-50)
- **UAP equivalent:** Same NDE-TI scale, reused directly. The FREE Survey validates that UAP contactees undergo identical spiritual and value shifts as NDE experiencers.

### Track 2 Analysis Pipeline (Program/Disclosure Content)

Different from the Triad. Focused on knowledge extraction:

- **People mentioned** (build knowledge graph: Elizondo, Grusch, Puthoff, Davis, etc.)
- **Programs mentioned** (AATIP, AAWSAP, MJ-12 claims, Stargate, etc.)
- **Claims made** (with confidence/corroboration scoring)
- **Technology described** (propulsion, materials, reverse engineering)
- **Consciousness connections** (psi, remote viewing, consciousness-craft interface, telepathy) - these are the Track 2 to Track 1 bridge points
- **Timeline events** (build navigable disclosure timeline)

### Cross-Domain Phenomenological Dimensions

10 shared dimensions across all experience types (used in comparison engine):

| Shared Dimension | NDE | UFO | Psychedelic | OBE |
|-----------------|-----|-----|-------------|-----|
| Light phenomena | Tunnel/light | Craft lights | Visual patterns | Rare |
| Entity encounters | Beings of light | NHI/aliens | "Machine elves" | Guides |
| Time distortion | Life review | Missing time | Eternity | Timelessness |
| Ineffability | Strong | Strong | Strong | Strong |
| Out-of-body | Core feature | Some reports | Rare | Core feature |
| Information download | Universal knowledge | "Messages" | Noetic quality | Rare |
| Transformation | Life changes | Worldview shift | Personality change | Moderate |
| Fear/peace spectrum | Peace dominant | Mixed | Mixed | Mixed |
| Telepathy | With entities | With NHI | Rare | Rare |
| Physical aftereffects | Some | Strong | Integration period | Minimal |

For radar chart visualization, collapse to 5 axes (Gemini's suggestion): Transformation, Intensity, Ineffability, Positive Tone, Entity Presence.

### Schema Additions

```sql
-- Track 1: First-person encounter analysis (mirrors nde_analysis)
CREATE TABLE uap_analysis (
  video_id TEXT PRIMARY KEY REFERENCES uap_vids(video_id),
  -- Content type classification
  content_type TEXT,  -- first_person_encounter, program_investigation, researcher_analysis, etc.
  -- Triad Axis 1: Evidence
  evidence_score SMALLINT,       -- 0-28 (UAP-ESS)
  evidence_breakdown JSONB,
  -- Triad Axis 2: Experience
  hynek_type TEXT,               -- NL, DD, CE1-CE5
  vallee_type TEXT,              -- AN1-5, MA1-5, FB1-3
  contact_depth_score SMALLINT,  -- 0-28
  contact_depth_breakdown JSONB,
  -- Triad Axis 3: Impact
  transformation_score INTEGER,  -- 0-50 (same NDE-TI scale)
  transformation_breakdown JSONB,
  -- Shared dimensions (enables cross-domain comparison)
  experience_type TEXT,
  phenomenology JSONB,
  entities JSONB,
  overall_tone TEXT,
  content_safety JSONB,
  -- UAP-specific fields
  physical_effects JSONB,
  technology_described JSONB,
  message_content JSONB,
  recurrence_pattern TEXT,       -- one-time, periodic, ongoing
  witness_count INTEGER,
  evidence_types TEXT[],         -- photo, video, radar, physical_trace
  -- Track 2 fields (populated for program/disclosure content)
  people_mentioned JSONB,        -- Knowledge graph entries
  programs_mentioned JSONB,      -- AATIP, AAWSAP, etc.
  claims JSONB,                  -- Extracted claims with confidence
  consciousness_connections JSONB, -- Bridge points to experiencer content
  timeline_events JSONB,         -- Date-tagged events
  -- Fingerprint for cross-domain comparison (Track 1 only)
  experience_fingerprint vector(1536)
);
```

---

## C. Marketing Strategy

### Recommendation: Unified Brand, Segmented Messaging

**Keep "Project Profound" as the umbrella brand.**

1. **Brand permission exists.** "Profound" is domain-agnostic. NDEs are profound. UFO contact is profound. A DMT breakthrough is profound.
2. **The cross-domain thesis IS the brand.** The viral hook is "we analyzed thousands of extraordinary experiences across domains and found [surprising pattern]." Separate brands cannot tell that story.
3. **SEO compounds.** One domain building authority on "consciousness," "what happens when you die," "are UFOs real" creates a topical authority moat.
4. **Disclosure content is the top-of-funnel.** UAP program content attracts a massive audience already searching. The consciousness connection bridges them to the core product.

**Tagline evolution:**
- Current: "Archive of the Extraordinary"
- Proposed: **"Mapping the Extraordinary"** or **"Where Extraordinary Experiences Meet Data"**

### Messaging by Audience

| Segment | Hook | Tone | Primary Channel |
|---------|------|------|-----------------|
| **SBNR** (Spiritual But Not Religious) | "What if NDEs, UFO contact, and psychedelic breakthroughs are windows into the same reality?" | Warm, wonder-filled | Instagram, TikTok, podcasts |
| **SBO** (Scientific But Open) | "The largest data-driven analysis of anomalous experience reports" | Evidence-based, measured | X/Twitter, Substack, conferences |
| **MST** (Meaning-Seekers in Transition) | Direct answers to their search queries | Compassionate, no jargon | Google SEO, YouTube, Reddit |
| **Disclosure Community** (NEW) | "Every UAP program mention, searchable to the second" | Investigative, thorough | Reddit r/UFOs, X/Twitter, podcasts |

### Content Strategy

- **Blog:** Unified, tagged by domain. Cross-domain comparison articles are highest-value content. Disclosure timeline articles attract the UFO audience.
- **Social:** Start with ONE account. Mix: 35% NDE, 25% UFO disclosure, 20% cross-domain comparisons, 10% UFO encounters, 10% psychedelics/OBE/psi teasers.
- **Newsletter:** Segment by interest at signup. Domain-specific content + monthly cross-domain digest.
- **SEO:** Target cross-domain long-tail keywords AND high-volume disclosure keywords.

### Brand Identity Evolution

Current brand (Crimson Pro + Inter, blue-600 primary) scales well. Add domain accent colors:

| Domain | Accent | Rationale |
|--------|--------|-----------|
| NDE | Blue-600 (keep) | Established, transcendent |
| UFO Encounters | Violet-600 | Cosmic, mysterious |
| UFO Program | Slate-500 | Investigative, serious |
| Psychedelic | Amber-500 | Warm, organic |
| OBE | Cyan-500 | Ethereal, astral |
| Psi | Indigo-500 | Mental, deep |
| STE | Emerald-600 | Growth, transformation |

---

## D. UX/Product Recommendations

### Homepage Evolution

**Current:** NDE-focused hero + curated grids by score type.

**Proposed hub homepage:**
1. **Hero:** "Mapping the Extraordinary" with animated counter showing total experiences across all domains
2. **Domain cards:** Large glassmorphism cards per domain with key stats, featured video, accent color
3. **Cross-domain spotlight:** "This Week's Discovery" - one compelling comparison finding
4. **Unified search bar:** "Search 9,000+ extraordinary experiences" with domain filter chips
5. **Trending:** Most-viewed accounts across all domains this week

### Navigation

```
Logo | Explore (dropdown) | Search | Compare | Blog | About
         |
         +-- Near-Death Experiences (by Score, Channel, Experiencer)
         +-- UFO/UAP
         |     +-- Encounters (by Type CE1-CE5, Channel, Evidence Level)
         |     +-- Programs & Disclosure (by Program, Person, Timeline)
         +-- [Future: Psychedelics, OBE, Psi]
         +-- Cross-Domain Comparison
```

### Cross-Domain Comparison Engine (The Killer Feature)

Three modes (applies to first-person experiencer content only):

1. **Side-by-Side:** Pick two accounts from different domains. Radar chart of shared phenomenological dimensions.
2. **Statistical:** "How do entity encounters compare across NDEs vs. UFO contact?" Distribution charts, word clouds, representative quotes.
3. **Fingerprint Match:** Describe your own experience. AI generates a vector, shows: "Your experience matches 73% with deep NDEs, 61% with CE-4 UFO contact, 45% with psilocybin breakthroughs." Viral, shareable hook.

### Compassionate AI Chat (Expanded)

Expand RAG chatbot context to handle cross-domain queries:
- Pull from all domain embedding tables via the unified view
- "How do NDE entity encounters compare to DMT entities?"
- "What do UFO contactees say about consciousness?"
- Maintain compassionate tone for all domains, with domain-appropriate sensitivity

---

## E. Competitive Differentiation

| Competitor | What They Do | Weakness | Our Advantage |
|-----------|-------------|----------|---------------|
| **NDERF.org** | ~5K NDE narratives, survey-based | Static text, no AI, no search, dated UX | AI analysis + semantic search + modern UX |
| **IANDS.org** | NDE education, conferences | Membership-gated, academic tone | Free, accessible, data-driven |
| **MUFON.com** | UFO sighting reports, field investigations | Sighting-focused, not experiencer-centered | First-person experiencer focus + program search |
| **IONS.org** | Broad consciousness research | Research institute, not consumer product | Consumer-friendly exploration |
| **Erowid.org** | 30K+ psychedelic reports | Text-only, no AI, forbids data mining | AI-powered cross-domain comparison |
| **Monroe Institute** | OBE training programs | Commercial training business | Free, open data exploration |

**Our moat:**
1. AI-powered validated scale scoring at scale across domains
2. Cross-domain comparison (nobody does this systematically)
3. Semantic search with timestamps linking to exact video moments (works for ALL content)
4. Beautiful modern UX in a space of 2005-era websites
5. The convergence thesis backed by quantitative data
6. Dual-track UAP content (experiencer + disclosure) bridges audiences

---

## F. Risk Analysis

### Brand Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| UFO stigma dilutes NDE credibility | HIGH | Lead with data. Use "UAP contact" framing. Academic tone. Separate URL paths so NDE users only see UFO content by choice. |
| Audience confusion | MEDIUM | Clear domain navigation, gradual introduction via cross-domain blog posts before full launch. |
| Content moderation | MEDIUM | UFO space has more conspiracy/hoax content. Stronger classifier + channel whitelisting. |

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Database capacity (27 GB on 8 GB plan) | HIGH | Each domain adds ~5 GB. Disable spend cap, budget $3-5/mo overage per domain. Consider purging duplicates. |
| HNSW index scaling | MEDIUM | Currently 865K NDE + 555K UAP = 1.4M vectors. Adding domains pushes toward 2M+. Monitor index build times and query performance. Consider partitioning. |
| Embedding space pollution | MEDIUM | Include domain metadata in queries, weight by domain relevance. Same embedding model works since phenomenological language is similar. |
| Pipeline complexity (two pipelines per domain) | HIGH | Shared infrastructure (scraper, punctuator, embedder) + domain-specific analysis prompts. Budget 2-3 weeks per new domain pipeline. |
| Cloud Run timeouts (300s/100s) | MEDIUM | Same async job pattern applies. No new risk, same constraint. |

### Market Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| UFO disclosure fizzles | LOW | Experiencer accounts are timeless regardless of government outcomes. |
| Psychedelic legal backlash | LOW | We analyze reports, not advocate use. Harm reduction framing. |
| Competitor copies approach | MEDIUM | First-mover advantage with 9K+ analyzed accounts. Data scale is hard to replicate. |

---

## G. Phased Roadmap

### Phase 1: UFO Vertical MVP (Weeks 1-6)

- [ ] Build UAP content classifier (content_type: first_person, retold_story, research_analysis, etc.)
- [ ] Run punctuation pipeline on 4,195 existing UAP videos
- [ ] Build `uap_analysis` table + Triad analysis pipeline for encounters (Evidence, Experience, Impact)
- [ ] Build Track 2 knowledge extraction pipeline for program content
- [ ] Create `/uap/encounters/` route group with explore pages
- [ ] Create `/uap/program/` route group with explore pages (by program, person, timeline)
- [ ] Create `/uap/video/[id]/` detail page (reuse ~80% of NDE video page)
- [ ] Add UAP to unified search via UNION view
- [ ] Add `/uap/channels/`, `/uap/chat/`, `/uap/questions/`, `/uap/blog/`
- [ ] Add domain accent colors (violet for encounters, slate for program)
- [ ] Write 3-5 launch blog posts for `/uap/blog/`
- [ ] Ingest `#alienabduction` top 5K + new channels (Mantis Encounters, Paranormal Spirituality playlist)

**Note:** No changes to existing NDE routes or homepage during this phase.

**Gate:** 100+ fully analyzed UAP first-person encounters + searchable program content live. UX coherent.

### Phase 2: Cross-Domain Comparison Engine (Weeks 7-10)

- [ ] Build `/compare/` route (side-by-side, statistical, fingerprint modes)
- [ ] Create shared phenomenological dimension schema
- [ ] Generate experience_fingerprint vectors for all analyzed accounts
- [ ] Build radar chart (5-axis) + distribution chart components
- [ ] Build "Match My Experience" prototype
- [ ] Expand RAG chatbot to cross-domain queries
- [ ] Write 5+ viral comparison articles

**Gate:** Comparison working for NDE vs. UFO. 3+ statistically interesting cross-domain findings.

### Phase 3: Marketing & Growth (Weeks 8-14, overlapping)

- [ ] Launch social media (Instagram first, then X/Twitter)
- [ ] PR: pitch findings to podcasts (Lex Fridman, Duncan Trussell, That UFO Podcast)
- [ ] SEO content push on cross-domain keywords + disclosure keywords
- [ ] Newsletter segmentation
- [ ] Shareable comparison cards (OG images)

**Gate:** 50% traffic growth MoM for 2 consecutive months.

### Phase 4: Additional Domains (Months 4-12)

Priority order:
1. **Psychedelic Experiences** (Mo 4-6) - Mainstream acceptance growing, MEQ30 well-validated, strong NDE overlap
2. **Psi Phenomena** (Mo 5-7) - Remote viewing, telepathy, psychokinesis. Bridges UAP programs and experiencer accounts. Stargate Program content already partially captured in UAP channels.
3. **Out-of-Body Experiences** (Mo 6-8) - Strong NDE overlap, distinct enough for own section
4. **Spiritually Transformative Experiences** (Mo 8-12) - Broadest umbrella category

**Gate per domain:** Analysis framework defined, 500+ videos analyzed, frontend live.

### Phase 5: Community (Months 6-18, Future)

Community features to consider (not yet designed, brainstorming only):

- **Video comments/discussion:** Threaded discussion on each video page. Low barrier, high engagement potential. Moderation needed.
- **Reddit-style forum:** Topic-based discussions across domains. "r/NDE_Experiences", "r/UFO_Contact", "r/CrossDomain". Self-moderating with upvotes.
- **Skool-style learning program:** Structured courses ("Understanding NDEs", "The Disclosure Timeline", "Cross-Domain Consciousness Research"). Premium/paid tier potential. Could be the monetization model.
- **User-submitted accounts:** Written first-person accounts (not just YouTube) processed through the same AI analysis pipeline. Massively expands the database beyond YouTube. (Gemini suggestion.)
- **Experience matching/networking:** "Connect with people who had similar experiences." Sensitive, requires strong safety systems.
- **Research collaboration:** Tools for researchers to query the data, build cohorts, export anonymized datasets.

**The community question is also the monetization question.** Free search + free analysis + paid community/courses is a viable model. Or: free everything + donation/patronage (Wikipedia model). Decision deferred to later phase.

---

## H. Resolved Decisions

1. **Brand naming:** ✅ Keep "Project Profound" — brand permission exists, name is domain-agnostic.
2. **Supabase budget:** ✅ Overage acceptable (~$2-5/mo additional). Disable spend cap.
3. **URL migration:** ✅ NDE stays at root for now. Build `/uap/` additively. Move NDE to `/nde/` later.
4. **URL naming:** ✅ `/uap/` in URLs, "UFO/UAP" in visible text/titles/meta for SEO.
5. **Phase priority:** ✅ Polish UAP vertical fully first. Comparison engine comes after.
6. **Domain order after UAP:** ✅ Decide after UAP is complete. Candidates: Psychedelic, Psi, OBE, STE.
7. **Community model:** ✅ Deferred to later phase. Brainstorming captured in Phase 5.
8. **Homepage:** ✅ Untouched during UAP build. Current homepage eventually becomes `/nde/` homepage.
9. **Content scope:** ✅ Consciousness experiences only. Three-tier hierarchy. No cryptids/true crime.

---

## Research Sources

### Validated Scales
- Greyson NDE Scale (1983) - already implemented
- NDE-TI / cvNDE - already implemented (custom)
- Hynek Classification (1972) - CE1 through CE5
- Vallee Classification (1990) - AN/MA/FB typology
- Vallee SVP Credibility Index - Source/Visit/Probability for evidence scoring
- FREE Foundation Survey (2018) - 4,200+ respondents, 100+ countries
- Ring Life Changes Inventory (1992, "The Omega Project")
- MEQ30 (Barrett/Johnson/Griffiths, 2015, Johns Hopkins)
- PES48 - extends MEQ30 with additional dimensions

### Key Finding: FREE Foundation
Survey of 4,200+ contactees found UFO contact is highly correlated with NDEs, OBEs, remote viewing, and mediumship. 85-95% report positive long-term transformation. This validates the convergence thesis and cross-domain comparison approach.

### Key Finding: Ring's Omega Project
Kenneth Ring's 1992 study used standardized instruments across NDE experiencers and UFO experiencers, finding near-identical psychological profiles: increased psychic sensitivity, worldview expansion, decreased materialism, electronics interference. Both groups showed changes consistent with "a new stage in the evolution of the human mind."
