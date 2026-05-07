# UAP Phenomenological Analysis — Complete Proposal

> **Domain:** UAP Vertical (Tier 1 First-Person Encounters)
> **Parity Target:** NDE Research Breakdown (`PhenomenologyCard` + `EntityEncounters` + `JourneyFlowTimeline`)
> **Copy-Modify Source:** `src/lib/ai/phenomenology-entities.ts` → `src/lib/ai/uap-phenomenology.ts`

---

## 1. Executive Summary

This proposal defines a **structured phenomenological analysis framework** for first-person UAP encounter accounts. It mirrors the depth and rigor of the existing NDE "Research Breakdown" display, which extracts journey flow, sensory channels, emotional progression, altered cognition, distinguishing features, and entity encounters from transcripts.

The UAP version adapts these categories to the UAP encounter domain, drawing on established frameworks:
- **Hynek Classification** (CE1–CE5 proximity scale)
- **Vallée System** (anomaly/reality-transformation categories)
- **Bullard's Abduction Sequence** (7-phase encounter flow)
- **FREE Foundation Survey** (consciousness + aftereffect categories)
- **The Five Observables** (AATIP craft characteristics)

The result is a **single-pass AI extraction** using `gpt-4o-mini` + `json_object` response format, producing a structured JSON blob stored in `uap_analysis.phenomenology_breakdown`.

---

## 2. Relationship to Existing UAP Triad Scores

The UAP vertical already has three quantitative scales:

| Scale | What It Measures | Analogy |
|-------|-----------------|---------|
| **UAP-ESS** (Evidence Strength) | *How credible is the claim?* | cvNDE Scale |
| **UAP-CDS** (Contact Depth) | *What happened?* (phenomenological depth) | Greyson NDE Scale |
| **UAP-CTI** (Transformation) | *How did it change them?* | NDE-TI Scale |

**This new module fills a different role:** It doesn't score — it *describes*. Like the NDE `phenomenology-entities.ts`, it extracts the **qualitative texture** of the encounter: what was sensed, felt, communicated, and how the experience unfolded chronologically.

```
Triad Scores = "How deep/credible/transformative was this?" (quantitative)
Phenomenology = "What was the experience LIKE?" (qualitative description)
```

The CDS already touches some of the same ground (entity perceived, altered state, etc.) but at a coarse 0-2 granularity. The phenomenology module provides **rich narrative detail** — specific entity descriptions, sensory channel breakdowns, emotional arcs, and encounter sequencing.

---

## 3. UAP Encounter Flow (Journey Timeline)

### NDE Equivalent: `JourneyFlowTimeline`
The NDE journey uses phases like: `onset → separation → darkness → light → realm → beings → boundary → return`.

### UAP Encounter Flow: 7 Phases

Adapted from Bullard's abduction sequence, expanded for all encounter modalities:

| Phase | Label | Description | Icon |
|-------|-------|-------------|------|
| `precursor` | **Precursor** | Atmospheric anomaly, equipment interference, feeling of "wrongness," drawn to location | 🌀 |
| `onset` | **Onset/Sighting** | Initial anomalous perception — lights, craft, sounds, presence felt | 👁️ |
| `approach` | **Approach/Proximity** | Encounter escalates — object approaches, entity appears, paralysis begins | ↗️ |
| `immersion` | **Immersion** | Peak experience — aboard craft, face-to-face contact, examination, transportation, vision | 🔮 |
| `communication` | **Communication** | Information exchange — telepathy, verbal, downloads, imagery, conference | 💬 |
| `separation` | **Separation/Return** | Experience ends — returned to location, craft departs, consciousness shifts back | ↩️ |
| `aftermath` | **Aftermath** | Immediate post-encounter — disorientation, missing time realized, physical marks discovered | 🌅 |

**Extraction rule:** Not all phases will appear in every account. A simple sighting may only have `onset → separation`. A full abduction may hit all 7. The AI extracts only phases explicitly described.

**Schema per phase:**
```typescript
{
  phase: EncounterPhase;      // enum key
  label: string;              // human-readable
  present: boolean;           // whether this phase was described
  duration_estimate: string;  // "seconds" | "minutes" | "hours" | "unknown" | "missing_time"
  description: string;        // 1-2 sentence summary of what happened in this phase
  key_quote: string;          // direct quote from transcript
}
```

---

## 4. Sensory Channel Analysis

### NDE Equivalent: `PhenomenologyCard` sensory modalities
The NDE version tracks: visual, auditory, tactile, olfactory, gustatory, kinesthetic.

### UAP Sensory Channels: 9 Modalities

The same 6 base modalities **plus 3 UAP-specific channels** that appear repeatedly in encounter literature:

| Channel | Description | UAP-Specific Notes |
|---------|-------------|-------------------|
| `visual` | What was seen | Craft geometry, light colors, entity appearance, impossible physics |
| `auditory` | What was heard | Hums, buzzes, clicks, silence, voice, frequency tones |
| `tactile` | Touch/temperature | Heat, cold, vibration, paralysis, tingling, pressure, being touched |
| `olfactory` | Smells | Ozone, sulfur, metallic, "electrical," sweet/floral |
| `gustatory` | Taste | Metallic taste (commonly reported near EM phenomena) |
| `kinesthetic` | Movement/body | Floating, levitation, being pulled/transported, g-force, weightlessness |
| `electromagnetic` | EM interference | Phone/camera malfunction, car stalling, watch stopping, streetlight interference |
| `proprioceptive` | Body awareness | Paralysis, loss of motor control, forced posture, vibration through body |
| `noetic` | Direct knowing | Downloaded information, sudden understanding, "just knew," implanted knowledge |

**Schema per channel:**
```typescript
{
  active: boolean;
  description: string;        // brief description of what was experienced
  extraordinary: boolean;     // beyond normal capacity (e.g., seeing through walls, 360° vision)
  intensity: 1-10;           // how prominent this channel was in the account
}
```

---

## 5. Entity Classification Taxonomy

### NDE Equivalent: `EntityEncounters` component
NDE uses: `deceased_relative`, `religious_figure`, `angel`, `guide`, `being_of_light`, `shadow_figure`, `animal`, `group`, `unknown`.

### Research Basis for UAP Entity Taxonomy

The taxonomy below synthesizes entity types documented across multiple academic and field research sources:

- **FREE Foundation Survey** (4,200+ experiencers, 100+ countries) — categorized NHI by morphology, with Greys, Mantis/Insectoid, Reptilian, and Light Beings as the most frequently reported types. ~85% of experiencers described encounters as positive.
- **Jacques Vallée, *Passport to Magonia*** — established the continuity between modern "alien" encounters and historical accounts of fairies, angels, demons, djinn, and other supernatural beings. Argued the same intelligence manifests in culturally-appropriate forms across eras.
- **John Mack's Harvard Research** — documented diverse entity morphologies across 200+ abduction cases, noting Grey, Insectoid, Reptilian, and Light Being archetypes with consistent behavioral patterns.
- **Thomas E. Bullard's Comparative Analysis** — catalogued entity descriptions across 300+ abduction reports, identifying recurring morphological clusters.
- **Hopi Tradition / Indigenous Accounts** — "Ant People" (Anu Sinom) described as ancient insectoid helpers; relevant to modern insectoid encounter reports.
- **Modern Experiencer Communities** — Reports of Tall Whites (Charles Hall accounts), Blue Beings (meditation/spiritual contacts), Hooded/Cloaked figures (shadow-adjacent), and beings described in explicitly angelic or demonic terms.

### UAP Entity Types: 18 Categories

Grouped by morphological family for clarity:

#### Grey Family
| Type | Description | Examples |
|------|-------------|---------|
| `grey` | Small humanoid (3-4 ft), large black eyes, grey skin, bulbous head | Classic "Grey," Zeta Reticuli type, worker/drone |
| `tall_grey` | Larger variant (5-7 ft), often supervisory or medical role | "Doctor" Grey, tall with elongated limbs, leader archetype |

#### Insectoid Family
| Type | Description | Examples |
|------|-------------|---------|
| `mantis` | Praying-mantis morphology, triangular head, compound eyes | Often described as "elder," "director," or "overseer" |
| `insectoid_other` | Non-mantis insectoid — ant-like, spider-like, beetle-like | Hopi "Ant People," arachnid entities, generic insectoid |

#### Reptilian / Scaled
| Type | Description | Examples |
|------|-------------|---------|
| `reptilian` | Scaled skin, vertical-slit pupils, serpentine or lizard-like features | Draco, lizard-like humanoids, sometimes described as aggressive |

#### Human-Like
| Type | Description | Examples |
|------|-------------|---------|
| `nordic` | Tall (6-7 ft), human-like, often blonde hair, blue eyes, fair skin | "Space brothers," Pleiadians, benevolent contactee reports |
| `tall_white` | Very tall (6-9 ft), chalk-white skin, slender, often telepathic | Charles Hall accounts, sometimes linked to military contexts |
| `humanoid` | Generally human-shaped, unclassified subtype | Suited figures, astronaut-like, generic humanoid, uniformed |
| `hybrid` | Mixed human/non-human features | Reported in abduction breeding programs, human-Grey hybrids |

#### Luminous / Non-Physical
| Type | Description | Examples |
|------|-------------|---------|
| `light_being` | Non-physical, luminous, formless or semi-formed | Orbs of consciousness, luminous cloud entities |
| `blue_being` | Blue-hued, luminous, often in meditation/spiritual contexts | Blue light entities, associated with healing and spiritual growth |
| `angelic` | Winged, radiant, explicitly described in religious/angelic terms | Angels, seraphim-like beings, divine messengers |
| `demonic` | Dark, threatening, explicitly described in infernal/demonic terms | Demonic entities, malevolent beings with horns/features, succubi |

#### Shadow / Cloaked
| Type | Description | Examples |
|------|-------------|---------|
| `shadow_entity` | Dark, silhouette, absence of light, 2D or featureless | Shadow people, dark figures, "Hat Man" |
| `hooded_cloaked` | Entity wearing robes, cloaks, or hoods obscuring features | Cloaked figures, robed beings, monk-like entities |

#### Mechanical / Other
| Type | Description | Examples |
|------|-------------|---------|
| `robotic` | Mechanical, semi-organic, or AI-like | Drones, mechanical entities, cybernetic beings |
| `amorphous` | No fixed form, shape-shifting, mist-like | Plasma entities, morphing beings, cloud/fog intelligence |
| `unknown` | Entity described but type unclear from account | Insufficient morphological detail to classify |

> [!NOTE]
> **Design Decision — Vallée's Continuity Principle:** The taxonomy intentionally includes `angelic` and `demonic` as distinct types rather than forcing them into `light_being` or `shadow_entity`. Vallée's research demonstrates that experiencers who describe beings in explicitly religious terms are reporting a phenomenologically distinct experience from those who describe "orbs of light" or "shadow people." The label the experiencer uses IS part of the phenomenological data.

**Schema per entity:**
```typescript
{
  order: number;                    // appearance order
  entity_type: UapEntityType;       // from 18-type taxonomy above
  count: "single" | "few" | "many"; // how many of this type
  appearance: string;               // physical description
  height_estimate: string;          // "3-4 ft" | "6-7 ft" | "enormous" | "not_stated"
  luminosity: "radiant" | "glowing" | "normal" | "dark" | "translucent" | "not_stated";
  demeanor: "benevolent" | "neutral" | "clinical" | "menacing" | "curious" | "authoritative" | "not_stated";
  communication_method: "telepathy" | "verbal" | "gesture" | "emotional" | "technological" | "presence_only" | "none" | "not_stated";
  interaction_type: "observation" | "medical_exam" | "teaching" | "abduction" | "consensual_contact" | "guided_tour" | "warning" | "task_assignment" | "none" | "not_stated";  // ← NEW: structured interaction taxonomy (from advisory review)
  message_summary: string;          // key content conveyed
  message_quote: string;            // direct quote (≤40 words)
  behavior: string;                 // narrative description of what the entity DID
  confidence: number;               // 0-100, how clearly described
}
```

---

## 6. Consciousness & Cognition Alteration

### NDE Equivalent: `PhenomenologyCard` altered_cognition section

### UAP Altered Cognition Framework

| Dimension | Values | UAP-Specific Notes |
|-----------|--------|-------------------|
| `state_of_consciousness` | `normal_waking` \| `heightened` \| `trance` \| `paralysis` \| `hyper_lucid` \| `dissociated` \| `not_stated` | UAP adds `paralysis` and `trance` as common states |
| `time_perception` | `normal` \| `dilated` \| `compressed` \| `missing_time` \| `timeless` \| `not_stated` | `missing_time` is UAP-critical; distinct from NDE `timeless` |
| `thought_clarity` | `enhanced` \| `normal` \| `diminished` \| `overwhelmed` \| `controlled_by_other` \| `not_stated` | `overwhelmed` for ontological shock; `controlled_by_other` for cognitive override by NHI (distinct from physical paralysis — advisory review addition) |
| `memory_quality` | `perfect_recall` \| `vivid` \| `partial` \| `fragmentary` \| `screen_memory` \| `recovered` \| `not_stated` | `screen_memory` = false/masking memories (owls, deer, absurd imagery); `recovered` = hypnotic regression (advisory review addition) |
| `agency` | `full_control` \| `partial_control` \| `no_control` \| `directed` \| `not_stated` | Critical UAP dimension: was the witness in control? |
| `reality_assessment` | `more_real` \| `equally_real` \| `dreamlike` \| `surreal` \| `hyperreal` \| `not_stated` | Same as NDE + `hyperreal` |
| `oz_factor` | `boolean` | **The Oz Factor** (Jenny Randles): sudden, eerie environmental silence — dogs stop barking, wind stops, traffic vanishes, feeling of isolation from normal reality. Multi-sensory phenomenon distinct from auditory silence alone. (advisory review addition) |
| `screen_memory_details` | `string` | If `memory_quality = screen_memory`, describe what the experiencer recalls as the masking image (e.g., "saw a large owl staring at them") |
| `ontological_shock_rating` | `1-10` | How severely did this encounter shatter their prior worldview? 1 = mild confusion, 10 = complete paradigm collapse. Complements `reality_assessment` with a scalar intensity. (advisory review addition) |

---

## 7. Physical & Environmental Effects

This section has no NDE equivalent — it's unique to UAP encounters.

### Physical Effects Categories

| Category | Subcategories |
|----------|--------------|
| **Witness Physiological** | burns, rashes, nausea, headache, nosebleed, paralysis, tingling, fatigue, eye_irritation, hair_loss |
| **Vehicle/Equipment** | car_stall, electronics_malfunction, radio_interference, compass_deviation, camera_failure, phone_disruption |
| **Environmental** | ground_traces, vegetation_damage, animal_reaction, temperature_change, magnetic_anomaly, light_anomaly |
| **Temporal** | missing_time, time_dilation, chronological_confusion |

**Schema:**
```typescript
{
  physical_effects: {
    witness_physiological: string[];     // array of subcategory keys
    vehicle_equipment: string[];
    environmental: string[];
    temporal: string[];
    details: string;                     // narrative summary
  }
}
```

---

## 8. Emotional Progression

### NDE Equivalent: `PhenomenologyCard` emotional_progression

Same structure, different typical arc. NDE emotions tend to: fear → peace → love → reluctance.
UAP emotions commonly follow: confusion → fear → awe → peace/terror (bifurcates).

```typescript
emotional_progression: [
  {
    emotion: string;      // e.g., "confusion", "terror", "awe", "peace", "curiosity"
    intensity: 1-10;
    context: string;      // when in the encounter this emotion occurred
    phase: EncounterPhase; // which encounter flow phase this maps to
  }
]
```

---

## 9. Craft Observation (UAP-Specific)

No NDE equivalent. Unique to UAP domain.

**UI Behavior:** When `observed: false`, the Craft Observation card **still renders** with a "No Craft Observed" badge. This enables sorting/filtering encounters by craft type and makes non-craft encounters (bedroom visitations, meditation contacts) explicitly discoverable.

### The Five Observables (AATIP)

The Five Observables — defined by the Pentagon's AATIP program — are **promoted as a prominent feature** within the Craft Observation card. Many researchers and investigators use these as primary verification criteria for truly anomalous craft behavior. Each observable gets its own clearly labeled indicator (active/inactive) rather than being buried in a sub-section.

```typescript
craft_observation: {
  observed: boolean;                        // false = "No Craft Observed" badge in UI
  shape: "disc" | "triangle" | "sphere" | "cigar" | "tic_tac" | "chevron" | "diamond" | "irregular" | "morphing" | "other" | "none" | "not_stated";
  size_estimate: string;                    // "car-sized", "football field", "unknown"
  color: string;                            // primary color/description
  luminosity: "self_luminous" | "reflective" | "dark" | "pulsating" | "color_shifting" | "not_stated";
  sound: "silent" | "humming" | "buzzing" | "roaring" | "pulsing" | "other" | "not_stated";
  movement: string[];                       // ["hovering", "instant_acceleration", "zig_zag", "rotating", "trans_medium"]
  five_observables: {
    instantaneous_acceleration: boolean;    // Prominent in UI
    hypersonic_velocity: boolean;           // Prominent in UI
    low_observability: boolean;             // Prominent in UI
    trans_medium_travel: boolean;           // Prominent in UI
    positive_lift: boolean;                 // Prominent in UI
  };
  description: string;                      // narrative summary
}
```

---

## 10. Complete Output Schema

The full JSON blob extracted by the AI:

```typescript
interface UapPhenomenologyResult {
  // ── Encounter Flow ──
  encounter_flow: EncounterFlowPhase[];         // 0-7 phases
  encounter_duration_estimate: string;           // total estimated duration
  
  // ── Sensory Channels ──
  sensory_channels: {
    visual: SensoryChannel;
    auditory: SensoryChannel;
    tactile: SensoryChannel;
    olfactory: SensoryChannel;
    gustatory: SensoryChannel;
    kinesthetic: SensoryChannel;
    electromagnetic: SensoryChannel;
    proprioceptive: SensoryChannel;
    noetic: SensoryChannel;
  };
  
  // ── Emotional Arc ──
  emotional_progression: EmotionEntry[];        // 2-8 entries
  dominant_emotion: string;
  
  // ── Consciousness ──
  consciousness_alteration: {
    state_of_consciousness: ConsciousnessState;
    time_perception: TimePerception;
    thought_clarity: ThoughtClarity;           // includes "controlled_by_other"
    memory_quality: MemoryQuality;             // includes "screen_memory"
    screen_memory_details: string;             // masking image description if screen_memory
    agency: AgencyLevel;
    reality_assessment: RealityAssessment;
    reality_quote: string;
    oz_factor: boolean;                        // The Oz Factor (Jenny Randles)
    ontological_shock_rating: number;          // 1-10 paradigm disruption intensity
  };
  
  // ── Entities ──
  entities: UapEntityEncounter[];               // 0-N entities, each with interaction_type
  entity_count: number;
  dominant_entity_type: string;
  
  // ── Craft ──
  craft_observation: CraftObservation;
  
  // ── Physical Effects ──
  physical_effects: PhysicalEffects;
  
  // ── Meta ──
  distinguishing_features: string;              // 1-2 sentence summary of what makes THIS encounter unique
  encounter_modality: string;                   // "physical_sighting" | "close_encounter" | "abduction" | "dream_vision" | "meditation_ce5" | "ongoing_contact"
  hynek_classification: string;                 // "CE1" | "CE2" | "CE3" | "CE4" | "CE5" | "NL" | "DD"
}
```

---

## 11. AI Pipeline Design

### Architecture: Single-Pass Extraction

```
gpt-4o-mini + response_format: { type: "json_object" }
Temperature: 0.2
Truncation: 50,000 chars
Cost: ~$0.001-0.002/call
```

**Why single-pass:** The NDE equivalent (`phenomenology-entities.ts`) successfully extracts phenomenology + entities in a single pass. The UAP version has more fields but the same pattern — a structured prompt with an explicit JSON schema yields reliable results from `gpt-4o-mini`.

### Prompt Structure

```
SYSTEM: You are an expert UAP researcher specializing in phenomenological 
        quality assessment and entity encounter documentation from first-person 
        encounter transcripts...

        CONTEXT: [transcript constraints]
        
        OUTPUT SCHEMA: [full JSON schema from §10]
        
        EXTRACTION RULES:
        - Encounter Flow: Extract only phases explicitly described...
        - Sensory: "extraordinary" means beyond normal capacity...
        - Entities: Extract ALL distinct entities, in order of appearance...
        - Craft: Only score if a craft/object is explicitly described...
        - Physical Effects: Only extract effects explicitly mentioned...
        
USER:   Analyze this UAP encounter transcript for phenomenological quality 
        and entity encounters:
        
        [transcript]
```

### Pipeline Integration Point

In `src/lib/pipeline/intake-uap.ts`, the new analysis call should be added to the **Tier 1 Analysis Suite** (Step 10.5), running **in parallel** with the existing triad scores:

```typescript
// Step 10.5: Analysis Suite (Tier 1 only)
if (tier === 1) {
  const [evidenceResult, contactResult, transformResult, phenomResult] = 
    await Promise.allSettled([
      analyzeUapEvidenceScore(punctuated),
      analyzeUapContactDepthScore(punctuated),
      analyzeUapTransformationScore(punctuated),
      analyzeUapPhenomenology(punctuated),        // ← NEW
    ]);
  
  // ... store phenomResult.value in uap_analysis.phenomenology_breakdown
}
```

---

## 12. Database Schema

### Target Column: `uap_analysis.phenomenology_breakdown`

```sql
ALTER TABLE uap_analysis 
ADD COLUMN IF NOT EXISTS phenomenology_breakdown JSONB;
```

The entire `UapPhenomenologyResult` JSON blob is stored in this single JSONB column. This follows the same pattern as `evidence_breakdown`, `contact_depth_breakdown`, and `transformation_breakdown`.

---

## 13. UI Component Blueprint: `UapResearchBreakdown`

### Component Hierarchy

```
UapResearchBreakdown (collapsible section)
├── EncounterFlowTimeline          — Pill-based phase sequence (green palette)
├── SensoryChannelsGrid            — 9-channel meter display
├── EmotionalArcChart              — Emotion progression with intensity bars
├── ConsciousnessPanel             — 6-dimension cognitive state display
├── CraftObservationCard           — Shape/movement/observables display
├── PhysicalEffectsGrid            — Categorized effect badges
├── UapEntityEncounters            — Expandable entity detail cards
└── DistinguishingFeaturesBanner   — Highlight quote
```

### Design Identity

- **Color Palette:** Green-dominant "Tinted Skin" UAP identity
  - Primary accent: `green-500`/`green-600`
  - Meter fills: `green-400` → `green-600` gradient
  - Entity cards: `green-50` dark:`green-900/20` borders
- **Typography:** Crimson Pro for section headers, system font for body
- **Layout:** Matches NDE `NderfAnalysisSection` collapsible structure
- **Icons:** Lucide icon set (consistent with rest of platform)

### Encounter Flow Timeline (Visual)

```
┌─────────────────────────────────────────────────────────┐
│ 🌀 Precursor → 👁️ Onset → ↗️ Approach → 🔮 Immersion  │
│                 → 💬 Communication → ↩️ Return → 🌅 After│
│                                                         │
│  [precursor]  [onset]   [approach] [immersion]          │
│    "felt      "saw      "craft     "found myself        │
│     drawn"     light"    closer"    inside"              │
└─────────────────────────────────────────────────────────┘
```

Active phases shown as green pills with descriptions. Inactive phases shown as grey/muted pills.

### Sensory Channels (Visual)

```
┌─ Sensory Channels ─────────────────────┐
│ 👁 Visual      ████████░░ 8/10  ★      │
│ 👂 Auditory    ████░░░░░░ 4/10        │
│ ✋ Tactile     ██████░░░░ 6/10  ★      │
│ 👃 Olfactory   ░░░░░░░░░░ —           │
│ 👅 Gustatory   ░░░░░░░░░░ —           │
│ 🏃 Kinesthetic █████░░░░░ 5/10        │
│ ⚡ EM Effects   ████████░░ 8/10  ★      │
│ 🫀 Propriocept. ███░░░░░░░ 3/10        │
│ 🧠 Noetic      ██████████ 10/10 ★     │
│                                        │
│ ★ = Extraordinary                      │
└────────────────────────────────────────┘
```

---

## 14. Comparison: NDE vs. UAP Phenomenology

| Dimension | NDE | UAP | Notes |
|-----------|-----|-----|-------|
| Journey Phases | 8 (onset→return) | 7 (precursor→aftermath) | Different sequence, similar timeline concept |
| Sensory Channels | 6 standard | 6 standard + 3 UAP-specific (EM, proprioceptive, noetic) | UAP has unique EM interference channel |
| Entity Types | 10 (deceased, angel, guide...) | 18 (grey, mantis, nordic, angelic, demonic...) | Completely different taxonomies; UAP includes Vallée continuity types |
| Cognition | 4 dimensions | 6 dimensions (+agency, +time_perception) | UAP adds missing time and control loss |
| Physical Effects | None (NDE is non-physical) | 4 categories | UAP-specific; no NDE equivalent |
| Craft | None | Full observation schema | UAP-specific; no NDE equivalent |
| Emotional Arc | Same structure | Same structure + phase mapping | UAP ties emotions to encounter phases |
| Reality Assessment | Same | Same + "hyperreal" | Near-identical |

---

## 15. Implementation Checklist

### Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| **[NEW]** | `src/lib/ai/uap-phenomenology.ts` | Prompt, Zod schema, types, analysis function |
| **[MODIFY]** | `src/lib/pipeline/intake-uap.ts` | Add `analyzeUapPhenomenology` to Tier 1 parallel analysis |
| **[MIGRATION]** | `supabase/migrations/xxx_add_phenomenology_breakdown.sql` | Add `phenomenology_breakdown JSONB` column |
| **[NEW]** | `src/components/uap/UapResearchBreakdown.tsx` | Main collapsible container |
| **[NEW]** | `src/components/uap/EncounterFlowTimeline.tsx` | Phase pill timeline |
| **[NEW]** | `src/components/uap/SensoryChannelsGrid.tsx` | 9-channel meter display |
| **[NEW]** | `src/components/uap/UapEntityEncounters.tsx` | Entity detail cards |
| **[NEW]** | `src/components/uap/CraftObservationCard.tsx` | Craft details panel |
| **[NEW]** | `src/components/uap/ConsciousnessPanel.tsx` | Cognitive alteration display |
| **[MODIFY]** | `src/app/uap/encounters/[slug]/page.tsx` | Render `UapResearchBreakdown` below summary |

### Estimated Cost per Video

| Component | Model | Cost |
|-----------|-------|------|
| Classification | gpt-4o | ~$0.01 |
| Evidence (UAP-ESS) | gpt-4o-mini | ~$0.001 |
| Contact Depth (UAP-CDS) | gpt-4o-mini | ~$0.001 |
| Transformation (UAP-CTI) | gpt-4o-mini | ~$0.001 |
| **Phenomenology (NEW)** | gpt-4o-mini | ~$0.002 |
| **Total per Tier 1 video** | — | **~$0.015** |

---

## 16. Resolved Design Decisions

All four original open questions have been resolved:

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| Q1 | Entity Taxonomy Scope | **Expanded to 18 types** — added `angelic`, `demonic`, `hooded_cloaked`, `tall_white`, `blue_being`, `insectoid_other` | Deep research confirmed these are distinct phenomenological categories in experiencer literature. Vallée's continuity principle supports treating religious-frame entities as distinct from generic light/shadow types. |
| Q2 | Craft Section for non-craft encounters | **Show "No Craft Observed"** badge | Enables sorting/filtering by craft type. Makes non-craft encounters (bedroom, meditation) explicitly discoverable as a data category. |
| Q3 | Five Observables prominence | **Prominent feature**, not hidden sub-section | Widely used in ufology as verification criteria for truly anomalous craft. Important for credibility with serious researchers. |
| Q4 | Backfill strategy | **Deferred** until trial testing complete | Run phenomenology analysis on 3-5 diverse transcripts first. Iterate on prompt/schema. Batch-backfill all existing Tier 1s only after trials pass. |

---

## 17. Verification Plan

### Trial Testing Protocol (Before Backfill)

> [!WARNING]
> **Do NOT batch-backfill until trials are complete and approved.** The prompt will likely need 2-3 iterations.

1. Run `analyzeUapPhenomenology()` against 3-5 diverse Tier 1 transcripts:
   - A simple sighting (CE1/CE2) — should have few phases, minimal entities
   - A contact/abduction account (CE3/CE4) — should have rich entities, multiple phases
   - A meditation/CE5 account — should emphasize consciousness alteration, noetic channel
   - An entity-heavy account — should classify entities into correct taxonomy types
   - A craft-only sighting — should populate Five Observables, minimal entity data
2. Validate Zod parsing passes for all outputs
3. Review entity type classifications for accuracy against transcript content
4. Iterate on prompt if classification errors appear
5. **User approval gate** before proceeding to backfill

### Post-Approval Backfill
- Batch-process all existing Tier 1 UAP videos (~50+, ~$0.10 total cost)
- Verify UI renders all sections correctly with real data

### UI Verification
- Visual comparison of the rendered `UapResearchBreakdown` against the existing NDE Research Breakdown on a live video page
- Confirm green palette consistency with UAP "Tinted Skin" design identity
- Test collapsible behavior and mobile responsiveness
- Verify Five Observables render prominently in Craft Observation card
- Verify "No Craft Observed" badge renders correctly for non-craft encounters

---

## Appendix A: Research Sources for Entity Taxonomy

| Source | Contribution to Taxonomy | Key Entities Documented |
|--------|-------------------------|------------------------|
| **FREE Foundation Survey** (4,200+ participants) | Largest quantitative study of contact experiences | Grey, Insectoid/Mantis, Reptilian, Light Being, Human-like (Nordic), Shadow |
| **Jacques Vallée — *Passport to Magonia* (1969)** | Historical continuity thesis — same phenomenon, different cultural masks | Fairies/elves → Nordics, Angels → Angelic, Demons → Demonic, Djinn → Amorphous |
| **John Mack — Harvard Abduction Research** | 200+ clinical case studies with consistent morphological clusters | Grey, Tall Grey, Insectoid, Reptilian, Light Being |
| **Thomas E. Bullard — Comparative Abduction Analysis** | 300+ abduction reports catalogued and cross-referenced | Grey (most common), Insectoid, Nordic, Hooded/Robed figures |
| **Charles Hall — Tall White Accounts** | Detailed descriptions of a specific entity subtype | Tall White (distinct from Nordic) |
| **Hopi Tradition (Anu Sinom)** | Indigenous accounts of "Ant People" — insectoid helpers | Insectoid (non-mantis) |
| **Modern Experiencer Communities** | Blue Beings in meditation/CE5 contexts; Hooded/Cloaked in shadow-adjacent encounters | Blue Being, Hooded/Cloaked |
| **John Keel — *The Mothman Prophecies*; Vallée — control system theory** | "Ultraterrestrial" hypothesis — indigenous Earth intelligences | Shadow Entity, Demonic, Amorphous |

> [!NOTE]
> **Status: Advisory AI review complete.** Four concepts integrated (see Appendix B). Proposal is ready for implementation planning upon user approval.

---

## Appendix B: Advisory AI Review — Integration Summary

An advisory AI produced an independent phenomenological analysis proposal. After critical comparison, **4 concepts** were identified as genuine additions to our framework and integrated above. The remainder was already covered (better) by our existing proposal.

### ✅ Adopted (4 additions)

| Concept | What It Adds | Where Integrated |
|---------|-------------|-----------------|
| **The Oz Factor** | Explicit boolean for the sudden environmental silence/isolation phenomenon (Jenny Randles). Multi-sensory — not just auditory. | §6 `consciousness_alteration.oz_factor` |
| **Screen Memories** | Distinct `memory_quality` value for false/masking memories (owls, deer, absurd imagery) + detail field | §6 `memory_quality: "screen_memory"` + `screen_memory_details` |
| **`controlled_by_other`** | Cognitive override by NHI — distinct from physical paralysis (`agency: no_control`) | §6 `thought_clarity: "controlled_by_other"` |
| **`interaction_type` enum on entities** | Structured taxonomy replacing free-text behavior: `observation`, `medical_exam`, `teaching`, `abduction`, `consensual_contact`, `guided_tour`, `warning`, `task_assignment` | §5 entity schema |

### Also adopted from advisory (scalar):
| Concept | What It Adds | Where Integrated |
|---------|-------------|-----------------|
| **Ontological Shock Rating** | 1-10 scalar for worldview disruption intensity. Complements the enum `reality_assessment`. | §6 `ontological_shock_rating` |

### ❌ Already covered (superior in our version)

| Advisory Element | Our Coverage | Verdict |
|-----------------|-------------|---------|
| Entity types (8 types) | We have 18 types with morphological families + research citations | Ours is far more comprehensive |
| Sensory modalities (4 channels) | We have 9 channels including EM, proprioceptive, noetic | Ours covers 2.25× more channels |
| Journey timeline (5 phases) | We have 7 phases from Bullard's sequence with quotes + durations | Ours is academically grounded |
| Craft observation (basic) | We have full schema + Five Observables (prominent) | Ours includes AATIP verification criteria |
| Physical effects | We have 4-category system with granular subcategories | Advisory had none |
| `mechanical_hum` boolean | Covered by our `auditory.description` free text | Adequate coverage |
| `vibration` / `temperature_change` booleans | Covered by `tactile` + `proprioceptive` channels | Our 9-channel system is richer |
| `physical_marks` boolean | In our `physical_effects.witness_physiological` array | More granular in ours |
| Emotional progression | Same structure | Ours adds encounter-phase mapping |
| Database schema | Advisory didn't specify | We defined `uap_analysis.phenomenology_breakdown JSONB` |
| Pipeline integration | Advisory didn't specify | We defined parallel execution in intake-uap.ts |
| Backfill / testing strategy | Advisory didn't specify | We defined trial protocol + approval gate |
