# UAP-CTI: UAP Contact Transformation Index

> **Version:** 0.1 (Draft)
> **Date:** 2026-05-06
> **Status:** Under Review
> **Part of:** UAP-CET (Contact Experience Triad) — see `docs/scales/UAP-CET.md`
> **NDE Parallel:** NDE-TI (NDE Transformation Index, 10 domains, 0-50)
> **Score Range:** 0-60 (12 domains, each scored 0-5)

## Purpose

For Assessing Aftereffects and Life Changes Following UAP Contact

The UAP Contact Transformation Index (UAP-CTI) measures the self-reported aftereffects, life changes, and personal transformation that a witness describes as resulting from their UAP contact experience. It answers the question: **"How did it change you?"** — not "is it true?" (UAP-ESS) or "what happened?" (UAP-CDS).

Transformation following UAP contact is one of the most under-studied and most important aspects of the phenomenon. Research across multiple domains (NDE, psychedelics, UAP, mystical experiences) consistently shows that:

- Contact experiences frequently produce lasting changes in values, beliefs, relationships, and life direction (Ring, 1992; Mack, 1994)
- Transformation correlates with depth of experience but NOT necessarily with evidence strength — a dream contact with no physical evidence can produce profound life changes
- The aftereffect profiles of UAP contactees overlap significantly with NDE experiencers, suggesting shared mechanisms (Ring & Rosing, 1990)
- Transformation can be positive, negative, or mixed — UAP contact frequently produces isolation, relationship disruption, and career damage alongside spiritual growth and expanded awareness

The UAP-CTI uses 12 domains:
- **8 shared domains** — identical definitions to NDE-TI (direct 1:1 comparison)
- **2 adapted domains** — broadened from NDE-TI equivalents (comparable with caveats)
- **2 UAP-specific domains** — no NDE equivalent (capture phenomena unique to UAP contact)

This architecture enables the generation of both a **Full Score (0-60)** and a **Comparable Score (0-50)** — the latter uses only the 10 mappable domains for direct statistical comparison with NDE-TI profiles.

### AI Evaluation Constraints

When this scale is applied by AI in the analysis pipeline, the following constraints are mandatory:

1. **Score only described transformation:** Score ONLY what the witness explicitly describes or clearly implies as changes resulting from their experience. Do not infer transformation that is not mentioned. A score of 0 means the domain was NOT DISCUSSED — it does NOT mean no change occurred.
2. **Assess change from the person's own baseline:** Score the DEGREE OF CHANGE from the experiencer's described prior state, not against an external standard. "I was never religious but now I meditate daily" = significant change. "I've always been spiritual and this deepened it" = mild change.
3. **Verify attribution:** Score a change ONLY if the witness explicitly attributes it to the UAP encounter, or if they describe a clear chronological "before and after" shift. Do not score general personality traits, lifelong beliefs, or pre-existing conditions unless the witness links them to the experience. A deeply spiritual person who also had a UAP sighting does NOT automatically get a high Spiritual Awareness score — only if they say the experience CHANGED their spirituality.
4. **Capture direction, not just magnitude:** Use direction indicators (up, down, mixed, shifted, new) to capture the nature of change. Many domains can go in either direction — especially Relationships (isolation vs. deeper connection) and Cosmological Orientation (empowering vs. terrifying revelations).
5. **No external knowledge injection:** Same rule as UAP-ESS and UAP-CDS — score only what's in the transcript.
6. **Destruction is transformation:** Do NOT assume positive transformation. UAP contact frequently produces negative outcomes — PTSD, relationship destruction, career loss, paranoia, substance abuse, health deterioration. A complete psychological breakdown, severe substance abuse to cope with ontological shock, or total relationship collapse represents a Profound Transformation (Score 4-5, direction = down). The magnitude of change (0-5) is completely independent of its valence (positive/negative). The scale measures CHANGE, not improvement.
7. **Many accounts focus on the experience, not aftereffects:** Low transformation scores are expected and normal when the video is primarily about the encounter itself rather than how life changed afterward.

---

## Scoring Scale (Per Domain, 0-5)

Each of the 12 domains is scored on the same 0-5 scale:

| Score | Anchor | Description |
|-------|--------|-------------|
| 0 | Not Addressed | This area of transformation is not discussed in the account |
| 1 | Briefly Noted | A passing mention or slight implication of change |
| 2 | Mild Change | A noticeable shift is described, with limited detail |
| 3 | Moderate Change | A clear, meaningful transformation is described with specific examples |
| 4 | Significant Change | A major, life-altering transformation described in detail |
| 5 | Profound Transformation | A dramatic, fundamental change; central to the account; described with vivid detail and emotional emphasis |

**For each domain scored ≥ 1, the AI must provide:**
- `direction` — One of: `up` (increased), `down` (decreased), `mixed` (complex/both), `shifted` (redirected), `new` (newly emerged), `N/A`
- `evidence_summary` — Brief explanation of what change was described
- `key_quote` — Direct quote from the transcript supporting the score

---

## The 12 Domains

### Shared Domains (1:1 with NDE-TI)

These 8 domains use identical definitions to the NDE-TI. Scores can be compared directly across domains.

---

#### Domain 1: Appreciation for Life (AL)

**Changes in gratitude, wonder, savoring ordinary moments, awareness of beauty, feeling life is precious.**

Typical direction: ↑ (increased)

**Rating Guidance:**
- "I see everything differently now — every sunset, every conversation" = 3-4
- "I appreciate life more" (brief mention) = 1
- "I realize how precious and fragile life is — I changed my whole lifestyle to be present" = 4-5
- "I can't enjoy normal life anymore; everything feels meaningless compared to what I experienced" = scored but direction = down
- No mention of changed appreciation = 0

---

#### Domain 2: Self-Perception & Identity (SI)

**Changes in self-acceptance, self-worth, inner peace, confidence, personality traits, sense of being a "different person."**

Typical direction: ↑ (increased)

**Rating Guidance:**
- "I feel like a completely different person" = 3-4
- "I'm more confident now" (brief) = 1-2
- "I went from being terrified to feeling like I have a purpose" = 4
- "I feel broken — I don't know who I am anymore" = scored, direction = down or mixed
- Identity disruption following the experience counts — not all identity change is positive

---

#### Domain 3: Compassion & Concern for Others (CC)

**Changes in empathy, desire to help/serve, tolerance, unconditional love, sensitivity to others' feelings.**

Typical direction: ↑ (increased)

**Rating Guidance:**
- "I feel other people's emotions now — it's overwhelming" = 3-4
- "I care more about people" = 1-2
- "I became a therapist / volunteer / activist because of the experience" = 4-5
- "I pulled away from people — I can't relate to anyone anymore" = scored, direction = mixed (the isolation may coexist with increased empathy)

---

#### Domain 4: Values & Priorities (VP)

**Changes in materialism, status-seeking, competition, simplicity, authenticity, what the person considers most important.**

Typical direction: ↓ materialism, ↑ simplicity

**Rating Guidance:**
- "I quit my corporate job and moved to a farm" = 4-5
- "Money doesn't matter to me anymore" = 2-3
- "I realized what really matters is connection and love" = 3
- Brief mention of changed priorities = 1-2

---

#### Domain 5: Spiritual Awareness (SA)

**Changes in sense of connection to the divine, universal consciousness, oneness, spiritual practices. Distinct from organized religion.**

Typical direction: ↑ (increased)

**Rating Guidance:**
- "I know there's something bigger than us now" = 2-3
- "I started meditating daily / practicing yoga / studying consciousness" = 3-4
- "I feel connected to everything — a universal consciousness" = 4-5
- "I had no interest in spirituality before; now it's the center of my life" = 5
- Distinguish from Domain 9 (Cosmological Orientation) — SA is about personal spiritual practice and felt connection; CO is about understanding reality and non-human intelligence

---

#### Domain 6: Psychic & Expanded Perception (PE)

**Emergence or increase of intuition, precognition, telepathy, healing abilities, mediumship, OBEs, synchronicities.**

Typical direction: ↑ (increased)

**Rating Guidance:**
- "I started having premonitions" = 2-3
- "I can feel other people's emotions/health issues" = 3-4
- "I developed the ability to heal / see auras / communicate with the dead" = 4-5
- "Synchronicities happen constantly now" = 2-3
- "I had no psychic abilities before; now I have them regularly" = 4-5
- **Note:** This domain has special significance for UAP research — many researchers hypothesize a correlation between UAP contact (even distant sightings) and emergence of psychic abilities. Score carefully and capture any reported timeline.
- Distinguish from Domain 12 (ES) — PE is about psychic/cognitive abilities; ES is about electromagnetic and somatic sensitivity

---

#### Domain 7: Relationships & Social Dynamics (RS)

**Changes in intimate partnerships, friendships, family dynamics, feelings of alienation, need for deep connection.**

Typical direction: Mixed (this domain is frequently both positive and negative)

**Rating Guidance:**
- "My marriage ended because my spouse thought I was crazy" = 3-4 (direction = mixed or down)
- "I found my tribe — people who understand" = 2-3
- "I feel completely alone — no one believes me" = 3-4 (direction = down)
- "My relationships deepened — I can't do surface-level anymore" = 3
- "I lost friends but gained a community" = 3-4 (direction = mixed)
- **UAP-specific note:** Relationship disruption following UAP contact is extremely common. The stigma of reporting is itself a relationship transformer. Score this even if the witness doesn't frame it as "transformation."

---

#### Domain 8: Purpose, Meaning & Life Direction (PD)

**Changes in life purpose, mission, career path, thirst for knowledge, desire to serve, meaningful work.**

Typical direction: ↑ (increased)

**Rating Guidance:**
- "I know why I'm here now — I have a mission" = 4-5
- "I changed careers because of the experience" = 3-4
- "I started researching consciousness / UAP / physics" = 2-3
- "I feel called to share this with others" = 3 (also score in DA if the advocacy aspect is strong)
- "I have no idea what to do with my life after this" = 2 (direction = mixed)

---

### Adapted Domains (Modified from NDE-TI)

These 2 domains are broadened from their NDE-TI equivalents. They are included in the Comparable Score (0-50) but comparisons carry a caveat.

---

#### Domain 9: Cosmological Orientation (CO)

**Changes in understanding of reality, non-human intelligence, multiverse/interdimensional concepts, simulation theory, humanity's place in the cosmos.**

*NDE-TI equivalent: Religious Orientation (RO) — relationship with organized religion, doctrines, institutional participation.*

**Why adapted:** UAP contact rarely shifts people toward or away from organized religion in the way NDEs do. Instead, it shifts their understanding of REALITY ITSELF — the nature of consciousness, the existence of non-human intelligence, the structure of the cosmos, humanity's significance (or insignificance). CO captures this broader ontological shift.

**Mapping caveat:** When comparing NDE-TI RO scores with UAP-CTI CO scores, note that NDE-TI RO measures institutional/doctrinal change while UAP-CTI CO measures cosmological/ontological change. Both measure "how did your model of reality shift?" but through different lenses.

**Rating Guidance:**
- "I left the church because they couldn't explain what I experienced" = 2-3 (overlaps with old RO definition)
- "I now believe we live in a multiverse with non-human intelligences" = 3-4
- "My entire understanding of what reality IS has changed" = 4-5
- "I went from being a materialist scientist to believing in consciousness as fundamental" = 5
- "I don't know what's real anymore" = 2-3 (direction = mixed)
- Shifts in both directions count: both "the universe is more wonderful than I thought" AND "the universe is more terrifying than I thought" score equally

| Direction | Examples |
|-----------|---------|
| up | Expanded cosmological understanding, sense of cosmic citizenship |
| down | Contracted worldview, existential dread, nihilism |
| mixed | Both expanded understanding AND increased uncertainty/anxiety |
| shifted | Moved from one framework to another (materialism → consciousness-first, Christianity → panpsychism) |

---

#### Domain 10: Existential Orientation (EO)

**Changes in relationship with mortality, existential anxiety, belief in continuity of consciousness, sense of safety or threat in the universe.**

*NDE-TI equivalent: Attitude Toward Death (AD) — fear of death, belief in afterlife, comfort with mortality.*

**Why adapted:** NDE experiencers typically lose their fear of death because they've "been there." UAP contactees may also shift their relationship with mortality, but the bigger shift is often about existential SECURITY — "Is the universe safe? Are these intelligences benevolent? Am I in danger?" EO captures this broader existential reorientation.

**Mapping caveat:** When comparing NDE-TI AD scores with UAP-CTI EO scores, note that NDE-TI AD almost always moves toward decreased fear and increased comfort, while UAP-CTI EO can move in either direction — some contactees feel safer, others feel profoundly threatened.

**Rating Guidance:**
- "I no longer fear death — I know there's more" = 3-4 (maps directly to NDE-TI AD)
- "I feel watched all the time — I never feel safe" = 3-4 (direction = down)
- "Knowing they're out there is terrifying and comforting at the same time" = 3 (direction = mixed)
- "I realized death isn't the end, but I'm also terrified of what else is out there" = 4 (direction = mixed)
- "I feel a sense of cosmic safety I never had before" = 3-4 (direction = up)
- "I live in constant hypervigilance" = 3 (direction = down)
- **Fear of death reduction:** If the witness specifically mentions losing their fear of death or developing a new belief in an afterlife/continuity of consciousness — a classic NDE-adjacent effect — score this highly here (direction = up or shifted). EO is the correct domain for this, even though the domain name is broader than NDE-TI's "Attitude Toward Death"

---

### UAP-Specific Domains (No NDE Equivalent)

These 2 domains capture transformation phenomena unique to UAP contact. They are NOT included in the Comparable Score and have no NDE-TI mapping.

---

#### Domain 11: Disclosure & Advocacy (DA)

**Compulsion to share the experience publicly, activism, joining organizations, public speaking, writing, art, whistleblowing. Emergence of a felt duty to inform others or contribute to disclosure.**

*No NDE-TI equivalent.*

**Why UAP-specific:** While NDE experiencers sometimes feel called to share their story, UAP contactees uniquely experience a compulsion toward DISCLOSURE — a felt duty to inform the public, contribute to governmental transparency, or participate in collective truth-telling. This is a distinct transformation domain that reflects the political and societal dimensions of UAP contact.

**Rating Guidance:**
- "I felt I had to tell someone" (brief) = 1
- "I started a YouTube channel / wrote a book / went on podcasts" = 3-4
- "I became a MUFON investigator / joined a disclosure organization" = 3-4
- "I testified before Congress / risked my career to go public" = 5
- "I created art / music / writing about the experience as a way to process and share" = 2-3
- "I feel a mission to help humanity understand what's happening" = 3-4
- **Double-scoring with PD is valid:** If disclosure activism becomes the person's primary career or life mission, it is correct to score highly in BOTH Purpose (PD) and Disclosure (DA). PD captures the personal life-direction shift; DA captures the specific outward compulsion to inform. These are distinct dimensions of the same transformation.
- Distinguish from PD (Purpose) — PD is about personal life direction broadly; DA is specifically about the OUTWARD compulsion to inform, advocate, or contribute to collective awareness

---

#### Domain 12: Electromagnetic & Somatic Sensitivity (ES)

**New or increased sensitivity to electronics, EM fields, watches stopping, streetlights reacting, health changes (positive or negative), body awareness, energy sensations, healing abilities.**

*No NDE-TI equivalent.*

**Why UAP-specific:** A significant subset of UAP contactees report persistent physical/somatic changes that don't fit neatly into other domains: electronics malfunctioning around them, streetlights going out, watches stopping, chronic health changes (both positive and negative), new sensitivity to electromagnetic fields, and energy sensations in the body. These effects are reported across cultures and contact modalities.

**Rating Guidance:**
- "My watch stopped during the encounter and never worked again" = 1-2 (single event)
- "Electronics malfunction around me regularly now" = 3-4
- "Streetlights go out when I walk under them consistently" = 2-3
- "I developed chronic fatigue / autoimmune issues after the encounter" = 3-4 (direction = down)
- "I can feel energy in my hands — I seem to be able to help people heal" = 3-4 (direction = new)
- "My health dramatically improved after the encounter" = 3 (direction = up)
- "I get headaches near power lines / cell towers that I never had before" = 2-3
- **Chronological boundary:** Do NOT score physical effects that occurred ONLY during the encounter itself — those are captured in UAP-CDS item CD-1d (Physical Effects). Score ES only for persistent, ongoing, or NEW sensitivities that continued as an aftereffect AFTER the encounter ended. The car radio dying during a sighting = CDS. Electronics malfunctioning for years afterward = CTI-ES.
- Distinguish from PE (Psychic) — PE is about cognitive/psychic abilities (precognition, telepathy); ES is about physical/somatic/electromagnetic sensitivity

---

## Calculation

### Primary Metrics

| Metric | Calculation | Range | Description |
|--------|-------------|-------|-------------|
| **Full Score** | Sum of all 12 domains | 0-60 | Total transformation across all domains |
| **Comparable Score** | Sum of 10 mappable domains (AL+SI+CC+VP+SA+PE+RS+PD+CO+EO) | 0-50 | For direct comparison with NDE-TI |
| **Breadth** | Count of domains scoring ≥ 1 | 0-12 | How many areas of life were affected |
| **Depth** | Mean of domains scoring ≥ 1 | 0-5.0 | How intensely affected areas changed |

**Data Completeness:** As with UAP-ESS and UAP-CDS, if a domain cannot be evaluated because the account doesn't address aftereffects at all, score it 0. Track `data_completeness` as count of evaluable domains out of 12. Note: many videos focus on the encounter, not the transformation — low completeness is expected and normal.

### Full Score Classification

| Range | Level |
|-------|-------|
| 0 | No Transformation Discussed |
| 1-12 | Minimal Transformation |
| 13-24 | Moderate Transformation |
| 25-36 | Significant Transformation |
| 37-48 | Major Transformation |
| 49-60 | Comprehensive Profound Transformation |

### Comparable Score Classification (for NDE-TI comparison)

| Range | Level | NDE-TI Equivalent |
|-------|-------|-------------------|
| 0 | No Transformation | Same |
| 1-10 | Minimal | Same |
| 11-20 | Moderate | Same |
| 21-30 | Significant | Same |
| 31-40 | Major | Same |
| 41-50 | Comprehensive Profound | Same |

---

## Cross-Domain Comparison with NDE-TI

The UAP-CTI is designed for direct cross-domain comparison with the NDE-TI:

| Feature | NDE-TI | UAP-CTI |
|---------|--------|---------|
| Number of domains | 10 | 12 (10 mappable + 2 UAP-specific) |
| Score per domain | 0-5 | 0-5 |
| Total range | 0-50 | 0-60 (Full) / 0-50 (Comparable) |
| Classification levels | 6 tiers (identical thresholds) | 6 tiers (identical thresholds for Comparable) |
| Direction tracking | Yes | Yes (identical indicators) |

### Domain Mapping

| NDE-TI Domain | UAP-CTI Domain | Comparison Type |
|---------------|----------------|-----------------|
| AL — Appreciation for Life | AL — Appreciation for Life | **Direct** (identical) |
| SI — Self-Perception & Identity | SI — Self-Perception & Identity | **Direct** (identical) |
| CC — Compassion & Concern for Others | CC — Compassion & Concern for Others | **Direct** (identical) |
| VP — Values & Priorities | VP — Values & Priorities | **Direct** (identical) |
| SA — Spiritual Awareness | SA — Spiritual Awareness | **Direct** (identical) |
| RO — Religious Orientation | CO — Cosmological Orientation | **Adapted** (religion → cosmology) |
| AD — Attitude Toward Death | EO — Existential Orientation | **Adapted** (death → existential security) |
| PE — Psychic & Expanded Perception | PE — Psychic & Expanded Perception | **Direct** (identical) |
| RS — Relationships & Social Dynamics | RS — Relationships & Social Dynamics | **Direct** (identical) |
| PD — Purpose, Meaning & Life Direction | PD — Purpose, Meaning & Life Direction | **Direct** (identical) |
| *(none)* | DA — Disclosure & Advocacy | **UAP-specific** (not comparable) |
| *(none)* | ES — Electromagnetic & Somatic Sensitivity | **UAP-specific** (not comparable) |

**8 of 10 NDE-TI domains map directly** — identical definitions, identical scoring, directly comparable.
**2 of 10 map with caveats** — same phenomena measured through different lenses (religion→cosmology, death→existential).
**2 additional domains** are UAP-specific and excluded from cross-domain comparison.

This means researchers can ask: "Do UAP contactees show the same transformation profile as NDE experiencers?" using the Comparable Score, while also capturing UAP-specific phenomena (disclosure compulsion, EM sensitivity) in the Full Score.

---

## Notes on Scale Limitations

1. **Aftereffect reporting bias:** Videos about UAP encounters often focus on the encounter itself. Transformation is discussed less frequently and less systematically, leading to many low/zero scores. This does NOT mean transformation didn't occur — only that it wasn't discussed.
2. **Self-attribution bias:** Witnesses may attribute life changes to the UAP experience that would have occurred anyway. The scale measures ATTRIBUTED transformation, not verified causation.
3. **Negativity gap:** Positive transformations are more socially rewarded and more likely to be described in detail. Negative outcomes (PTSD, relationship loss, career damage) may be underreported. The AI should actively listen for subtle negative indicators.
4. **Temporal distance:** Some transformations emerge years or decades after the experience. An account recorded soon after the event will necessarily show fewer long-term changes.
5. **Comparable Score caveats:** The CO/RO and EO/AD mappings are conceptually parallel but not identical. Cross-domain comparisons using these adapted domains should note the mapping caveat.
6. **AI knowledge contamination:** Same constraint as UAP-ESS and UAP-CDS — score only what's in the transcript.
7. **Cultural framing:** Transformation may be described through different cultural frameworks (spiritual awakening, psychological breakdown, shamanic initiation). Score the CHANGE described, not the framework used.

---

*Scale developed for Project Profound as part of the UAP-CET (Contact Experience Triad). Companion scales: UAP-ESS (Evidence Strength Scale) and UAP-CDS (Contact Depth Scale).*
