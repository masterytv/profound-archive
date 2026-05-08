/**
 * UAP Phenomenological Analysis Module
 *
 * Deep phenomenological extraction for Tier 1 UAP encounters.
 * Copy-Modify source: src/lib/ai/phenomenology-entities.ts (NDE domain)
 * Canonical schema: directives/UAP-PHENOMENOLOGY.md (source of truth)
 *
 * Extracts: encounter flow phases, 9 sensory channels, 18-type entity taxonomy,
 * consciousness alteration (inc. Oz Factor, screen memories), craft observation
 * (inc. Five Observables), physical effects, emotional progression.
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ─── Lazy OpenAI init (avoids build-time env errors — see LEARNINGS.md) ──────

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");
  return new OpenAI({ apiKey });
};

// ─── Enums ───────────────────────────────────────────────────────────────────

const EncounterPhaseEnum = z.enum([
  'precursor', 'onset', 'approach', 'immersion',
  'communication', 'separation', 'aftermath', 'not_stated', 'unknown'
]);

const UapEntityTypeEnum = z.enum([
  'grey', 'tall_grey', 'mantis', 'insectoid_other', 'reptilian',
  'nordic', 'tall_white', 'humanoid', 'hybrid',
  'light_being', 'blue_being', 'angelic', 'demonic',
  'shadow_entity', 'hooded_cloaked', 'robotic', 'amorphous', 'unknown', 'not_stated'
]);

const EntityCountEnum = z.enum(['single', 'few', 'many', 'unknown', 'not_stated']);
const LuminosityEnum = z.enum(['radiant', 'glowing', 'normal', 'dark', 'translucent', 'not_stated', 'unknown']);
const DemeanorEnum = z.enum(['benevolent', 'neutral', 'clinical', 'menacing', 'curious', 'authoritative', 'not_stated', 'unknown']);
const CommMethodEnum = z.enum(['telepathy', 'verbal', 'gesture', 'emotional', 'technological', 'presence_only', 'none', 'not_stated', 'unknown']);
const InteractionTypeEnum = z.enum([
  'observation', 'medical_exam', 'teaching', 'abduction', 'consensual_contact',
  'guided_tour', 'warning', 'task_assignment', 'none', 'not_stated', 'unknown'
]);

const ConsciousnessStateEnum = z.enum(['normal_waking', 'heightened', 'trance', 'paralysis', 'hyper_lucid', 'dissociated', 'not_stated', 'unknown']);
const TimePerceptionEnum = z.enum(['normal', 'dilated', 'compressed', 'missing_time', 'timeless', 'not_stated', 'unknown']);
const ThoughtClarityEnum = z.enum(['enhanced', 'normal', 'diminished', 'overwhelmed', 'controlled_by_other', 'not_stated', 'unknown']);
const MemoryQualityEnum = z.enum(['perfect_recall', 'vivid', 'partial', 'fragmentary', 'screen_memory', 'recovered', 'not_stated', 'unknown']);
const AgencyEnum = z.enum(['full_control', 'partial_control', 'no_control', 'directed', 'not_stated', 'unknown']);
const RealityAssessmentEnum = z.enum(['more_real', 'equally_real', 'dreamlike', 'surreal', 'hyperreal', 'not_stated', 'unknown']);

const CraftShapeEnum = z.enum([
  'disc', 'triangle', 'sphere', 'cigar', 'tic_tac', 'chevron',
  'diamond', 'delta', 'boomerang', 'irregular', 'morphing', 'other', 'unknown', 'none', 'not_stated',
]);
const CraftLuminosityEnum = z.enum(['self_luminous', 'reflective', 'dark', 'pulsating', 'color_shifting', 'not_stated', 'unknown']);
const CraftSoundEnum = z.enum(['silent', 'humming', 'buzzing', 'roaring', 'pulsing', 'other', 'not_stated', 'unknown']);

const DurationEstimateEnum = z.enum(['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years', 'ongoing', 'unknown', 'missing_time', 'not_stated']);

// ─── LLM Output Normalizer ───────────────────────────────────────────────────
// gpt-4o-mini frequently returns "not stated" or "not described" instead of
// the underscored enum value "not_stated". This preprocessor normalizes
// common LLM drift patterns before Zod validation.
//
// IMPORTANT: Only normalize SHORT strings (≤30 chars) without sentence punctuation.
// This targets enum values while preserving readable free-text descriptions,
// labels, and quotes which should keep their natural spaces.

function normalizeLlmOutput(raw: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(raw, (_key, value) => {
      if (typeof value !== 'string') return value;
      const lower = value.toLowerCase().trim();

      // Map common "not stated" variants to canonical enum value (any length)
      if (lower === 'not stated' || lower === 'not described' || lower === 'not_described') {
        return 'not_stated';
      }

      // Only normalize short strings that look like enum values:
      // - ≤ 30 chars (enum values are short; descriptions are long)
      // - No sentence punctuation (periods, commas, colons, question marks)
      // This prevents mangling free-text descriptions, quotes, and labels
      if (lower.includes(' ') && lower.length <= 30 && !/[.,;:!?]/.test(lower)) {
        return lower.replace(/ /g, '_');
      }

      return value;
    })
  );
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const EncounterFlowPhaseSchema = z.object({
  phase: EncounterPhaseEnum,
  label: z.string(),
  present: z.boolean(),
  duration_estimate: DurationEstimateEnum,
  description: z.string(),
  key_quote: z.string(),
});

const SensoryChannelSchema = z.object({
  active: z.boolean(),
  description: z.string(),
  extraordinary: z.boolean(),
  intensity: z.number().min(0).max(10),
});

const EmotionEntrySchema = z.object({
  emotion: z.string(),
  intensity: z.number().min(1).max(10),
  context: z.string(),
  phase: EncounterPhaseEnum.optional(),
});

const ConsciousnessAlterationSchema = z.object({
  state_of_consciousness: ConsciousnessStateEnum,
  time_perception: TimePerceptionEnum,
  thought_clarity: ThoughtClarityEnum,
  memory_quality: MemoryQualityEnum,
  screen_memory_details: z.string(),
  agency: AgencyEnum,
  reality_assessment: RealityAssessmentEnum,
  reality_quote: z.string(),
  oz_factor: z.boolean(),
  ontological_shock_rating: z.number().min(1).max(10),
});

const UapEntityEncounterSchema = z.object({
  order: z.number(),
  entity_type: UapEntityTypeEnum,
  count: EntityCountEnum,
  appearance: z.string(),
  height_estimate: z.string(),
  luminosity: LuminosityEnum,
  demeanor: DemeanorEnum,
  communication_method: CommMethodEnum,
  interaction_type: InteractionTypeEnum,
  message_summary: z.string(),
  message_quote: z.string(),
  behavior: z.string(),
  confidence: z.number().min(0).max(100),
});

const FiveObservablesSchema = z.object({
  instantaneous_acceleration: z.boolean(),
  hypersonic_velocity: z.boolean(),
  low_observability: z.boolean(),
  trans_medium_travel: z.boolean(),
  positive_lift: z.boolean(),
});

const CraftObservationSchema = z.object({
  observed: z.boolean(),
  shape: CraftShapeEnum,
  size_estimate: z.string(),
  color: z.string(),
  luminosity: CraftLuminosityEnum,
  sound: CraftSoundEnum,
  movement: z.array(z.string()),
  five_observables: FiveObservablesSchema,
  description: z.string(),
});

const PhysicalEffectsSchema = z.object({
  witness_physiological: z.array(z.string()),
  vehicle_equipment: z.array(z.string()),
  environmental: z.array(z.string()),
  temporal: z.array(z.string()),
  details: z.string(),
});

const SensoryChannelsSchema = z.object({
  visual: SensoryChannelSchema,
  auditory: SensoryChannelSchema,
  tactile: SensoryChannelSchema,
  olfactory: SensoryChannelSchema,
  gustatory: SensoryChannelSchema,
  kinesthetic: SensoryChannelSchema,
  electromagnetic: SensoryChannelSchema,
  proprioceptive: SensoryChannelSchema,
  noetic: SensoryChannelSchema,
});

// ─── Root Schema ─────────────────────────────────────────────────────────────

export const UapPhenomenologySchema = z.object({
  // Encounter Flow
  encounter_flow: z.array(EncounterFlowPhaseSchema),
  encounter_duration_estimate: z.string(),

  // Sensory Channels
  sensory_channels: SensoryChannelsSchema,

  // Emotional Arc
  emotional_progression: z.array(EmotionEntrySchema),
  dominant_emotion: z.string(),

  // Consciousness
  consciousness_alteration: ConsciousnessAlterationSchema,

  // Entities
  entities: z.array(UapEntityEncounterSchema),
  entity_count: z.number(),
  dominant_entity_type: z.string(),

  // Craft
  craft_observation: CraftObservationSchema,

  // Physical Effects
  physical_effects: PhysicalEffectsSchema,

  // Meta
  distinguishing_features: z.string(),
  encounter_modality: z.string(),
  hynek_classification: z.string(),
});

export type UapPhenomenologyResult = z.infer<typeof UapPhenomenologySchema>;

// ─── Exported sub-types for UI components ────────────────────────────────────

export type EncounterFlowPhase = z.infer<typeof EncounterFlowPhaseSchema>;
export type SensoryChannel = z.infer<typeof SensoryChannelSchema>;
export type EmotionEntry = z.infer<typeof EmotionEntrySchema>;
export type UapEntityEncounter = z.infer<typeof UapEntityEncounterSchema>;
export type CraftObservation = z.infer<typeof CraftObservationSchema>;
export type PhysicalEffects = z.infer<typeof PhysicalEffectsSchema>;
export type ConsciousnessAlteration = z.infer<typeof ConsciousnessAlterationSchema>;
export type FiveObservables = z.infer<typeof FiveObservablesSchema>;

// ─── System Prompt ───────────────────────────────────────────────────────────
// Keep in sync with directives/UAP-PHENOMENOLOGY.md (source of truth)

export const UAP_PHENOMENOLOGY_PROMPT = `You are an expert UAP researcher specializing in phenomenological quality assessment, entity encounter documentation, and craft observation analysis from first-person encounter transcripts.

CONTEXT: This is a punctuated transcript from a YouTube video where someone describes their UAP/UFO/contact experience. The speech may be conversational, non-linear, or include interviewer questions. Focus ONLY on the experiencer's first-person account. Ignore filler words, interviewer commentary, and tangential discussions.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation. Never use em dashes in output text -- use commas or semicolons instead.

OUTPUT SCHEMA:
{
  "encounter_flow": [
    {
      "phase": "precursor" | "onset" | "approach" | "immersion" | "communication" | "separation" | "aftermath",
      "label": "human readable label",
      "present": true/false,
      "duration_estimate": "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years" | "ongoing" | "unknown" | "missing_time",
      "description": "1-2 sentence summary of what happened in this phase",
      "key_quote": "direct quote from transcript (max 40 words)"
    }
  ],
  "encounter_duration_estimate": "total estimated duration of the encounter",

  "sensory_channels": {
    "visual": {"active": true/false, "description": "brief desc", "extraordinary": true/false, "intensity": 1-10},
    "auditory": {"active": true/false, "description": "", "extraordinary": true/false, "intensity": 1-10},
    "tactile": {"active": true/false, "description": "", "extraordinary": true/false, "intensity": 1-10},
    "olfactory": {"active": true/false, "description": "", "extraordinary": true/false, "intensity": 1-10},
    "gustatory": {"active": true/false, "description": "", "extraordinary": true/false, "intensity": 1-10},
    "kinesthetic": {"active": true/false, "description": "", "extraordinary": true/false, "intensity": 1-10},
    "electromagnetic": {"active": true/false, "description": "phone/camera/car malfunction, compass, watch", "extraordinary": true/false, "intensity": 1-10},
    "proprioceptive": {"active": true/false, "description": "paralysis, forced posture, vibration through body", "extraordinary": true/false, "intensity": 1-10},
    "noetic": {"active": true/false, "description": "downloaded info, sudden understanding, implanted knowledge", "extraordinary": true/false, "intensity": 1-10}
  },

  "emotional_progression": [
    {"emotion": "string", "intensity": 1-10, "context": "when this emotion occurred", "phase": "optional phase key"}
  ],
  "dominant_emotion": "the single most prominent emotion across the encounter",

  "consciousness_alteration": {
    "state_of_consciousness": "normal_waking" | "heightened" | "trance" | "paralysis" | "hyper_lucid" | "dissociated" | "not_stated",
    "time_perception": "normal" | "dilated" | "compressed" | "missing_time" | "timeless" | "not_stated",
    "thought_clarity": "enhanced" | "normal" | "diminished" | "overwhelmed" | "controlled_by_other" | "not_stated",
    "memory_quality": "perfect_recall" | "vivid" | "partial" | "fragmentary" | "screen_memory" | "recovered" | "not_stated",
    "screen_memory_details": "if memory_quality is screen_memory, describe the masking image; otherwise empty string",
    "agency": "full_control" | "partial_control" | "no_control" | "directed" | "not_stated",
    "reality_assessment": "more_real" | "equally_real" | "dreamlike" | "surreal" | "hyperreal" | "not_stated",
    "reality_quote": "supporting quote about how real the experience felt, or empty string",
    "oz_factor": true/false,
    "ontological_shock_rating": 1-10
  },

  "entities": [
    {
      "order": 1,
      "entity_type": "grey" | "tall_grey" | "mantis" | "insectoid_other" | "reptilian" | "nordic" | "tall_white" | "humanoid" | "hybrid" | "light_being" | "blue_being" | "angelic" | "demonic" | "shadow_entity" | "hooded_cloaked" | "robotic" | "amorphous" | "unknown",
      "count": "single" | "few" | "many",
      "appearance": "physical description if given, or 'not described'",
      "height_estimate": "3-4 ft" | "5-6 ft" | "6-7 ft" | "enormous" | "variable" | "not_stated",
      "luminosity": "radiant" | "glowing" | "normal" | "dark" | "translucent" | "not_stated",
      "demeanor": "benevolent" | "neutral" | "clinical" | "menacing" | "curious" | "authoritative" | "not_stated",
      "communication_method": "telepathy" | "verbal" | "gesture" | "emotional" | "technological" | "presence_only" | "none" | "not_stated",
      "interaction_type": "observation" | "medical_exam" | "teaching" | "abduction" | "consensual_contact" | "guided_tour" | "warning" | "task_assignment" | "none" | "not_stated",
      "message_summary": "key content conveyed, or 'none'",
      "message_quote": "direct quote from transcript (max 40 words), or empty string",
      "behavior": "narrative description of what the entity DID",
      "confidence": 0-100
    }
  ],
  "entity_count": 0,
  "dominant_entity_type": "the most significant entity type encountered, or 'none'",

  "craft_observation": {
    "observed": true/false,
    "shape": "disc" | "triangle" | "sphere" | "cigar" | "tic_tac" | "chevron" | "diamond" | "delta" | "boomerang" | "irregular" | "morphing" | "other" | "unknown" | "none" | "not_stated",
    "size_estimate": "car-sized" | "football field" | "unknown" | other description,
    "color": "primary color or description",
    "luminosity": "self_luminous" | "reflective" | "dark" | "pulsating" | "color_shifting" | "not_stated",
    "sound": "silent" | "humming" | "buzzing" | "roaring" | "pulsing" | "other" | "not_stated",
    "movement": ["hovering", "instant_acceleration", "zig_zag", "rotating", "trans_medium"],
    "five_observables": {
      "instantaneous_acceleration": true/false,
      "hypersonic_velocity": true/false,
      "low_observability": true/false,
      "trans_medium_travel": true/false,
      "positive_lift": true/false
    },
    "description": "narrative summary of craft observation"
  },

  "physical_effects": {
    "witness_physiological": ["burns", "rashes", "nausea", "headache", "nosebleed", "paralysis", "tingling", "fatigue", "eye_irritation", "hair_loss"],
    "vehicle_equipment": ["car_stall", "electronics_malfunction", "radio_interference", "compass_deviation", "camera_failure", "phone_disruption"],
    "environmental": ["ground_traces", "vegetation_damage", "animal_reaction", "temperature_change", "magnetic_anomaly", "light_anomaly"],
    "temporal": ["missing_time", "time_dilation", "chronological_confusion"],
    "details": "narrative summary of physical effects"
  },

  "distinguishing_features": "1-2 sentence summary of what makes THIS encounter phenomenologically unique",
  "encounter_modality": "physical_sighting" | "close_encounter" | "abduction" | "dream_vision" | "meditation_ce5" | "ongoing_contact",
  "hynek_classification": "CE1" | "CE2" | "CE3" | "CE4" | "CE5" | "NL" | "DD"
}

EXTRACTION RULES:

Encounter Flow:
- Extract ONLY phases explicitly described in the transcript. A simple sighting may only have onset and separation.
- duration_estimate should reflect the experiencer's description (e.g., "it lasted about 10 minutes" = "minutes").
- key_quote must be a DIRECT quote from the transcript, max 40 words. If no good quote exists for that phase, use empty string.

Sensory Channels:
- "extraordinary" means BEYOND normal human capacity (360-degree vision, hearing thoughts, feeling gravity change).
- intensity: 10 = overwhelming/dominant, 1 = barely noticed. Base on descriptive language richness.
- electromagnetic channel: phone/camera/car/watch/compass anomalies, streetlight interference.
- proprioceptive: paralysis, vibration, forced posture changes. Distinct from tactile (external touch).
- noetic: "downloads," sudden knowledge, telepathic data transfers, "just knowing" things.

Entities:
- Extract ALL distinct entities mentioned, in order of appearance during the experience.
- Use the 18-type taxonomy. Never default to "unknown" when morphological details exist that match a specific type.
- If a "group" is mentioned (crowd, many beings), still classify by type and set count to "many."
- interaction_type captures the primary interaction purpose. Use "observation" for passive sightings.
- message_quote should be the experiencer's direct words recounting what was communicated, max 40 words.
- If no entities were encountered, return an empty array and entity_count: 0.
- confidence: how clearly this entity was described (100 = vivid detail, 50 = briefly mentioned, 20 = vague/implied).

Consciousness:
- oz_factor: The Oz Factor (Jenny Randles) = sudden eerie silence, traffic vanishes, dogs stop barking, feeling of isolation from normal reality. Only set true if the experiencer explicitly describes this phenomenon.
- screen_memory_details: Only fill if memory_quality is "screen_memory." Describe the masking image (e.g., "large owl staring at them").
- ontological_shock_rating: 1 = mild surprise, 5 = significant worldview disruption, 10 = complete paradigm collapse requiring years of processing.
- "controlled_by_other" in thought_clarity means the experiencer felt their THOUGHTS (not just body) were being directed or influenced by another intelligence.

Craft:
- If NO craft/object is explicitly described, set observed: false and all other fields to defaults (shape: "none", movement: [], five_observables: all false, etc.).
- Five Observables (AATIP): Only set to true if the behavior is EXPLICITLY described. "It moved fast" alone does not qualify for hypersonic_velocity -- it needs to be described as extraordinary speed.
- movement array: include only observed movement patterns.

Physical Effects:
- Only extract effects EXPLICITLY mentioned by the experiencer. Do NOT infer physical effects from context.
- Arrays should contain only the specific subcategory keys that were described.
- If no physical effects, use empty arrays and empty details string.

ANTI-HALLUCINATION RULE: If a section is not described in the transcript, use empty arrays, "not_stated", false, 0, or empty strings. NEVER infer or fabricate data that is not explicitly stated in the transcript.`;

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Analyzes a UAP encounter transcript for deep phenomenological quality.
 * Extracts encounter flow, sensory channels, entities, consciousness alteration,
 * craft observation, physical effects, and emotional progression.
 *
 * @param subtitles The subtitles_punctuated text content to analyze
 * @returns Validated UapPhenomenologyResult or null on failure
 */
export async function analyzeUapPhenomenology(subtitles: string): Promise<UapPhenomenologyResult | null> {
  if (!subtitles) return null;

  // Same truncation limit as NDE pipeline
  const truncatedSubtitles = subtitles.slice(0, 50000);

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: UAP_PHENOMENOLOGY_PROMPT },
        {
          role: "user",
          content: `Analyze the phenomenological quality, entity encounters, craft observation, and consciousness alteration in this UAP encounter transcript:\n\n${truncatedSubtitles}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      console.error("[uap-phenomenology] Empty response from model");
      return null;
    }

    const raw = JSON.parse(content);
    // Normalize LLM output drift ("not stated" → "not_stated", spaces → underscores)
    const normalized = normalizeLlmOutput(raw);
    const parsed = UapPhenomenologySchema.safeParse(normalized);

    if (!parsed.success) {
      console.error("[uap-phenomenology] Zod validation failed:", JSON.stringify(parsed.error.issues, null, 2));
      // Log the raw output for debugging so we can iterate on the prompt
      console.error("[uap-phenomenology] Raw output keys:", Object.keys(raw));
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("[uap-phenomenology] Analysis error:", error);
    return null;
  }
}
