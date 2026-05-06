# UAP-CET: UAP Contact Experience Triad

> **Version:** 0.1 (Draft)
> **Date:** 2026-05-06
> **Status:** Under Review
> **Purpose:** Overview of the three-scale scoring system for UAP contact experiences, designed for cross-domain comparison with the NDE analysis triad.

## Overview

The UAP-CET (Contact Experience Triad) is a system of three independent scoring scales for UAP contact experiences, mirroring the NDE triad (cvNDE, Greyson Scale, NDE-TI):

| Scale | Full Name | Measures | Range | NDE Parallel | Document |
|-------|-----------|----------|-------|--------------|----------|
| **UAP-ESS** | Evidence Strength Scale | Evidential strength | 7-28 | cvNDE (7-28) | `docs/scales/UAP-ESS.md` |
| **UAP-CDS** | Contact Depth Scale | Phenomenology of encounter | 0-32 | Greyson (0-32) | `docs/scales/UAP-CDS.md` |
| **UAP-CTI** | Contact Transformation Index | Aftereffects & life changes | 0-60 | NDE-TI (0-50) mappable | `docs/scales/UAP-CTI.md` |

Each scale has its own paper (methodology, rating guidance, limitations) and rubric (AI prompt template for pipeline scoring). The details below are a reference summary — see the individual scale documents for the full specification.

---

## Dimension 1: Evidence Quality (EQ)

> Measures the EVIDENTIAL STRENGTH of the reported encounter.
> Applies to both Tier 1 (encounters) and Tier 2 (program/research) with a `source_type` flag.

### Source Type Flag

Before scoring, classify the source:
- `first_person` — The speaker IS the experiencer (Tier 1 primary)
- `reported` — The speaker describes someone else's experience with detail (Tier 1 or Tier 2)
- `commentary` — The speaker analyzes/discusses UAP topics without a specific account (Tier 2 primary)

> For `commentary` sources, criteria 2-4 should be scored based on the BEST evidence discussed in the video, not the commentator's own experience.

### The 7 Criteria (each scored 1-4)

#### EQ-1: Witness Credibility Context
What is the credibility context of the primary witness?

| Score | Anchor |
|-------|--------|
| 1 | Anonymous or unverifiable source; no professional context given |
| 2 | Named individual with general background; single untrained witness |
| 3 | Trained observer (pilot, military, law enforcement, scientist) or multiple independent witnesses |
| 4 | Official capacity witness (on-duty military/radar operator, flight crew with instruments) or large group (10+) with independent reports |

#### EQ-2: Perceptual Clarity
How clear and detailed was the observation itself?

| Score | Anchor |
|-------|--------|
| 1 | Vague, ambiguous, or fleeting (flash of light, peripheral glimpse, uncertain dream) |
| 2 | Moderate clarity — distinct shape or behavior noted but limited detail |
| 3 | Clear observation — structured object/entity described with specific features, sustained viewing |
| 4 | Exceptional clarity — prolonged, close-range observation with multiple sensory channels (visual + auditory + physical) |

#### EQ-3: Specificity of Details
How specific and potentially verifiable are the reported details?

| Score | Anchor |
|-------|--------|
| 1 | General impressions only ("bright light", "something in the sky") |
| 2 | Some specifics (color, approximate size, general location, time of day) |
| 3 | Precise details (exact time, GPS-level location, specific physical descriptions, quoted communications) |
| 4 | Highly precise, unique details (serial numbers, names of unknown personnel, technical specifications, information later confirmed independently) |

#### EQ-4: Corroboration
Is the account supported by other witnesses or evidence?

| Score | Anchor |
|-------|--------|
| 1 | Single witness, no supporting evidence |
| 2 | Single witness with circumstantial support (consistent with other reports in area/time) |
| 3 | Multiple independent witnesses OR single instrumental record (photo, radar, video) |
| 4 | Multiple witnesses AND instrumental/physical evidence (radar + video, ground traces + radiation, medical records of physiological effects) |

#### EQ-5: Unpredictability
Could the experience have been anticipated or fabricated?

| Score | Anchor |
|-------|--------|
| 1 | Expected context (at a skywatch, meditating for contact, UFO hotspot) |
| 2 | Somewhat expected (outdoors at night, interest in topic but not actively seeking) |
| 3 | Unexpected (during routine activity, no prior interest, skeptic) |
| 4 | Highly unexpected (during professional duty, hostile witness, experience contradicts witness's prior beliefs) |

#### EQ-6: Physical Effects
Were there measurable physical effects on the witness or environment?

| Score | Anchor |
|-------|--------|
| 1 | No physical effects reported |
| 2 | Subjective physiological effects (tingling, heat, nausea, headache, paralysis) |
| 3 | Observable physiological effects (burns, rashes, hair loss) OR environmental effects (vehicle interference, compass deviation, animal reactions) |
| 4 | Documented/medical physiological effects OR measurable environmental evidence (ground traces, radiation readings, electromagnetic anomalies on instruments) |

#### EQ-7: Temporal Precedence of Report
When was the experience first reported relative to public knowledge?

| Score | Anchor |
|-------|--------|
| 1 | No information about when first reported; reported long after the fact |
| 2 | Reported within weeks/months; could have been influenced by media or others |
| 3 | Reported to others shortly after (within hours/days) before exposure to similar accounts |
| 4 | Documented contemporaneously (written report, official filing, told multiple witnesses immediately, recorded before any media coverage) |

### EQ Scoring Levels

| Range | Level |
|-------|-------|
| 7-12 | Low Evidential Strength |
| 13-17 | Moderate Evidential Strength |
| 18-22 | High Evidential Strength |
| 23-28 | Exceptional Evidential Strength |

---

## Dimension 2: Contact Depth (CD)

> Measures the PHENOMENOLOGICAL DEPTH of the contact experience.
> Designed to score ALL contact types — from distant light sighting to dream contact to full abduction.

### Contact Modality Tag

Before scoring, tag the PRIMARY modality (non-scoring, for analysis):
- `physical_sighting` — Visual observation of object/craft in waking state
- `close_encounter` — Physical proximity to object/entity in waking state
- `dream_vision` — Contact occurring in dream, hypnagogic, or vision state
- `meditation_ce5` — Contact initiated through meditation or CE5 protocol
- `abduction` — Involuntary transportation or examination
- `ongoing_contact` — Repeated/sustained contact pattern over time
- `ambiguous` — Modality unclear from account

> The modality tag does NOT affect scoring. A vivid, bilateral dream contact can score HIGHER than a distant physical sighting. This is intentional — we are measuring depth of the experience as reported, not physical proximity.

### The 4 Categories × 4 Items (each scored 0-1-2)

**0** = Not present | **1** = Mildly or ambiguously present | **2** = Definitely present

#### Category 1: Observation & Physical Encounter

| Item | What to assess |
|------|----------------|
| **CD-1a: Anomalous perception** | Did the witness perceive something anomalous? (light, object, sound, presence — in ANY modality including dreams) |
| **CD-1b: Structured form** | Was a distinct structured form observed? (craft with shape, entity with features, geometric pattern — vs. amorphous light/feeling) |
| **CD-1c: Proximity** | How close was the encounter? (distant sky → overhead → within room → physical touch/inside craft. For dreams: vague background → face-to-face → immersive environment) |
| **CD-1d: Physical effects** | Were there physical effects on witness or environment? (paralysis, missing time, marks, EM interference, ground trace, physiological symptoms) |

#### Category 2: Entity Interaction

| Item | What to assess |
|------|----------------|
| **CD-2a: Entity perceived** | Was a non-human entity/intelligence perceived? (any form: humanoid, orb, shadow, voice, presence, dream figure) |
| **CD-2b: Bilateral awareness** | Did the entity appear to acknowledge or respond to the witness? (directed gaze, approached, responded to thought/action) |
| **CD-2c: Communication** | Was information exchanged? (telepathic message, verbal, symbolic imagery, emotional transmission, "download") |
| **CD-2d: Directed content** | Did communication contain specific content? (teaching, warning, prophecy, personal message, mission assignment, technical information) |

#### Category 3: Consciousness Alteration

| Item | What to assess |
|------|----------------|
| **CD-3a: Altered state** | Was an altered state of consciousness involved? (trance, paralysis, dissociation, hyper-lucidity, dream state, meditation state) |
| **CD-3b: Transportation** | Was the witness transported or felt taken somewhere? (aboard craft, other realm, other dimension, astral travel, immersive vision) |
| **CD-3c: Time distortion** | Was time perception disrupted? (missing time, time dilation, timelessness, experience felt longer than clock time) |
| **CD-3d: Enhanced perception** | Were perceptions enhanced beyond normal? (seeing through walls, 360° vision, perceiving energy/auras, knowing things impossibly, synesthesia) |

#### Category 4: Transcendent Elements

| Item | What to assess |
|------|----------------|
| **CD-4a: Cosmic knowledge** | Was universal/cosmic knowledge imparted? (nature of reality, purpose of life, future of humanity, cosmic history) |
| **CD-4b: Ontological shock** | Did the experience shatter the witness's reality model? ("more real than real", fundamental worldview disruption, existential crisis/revelation) |
| **CD-4c: Emotional overwhelm** | Was the emotional impact extreme? (profound awe, terror, unconditional love, surrender, ecstasy — beyond normal emotional range) |
| **CD-4d: Pattern/recurrence** | Is this part of a recurring pattern? (multiple encounters over time, lifelong contact, escalating experiences, family pattern) |

### CD Scoring Levels

| Range | Level | Hynek Parallel |
|-------|-------|----------------|
| 0-6 | Minimal Contact | CE1 (distant sighting) |
| 7-12 | Light Contact | CE2 (physical effects) |
| 13-20 | Moderate Contact | CE3 (entity observed) |
| 21-32 | Deep Contact | CE4-CE5 (bilateral, transformative) |

### CD Scoring Examples

| Scenario | Estimated Score | Level |
|----------|----------------|-------|
| Saw a distant light moving oddly for 10 seconds | 1-3 | Minimal |
| Vivid dream of gray alien making eye contact, felt paralyzed | 5-9 | Light |
| Orb in backyard, dog reacted, felt watched, 30 min missing time | 7-11 | Light |
| CE5 meditation: saw craft, received telepathic message about Earth | 10-16 | Moderate |
| Physical encounter: entity in bedroom, bilateral telepathy, transported aboard, cosmic download, ongoing pattern | 22-30 | Deep |

---

## Dimension 3: Transformation (TF)

> Measures AFTEREFFECTS and LIFE CHANGES resulting from the UAP experience.
> Designed to be MAPPABLE to NDE-TI (not identical) for cross-domain comparison.

### Scoring Scale (per domain, 0-5)

| Score | Anchor |
|-------|--------|
| 0 | Not Addressed — this area is not discussed in the account |
| 1 | Briefly Noted — passing mention or slight implication of change |
| 2 | Mild Change — noticeable shift described with limited detail |
| 3 | Moderate Change — clear, meaningful transformation with specific examples |
| 4 | Significant Change — major, life-altering transformation described in detail |
| 5 | Profound Transformation — dramatic, fundamental change; central to the account |

### The 12 Domains

> Domains 1-8 are SHARED with NDE-TI (identical definitions). Domains 9-10 are ADAPTED (broader scope). Domains 11-12 are UAP-SPECIFIC (no NDE equivalent).

#### Shared Domains (map 1:1 to NDE-TI)

| Code | Domain | Direction | NDE-TI Map |
|------|--------|-----------|------------|
| **AL** | Appreciation for Life | Typically ↑ | AL (identical) |
| **SI** | Self-Perception & Identity | Typically ↑ | SI (identical) |
| **CC** | Compassion & Concern for Others | Typically ↑ | CC (identical) |
| **VP** | Values & Priorities | ↓ materialism, ↑ simplicity | VP (identical) |
| **SA** | Spiritual Awareness | Typically ↑ | SA (identical) |
| **PE** | Psychic & Expanded Perception | Typically ↑ | PE (identical) |
| **RS** | Relationships & Social Dynamics | Mixed | RS (identical) |
| **PD** | Purpose, Meaning & Life Direction | Typically ↑ | PD (identical) |

#### Adapted Domains (modified from NDE-TI, comparable with caveats)

| Code | Domain | Description | NDE-TI Map |
|------|--------|-------------|------------|
| **CO** | Cosmological Orientation | Changes in understanding of reality, non-human intelligence, multiverse/interdimensional concepts, simulation theory, humanity's place in cosmos. Broader than NDE-TI's "Religious Orientation" — includes shifts in scientific worldview and cosmology, not just religious/institutional participation. | RO (adapted) |
| **EO** | Existential Orientation | Changes in relationship with mortality, existential anxiety, belief in continuity of consciousness, sense of safety/threat in the universe. Broader than NDE-TI's "Attitude Toward Death" — includes existential security/insecurity about non-human presence. | AD (adapted) |

#### UAP-Specific Domains (no NDE equivalent)

| Code | Domain | Description | NDE-TI Map |
|------|--------|-------------|------------|
| **DA** | Disclosure & Advocacy | Compulsion to share the experience publicly, activism, joining organizations, public speaking, writing, art, whistleblowing. Emergence of felt duty to inform others or contribute to disclosure. | None |
| **ES** | Electromagnetic & Somatic Sensitivity | New or increased sensitivity to electronics, EM fields, watches stopping, streetlights reacting, health changes (positive or negative), body awareness, energy sensations, healing abilities. | None |

### TF Scoring and Cross-Domain Comparability

| Metric | Calculation | Range |
|--------|------------|-------|
| **UAP Full Score** | Sum of all 12 domains | 0-60 |
| **UAP Comparable Score** | Sum of 10 mappable domains (AL+SI+CC+VP+SA+PE+RS+PD+CO+EO) | 0-50 |
| **UAP Breadth** | Count of domains scoring ≥ 1 | 0-12 |
| **UAP Depth** | Mean of domains scoring ≥ 1 | 0-5.0 |

**Cross-domain comparison uses the "Comparable Score" (0-50):**

| NDE-TI Domain | UAP-ESS Domain | Comparison |
|---------------|----------------|------------|
| AL → AL | Identical definition | Direct |
| SI → SI | Identical | Direct |
| CC → CC | Identical | Direct |
| VP → VP | Identical | Direct |
| SA → SA | Identical | Direct |
| RO → CO | Adapted (religion → cosmology) | With caveat |
| AD → EO | Adapted (death → existential) | With caveat |
| PE → PE | Identical | Direct |
| RS → RS | Identical | Direct |
| PD → PD | Identical | Direct |
| — → DA | UAP-specific | Not comparable |
| — → ES | UAP-specific | Not comparable |

### TF Classification Levels

| Range (Full) | Range (Comparable) | Level |
|---|---|---|
| 0 | 0 | No Transformation Discussed |
| 1-12 | 1-10 | Minimal Transformation |
| 13-24 | 11-20 | Moderate Transformation |
| 25-36 | 21-30 | Significant Transformation |
| 37-48 | 31-40 | Major Transformation |
| 49-60 | 41-50 | Comprehensive Profound Transformation |

### TF Output JSON Schema

Each domain scores with: score (0-5), direction (up/down/mixed/shifted/new/N/A), evidence_summary, key_quote.

Quantitative metrics include: overall_transformation_score (0-60), comparable_score (0-50), transformation_breadth (0-12), transformation_depth (0-5.0).

Qualitative profile includes: dominant_themes, integration_notes, timeline_notes, unique_features.

---

## Appendix: AI Prompt Templates

> Full prompt templates for each dimension will be finalized after rubric approval and placed in `src/lib/ai/uap-evidence.ts`, `src/lib/ai/uap-contact-depth.ts`, and `src/lib/ai/uap-transformation.ts`.

Each prompt will follow the pattern established by `greyson.ts` and `transformation.ts`:
- System prompt with full rubric text
- JSON mode output (`response_format: { type: 'json_object' }`)
- Temperature 0.1 for consistency
- gpt-4o-mini model (per LEARNINGS.md)
- 50,000 char input truncation
