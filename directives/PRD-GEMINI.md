# Phase 1 PRD: UFO/UAP Vertical Expansion

> **Phase 1 | Project Profound Expansion | Gemini Analysis**
> **Project Type:** Type A (Development Project - Full BMAD)
> **Status:** PENDING REVIEW

## 1. Product Overview & Objectives

**Objective:** Expand Project Profound from an NDE-exclusive platform to a multi-domain consciousness exploration hub, starting additively with the UFO/UAP vertical. This expansion must maintain strict separation from the existing NDE experience, laying the groundwork for a future cross-domain comparison engine without disrupting the current site.

**Target Audiences:**
1. **Disclosure Community:** Seeking rigorous, searchable data on government programs, whistleblower testimony, and technology.
2. **Spiritual But Not Religious (SBNR) / Meaning Seekers:** Interested in the transformative nature of UAP contact (CE-5, entity encounters) and the consciousness connection.

**Core Directives:**
- **Zero Impact on Existing Routes:** All new development happens strictly under the `/uap/` subfolder. The existing homepage and `/explore` routes remain entirely untouched.
- **Dual-Track Content:** We are serving both the disclosure enthusiast and the phenomenology researcher by explicitly separating "Program" (historical/governmental) from "Encounters" (first-person).
- **SEO & Branding:** URL structure uses `/uap/`, but all visible text, metadata, and page titles use "UFO/UAP" to capture maximum search intent. The brand accent color for this vertical is Violet-600.

---

## 2. Core Features & Capabilities

### 2.1 Dual-Track Content Navigation
- **/uap/encounters/ (Track 1 - Tier 1):** First-person accounts of UFO/NHI experiences. Videos here receive the full Triad Analysis (Evidence, Experience, Impact).
- **/uap/program/ (Track 2 - Tier 2):** Investigative content, disclosure testimony, and program history. Videos here receive Knowledge Extraction analysis (people, programs, claims, consciousness connections) but *not* Triad scoring.

### 2.2 UAP-Scoped Capabilities
- **Timestamped Semantic Search:** Dedicated `/uap/search/` interface querying the existing `uap_embeddings` table. Visually differentiates between Tier 1 (Encounters) and Tier 2 (Program/Research) results.
- **Domain-Scoped AI Chat:** A `/uap/chat/` interface utilizing the existing compassionate UI but injecting a UAP-specific system prompt (Curious UAP researcher) and restricting RAG retrieval strictly to the UAP corpus.
- **Triad Analysis Engine (Encounters Only):**
  - *Axis 1: Evidence.* Visualized via the UAP-ESS (Evidence Strength Scale), assessing corroboration and trace evidence.
  - *Axis 2: Experience.* Categorized using the Vallée Classification (CE1-CE5, FB, MA, AN) and scored on Contact Depth.
  - *Axis 3: Impact.* Scored using the existing NDE-TI (Transformation Index), reinforcing the cross-domain thesis.

### 2.3 Required Pages & Routes
All routes exist under `/uap/`:
- `/uap/encounters/explore/`: Browse and filter first-person accounts.
- `/uap/program/explore/`: Browse and filter disclosure/research content.
- `/uap/video/[id]/`: Video detail page tailored for UAP metadata (reusing ~80% of NDE video UI).
- `/uap/experiencer/[id]/`: Profiles for recurring contactees.
- `/uap/person/[name]/`: Knowledge graph profiles (e.g., Grusch, Elizondo) for Track 2.
- `/uap/channels/` & `/uap/channel/[id]/`: UAP-specific channel directories.
- `/uap/chat/`, `/uap/search/`, `/uap/questions/`, `/uap/blog/`.

---

## 3. User Journeys

### Journey A: The Disclosure Enthusiast
1. Searches Google for "AATIP David Grusch testimony" and lands on a `/uap/program/video/[id]` page.
2. Uses the timestamped transcript to jump directly to mentions of consciousness or biological biologics.
3. Clicks a "Consciousness Connection" tag that bridges them over to `/uap/encounters/` to hear a first-person account of a CE-5 experience.
4. Engages the `/uap/chat/` to ask, "Which whistleblower programs studied telepathy?"

### Journey B: The Meaning-Seeker
1. Browses `/uap/encounters/explore/` filtering for high NDE-TI (Transformation) scores and CE-4 encounters.
2. Watches a highly-corroborated first-person account, viewing the Triad Analysis radar chart to understand the profound after-effects of the contact.
3. Visits the `/uap/blog/` to read an AI-generated article summarizing common entity descriptions across 100 experiencers.

---

## 4. Scope Bounding (MVP)

### In Scope (V1)
- Classification of the existing 4,195 UAP videos into Tier 1 (Encounters), Tier 2 (Program), or Tier 3 (Out of Scope/Hidden).
- Punctuation and knowledge extraction pipelines for the UAP corpus.
- Implementation of the full `/uap/*` frontend route group.
- Triad Analysis visualization for at least 100 first-person encounter videos.
- UAP-scoped Search and Chat.

### Explicitly Out of Scope (Not in V1)
- The Cross-Domain Comparison Engine (`/compare/`).
- Modifications to the root homepage (`/page.tsx`).
- Ingestion of Psychedelics, OBEs, or Psi phenomena.
- User-submitted written accounts or community forum features.
- Any modifications to the existing NDE routes or search capabilities.

---

## 5. Acceptance Criteria (Gate 1 Checklist)

- [ ] **Zero-Impact Verification:** The existing NDE site (`/`, `/explore`, `/chat`) functions identically with no regressions.
- [ ] **Routing:** All new content is successfully served under the `/uap/` path prefix.
- [ ] **Dual-Track UI:** The UI clearly differentiates between Encounter content and Program content.
- [ ] **Search Effectiveness:** Queries in `/uap/search` return only UAP content, with accurate timestamp deep-linking to the YouTube player.
- [ ] **Analysis Fidelity:** At least 100 first-person encounter videos successfully display Triad Analysis scores (Evidence, Vallée, NDE-TI).
- [ ] **Chat Scoping:** `/uap/chat` answers questions using only UAP context and maintains the defined persona.

---

## 6. Success Metrics (KPIs)

1. **Traffic Velocity:** Achieve 50% MoM traffic growth in the `/uap/` sub-directory for two consecutive months post-launch.
2. **Engagement (Video):** Average Time on Page for `/uap/video/[id]` exceeds 3:00 minutes.
3. **Engagement (Chat):** Average conversation depth in `/uap/chat` exceeds 4 messages per session.
4. **Cross-Pollination (Future-Proofing):** Track the percentage of users who traverse the "Consciousness Connection" bridge from `/uap/program/` to `/uap/encounters/`.
