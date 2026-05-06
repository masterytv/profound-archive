# UAP-ESS: UAP Evidence Strength Scale

> **Version:** 0.1 (Draft)
> **Date:** 2026-05-06
> **Status:** Under Review
> **Part of:** UAP-CET (Contact Experience Triad) — see `docs/scales/UAP-CET.md`
> **NDE Parallel:** cvNDE (Claimed Veridical Perception Scale)
> **Score Range:** 7-28 (7 criteria, each scored 1-4)

## Purpose

For First-Person and Reported UAP Contact Accounts

The UAP Evidence Strength Scale (UAP-ESS) is designed to evaluate the evidential strength of UAP encounter claims within first-person accounts or detailed reports shared through audio or video formats (such as YouTube videos, podcasts, or recorded interviews).

Unlike investigative frameworks used by organizations like MUFON or AARO, which require field investigation, physical evidence collection, and researcher access, the UAP-ESS:

- Accepts the account as presented (evaluating quality of claims, not investigating truth)
- Measures evidential strength rather than verified accuracy
- Assesses qualities inherent to the narrative that make encounter claims more or less compelling
- Can be applied to any first-person or reported account without requiring researcher access to witnesses, radar data, or physical evidence

### AI Evaluation Constraints

When this scale is applied by AI in the analysis pipeline, the following constraints are mandatory:

1. **Transcript-only evaluation:** The AI evaluates the narrative claims made by the speaker(s) in the transcript text. The AI is NOT a video forensics tool — it does not analyze raw UAP footage, images, or visual content shown on screen. Scores are based on what the speaker SAYS, not what the camera shows.
2. **No external knowledge injection:** The AI must score ONLY based on information present in the transcript. It must NOT supplement the transcript with knowledge from its training data about famous cases, named witnesses, or known events. If the transcript says "a military pilot saw something" but does not name them or specify their background, the AI scores based on "military pilot" — it does not look up who that pilot might be.
3. **Emotional delivery is not evidence:** The witness's tone of voice, apparent sincerity, crying, conviction, or emotional distress does NOT affect scoring. A calm, matter-of-fact account with strong corroboration scores higher than an emotional, tearful account with no supporting evidence. Evidential strength is about the CONTENT of the claims, not the DELIVERY.

An encounter claim carries greater evidential strength when:

1. The witness has credibility context that reduces likelihood of fabrication
2. The observation was clear, sustained, and multi-sensory
3. The reported details are specific rather than vague
4. The account is corroborated by other witnesses or instruments
5. The experience was unexpected and contradicts the witness's prior beliefs
6. Physical effects on the witness or environment were documented
7. The account was reported before the witness could have been influenced by media or other accounts

## Source Type Flag

Before scoring, classify the source type. This flag does not affect scoring but provides analytical context:

- **`first_person`** — The speaker IS the experiencer. They are describing what happened to them directly. (Tier 1 primary)
- **`reported`** — The speaker describes someone else's experience with specific detail — a researcher presenting a case, a family member recounting an event. (Tier 1 or Tier 2)
- **`commentary`** — The speaker analyzes or discusses UAP topics without presenting a specific first-person account. (Tier 2 primary)

> **Scoring guidance for `commentary` sources:** Criteria 2-4 should be scored based on the BEST specific case evidence discussed in the video, not the commentator's own experience or general claims. If no specific case is discussed in sufficient detail to score, assign minimum scores (all 1s).

### Handling Missing Data

Many accounts — especially `reported` and `commentary` sources — will not contain enough information to evaluate all 7 criteria. When a criterion cannot be evaluated because the account omits that category of information entirely:

1. **Score the criterion as 1** (minimum).
2. **Flag the reasoning as `insufficient_data`** — e.g., `"reasoning": "[insufficient_data] The account does not mention when the experience was first reported."`
3. **Do not assume or infer** information not present in the transcript. Even if the AI recognizes a famous case from its training data, it must score only what the speaker explicitly states.
4. **Track the `data_completeness` metric** — count how many of the 7 criteria were scorable vs. flagged as `insufficient_data`. This allows downstream filtering (e.g., "show me only accounts where at least 5 of 7 criteria were evaluable").

---

## The 7 Criteria

### Criterion 1: Witness Credibility Context

**What is the credibility context of the primary witness?**

This criterion assesses the background and circumstances that affect the likelihood of accurate observation and honest reporting. Professional training in observation, official duty context, and multiple independent witnesses all increase credibility weight.

**Rating Guidance:**
- Listen for professional background mentions (military, aviation, law enforcement, science)
- Note whether the witness was alone or with others
- Consider whether the witness had anything to gain or lose by reporting
- "I'm a Navy pilot and my WSO saw it too" = higher than "I was alone in my backyard"
- Hostile witnesses (skeptics, people whose careers could be damaged) rate higher

| Score | Anchor |
|-------|--------|
| 1 | Anonymous or unverifiable source; no professional context given; pseudonym with no corroborating identity |
| 2 | Named individual with general background; single untrained civilian witness; OR a small group of dependent/related civilian witnesses (e.g., a family in a car, a couple on a walk) |
| 3 | Trained observer (pilot, military, law enforcement, scientist) OR multiple independent witnesses (2-9) confirming similar observations |
| 4 | Official capacity witness (on-duty military, radar operator, flight crew with instrument readings) OR large group (10+) with independent consistent reports |

---

### Criterion 2: Perceptual Clarity

**How clear and detailed was the observation itself?**

This criterion evaluates the quality of the sensory experience — was this a fleeting glimpse or a sustained, clear observation? Multiple sensory channels (visual + auditory + physical sensation) indicate a richer perceptual event that is harder to dismiss as misidentification.

**Rating Guidance:**
- Duration matters: 2 seconds vs. 20 minutes changes everything
- Distance matters: binocular needed vs. filling the windshield
- Conditions matter: daylight/clear sky vs. nighttime/rain
- "I saw a light" = low; "I watched a disk-shaped craft hover 50 feet above me for 10 minutes, silent, with a blue glow underneath" = high
- For dream/meditation contacts: vague feeling vs. hyper-lucid structured encounter with full sensory detail

| Score | Anchor |
|-------|--------|
| 1 | Vague, ambiguous, or fleeting — flash of light, peripheral glimpse, uncertain impression, fragmentary dream |
| 2 | Moderate clarity — distinct shape, color, or behavior noted but limited detail; brief observation (seconds) |
| 3 | Clear observation — structured object or entity described with specific features, sustained viewing (minutes), good conditions |
| 4 | Exceptional clarity — prolonged, close-range observation with multiple sensory channels (visual + auditory + physical sensation); or hyper-lucid non-physical encounter with detailed structured content |

---

### Criterion 3: Specificity of Details

**How specific and potentially verifiable are the reported details?**

Vague impressions that could apply to many situations carry less evidential weight than precise, specific details that could be clearly confirmed or refuted. Details that are unusual, unexpected, or independently checkable score highest.

**Rating Guidance:**
- Numbers, exact times, GPS coordinates, and proper names rate highest
- Details that would be impossible to fabricate without investigation = 4
- "Something in the sky" = low; "A triangular craft with three white lights at the vertices and a red pulsing center, roughly 100 feet wide" = high
- For entity encounters: "a being" = low; "approximately 4 feet tall, gray skin, disproportionately large head, black almond-shaped eyes, three fingers" = high
- Descriptions of anomalous flight characteristics (instantaneous acceleration, lack of visible propulsion, trans-medium movement between air/water, stationary hover with no rotor wash) represent highly structured, specific observational details
- Multiple specific details elevate rating even if individually moderate

| Score | Anchor |
|-------|--------|
| 1 | General impressions only ("bright light", "something in the sky", "I felt a presence") |
| 2 | Some specifics — color, approximate size, general location, time of day, basic shape |
| 3 | Precise details — exact time, specific location, detailed physical descriptions, quoted communications, specific behaviors/maneuvers observed |
| 4 | Highly precise, unique details — exact measurements, names of unknown personnel, technical specifications, information later confirmed independently, details that "no one could have known" |

---

### Criterion 4: Corroboration

**Is the account supported by other witnesses or independent evidence?**

This is often the strongest single indicator of evidential strength. Independent corroboration — especially from strangers or instruments — dramatically reduces the probability of fabrication or misidentification.

**Rating Guidance:**
- Independent matters more than "my spouse saw it too" — strangers in different locations reporting the same event = strong
- Instrumental evidence (radar, FLIR, photos, video) is weighted heavily
- Physical evidence (ground traces, radiation, vehicle interference) adds significant weight
- "I called the police and they confirmed other calls" = 3
- Medical records documenting physiological effects after the event = strong corroboration
- For Tier 2 commentary: assess the corroboration of the CASE being discussed

| Score | Anchor |
|-------|--------|
| 1 | Single witness, no supporting evidence of any kind |
| 2 | Single witness with circumstantial support — consistent with other reports in the area/timeframe, or one other non-independent witness (family member, companion) |
| 3 | Multiple independent witnesses OR single instrumental record (photo, radar return, video, audio recording) |
| 4 | Multiple independent witnesses AND instrumental/physical evidence (radar + video, ground traces + radiation, medical records of physiological effects); OR single witness with multiple independent sensor modalities (e.g., radar + FLIR + visual simultaneously); OR official investigation confirming anomalous nature |

---

### Criterion 5: Unpredictability

**Could the experience have been anticipated, sought, or fabricated?**

This criterion assesses the likelihood that the encounter arose from genuine surprise rather than expectation, active seeking, or pre-existing belief. Encounters that contradict the witness's worldview or occur during unrelated professional duty carry the greatest evidential weight.

**Rating Guidance:**
- Ask: "Was this person looking for this?"
- CE5 meditation sessions, skywatches, and UFO hotspot visits = expected context
- Consider motive: Content creators, book authors, and public figures have incentive structures
- "I was a total skeptic driving to work" = high
- "I was at a contactee gathering practicing protocols" = low
- Military/government witnesses risking career damage = highest credibility context

| Score | Anchor |
|-------|--------|
| 1 | Expected context — at a skywatch, CE5 meditation, known hotspot, or actively seeking contact |
| 2 | Somewhat expected — outdoors at night, interest in the topic but not actively seeking, visiting an area with UAP history |
| 3 | Unexpected — during routine activity, no prior interest in UAP, or skeptic/agnostic about the phenomenon |
| 4 | Highly unexpected — during professional duty (flying, military operations, farming), hostile witness whose experience contradicts their prior beliefs, or person whose career/reputation is damaged by reporting |

---

### Criterion 6: Physical Effects

**Were there measurable physical effects on the witness or environment?**

Physical effects that can be independently observed, measured, or documented provide some of the strongest evidence that something anomalous occurred. Subjective reports of physical sensations are common but carry less weight than observable or documented effects.

**Rating Guidance:**
- Subjective feelings (tingling, heat) are common but unverifiable
- Observable effects that others could confirm (burns, rashes, vehicle stalling) rate higher
- Effects documented by third parties (medical records, equipment readings) rate highest
- Environmental effects are especially compelling (circular ground impressions, broken branches in pattern, compass anomalies)
- Note: Some witnesses report delayed physiological effects (cancer, vision changes, immune issues) — these rate higher if medically documented

| Score | Anchor |
|-------|--------|
| 1 | No physical effects reported or mentioned |
| 2 | Subjective physiological effects only — tingling, heat sensation, nausea, headache, temporary paralysis, emotional overwhelm |
| 3 | Observable physiological effects (burns, rashes, hair loss, sunburn-like marks) OR environmental effects (vehicle/electronics interference, compass deviation, animal reactions, unusual ground markings) |
| 4 | Documented/medical physiological effects (medical records, lab results) OR measurable environmental evidence (radiation readings, electromagnetic anomalies on calibrated instruments, officially documented ground traces) |

---

### Criterion 7: Temporal Precedence of Report

**When was the experience first reported relative to public knowledge and potential contamination?**

This is crucial for ruling out confabulation or unconscious influence from media, other accounts, or social pressure. An account that was documented or told to others BEFORE the witness was exposed to similar stories carries much greater evidential weight.

**Rating Guidance:**
- "I've been watching UFO documentaries for years and then I had this experience" = potential contamination
- "I told my wife immediately when I got home, before I even knew what UAPs were" = strong temporal precedence
- Look for phrases like "the first thing I did was call..." or "I filed a report that night"
- Official reports (MUFON, police, FAA, military channels) provide timestamped documentation
- Accounts recorded/published before similar cases became public knowledge rate highest
- Consider: How many years between event and this video? Decades = more opportunity for memory revision
- **Pre-zeitgeist accounts:** If the transcript states the event occurred before a particular UAP typology was publicly known (e.g., a 1970s account describing characteristics that match modern verified cases), AND the witness indicates they reported it at the time, this elevates the score — the temporal gap actually REDUCES contamination risk for the original report. Score the ORIGINAL report timing, not the video recording date

| Score | Anchor |
|-------|--------|
| 1 | No information about when first reported; reported long after the fact (years/decades); or only reported after consuming significant UAP media |
| 2 | Reported within weeks or months; could have been influenced by media, other accounts, or social context |
| 3 | Reported to others shortly after (within hours/days) and before significant exposure to similar accounts; or filed a report with an organization |
| 4 | Documented contemporaneously — written report filed same day, told multiple witnesses immediately, recorded before any related media coverage, or official filing (police, military, FAA) with timestamp |

---

## Calculation

**Total Score Range: 7-28 points**

Sum all seven criterion ratings (each 1-4) for total score.

**Data Completeness:** Report the number of criteria scored from actual evidence vs. flagged as `insufficient_data`. Format: `data_completeness: 5/7` (meaning 5 criteria had evaluable information, 2 were defaulted to 1).

### Scoring Levels

| Range | Level |
|-------|-------|
| 7-12 | Low Evidential Strength |
| 13-17 | Moderate Evidential Strength |
| 18-22 | High Evidential Strength |
| 23-28 | Exceptional Evidential Strength |

### Critical Threshold Markers

**Strong Account Indicators** (any of these significantly elevates evidential strength):
- Criterion 1 ≥ 3 AND Criterion 4 ≥ 3 (trained observer WITH independent corroboration)
- Criterion 5 = 4 (hostile witness / career risk)
- Criterion 6 ≥ 3 (observable or documented physical effects)
- Criterion 4 = 4 (multiple witnesses AND instrumental evidence)
- Criterion 7 ≥ 3 (reported before contamination possible)

**Limiting Factors** (these cap overall evidential strength regardless of other scores):
- Criterion 4 = 1 (no corroboration) limits maximum practical evidential strength
- Criterion 3 ≤ 2 (vague details) makes the account harder to evaluate
- Criterion 1 = 1 (anonymous source) reduces all other criteria's weight
- Source type = `commentary` without specific case details limits maximum to Moderate

---

## Notes on Scale Limitations

The UAP-ESS assesses evidential strength of claims as presented — it does not and cannot determine whether claims are actually true. Key limitations include:

1. **No independent verification:** All claims are assessed from the account as presented. The UAP-ESS cannot confirm whether events actually occurred as described.
2. **Modality bias:** Physical sighting accounts naturally score higher on criteria like Corroboration and Physical Effects than dream/meditation contacts, even if the latter are subjectively profound. This is intentional — the scale measures EVIDENCE, not DEPTH (see UAP-CDS for phenomenological depth).
3. **Potential for selective reporting:** Witnesses may emphasize details that support their account and omit contradictory information.
4. **Memory considerations:** Time between experience and recording affects recall accuracy. Details often crystallize or shift over repeated retellings.
5. **Platform context:** Interview format, audience expectations, and content platform may influence how an account is presented.
6. **Tier 2 limitation:** When scoring `commentary` or `reported` sources, the evidence strength reflects the CASE DISCUSSED, not the commentator's credibility. A respected researcher discussing a weak case still produces a low score.
7. **AI knowledge contamination:** When scored by AI, the model may "recognize" famous cases from training data and be tempted to inject knowledge not present in the transcript. The `insufficient_data` flagging system and the "transcript-only" constraint mitigate this, but cannot eliminate it entirely.
8. **Emotional bias risk:** Compelling, emotional delivery can unconsciously inflate perceived credibility. The scale explicitly excludes delivery quality from scoring — only the informational content of claims matters.

A high UAP-ESS score indicates an account WORTH INVESTIGATING further with field methodology, not proof that a genuine UAP encounter occurred.

---

## Cross-Domain Comparison with cvNDE

The UAP-ESS is designed to be structurally parallel to the cvNDE Scale used in NDE analysis:

| Feature | cvNDE | UAP-ESS |
|---------|-------|---------|
| Number of criteria | 7 | 7 |
| Score per criterion | 1-4 | 1-4 |
| Total range | 7-28 | 7-28 |
| Scoring levels | 4 tiers (same thresholds) | 4 tiers (identical thresholds) |
| Purpose | Evidential strength of veridical perception | Evidential strength of UAP encounter |

**Criterion mapping:**

| cvNDE Criterion | UAP-ESS Criterion | Relationship |
|-----------------|-------------------|--------------|
| 1. Medical State Severity | 1. Witness Credibility Context | Adapted — both assess circumstances that affect credibility |
| 2. Perceptual Access Impossibility | 2. Perceptual Clarity | Adapted — both assess quality of the perception itself |
| 3. Specificity & Precision | 3. Specificity of Details | Direct parallel |
| 4. Unpredictability | 5. Unpredictability | Direct parallel |
| 5. Self-Reported Verification | 4. Corroboration | Adapted — verification → broader corroboration |
| 6. Verified Perception Weight | 6. Physical Effects | Adapted — verified perceptions → physical evidence |
| 7. Temporal Precedence | 7. Temporal Precedence | Direct parallel |

Scores from both scales can be compared at the total level and at the individual criterion level (with mapping caveats noted above).

---

*Scale developed for Project Profound as part of the UAP-CET (Contact Experience Triad). Companion scales: UAP-CDS (Contact Depth Scale) and UAP-CTI (Contact Transformation Index).*
