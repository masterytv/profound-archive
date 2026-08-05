
import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';

// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'journey-flow' });
};

export const JOURNEY_FLOW_PROMPT = `You are an expert NDE researcher analyzing a video transcript to extract the
CHRONOLOGICAL SEQUENCE of phenomenological elements from a near-death or
out-of-body experience.

CONTEXT: This is a punctuated transcript from a YouTube video. The experiencer
may describe events non-linearly (common in spoken accounts). Reconstruct the
chronological order of the EXPERIENCE ITSELF, not the order it was told.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

ELEMENT TAXONOMY (25 elements across 6 phases):

PHASE 1 — Initial Transition (first element should be from here):
- observing_body: Seeing own physical body/scene from external viewpoint
- void_darkness: Entering complete darkness, void, nothingness
- tunnel: Entering or traveling through a tunnel
- bright_light: Immediately encountering brilliant light

PHASE 2 — Emotional/Sensory States (can occur anytime):
- peace_calm: Overwhelming peace, tranquility, absence of pain
- joy_bliss: Intense positive emotions, ecstasy
- love_unconditional: Feeling completely loved, accepted
- fear_distress: Fear, terror, distress
- enhanced_senses: Vivid colors, clarity, 360-degree vision
- celestial_music: Otherworldly music, harmonies, voices
- time_distortion: Time stops or becomes meaningless

PHASE 3 — Encounters:
- deceased_relatives: Meeting specific dead family/friends
- beings_entities: Meeting beings, angels, guides (not recognized as deceased)
- being_of_light: Meeting THE being of light — powerful, loving presence
- religious_figure: Meeting Jesus, God, Buddha, or named religious figure
- unknown_presence: Sensing a presence without seeing it clearly

PHASE 4 — Realm/Environment:
- otherworldly_realm: Another dimension, heaven-like place
- hellish_realm: Frightening, dark, hellish environment
- cities_structures: Buildings, cities of light, crystalline structures
- nature_landscapes: Gardens, fields, mountains, meadows, water

PHASE 5 — Transformative Experiences:
- life_review: Reviewing life events, experiencing others' perspectives
- knowledge_download: Receiving universal knowledge, understanding everything
- cosmic_unity: Feeling one with everything, interconnected
- telepathy: Communicating without words, thought transfer
- future_visions: Seeing future events, prophecies

PHASE 6 — Return (last element should be from here):
- border_boundary: Reaching a barrier, fence, river they cannot cross
- choice_to_return: Given explicit choice, chose to return
- forced_return: Sent back ("It's not your time")
- sudden_return: Instantly back in body
- return_unclear: Narrative ends without describing return

EXTRACTION RULES:
1. First element SHOULD be from Phase 1 (Initial Transition)
2. Last element SHOULD be from Phase 6 (Return)
3. Extract in CHRONOLOGICAL order of the experience, not the telling
4. Include emotional states (Phase 2) only when distinct moments, not background feelings
5. Rate CONFIDENCE (0.0-1.0) based on how clearly described
6. If two things happened SIMULTANEOUSLY, use same order number
7. Minimum 3 elements, maximum 12 elements
8. Excerpts should be short (under 30 words), from the experiencer only

OUTPUT FORMAT (valid JSON only):
{
  "valid": true,
  "nde_type": "positive" | "distressing" | "mixed" | "neutral",
  "sequence": [
    {"order": 1, "element": "element_name", "excerpt": "short quote", "confidence": 0.95}
  ],
  "notes": null
}

If INVALID (too vague, not an NDE/OBE, no clear sequence):
{
  "valid": false,
  "reason": "why extraction failed",
  "nde_type": "neutral",
  "sequence": [],
  "notes": null
}`;

// --- TypeScript Types ---

/** The 25-element journey taxonomy used by NDERF/NoeticMap */
export type JourneyElement =
    // Phase 1: Initial Transition
    | 'observing_body' | 'void_darkness' | 'tunnel' | 'bright_light'
    // Phase 2: Emotional/Sensory States
    | 'peace_calm' | 'joy_bliss' | 'love_unconditional' | 'fear_distress'
    | 'enhanced_senses' | 'celestial_music' | 'time_distortion'
    // Phase 3: Encounters
    | 'deceased_relatives' | 'beings_entities' | 'being_of_light'
    | 'religious_figure' | 'unknown_presence'
    // Phase 4: Realm/Environment
    | 'otherworldly_realm' | 'hellish_realm' | 'cities_structures' | 'nature_landscapes'
    // Phase 5: Transformative Experiences
    | 'life_review' | 'knowledge_download' | 'cosmic_unity' | 'telepathy' | 'future_visions'
    // Phase 6: Return
    | 'border_boundary' | 'choice_to_return' | 'forced_return' | 'sudden_return' | 'return_unclear';

export type JourneyNdeType = 'positive' | 'distressing' | 'mixed' | 'neutral';

export type JourneySequenceItem = {
    order: number;
    element: JourneyElement;
    excerpt: string;
    confidence: number;
};

export type JourneyFlowAnalysisResult = {
    valid: boolean;
    nde_type: JourneyNdeType;
    sequence: JourneySequenceItem[];
    notes: string | null;
    reason?: string; // Only present when valid=false
};

/**
 * Element synonym normalization map.
 * LLMs sometimes output slightly different names — normalize them to the canonical taxonomy.
 */
const ELEMENT_SYNONYMS: Record<string, JourneyElement> = {
    'darkness': 'void_darkness',
    'dark': 'void_darkness',
    'void': 'void_darkness',
    'light': 'bright_light',
    'the_light': 'bright_light',
    'oobe': 'observing_body',
    'out_of_body': 'observing_body',
    'obe': 'observing_body',
    'peace': 'peace_calm',
    'calm': 'peace_calm',
    'joy': 'joy_bliss',
    'bliss': 'joy_bliss',
    'love': 'love_unconditional',
    'fear': 'fear_distress',
    'distress': 'fear_distress',
    'music': 'celestial_music',
    'sounds': 'celestial_music',
    'relatives': 'deceased_relatives',
    'family': 'deceased_relatives',
    'beings': 'beings_entities',
    'entities': 'beings_entities',
    'angels': 'beings_entities',
    'god': 'religious_figure',
    'jesus': 'religious_figure',
    'realm': 'otherworldly_realm',
    'heaven': 'otherworldly_realm',
    'hell': 'hellish_realm',
    'garden': 'nature_landscapes',
    'meadow': 'nature_landscapes',
    'city': 'cities_structures',
    'buildings': 'cities_structures',
    'review': 'life_review',
    'knowledge': 'knowledge_download',
    'unity': 'cosmic_unity',
    'oneness': 'cosmic_unity',
    'boundary': 'border_boundary',
    'border': 'border_boundary',
    'choice': 'choice_to_return',
    'forced': 'forced_return',
    'sent_back': 'forced_return',
};

/** All valid canonical element names for validation */
const VALID_ELEMENTS = new Set<string>([
    'observing_body', 'void_darkness', 'tunnel', 'bright_light',
    'peace_calm', 'joy_bliss', 'love_unconditional', 'fear_distress',
    'enhanced_senses', 'celestial_music', 'time_distortion',
    'deceased_relatives', 'beings_entities', 'being_of_light',
    'religious_figure', 'unknown_presence',
    'otherworldly_realm', 'hellish_realm', 'cities_structures', 'nature_landscapes',
    'life_review', 'knowledge_download', 'cosmic_unity', 'telepathy', 'future_visions',
    'border_boundary', 'choice_to_return', 'forced_return', 'sudden_return', 'return_unclear',
]);

/**
 * Normalizes an element name from the LLM output to the canonical taxonomy.
 * Returns the canonical name if found, or the original if it's already canonical.
 */
function normalizeElement(element: string): JourneyElement {
    const lower = element.toLowerCase().trim();
    // Already canonical
    if (VALID_ELEMENTS.has(lower)) return lower as JourneyElement;
    // Check synonym map
    if (ELEMENT_SYNONYMS[lower]) return ELEMENT_SYNONYMS[lower];
    // Fallback: return as-is (will be caught during validation if invalid)
    return lower as JourneyElement;
}

/**
 * Analyzes a video transcript to extract the chronological Journey Flow using
 * the NDERF/NoeticMap 25-element taxonomy.
 * @param subtitles The subtitles_punctuated text content to analyze
 * @returns A structured JourneyFlowAnalysisResult or null on failure.
 */
export async function analyzeJourneyFlow(subtitles: string): Promise<JourneyFlowAnalysisResult | null> {
    if (!subtitles) return null;

    // Truncate to keep costs reasonable. GPT-4o-mini handles 128k context,
    // but 50k chars covers most hour-long videos.
    const truncatedSubtitles = subtitles.slice(0, 50000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: JOURNEY_FLOW_PROMPT },
                { role: "user", content: `Extract the journey flow from this NDE video transcript:\n\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2, // Slightly higher than scale scoring for nuanced sequence detection
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as JourneyFlowAnalysisResult;

        // Post-process: normalize element names to handle LLM synonym variations
        if (result.sequence && result.sequence.length > 0) {
            result.sequence = result.sequence.map(item => ({
                ...item,
                element: normalizeElement(item.element),
            }));
        }

        return result;

    } catch (error) {
        console.error("Error in analyzeJourneyFlow:", error);
        return null;
    }
}
