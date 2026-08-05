/**
 * UAP-CDS: Contact Depth Scale Analysis Module
 *
 * Copy-Modify from: src/lib/ai/greyson.ts (NDE Greyson Scale scoring pattern)
 * Scale reference: docs/scales/UAP-CDS.md
 *
 * Measures phenomenological depth of UAP contact experiences
 * across 16 items in 4 categories (each scored 0-2, total 0-32).
 *
 * Uses gpt-4o-mini + OpenAI JSON mode (~$0.001/call).
 * Tier 1 only (first-person encounter accounts).
 */

import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';
import { z } from 'zod';

// ─── Lazy OpenAI client ─────────────────────────────────────────────────────

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
  return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'uap-contact-depth' });
};

// ─── Prompt (engineered from UAP-CDS rubric) ─────────────────────────────────

export const UAP_CONTACT_DEPTH_PROMPT = `You are an expert UAP researcher analyzing the phenomenological depth of a UAP contact experience. Analyze the following transcript using the UAP Contact Depth Scale (UAP-CDS).

The UAP-CDS measures WHAT HAPPENED in the experience, not whether it is true (UAP-ESS) or how it changed the person (UAP-CTI). It is deliberately modality-agnostic: physical sightings, dream contacts, meditation encounters, and abductions are all scored on the same scale.

CRITICAL CONSTRAINTS:
1. Score the REPORTED EXPERIENCE, not physical reality. If the witness says they were "transported aboard a craft," score Transportation as 2 regardless of modality.
2. NO EXTERNAL KNOWLEDGE: Score only what is in the transcript.
3. DO NOT PATHOLOGIZE: Do not reduce scores because the experience sounds "like a dream" or "like sleep paralysis."
4. SCORE CONSERVATIVELY ON AMBIGUITY: If unclear whether an element was present, score 1 (ambiguous) rather than 2 (definite).
5. SCORE THE VIDEO HOLISTICALLY: The unit of analysis is the VIDEO, not a single event. If multiple encounters are described, score each item based on whether that feature appeared ANYWHERE in the described experiences.
6. DISTINGUISH LITERAL FROM METAPHORICAL: "I was paralyzed with fear" is emotional (CD-4c), not an altered state (CD-3a). "I was in a state of shock" is NOT an altered state. Only score literal descriptions.

BEFORE SCORING, tag ALL applicable contact modalities as an ordered array:
- "physical_sighting" — Visual observation of object/craft/entity in waking state, from a distance
- "close_encounter" — Physical proximity within ~500 ft in waking state
- "dream_vision" — Contact in dream, hypnagogic/hypnopompic state, or vision
- "meditation_ce5" — Contact initiated through meditation, CE5 protocol, or intentional practice
- "abduction" — Involuntary transportation, examination, or immersive experience
- "ongoing_contact" — Repeated/sustained contact pattern over time
- "ambiguous" — Modality unclear from account

Tags do NOT affect scoring. A vivid dream contact can score HIGHER than a distant sighting.

## THE 16 ITEMS (4 Categories x 4 Items, each 0-2)

### Category 1: Observation & Physical Encounter
CD-1a: Anomalous Perception — Was something anomalous perceived?
  0: No anomalous perception described
  1: Vague/uncertain — "I thought I saw something," fleeting impression
  2: Clear anomalous perception — specific object, entity, sound, presence

CD-1b: Structured Form — Was a distinct structured form observed?
  0: No distinct form — only feelings, intuitions
  1: Partial form — basic shape (light, orb, shadow) but lacking detail
  2: Structured form — craft with geometry, entity with features, geometric patterns. Shape-shifting/morphing = Structured (2)

CD-1c: Proximity — How close was the encounter?
  0: Distant or no spatial context
  1: Moderate — overhead, within few hundred feet; dream entity nearby
  2: Intimate — arm's reach, face-to-face, touch, inside craft; or immersive vision. Telepathic/internal contact = Intimate (2)

CD-1d: Physical Effects — Were there physical effects on witness or environment?
  0: No physical effects
  1: Subjective sensations during encounter — tingling, heat, vibration, nausea, temporary paralysis
  2: Observable/persistent effects — marks, equipment malfunction, ground traces, missing time with evidence

### Category 2: Entity Interaction
CD-2a: Entity Perceived — Was a non-human entity or intelligence perceived?
  0: No entity — only objects, lights, phenomena
  1: Ambiguous — felt presence, sensed intelligence, orb with possibly intelligent behavior
  2: Clear entity — described with features, observed agency, voice from identifiable non-human source

CD-2b: Bilateral Awareness — Did the entity acknowledge/respond to the witness?
  0: No bilateral awareness
  1: Possible awareness — entity seemed to look at, orient toward witness
  2: Clear bilateral interaction — entity addressed, approached, touched, or responded to witness's thoughts

CD-2c: Communication — Was information exchanged?
  0: No communication
  1: Ambiguous — vague emotional impressions, general feelings
  2: Clear communication — specific info via telepathy, voice, imagery, "download"

CD-2d: Directed Content — Did communication contain specific directed content?
  0: No directed content
  1: General themes (love, peace, "don't be afraid")
  2: Specific content — warnings, prophecies, personal instructions, technical information, mission assignment

### Category 3: Consciousness Alteration
CD-3a: Altered State — Was an altered state of consciousness involved?
  0: Normal waking consciousness throughout
  1: Mild alteration — heightened alertness, slight dissociation, "surreal," standard dream
  2: Clear altered state — trance, LITERAL paralysis, hyper-lucidity, "more real than real," expanded consciousness. Do NOT score extreme emotions as altered states.

CD-3b: Transportation — Was the witness transported or felt taken somewhere?
  0: Remained in place
  1: Partial — felt pulled, brief displacement, partial out-of-body
  2: Clear — aboard craft, another realm/dimension, fully immersive vision of another location

CD-3c: Time Distortion — Was time perception disrupted?
  0: Normal time perception
  1: Mild — "time felt weird," subjective difference
  2: Clear — documented missing time, dramatic dilation/compression, timelessness

CD-3d: Enhanced Perception — Were perceptions enhanced beyond normal?
  0: Normal perception
  1: Mildly enhanced — heightened senses, unusual clarity
  2: Clearly enhanced beyond normal — impossible perception (seeing through objects, 360deg vision), claircognizance, perceiving energy/auras

### Category 4: Transcendent Elements
CD-4a: Cosmic Knowledge — Was universal/cosmic knowledge imparted?
  0: No cosmic knowledge
  1: Vague cosmic impressions — sense of "greater truth"
  2: Specific cosmic knowledge — revelations about reality, consciousness, humanity, dimensions. Negative cosmic knowledge counts equally.

CD-4b: Ontological Shock — Did the experience shatter the witness's reality model?
  0: No worldview disruption
  1: Mild — confusion, inability to explain
  2: Clear — fundamental worldview shattered, "more real than real," existential crisis

CD-4c: Emotional Overwhelm — Was emotional impact extreme?
  0: Normal emotional range — curiosity, mild fear
  1: Strong emotion — significant fear, deep wonder, awe
  2: Transcendent overwhelm — ineffable awe, primal terror, unconditional love, states "beyond words"

CD-4d: Pattern/Recurrence — Is this part of a recurring pattern?
  0: Single isolated event
  1: Some recurrence — a few similar experiences
  2: Clear pattern — lifelong contact, regular occurrences, family/generational, ongoing relationship

## SCORING LEVELS
- 0-6: Minimal Contact (CE1)
- 7-12: Light Contact (CE2)
- 13-20: Moderate Contact (CE3)
- 21-32: Deep Contact (CE4-CE5)

## OUTPUT JSON SCHEMA
{
  "contact_modalities": ["string"],
  "total_score": number,
  "classification": "Minimal Contact" | "Light Contact" | "Moderate Contact" | "Deep Contact",
  "data_completeness": "N/16",
  "summary_reason": "2-3 sentence summary of the contact depth",
  "breakdown": {
    "observation": {
      "anomalous_perception": { "score": 0|1|2, "reasoning": "string" },
      "structured_form": { "score": 0|1|2, "reasoning": "string" },
      "proximity": { "score": 0|1|2, "reasoning": "string" },
      "physical_effects": { "score": 0|1|2, "reasoning": "string" }
    },
    "entity_interaction": {
      "entity_perceived": { "score": 0|1|2, "reasoning": "string" },
      "bilateral_awareness": { "score": 0|1|2, "reasoning": "string" },
      "communication": { "score": 0|1|2, "reasoning": "string" },
      "directed_content": { "score": 0|1|2, "reasoning": "string" }
    },
    "consciousness_alteration": {
      "altered_state": { "score": 0|1|2, "reasoning": "string" },
      "transportation": { "score": 0|1|2, "reasoning": "string" },
      "time_distortion": { "score": 0|1|2, "reasoning": "string" },
      "enhanced_perception": { "score": 0|1|2, "reasoning": "string" }
    },
    "transcendent_elements": {
      "cosmic_knowledge": { "score": 0|1|2, "reasoning": "string" },
      "ontological_shock": { "score": 0|1|2, "reasoning": "string" },
      "emotional_overwhelm": { "score": 0|1|2, "reasoning": "string" },
      "pattern_recurrence": { "score": 0|1|2, "reasoning": "string" }
    }
  }
}

Respond ONLY with the JSON object. Do not include markdown code blocks, explanations, or any other text.`;

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const CDSItemSchema = z.object({
  score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  reasoning: z.string(),
});

const CDSCategorySchema = (keys: string[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, CDSItemSchema])));

export const UAPContactDepthScoreSchema = z.object({
  contact_modalities: z.array(z.string()),
  total_score: z.number().min(0).max(32),
  classification: z.enum([
    'Minimal Contact',
    'Light Contact',
    'Moderate Contact',
    'Deep Contact',
  ]),
  data_completeness: z.string(),
  summary_reason: z.string(),
  breakdown: z.object({
    observation: z.object({
      anomalous_perception: CDSItemSchema,
      structured_form: CDSItemSchema,
      proximity: CDSItemSchema,
      physical_effects: CDSItemSchema,
    }),
    entity_interaction: z.object({
      entity_perceived: CDSItemSchema,
      bilateral_awareness: CDSItemSchema,
      communication: CDSItemSchema,
      directed_content: CDSItemSchema,
    }),
    consciousness_alteration: z.object({
      altered_state: CDSItemSchema,
      transportation: CDSItemSchema,
      time_distortion: CDSItemSchema,
      enhanced_perception: CDSItemSchema,
    }),
    transcendent_elements: z.object({
      cosmic_knowledge: CDSItemSchema,
      ontological_shock: CDSItemSchema,
      emotional_overwhelm: CDSItemSchema,
      pattern_recurrence: CDSItemSchema,
    }),
  }),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CDSItem = z.infer<typeof CDSItemSchema>;

export type UAPContactDepthAnalysisResult = z.infer<typeof UAPContactDepthScoreSchema>;

// ─── Classification Helper ──────────────────────────────────────────────────

/**
 * Maps a total UAP-CDS score (0-32) to its contact depth level.
 * Parallel to Greyson NDE Scale thresholds.
 */
export function classifyContactDepthScore(score: number): string {
  if (score <= 6) return 'Minimal Contact';
  if (score <= 12) return 'Light Contact';
  if (score <= 20) return 'Moderate Contact';
  return 'Deep Contact';
}

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Analyzes a UAP encounter transcript using the Contact Depth Scale.
 * Returns structured scoring across 16 items in 4 categories, or null on failure.
 *
 * @param subtitles The punctuated transcript text to analyze
 * @returns UAPContactDepthAnalysisResult or null on failure
 */
export async function analyzeUapContactDepthScore(
  subtitles: string
): Promise<UAPContactDepthAnalysisResult | null> {
  if (!subtitles) return null;

  // Truncate to stay within token limits
  const truncatedSubtitles = subtitles.slice(0, 50000);

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: UAP_CONTACT_DEPTH_PROMPT },
        {
          role: 'user',
          content: `Analyze this UAP encounter transcript for contact depth:\n\n${truncatedSubtitles}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low for consistent scoring
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    const raw = JSON.parse(content);

    // gpt-4o-mini often omits items that score 0 — backfill missing ones
    // (same pattern as uap-transformation.ts domain backfill)
    const CDS_CATEGORIES: Record<string, string[]> = {
      observation: ['anomalous_perception', 'structured_form', 'proximity', 'physical_effects'],
      entity_interaction: ['entity_perceived', 'bilateral_awareness', 'communication', 'directed_content'],
      consciousness_alteration: ['altered_state', 'transportation', 'time_distortion', 'enhanced_perception'],
      transcendent_elements: ['cosmic_knowledge', 'ontological_shock', 'emotional_overwhelm', 'pattern_recurrence'],
    };
    if (raw.breakdown) {
      for (const [category, items] of Object.entries(CDS_CATEGORIES)) {
        if (!raw.breakdown[category]) {
          raw.breakdown[category] = {};
        }
        for (const item of items) {
          if (!raw.breakdown[category][item]) {
            raw.breakdown[category][item] = {
              score: 0,
              reasoning: 'Not described in transcript',
            };
          }
        }
      }
    }

    // Validate with Zod
    const parsed = UAPContactDepthScoreSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('UAP-CDS Zod validation failed:', parsed.error.issues);
      // Attempt to salvage: recalculate total and classification
      if (raw.breakdown) {
        const allItems = [
          ...Object.values(raw.breakdown.observation || {}),
          ...Object.values(raw.breakdown.entity_interaction || {}),
          ...Object.values(raw.breakdown.consciousness_alteration || {}),
          ...Object.values(raw.breakdown.transcendent_elements || {}),
        ] as Array<{ score: number }>;
        const sum = allItems.reduce((acc, item) => acc + (item.score || 0), 0);
        raw.total_score = sum;
        raw.classification = classifyContactDepthScore(sum);
        const retry = UAPContactDepthScoreSchema.safeParse(raw);
        if (retry.success) return retry.data;
      }
      return null;
    }

    const result = parsed.data;

    // Server-side validation: recalculate total_score from breakdown
    const allItems = [
      ...Object.values(result.breakdown.observation),
      ...Object.values(result.breakdown.entity_interaction),
      ...Object.values(result.breakdown.consciousness_alteration),
      ...Object.values(result.breakdown.transcendent_elements),
    ];
    const recalculated = allItems.reduce((sum, item) => sum + item.score, 0);
    if (result.total_score !== recalculated) {
      result.total_score = recalculated;
    }

    // Ensure correct classification
    result.classification = classifyContactDepthScore(result.total_score);

    return result;
  } catch (error) {
    console.error('Error in analyzeUapContactDepthScore:', error);
    return null;
  }
}
