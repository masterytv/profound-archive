
import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';

// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'phenomenology-entities' });
};

export const PHENOMENOLOGY_ENTITIES_PROMPT = `You are an expert analyst of near-death experiences (NDEs), specializing in phenomenological quality assessment and entity encounter documentation from video transcript analysis.

CONTEXT: This is a punctuated transcript from a YouTube video where someone describes their experience. The speech may be conversational, non-linear, or include interviewer questions. Focus ONLY on the experiencer's first-person account. Ignore filler words, interviewer commentary, and tangential discussions.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "phenomenology": {
    "reality_comparison": "more_real" | "equally_real" | "dreamlike" | "surreal" | "not_stated",
    "reality_quote": "supporting quote or empty string",
    "vividness_rating": 1-10,
    "vividness_quote": "supporting quote or empty string",
    "sensory_modalities": {
      "visual": {"active": true/false, "description": "brief description of visual experiences", "extraordinary": true/false},
      "auditory": {"active": true/false, "description": "music, voices, sounds described", "extraordinary": true/false},
      "tactile": {"active": true/false, "description": "touch, temperature, physical sensations", "extraordinary": true/false},
      "olfactory": {"active": true/false, "description": "smells described", "extraordinary": true/false},
      "gustatory": {"active": true/false, "description": "taste experiences", "extraordinary": true/false},
      "kinesthetic": {"active": true/false, "description": "movement, flying, floating sensations", "extraordinary": true/false}
    },
    "emotional_progression": [
      {"emotion": "string", "intensity": 1-10, "context": "brief context of when this emotion occurred"}
    ],
    "altered_cognition": {
      "thought_clarity": "enhanced" | "normal" | "diminished" | "not_stated",
      "thought_speed": "faster" | "normal" | "slower" | "timeless" | "not_stated",
      "memory_quality": "perfect_recall" | "vivid" | "partial" | "fragmentary" | "not_stated",
      "self_awareness": "heightened" | "normal" | "diminished" | "dissolved" | "not_stated"
    },
    "distinguishing_features": "1-2 sentence summary of what makes THIS experience phenomenologically unique"
  },
  "entities": [
    {
      "order": 1,
      "identity": "specific name or relation (e.g. 'grandmother', 'Jesus', 'unknown being') or 'unidentified'",
      "entity_type": "deceased_relative" | "deceased_friend" | "religious_figure" | "angel" | "guide" | "being_of_light" | "shadow_figure" | "animal" | "group" | "unknown",
      "appearance": "physical description if given, or 'not described'",
      "gender": "male" | "female" | "androgynous" | "non_physical" | "not_stated",
      "age_appearance": "young" | "middle_aged" | "elderly" | "ageless" | "not_stated",
      "luminosity": "radiant" | "glowing" | "normal" | "dark" | "not_stated",
      "communication_method": "telepathy" | "verbal" | "gesture" | "emotional" | "presence_only" | "not_stated",
      "message_summary": "key message conveyed, or 'none'",
      "message_quote": "direct quote of message from transcript, or empty string",
      "emotional_quality": "loving" | "peaceful" | "authoritative" | "playful" | "stern" | "frightening" | "neutral" | "mixed",
      "confidence": 0-100
    }
  ],
  "entity_count": 0,
  "dominant_entity_type": "the most significant entity type encountered, or 'none'"
}

EXTRACTION RULES:

Phenomenology:
- reality_comparison: Look for phrases like "more real than real", "realer than this", "like a dream", "crystal clear"
- vividness_rating: 10 = indescribable clarity/beauty, 1 = vague/fuzzy, based on descriptive language used
- sensory_modalities: "extraordinary" means beyond normal human capacity (360-degree vision, seeing through walls, etc.)
- emotional_progression: Extract in chronological order of the experience, minimum 2, maximum 6 emotions
- altered_cognition: Only fill if the experiencer explicitly comments on their thought processes

Entities:
- Extract ALL distinct entities mentioned, in order of appearance during the experience
- If a "group" is mentioned (crowd, many beings), count as one entity with type "group"
- message_quote should be the experiencer's direct words, under 40 words
- Do NOT infer entities that aren't clearly described — only extract what's explicitly stated
- If no entities were encountered, return an empty array and entity_count: 0
- confidence: how clearly this entity was described (100 = vivid detail, 50 = briefly mentioned)`;

// --- TypeScript Types ---

export type RealityComparison = 'more_real' | 'equally_real' | 'dreamlike' | 'surreal' | 'not_stated';
export type ThoughtQuality = 'enhanced' | 'normal' | 'diminished' | 'not_stated';
export type ThoughtSpeed = 'faster' | 'normal' | 'slower' | 'timeless' | 'not_stated';
export type MemoryQuality = 'perfect_recall' | 'vivid' | 'partial' | 'fragmentary' | 'not_stated';
export type SelfAwareness = 'heightened' | 'normal' | 'diminished' | 'dissolved' | 'not_stated';

export type SensoryModality = {
    active: boolean;
    description: string;
    extraordinary: boolean;
};

export type EmotionEntry = {
    emotion: string;
    intensity: number;
    context: string;
};

export type Phenomenology = {
    reality_comparison: RealityComparison;
    reality_quote: string;
    vividness_rating: number;
    vividness_quote: string;
    sensory_modalities: {
        visual: SensoryModality;
        auditory: SensoryModality;
        tactile: SensoryModality;
        olfactory: SensoryModality;
        gustatory: SensoryModality;
        kinesthetic: SensoryModality;
    };
    emotional_progression: EmotionEntry[];
    altered_cognition: {
        thought_clarity: ThoughtQuality;
        thought_speed: ThoughtSpeed;
        memory_quality: MemoryQuality;
        self_awareness: SelfAwareness;
    };
    distinguishing_features: string;
};

export type EntityType =
    | 'deceased_relative' | 'deceased_friend' | 'religious_figure' | 'angel'
    | 'guide' | 'being_of_light' | 'shadow_figure' | 'animal' | 'group' | 'unknown';

export type EntityGender = 'male' | 'female' | 'androgynous' | 'non_physical' | 'not_stated';
export type EntityAge = 'young' | 'middle_aged' | 'elderly' | 'ageless' | 'not_stated';
export type EntityLuminosity = 'radiant' | 'glowing' | 'normal' | 'dark' | 'not_stated';
export type CommunicationMethod = 'telepathy' | 'verbal' | 'gesture' | 'emotional' | 'presence_only' | 'not_stated';
export type EmotionalQuality = 'loving' | 'peaceful' | 'authoritative' | 'playful' | 'stern' | 'frightening' | 'neutral' | 'mixed';

export type EntityEncounter = {
    order: number;
    identity: string;
    entity_type: EntityType;
    appearance: string;
    gender: EntityGender;
    age_appearance: EntityAge;
    luminosity: EntityLuminosity;
    communication_method: CommunicationMethod;
    message_summary: string;
    message_quote: string;
    emotional_quality: EmotionalQuality;
    confidence: number;
};

export type PhenomenologyEntitiesResult = {
    phenomenology: Phenomenology;
    entities: EntityEncounter[];
    entity_count: number;
    dominant_entity_type: string;
};

/**
 * Analyzes a video transcript for detailed phenomenological quality and entity encounters.
 * Extracts sensory modalities, emotional progression, cognitive alterations,
 * entity descriptions, messages, and communication methods.
 * @param subtitles The subtitles_punctuated text content to analyze
 * @returns A structured PhenomenologyEntitiesResult or null on failure.
 */
export async function analyzePhenomenologyEntities(subtitles: string): Promise<PhenomenologyEntitiesResult | null> {
    if (!subtitles) return null;

    const truncatedSubtitles = subtitles.slice(0, 50000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: PHENOMENOLOGY_ENTITIES_PROMPT },
                { role: "user", content: `Analyze the phenomenological quality and entity encounters in this NDE video transcript:\n\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as PhenomenologyEntitiesResult;
        return result;

    } catch (error) {
        console.error("Error in analyzePhenomenologyEntities:", error);
        return null;
    }
}
