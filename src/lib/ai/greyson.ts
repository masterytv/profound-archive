
import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';

// Initialize OpenAI client
// Note: In server-side contexts, we can instantiate this here.
// In edge functions, we might need to instantiate inside the function.
// Initialize OpenAI client lazily
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'greyson' });
};

export const GREYSON_ANALYSIS_PROMPT = `You are an expert NDE researcher. Analyze the following NDE account using the Greyson NDE Scale.
The scale has 16 items across 4 categories. Each item is scored 0 (not present), 1 (mildly or ambiguously present), or 2 (definitely present).

The 4 categories and their items are:
1. Cognitive:
   - Time distortion (time seemed to speed up or slow down)
   - Thought speed (thoughts were speeded up)
   - Life review (scenes from the past came back)
   - Sudden understanding (suddenly seemed to understand everything)

2. Affective:
   - Peace/Pleasantness (feeling of peace or pleasantness)
   - Joy (feeling of joy)
   - Cosmic Unity (sense of harmony or unity with the universe)
   - Brilliant Light (saw or felt surrounded by a brilliant light)

3. Paranormal:
   - Enhanced Senses (senses were more vivid than usual)
   - ESP (seemed to be aware of things going on elsewhere)
   - Precognition (scenes from the future came to you)
   - Out of Body (felt separated from the body)

4. Transcendental:
   - Unearthly World (seemed to enter some other, unearthly world)
   - Mystical Being (seemed to encounter a mystical being or presence)
   - Spirits/Deceased (saw deceased or religious spirits)
   - Border/Point of no return (came to a border or point of no return)

Analyze the following account and provide a score for each item. Format your response as a JSON object strictly adhering to the schema below.

Output JSON Schema:
{
  "total_score": number, // Sum of all 16 items
  "classification": string, // "Not NDE" (0-6), "Mild NDE" (7-12), "Moderate NDE" (13-20), "Deep NDE" (21-32)
  "breakdown": {
    "cognitive": {
      "time_distortion": { "score": 0|1|2, "reasoning": "string (brief quote or explanation)" },
      "thought_speed": { "score": 0|1|2, "reasoning": "string" },
      "life_review": { "score": 0|1|2, "reasoning": "string" },
      "sudden_understanding": { "score": 0|1|2, "reasoning": "string" }
    },
    "affective": {
      "peace_pleasantness": { "score": 0|1|2, "reasoning": "string" },
      "joy": { "score": 0|1|2, "reasoning": "string" },
      "cosmic_unity": { "score": 0|1|2, "reasoning": "string" },
      "brilliant_light": { "score": 0|1|2, "reasoning": "string" }
    },
    "paranormal": {
      "enhanced_senses": { "score": 0|1|2, "reasoning": "string" },
      "esp": { "score": 0|1|2, "reasoning": "string" },
      "precognition": { "score": 0|1|2, "reasoning": "string" },
      "out_of_body": { "score": 0|1|2, "reasoning": "string" }
    },
    "transcendental": {
      "unearthly_world": { "score": 0|1|2, "reasoning": "string" },
      "mystical_being": { "score": 0|1|2, "reasoning": "string" },
      "spirits_deceased": { "score": 0|1|2, "reasoning": "string" },
      "border_point_no_return": { "score": 0|1|2, "reasoning": "string" }
    }
  }
}`;

export type GreysonItem = {
    score: 0 | 1 | 2;
    reasoning: string;
};

export type GreysonBreakdown = {
    cognitive: {
        time_distortion: GreysonItem;
        thought_speed: GreysonItem;
        life_review: GreysonItem;
        sudden_understanding: GreysonItem;
    };
    affective: {
        peace_pleasantness: GreysonItem;
        joy: GreysonItem;
        cosmic_unity: GreysonItem;
        brilliant_light: GreysonItem;
    };
    paranormal: {
        enhanced_senses: GreysonItem;
        esp: GreysonItem;
        precognition: GreysonItem;
        out_of_body: GreysonItem;
    };
    transcendental: {
        unearthly_world: GreysonItem;
        mystical_being: GreysonItem;
        spirits_deceased: GreysonItem;
        border_point_no_return: GreysonItem;
    };
};

export type GreysonAnalysisResult = {
    total_score: number;
    classification: string;
    breakdown: GreysonBreakdown;
};

/**
 * Analyzes the text transcript using the Greyson NDE Scale via OpenAI gpt-4o-mini.
 * @param subtitles The text content to analyze
 * @returns A structured Greyson Analysis result or null on failure.
 */
export async function analyzeGreysonScore(subtitles: string): Promise<GreysonAnalysisResult | null> {
    if (!subtitles) return null;

    // Truncate to avoid token limits if necessary, though 4o-mini handles 128k context.
    // A safe limit of 50k chars covers most hour-long videos.
    const truncatedSubtitles = subtitles.slice(0, 50000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: GREYSON_ANALYSIS_PROMPT },
                { role: "user", content: `Input Text:\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Low temperature for deterministic/consistent scoring
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as GreysonAnalysisResult;
        return result;

    } catch (error) {
        console.error("Error in analyzeGreysonScore:", error);
        return null;
    }
}
