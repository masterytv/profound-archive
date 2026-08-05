
import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';

// Lazy initialization to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'core-elements' });
};

export const CORE_ELEMENTS_PROMPT = `You are an expert analyst of near-death experiences (NDEs) and out-of-body experiences (OBEs), specializing in video transcript analysis.

CONTEXT: This is a punctuated transcript from a YouTube video where someone describes their experience. The speech may be conversational, non-linear, or include interviewer questions. Focus ONLY on the experiencer's first-person account. Ignore filler words, interviewer commentary, and tangential discussions.

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "experience_type": "nde" | "obe" | "sde" | "adc" | "ste" | "dream" | "meditation" | "other",
  "type_confidence": 0-100,
  "summary": "2-3 sentence summary of the experience itself",
  "elements": [
    {"name": "out_of_body", "present": true/false, "confidence": 0-100, "quote": "supporting quote from transcript or empty string"},
    {"name": "tunnel", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "bright_light", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "deceased_relatives", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "life_review", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "being_of_light", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "border_boundary", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "feelings_of_peace", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "cosmic_unity", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "time_distortion", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "enhanced_senses", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "telepathy", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "otherworldly_realm", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "knowledge_download", "present": true/false, "confidence": 0-100, "quote": ""},
    {"name": "choice_to_return", "present": true/false, "confidence": 0-100, "quote": ""}
  ],
  "trigger": {
    "category": "medical_crisis" | "accident" | "surgery" | "illness" | "cardiac_arrest" | "near_drowning" | "childbirth" | "combat" | "suicide_attempt" | "overdose" | "allergic_reaction" | "spontaneous" | "other" | "unknown",
    "description": "brief description of what caused the experience"
  },
  "overall_tone": "very_positive" | "positive" | "neutral" | "negative" | "very_negative" | "mixed",
  "intensity_rating": 1-10,
  "content_safety": {
    "overall_safe": true/false,
    "flags": {
      "suicide_related": true/false,
      "self_harm": true/false,
      "distressing_content": true/false,
      "medical_graphic": true/false,
      "child_death": true/false
    },
    "warning_level": "none" | "mild" | "moderate" | "severe"
  }
}

Experience type definitions:
- nde: Near-death experience (clinical death, life-threatening crisis)
- obe: Out-of-body experience (no life-threatening situation)
- sde: Shared death experience (witnessed another's death, shared their transition)
- adc: After-death communication (contact from deceased person, not during crisis)
- ste: Spiritually transformative experience (mystical, no death proximity)
- dream: Dream or lucid dream
- meditation: During meditation practice
- other: Does not fit above categories

Element definitions:
- out_of_body: Perceived from outside the physical body
- tunnel: Entered or traveled through a tunnel
- bright_light: Encountered brilliant or supernatural light
- deceased_relatives: Met dead family members or friends
- life_review: Reviewed life events, saw life flash
- being_of_light: Encountered a distinct, powerful light being
- border_boundary: Reached a barrier or point of no return
- feelings_of_peace: Overwhelming peace, absence of pain
- cosmic_unity: Felt one with everything
- time_distortion: Time stopped, sped up, or became meaningless
- enhanced_senses: Heightened perception, vivid colors, clarity
- telepathy: Communication without words
- otherworldly_realm: Being in another dimension or realm
- knowledge_download: Received universal knowledge or understanding
- choice_to_return: Given choice to stay or return

Scoring rules:
- Only mark elements as present if clearly described or strongly implied
- Confidence reflects how explicitly the element was described (100 = verbatim, 50 = implied)
- Quotes should be short (under 30 words) and from the experiencer only
- For trigger: if unknown or not mentioned, use "unknown"
- For content safety: only flag if CLEARLY present. When in doubt, do NOT flag.`;

// --- TypeScript Types ---

export type ExperienceType = 'nde' | 'obe' | 'sde' | 'adc' | 'ste' | 'dream' | 'meditation' | 'other';

export type ElementName =
    | 'out_of_body' | 'tunnel' | 'bright_light' | 'deceased_relatives'
    | 'life_review' | 'being_of_light' | 'border_boundary' | 'feelings_of_peace'
    | 'cosmic_unity' | 'time_distortion' | 'enhanced_senses' | 'telepathy'
    | 'otherworldly_realm' | 'knowledge_download' | 'choice_to_return';

export type TriggerCategory =
    | 'medical_crisis' | 'accident' | 'surgery' | 'illness' | 'cardiac_arrest'
    | 'near_drowning' | 'childbirth' | 'combat' | 'suicide_attempt' | 'overdose'
    | 'allergic_reaction' | 'spontaneous' | 'other' | 'unknown';

export type OverallTone = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' | 'mixed';

export type WarningLevel = 'none' | 'mild' | 'moderate' | 'severe';

export type ElementDetection = {
    name: ElementName;
    present: boolean;
    confidence: number;
    quote: string;
};

export type ContentSafety = {
    overall_safe: boolean;
    flags: {
        suicide_related: boolean;
        self_harm: boolean;
        distressing_content: boolean;
        medical_graphic: boolean;
        child_death: boolean;
    };
    warning_level: WarningLevel;
};

export type CoreElementsAnalysisResult = {
    experience_type: ExperienceType;
    type_confidence: number;
    summary: string;
    elements: ElementDetection[];
    trigger: {
        category: TriggerCategory;
        description: string;
    };
    overall_tone: OverallTone;
    intensity_rating: number;
    content_safety: ContentSafety;
};

/**
 * Analyzes a video transcript using the NDERF-compatible Core Elements framework.
 * Extracts experience type, 15 standard NDE elements, trigger, tone, and content safety.
 * @param subtitles The subtitles_punctuated text content to analyze
 * @returns A structured CoreElementsAnalysisResult or null on failure.
 */
export async function analyzeCoreElements(subtitles: string): Promise<CoreElementsAnalysisResult | null> {
    if (!subtitles) return null;

    // Truncate to keep costs reasonable. GPT-4o-mini handles 128k context,
    // but 50k chars covers most hour-long videos.
    const truncatedSubtitles = subtitles.slice(0, 50000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: CORE_ELEMENTS_PROMPT },
                { role: "user", content: `Analyze this NDE video transcript:\n\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2, // Slightly higher than scale scoring for nuanced element detection
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as CoreElementsAnalysisResult;
        return result;

    } catch (error) {
        console.error("Error in analyzeCoreElements:", error);
        return null;
    }
}
