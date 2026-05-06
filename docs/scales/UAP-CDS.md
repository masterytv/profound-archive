# UAP-CDS: UAP Contact Depth Scale

> **Version:** 0.1 (Draft)
> **Date:** 2026-05-06
> **Status:** Under Review
> **Part of:** UAP-CET (Contact Experience Triad) — see `docs/scales/UAP-CET.md`
> **NDE Parallel:** Greyson NDE Scale (16 items, 4 categories, 0-32)
> **Score Range:** 0-32 (16 items across 4 categories, each scored 0-2)

## Purpose

For All UAP Contact Modalities — Physical Sightings to Dream Contact

The UAP Contact Depth Scale (UAP-CDS) measures the phenomenological depth and complexity of a UAP contact experience as described in the account. It answers the question: **"What happened?"** — not "is it true?" (that's UAP-ESS) or "how did it change you?" (that's UAP-CTI).

The UAP-CDS is deliberately modality-agnostic. It scores the DEPTH of the reported experience regardless of whether contact occurred physically, in a dream, during meditation, or through an ambiguous altered state. This is a critical design decision based on research showing that:

- Phenomenological depth does not correlate perfectly with physical proximity (Davis, 1988)
- Dream/vision contacts can produce deeper entity interactions and consciousness alteration than distant physical sightings
- Aftereffects (transformation) can follow ANY contact modality, including those with low physical evidence
- Cross-domain research (NDE, psychedelics, UAP) suggests consciousness alteration is the common thread, not physical encounter type

The UAP-CDS is structurally parallel to the Greyson NDE Scale:
- Both use 4 categories × 4 items = 16 items total
- Both score each item 0 (not present), 1 (mildly/ambiguously present), 2 (definitely present)
- Both produce a total score of 0-32
- Both classify experiences into 4 depth tiers

### AI Evaluation Constraints

When this scale is applied by AI in the analysis pipeline, the following constraints are mandatory:

1. **Score the reported experience, not physical reality:** If the witness says they were "transported aboard a craft," score Transportation as 2 regardless of whether this was a physical event or a vision. The CDS measures the EXPERIENCE as described.
2. **No external knowledge injection:** Same rule as UAP-ESS — score only what's in the transcript.
3. **Don't pathologize:** Do not reduce scores because the experience sounds "like a dream" or "like sleep paralysis." Score what was described. The CDS is phenomenological, not diagnostic.
4. **Score conservatively on ambiguity:** If it's unclear whether an element was present, score 1 (ambiguous) rather than 2 (definite). Reserve 2 for clear, explicit descriptions.
5. **Score the video holistically:** The unit of analysis is the VIDEO, not an individual encounter. If the speaker describes multiple distinct encounters across their lifetime, score each item based on whether that feature appeared ANYWHERE in the described experiences. Do not attempt to isolate a single "peak" event — the video's overall contact depth is what we measure. Item CD-4d (Pattern/Recurrence) explicitly captures multi-event histories.
6. **Distinguish literal from metaphorical language:** Witnesses often use physical language metaphorically ("I was paralyzed with fear," "I was in a state of shock"). Score only LITERAL descriptions of altered states, physical effects, and paralysis. Metaphorical emotional language belongs in CD-4c (Emotional Overwhelm), not CD-3a (Altered State) or CD-1d (Physical Effects).

## Contact Modality Tags

Before scoring, tag ALL applicable modalities as an ordered array (`string[]`). This is a non-scoring metadata field for analytical filtering — tags do NOT affect any scores. A single encounter may span multiple modalities (e.g., a CE5 meditation that produces a physical sighting that escalates into an abduction).

**Available tags:**

- **`physical_sighting`** — Visual observation of object/craft/entity in waking state, from a distance
- **`close_encounter`** — Physical proximity to object/entity in waking state (within ~500 ft)
- **`dream_vision`** — Contact occurring in dream, hypnagogic/hypnopompic state, or spontaneous vision
- **`meditation_ce5`** — Contact initiated through meditation, CE5 protocol, or intentional practice
- **`abduction`** — Involuntary transportation, examination, or immersive experience (physical or perceived)
- **`ongoing_contact`** — Repeated/sustained contact pattern over time (may include multiple modalities)
- **`ambiguous`** — Modality unclear from the account

**Example:** `["meditation_ce5", "physical_sighting", "close_encounter"]`

> Modality tags do NOT affect scoring. A vivid, bilateral dream contact can score HIGHER than a distant physical sighting. This is intentional — we are measuring depth of the experience as reported, not physical proximity. Tags exist purely for downstream filtering and analysis (e.g., "show me all accounts that include abduction").

---

## The 16 Items (4 Categories × 4 Items)

Each item is scored:
- **0** = Not present — this element is not described or even hinted at in the account
- **1** = Mildly or ambiguously present — mentioned vaguely, partially, or with uncertainty
- **2** = Definitely present — clearly and explicitly described in the account

### Category 1: Observation & Physical Encounter

This category captures whether something anomalous was perceived, what form it took, how close it was, and whether it left physical traces. It maps loosely to the Greyson Scale's "Paranormal" category.

#### CD-1a: Anomalous Perception

**Did the witness perceive something anomalous?**

This is the most basic threshold — did anything unusual happen at all? This includes perception in ANY modality: physical sighting, sound, felt presence, dream figure, or meditation vision. Nearly all accounts score at least 1 here.

**Rating Guidance:**
- Any report of perceiving something unusual = at least 1
- Clear description of a specific anomalous event = 2
- "I just had a feeling something was there" = 1
- "I saw a structured craft hovering silently" = 2
- "In my dream, a being appeared" = 2 (dreams count — this is modality-agnostic)
- If the entire video is commentary with no specific encounter described = 0

| Score | Description |
|-------|-------------|
| 0 | No anomalous perception described |
| 1 | Vague or uncertain — "I thought I saw something," "I had a strange feeling," fleeting peripheral impression |
| 2 | Clear anomalous perception — specific object, entity, sound, presence, or event described with confidence |

---

#### CD-1b: Structured Form

**Was a distinct structured form observed?**

This distinguishes between amorphous phenomena (lights, feelings, vague shapes) and structured ones (craft with geometry, entities with features, geometric patterns). Structure suggests complexity beyond random misidentification.

**Rating Guidance:**
- Amorphous lights, glows, or feelings of presence = 0 or 1
- "A bright orb" = 1 (shape but no internal structure)
- "A disk-shaped craft with a dome on top and lights around the rim" = 2
- "A tall gray being with large black eyes" = 2
- For dreams: "something was there" = 1; "a being with specific features spoke to me" = 2
- Geometric patterns (sacred geometry, symbols, grid structures) in visions = 2
- **Shape-shifting and morphing:** Entities or craft that exhibit shape-shifting, morphing, or hyper-dimensional fluid geometry should be scored as Structured (2) — dynamic complexity represents high structural complexity, not amorphousness

| Score | Description |
|-------|-------------|
| 0 | No distinct form — only vague feelings, intuitions, or general "something" |
| 1 | Partial form — basic shape noted (light, orb, shadow, silhouette) but lacking detail or internal structure |
| 2 | Structured form — craft with specific geometry, entity with described features, geometric patterns, or detailed architecture |

---

#### CD-1c: Proximity

**How close was the encounter?**

This measures the perceived distance between the witness and the anomalous phenomenon. For non-physical modalities (dreams, visions), it measures how immersive and "close" the experience felt.

**Rating Guidance:**
- Distant sky observation = 0 or 1
- Overhead / within a few hundred feet = 1
- In the same room / face-to-face / touching / inside craft = 2
- For dreams and visions: vague background presence = 0; same room / face-to-face = 1; immersive environment (aboard craft, inside a realm) = 2
- "It was miles away" = 0; "It was right above the house" = 1; "It was 10 feet from me" = 2
- **Telepathic/internal contact:** If the presence is perceived as being "inside the mind," involves a merging of consciousness, or the witness describes the entity as "within" them rather than spatially external, this represents the ultimate absence of distance — score as Intimate Proximity (2)

| Score | Description |
|-------|-------------|
| 0 | Distant or no spatial proximity — far away in the sky, or no spatial context described |
| 1 | Moderate proximity — overhead, within a few hundred feet, in the same general area; or dream/vision where entity is perceived nearby |
| 2 | Intimate proximity — within arm's reach, face-to-face, physical touch, inside craft/environment; or immersive vision/dream where witness is fully embedded in the scene |

---

#### CD-1d: Physical Effects

**Were there physical effects on the witness or environment?**

Physical traces that persist after the experience provide important evidence of interaction with something external. This overlaps with UAP-ESS Criterion 6 but here measures the PHENOMENOLOGICAL experience of physical effects, not their evidential weight.

**Rating Guidance:**
- No physical effects mentioned = 0
- Subjective body sensations during the experience (tingling, heat, vibration, paralysis) = 1
- Observable effects after the experience (marks on body, equipment malfunction, ground traces, missing time with physical evidence) = 2
- "I felt paralyzed but nothing happened to my body" = 1
- "I woke up with three triangular marks on my arm" = 2
- "30 minutes of missing time — we were suddenly 20 miles from where we started" = 2

| Score | Description |
|-------|-------------|
| 0 | No physical effects described |
| 1 | Subjective physical sensations during the encounter — tingling, heat, vibration, nausea, temporary paralysis, pressure, weight |
| 2 | Observable or persistent physical effects — marks/burns on body, equipment malfunction, ground traces, missing time with evidence, environmental disturbance |

---

### Category 2: Entity Interaction

This category captures whether a non-human intelligence was perceived and the depth of interaction. It maps to the Greyson Scale's "Transcendental" category (encountering mystical beings/spirits).

#### CD-2a: Entity Perceived

**Was a non-human entity or intelligence perceived?**

This includes ANY form: humanoid, non-humanoid, orb-being, shadow, disembodied voice, felt presence with apparent intelligence, dream figure. The key threshold is: did the witness perceive an OTHER — something with apparent agency, intelligence, or awareness?

**Rating Guidance:**
- No entity of any kind = 0
- "I felt a presence" or "I sensed something watching" = 1
- "I saw a being" / "A figure appeared" / "There were entities aboard the craft" = 2
- For orbs/lights that seem to exhibit intelligent behavior (responding to thought, following, stopping when approached) = 1 or 2 depending on clarity
- AI voice/telepathic presence without visual form = 1 or 2 depending on specificity

| Score | Description |
|-------|-------------|
| 0 | No entity perceived — only objects, lights, or phenomena without apparent intelligence |
| 1 | Ambiguous entity — felt presence, sensed intelligence, orb/light with possibly intelligent behavior, vague dream figure |
| 2 | Clear entity — described with features, observed with apparent agency, voice/communication from an identifiable non-human source |

---

#### CD-2b: Bilateral Awareness

**Did the entity appear to acknowledge or respond to the witness?**

This distinguishes between passive observation (watching an entity that doesn't notice you) and interactive contact (the entity is aware of you and responds). Bilateral awareness is a key marker of close encounter depth.

**Rating Guidance:**
- Entity observed from a distance with no indication of mutual awareness = 0
- Entity seemed to look at the witness, orient toward them, or respond to their presence = 1
- Entity directly addressed, approached, touched, or demonstrably responded to the witness's thoughts/actions = 2
- "They didn't seem to notice me" = 0
- "It turned and looked directly at me" = 1 or 2
- "When I thought 'go away,' it moved backward" = 2

| Score | Description |
|-------|-------------|
| 0 | No bilateral awareness — entity (if present) did not acknowledge the witness |
| 1 | Possible awareness — entity appeared to notice, orient toward, or observe the witness |
| 2 | Clear bilateral interaction — entity directly addressed, approached, touched, or responded to the witness's actions or thoughts |

---

#### CD-2c: Communication

**Was information exchanged between the witness and the entity?**

Communication in UAP contact is frequently described as non-verbal — telepathy, emotional transmission, symbolic imagery, or sudden "downloads" of information. Verbal/audible communication also counts.

**Rating Guidance:**
- No communication of any kind = 0
- Vague emotional transmission ("I felt their emotions") or ambiguous impressions = 1
- Specific information received — words, images, concepts, instructions, data = 2
- "I felt a sense of calm from it" = 1
- "It told me not to be afraid" = 2
- "I received a complex vision about Earth's future" = 2
- One-way "download" with no back-and-forth still counts as 2 if specific content was received

| Score | Description |
|-------|-------------|
| 0 | No communication — entity (if present) did not transmit information |
| 1 | Ambiguous communication — vague emotional impressions, general feelings transmitted, uncertain whether communication occurred |
| 2 | Clear communication — specific information received via telepathy, voice, imagery, symbols, or "download"; content can be described |

---

#### CD-2d: Directed Content

**Did the communication contain specific, directed content?**

This escalates beyond "communication happened" to "what was the content?" General calm/love transmissions rate lower than specific teachings, warnings, prophecies, personal messages, or technical information.

**Rating Guidance:**
- No directed content = 0
- General themes (love, peace, "don't be afraid") = 1
- Specific content (warnings about Earth, personal life instructions, technical information, future predictions, mission assignment) = 2
- "They conveyed a feeling of love" = 1
- "They told me I needed to share this with humanity" = 2
- "They showed me images of ecological collapse and said humanity must change" = 2
- Technical or scientific information (propulsion, physics, biology) = 2

| Score | Description |
|-------|-------------|
| 0 | No directed content — no specific message or teaching |
| 1 | General content — broad themes of love, peace, reassurance, or vague impressions without specifics |
| 2 | Specific directed content — teachings, warnings, prophecies, personal instructions, technical information, mission assignment, or detailed cosmological explanation |

---

### Category 3: Consciousness Alteration

This category captures changes to the witness's state of consciousness during the experience. It maps to the Greyson Scale's "Cognitive" category (time distortion, thought speed, sudden understanding).

#### CD-3a: Altered State

**Was an altered state of consciousness involved?**

Many UAP encounters are accompanied by or embedded within an altered state — trance, paralysis, dissociation, hyper-lucidity, or the experience of being "more real than real." Dream and meditation contacts inherently involve an altered state.

**Rating Guidance:**
- Normal waking consciousness throughout = 0
- Mild alteration — heightened alertness, mild dissociation, "time felt weird" = 1
- Clear altered state — trance, LITERAL paralysis (not metaphorical "frozen with fear"), hyper-lucidity, dreamlike while awake, "more real than real," loss of body awareness = 2
- Dream/meditation contacts: the dream state itself = 1; hyper-lucid or "realer than waking" dream = 2
- "I felt like I was in a trance" = 1 or 2 depending on description
- "My consciousness seemed to expand" = 2
- **Do NOT score extreme emotions as altered states:** "I was in a state of terror" or "I was paralyzed with fear" are emotional descriptions (score in CD-4c), not altered states. Only score CD-3a if there was a distinct shift in cognitive functioning, perception of reality, or lucidity BEYOND the emotional response

| Score | Description |
|-------|-------------|
| 0 | Normal waking consciousness maintained throughout |
| 1 | Mild alteration — heightened awareness, slight dissociation, "surreal" feeling, standard dream state |
| 2 | Clear altered state — trance, paralysis, hyper-lucidity, "more real than real," expanded consciousness, loss of body awareness, or explicitly described state shift |

---

#### CD-3b: Transportation

**Was the witness transported or felt taken somewhere?**

This captures the experience of being moved — physically or in consciousness — to another location: aboard a craft, another realm, another dimension, or simply "somewhere else." Astral travel, immersive visions of other places, and physical abduction all count.

**Rating Guidance:**
- Remained in place throughout = 0
- Felt pulled or drawn; brief sense of being elsewhere; partial out-of-body = 1
- Clearly experienced being somewhere else — aboard a craft, in another realm/dimension, transported to another location, fully immersive vision of another place = 2
- "I felt like I was floating above my body" = 1
- "I was on a table in a white room aboard the craft" = 2
- "I was shown a vast landscape on another world" = 2

| Score | Description |
|-------|-------------|
| 0 | No transportation — witness remained in their original location/state |
| 1 | Partial transportation — felt pulled, brief sense of displacement, partial out-of-body, or momentary flash of another place |
| 2 | Clear transportation — experienced being aboard craft, in another realm/dimension, astral travel, or fully immersive vision of another location |

---

#### CD-3c: Time Distortion

**Was time perception disrupted?**

Time anomalies are one of the most commonly reported features across UAP, NDE, and psychedelic experiences. Missing time (arriving somewhere with unexplained hours lost) is a classic indicator. But time dilation, timelessness, and time compression also count.

**Rating Guidance:**
- Normal time perception = 0
- "Time felt strange" / "It seemed longer than it was" = 1
- Clear missing time, dramatic time dilation, or experience of timelessness = 2
- "What felt like 5 minutes was actually 2 hours" = 2
- "30 minutes of missing time — we can't account for it" = 2
- "It felt like time stopped" = 2

| Score | Description |
|-------|-------------|
| 0 | Normal time perception — no distortion noted |
| 1 | Mild distortion — "time felt weird," subjective sense of time moving differently, brief confusion about duration |
| 2 | Clear time distortion — documented missing time, dramatic dilation/compression, experience of timelessness, or significant unaccountable time gap |

---

#### CD-3d: Enhanced Perception

**Were the witness's perceptions enhanced beyond normal?**

This captures experiences of expanded sensory or cognitive capacity during the encounter — seeing through walls, 360° vision, perceiving energy/auras, knowing things impossibly (claircognizance), or synesthesia.

**Rating Guidance:**
- Normal perception throughout = 0
- Slightly heightened senses ("colors seemed brighter," "I could hear everything clearly") = 1
- Clearly impossible perception — seeing through objects, 360° awareness, knowing information without sensory input, perceiving energy fields or auras = 2
- "Everything seemed hyper-clear" = 1
- "I could see in all directions at once" = 2
- "I suddenly knew things about the beings — their purpose, their origin — without being told" = 2

| Score | Description |
|-------|-------------|
| 0 | Normal perception — no enhancement noted |
| 1 | Mildly enhanced — heightened senses, unusual clarity, vivid colors/sounds |
| 2 | Clearly enhanced beyond normal — impossible perception (seeing through objects, 360° vision), claircognizance, perceiving energy/auras, or synesthesia |

---

### Category 4: Transcendent Elements

This category captures the deepest aspects of the experience — cosmic knowledge, ontological disruption, extreme emotional impact, and recurring patterns. It maps to the Greyson Scale's "Affective" and "Transcendental" categories.

#### CD-4a: Cosmic Knowledge

**Was universal or cosmic knowledge imparted?**

This goes beyond personal messages (scored in CD-2d) to cosmic-scale revelations: the nature of reality, consciousness, humanity's place in the universe, future events, or the structure of existence.

**Rating Guidance:**
- No cosmic knowledge = 0
- Hints or general impressions of "greater truth" = 1
- Specific cosmic content received: nature of reality, universal consciousness, future of humanity, structure of dimensions, history of non-human involvement with Earth = 2
- "I had a sense that there was more to reality" = 1
- "They showed me that consciousness is the fundamental fabric of the universe" = 2
- **Negative cosmic knowledge counts equally:** Cosmic knowledge in UAP encounters is not always positive or enlightening. Terrifying revelations about human powerlessness, apocalyptic futures, simulation theory, or humanity's insignificance score 2 if the content is cosmic in scale, regardless of emotional valence

| Score | Description |
|-------|-------------|
| 0 | No cosmic knowledge imparted |
| 1 | Vague cosmic impressions — sense of "greater truth," general feeling of expanded understanding without specifics |
| 2 | Specific cosmic knowledge — revelations about reality, consciousness, humanity, multiverse, dimensional structure, or cosmic history |

---

#### CD-4b: Ontological Shock

**Did the experience shatter the witness's reality model?**

Ontological shock (Mack, 1994) describes the profound rupture that occurs when a person's fundamental understanding of reality is challenged. This is not just surprise — it's a forced reorganization of one's worldview. The experience feels "more real than real."

**Rating Guidance:**
- No worldview disruption = 0
- "It was strange" or "I couldn't explain it" = 1
- "My entire understanding of reality changed" / "I knew the world was not what I thought" / "It was more real than real" = 2
- Existential crisis following the experience = 2
- "I questioned everything I believed" = 2

| Score | Description |
|-------|-------------|
| 0 | No ontological disruption — experience was strange but didn't challenge fundamental reality model |
| 1 | Mild disruption — confusion, inability to explain, discomfort with implications, "I couldn't make sense of it" |
| 2 | Clear ontological shock — fundamental worldview shattered, "more real than real," existential crisis or revelation, forced reorganization of beliefs about reality |

---

#### CD-4c: Emotional Overwhelm

**Was the emotional impact extreme — beyond normal emotional range?**

This captures emotional experiences that transcend ordinary feelings: profound awe, primal terror, unconditional love, ecstatic surrender, or emotional states that the witness says they have no words for.

**Rating Guidance:**
- Normal emotional response (curiosity, mild fear, excitement) = 0
- Strong emotion (significant fear, deep wonder, strong joy) = 1
- Extreme/transcendent emotion (ineffable awe, primal terror, unconditional love, ecstasy, complete surrender) = 2
- "I was scared" = 0 or 1; "I felt a terror beyond anything I've ever experienced" = 2
- "I felt an overwhelming love that I can't describe in words" = 2
- "I was curious" = 0; "I wept uncontrollably" = 1 or 2

| Score | Description |
|-------|-------------|
| 0 | Normal emotional range — curiosity, mild fear, interest, confusion |
| 1 | Strong emotion — significant fear, deep wonder, awe, strong joy, or distress |
| 2 | Transcendent emotional overwhelm — ineffable awe, primal terror, unconditional love, ecstasy, states described as beyond words or beyond normal human emotional experience |

---

#### CD-4d: Pattern / Recurrence

**Is this part of a recurring pattern of contact?**

Single, isolated events score lower than patterns of repeated contact over time. Lifelong contact histories, escalating encounters, and family/generational patterns indicate deeper engagement.

**Rating Guidance:**
- Single, isolated event with no repetition = 0
- "This happened twice" or "I've had a few experiences" = 1
- Clear pattern: lifelong contact, escalating encounters, regular occurrences, family history of contact, multi-generational pattern = 2
- "This was the only time" = 0
- "I've had maybe three experiences over the years" = 1
- "This has been happening since childhood — my mother had the same experiences" = 2

| Score | Description |
|-------|-------------|
| 0 | Single isolated event — no recurrence described |
| 1 | Some recurrence — a few similar experiences, or mention of earlier/later events |
| 2 | Clear pattern — lifelong contact, regular occurrences, escalating encounters, family/generational pattern, or ongoing relationship with non-human intelligence |

---

## Calculation

**Total Score Range: 0-32 points**

Sum all sixteen item ratings (each 0-2) for total score.

**Data Completeness:** As with UAP-ESS, if an item cannot be evaluated because the account doesn't address it at all, score it 0 and flag as `insufficient_data` in the reasoning. Track `data_completeness` as count of evaluable items out of 16.

### Scoring Levels

| Range | Level | Hynek Parallel | Description |
|-------|-------|----------------|-------------|
| 0-6 | Minimal Contact | CE1 | Distant sighting, brief anomalous perception, no entity interaction |
| 7-12 | Light Contact | CE2 | Physical effects, possible entity, mild consciousness alteration |
| 13-20 | Moderate Contact | CE3 | Clear entity interaction, communication, altered consciousness |
| 21-32 | Deep Contact | CE4-CE5 | Bilateral communication, transportation, cosmic knowledge, ontological shock, recurring pattern |

### Scoring Examples

| Scenario | Items likely scored (examples) | Est. Score | Level |
|----------|-------------------------------|------------|-------|
| Distant light moving oddly for 10s | 1a=1, rest mostly 0 | 1-3 | Minimal |
| Vivid dream: gray alien, eye contact, paralyzed, woke terrified | 1a=2, 1b=2, 2a=2, 2b=1, 3a=2, 4c=1 | 7-10 | Light |
| Backyard orb, dog reacted, felt watched, 30 min missing time | 1a=2, 1b=1, 1c=1, 1d=2, 2a=1, 3c=2 | 7-11 | Light |
| CE5 meditation: saw craft, telepathic message about Earth | 1a=2, 1b=2, 2a=1, 2c=2, 2d=1, 3a=2 | 10-14 | Moderate |
| Bedroom entity, bilateral telepathy, aboard craft, cosmic download, lifelong pattern | Most items score 1-2 | 22-30 | Deep |

---

## Notes on Scale Limitations

1. **Subjectivity of scoring 0 vs. 1:** The boundary between "not present" and "mildly present" is inherently subjective. When in doubt, score 1 and explain in the reasoning.
2. **Modality bias awareness:** While the scale is designed to be modality-agnostic, physical encounters naturally engage Category 1 (Observation) more heavily, while dream/meditation contacts engage Category 3 (Consciousness) more. This is acceptable — different modalities SHOULD produce different category profiles.
3. **Double-counting with UAP-ESS:** Physical Effects appears in both UAP-ESS (Criterion 6) and UAP-CDS (Item 1d). This is intentional — ESS scores evidential weight of physical effects, CDS scores whether they were part of the phenomenological experience.
4. **Recurrence bias:** Item CD-4d (Pattern/Recurrence) rewards accounts that describe a history of contact. A single profound encounter scores lower than a pattern of mild encounters on this item alone. This is a feature, not a bug — patterns are phenomenologically significant.
5. **AI knowledge contamination:** Same constraint as UAP-ESS — score only what's in the transcript.
6. **Cultural framing:** Experiencers may describe the same phenomenon using different cultural frameworks (aliens, angels, djinn, spirits). The CDS scores the PHENOMENOLOGY, not the interpretation. An entity encounter is scored the same regardless of whether the witness calls it an "alien" or a "light being."

---

## Cross-Domain Comparison with Greyson NDE Scale

The UAP-CDS is structurally parallel to the Greyson NDE Scale:

| Feature | Greyson NDE Scale | UAP-CDS |
|---------|-------------------|---------|
| Number of items | 16 | 16 |
| Number of categories | 4 | 4 |
| Score per item | 0-2 | 0-2 |
| Total range | 0-32 | 0-32 |
| Scoring levels | 4 tiers | 4 tiers (different thresholds) |
| Purpose | NDE phenomenological depth | UAP contact phenomenological depth |

**Category mapping:**

| Greyson Category | UAP-CDS Category | Relationship |
|------------------|------------------|--------------|
| Cognitive (time, thought speed, life review, understanding) | Consciousness Alteration (altered state, transportation, time distortion, enhanced perception) | Parallel — both measure cognitive/consciousness changes |
| Affective (peace, joy, cosmic unity, brilliant light) | Transcendent Elements (cosmic knowledge, ontological shock, emotional overwhelm, recurrence) | Adapted — affective experience → transcendent impact |
| Paranormal (enhanced senses, ESP, precognition, OBE) | Observation & Physical Encounter (anomalous perception, structured form, proximity, physical effects) | Adapted — paranormal perception → physical encounter |
| Transcendental (unearthly world, mystical being, spirits, border) | Entity Interaction (entity perceived, bilateral awareness, communication, directed content) | Parallel — both measure encounters with non-human intelligence |

Scores can be compared at the total level (both 0-32) and at the category level (with mapping caveats). A Deep Contact UAP (21-32) is phenomenologically comparable in depth to a Deep NDE (21-32).

---

*Scale developed for Project Profound as part of the UAP-CET (Contact Experience Triad). Companion scales: UAP-ESS (Evidence Strength Scale) and UAP-CTI (Contact Transformation Index).*
