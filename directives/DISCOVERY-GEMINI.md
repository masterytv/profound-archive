# DISCOVERY: Project Profound Expansion
**Phase 0: Strategic Blueprint & Feasibility Validation**

## 1. Problem Statement & Opportunity
Project Profound currently focuses exclusively on Near-Death Experiences (NDEs). However, the public conversation surrounding consciousness is rapidly expanding, driven by UAP disclosure, AI advancements, and the mainstreaming of psychedelic research. 

The opportunity is to evolve Project Profound into a **Multi-Domain Consciousness Exploration Platform**—the first platform that enables rigorous, data-driven cross-domain comparison of anomalous experiences (NDEs, UFO/UAP contact, Psychedelics, OBEs, STEs) utilizing validated academic scales and AI.

Our North Star: *"What if these experiences are all connected? Let's find out together."*

## 2. Architecture Recommendation
**Recommendation: Single Site with Domain Sections (`projectprofound.org/nde`, `projectprofound.org/uap`)**
*   **SEO:** Concentrates domain authority on "consciousness" under a single premium brand.
*   **UX:** Enables seamless cross-domain comparison without jarring context switches or cross-origin authentication issues.
*   **Auth:** Maintains a single Supabase user account for cross-domain collections and favorites.

## 3. Database Architecture
**Recommendation: Parallel Tables Unified by SQL Views**
*   **Raw Data:** Maintain parallel tables (`nde_vids`, `uap_vids`) to handle domain-specific metadata without bloating a single massive table.
*   **Analysis:** Create domain-specific analysis tables (`nde_analysis`, `uap_analysis`) but enforce common semantic columns (`transformation_score`, `intensity_rating`, `overall_tone`).
*   **Cross-Domain Search:** Create a PostgreSQL View (`all_experiences_view`) to unify the domains for seamless cross-domain semantic and keyword searches. Keep all data in the single existing Supabase project.

## 4. The First Expansion: UFO/UAP Vertical
We will implement a **Dual-Track Content Strategy** for the UAP vertical to capture both phenomenological data and high-interest historical context.

*   **Track 1: First-Person Phenomenology (`/uap/encounters`)**
    *   **Focus:** Direct experiencer accounts (e.g., *Preston Dennett*, *Eyes On Cinema*).
    *   **Analysis:** Processed through the strict Triad Analysis Architecture (Evidence, Experience, Impact) to enable cross-domain comparison with NDEs.
*   **Track 2: Disclosure & Consciousness Research (`/uap/program` or `/uap/disclosure`)**
    *   **Focus:** High-quality documentaries and researcher analysis (e.g., *UAP Gerb*, *American Alchemy*) detailing the legacy UFO program, coverups, and the intersection with consciousness (psionics, telepathy, remote viewing).
    *   **Value Proposition:** Acts as a massive top-of-funnel draw. It introduces the general public to the platform through highly engaging disclosure content, serving as a bridge to the deeper exploration of consciousness.
    *   **Analysis:** Processed through a distinct "Research Pipeline" focusing on project extraction (e.g., Kona Blue), timeline mapping, and physics concepts, rather than personal transformation scales.

*   **The Triad Analysis Architecture (For Track 1: First-Person Encounters):**
    To enable perfect cross-domain symmetry, we will analyze all domains across three parallel axes: **Evidence**, **Experience**, and **Impact**.
    
    *   **Axis 1: Evidence (UAP Evidence Strength Scale):** 
        *   *NDE Equivalent:* Revised Veridical NDE Scale (cvNDE).
        *   *UAP Solution:* Create a custom **UAP-ESS (Evidence Strength Scale)** adapting Jacques Vallée's SVP Credibility Index (Source Reliability, Site Visit, Probability) and modern UAP Assessment Matrices. This scores the robustness of the account (e.g., multi-witness corroboration, physical/trace evidence, sensor/radar data, and source reliability).
    *   **Axis 2: Experience (Categorization & Strangeness):**
        *   *NDE Equivalent:* Greyson NDE Scale.
        *   *UAP Solution:* **Vallée Classification** (CE1-CE5, FB, MA, AN) to capture the high-strangeness aspects, augmented by shared Phenomenology Core Elements (Entity encounters, telepathy, time distortion, light phenomena).
    *   **Axis 3: Impact (After-Effects):**
        *   *NDE Equivalent:* NDE-TI (Transformation Index).
        *   *UAP Solution:* Reuse the exact same **NDE-TI**. The FREE Survey strongly indicates UAP contactees undergo identical spiritual and value shifts as near-death experiencers.

## 5. Marketing Strategy & Audiences
*   **Brand:** "Project Profound: The Archive of the Extraordinary."
*   **Audiences:**
    1.  **Scientific But Open (SBO):** Attracted by validated scales, data visualization, and rigorous phenomenology.
    2.  **Spiritual But Not Religious (SBNR):** Attracted by transformation narratives and compassionate exploration.
    3.  **Meaning Seekers in Transition:** Attracted by existential exploration.
*   **The Viral Hook:** "The Consciousness Overlap" — Visualizing the data overlap between an NDE life review and a UAP "download," or entity behavior across domains.

## 6. UX/Product Recommendations
*   **Discovery Portal:** Evolve the homepage to a unified feed with domain tags.
*   **Cross-Domain Comparison Engine:** The killer feature. Radar charts visualizing the "Consciousness Fingerprint" of an experience across 5 axes: Transformation, Intensity, Ineffability, Positive Tone, Entity Presence.
*   **Compassionate AI:** Expand RAG context to handle comparative queries across domains seamlessly.

## 7. Competitive Differentiation
Nobody is doing systematic, data-driven cross-domain comparison. Existing platforms (IANDS, MUFON, Erowid) are siloed by domain and lack modern AI semantic search and visualization. Project Profound brings academic scales to YouTube scale.

## 8. Key Risks & Mitigations
*   **Brand Dilution:** Mixing NDEs with UFOs may alienate purists. 
    *   *Mitigation:* Maintain a strictly data-driven, clinical, and respectful tone. Focus on phenomenology, not endorsing extraterrestrial hypotheses.
*   **Technical Scalability:** `pgvector` index size will grow massively.
    *   *Mitigation:* Ensure HNSW indexes are properly built and monitor Supabase compute.
*   **Content Moderation:** UAP space has hoaxes and mental health crises.
    *   *Mitigation:* Strict channel whitelisting and AI safety flagging.

## 9. Phased Roadmap
*   **Phase 1 (MVP - UAP Vertical):** Finalize `uap_vids` schema, map the Vallée/NDE-TI scales, ingest 100 UAP videos, build `/explore/uap`.
*   **Phase 2 (Comparison Engine):** Build `all_experiences_view`, Cross-Domain Search UI, and the Radar Chart comparison feature. Update RAG.
*   **Phase 3 (Next Domains):** Add Psychedelic Experiences (MEQ30) and Out-of-Body Experiences (OBEs).
*   **Phase 4 (Community):** Introduce user-submitted written accounts processed through the same AI pipeline.
