/**
 * UAP Summary Generator
 *
 * Copy-Modify from: src/lib/ai/nde-summary.ts
 *
 * Produces a concise, factual summary of a UAP encounter account.
 * Output: 80-150 word summary structured as Context → Encounter → Impact.
 * Grade 8 reading level, factual and objective tone.
 *
 * Uses gpt-4o-mini + OpenAI JSON mode (~$0.001/call).
 */

import OpenAI from 'openai';

// Lazy OpenAI client initialization
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    return new OpenAI({ apiKey });
};

/**
 * UAP Summary prompt — mirrors NDE summary structure but adapted for
 * UAP encounter reports (Context → Encounter → Impact).
 */
export const UAP_SUMMARY_PROMPT = `You are an expert UAP researcher. Your task is to analyze transcripts and produce simple, clear, and factual summaries.

You write at a Grade 8 reading level. You follow instructions precisely.

You output ONLY raw JSON with no markdown, no code blocks, and no extra text.

## SUMMARY REQUIREMENTS

Write a clear, 80-150 word summary of this UAP encounter account. Use simple sentences. Structure the summary in this exact order:

1. **Context:** Start by stating who the person is (if known) and the circumstances of the encounter (e.g., driving at night, military duty, meditation session, childhood experience).
2. **Encounter:** Briefly describe the key events of the encounter in chronological order (e.g., saw lights, observed craft, encountered entities, received communication, experienced missing time).
3. **Impact:** Conclude with the main effect on the person after the encounter (e.g., ongoing experiences, worldview change, physical effects, desire to share publicly, or no lasting impact mentioned).

## TONE & STYLE GUIDANCE

- Write for a Grade 8 reading level.
- Use simple, clear, and direct sentences.
- Be factual and objective. Do not add narrative flair or emotional language.
- Report the events as the person described them.
- Use active voice.
- Refer to the experiencer in the third person.
- Do NOT evaluate the truth or credibility of the account.

## OUTPUT JSON FORMAT

Return this exact structure with NO other text:

{
  "uap_summary": "Your 80-150 word factual summary here."
}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type UapSummaryResult = {
    uap_summary: string;
};

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Generates a concise factual summary of a UAP encounter transcript.
 * Returns a 80-150 word summary or null on failure.
 */
export async function generateUapSummary(subtitles: string): Promise<UapSummaryResult | null> {
    if (!subtitles) return null;

    // Truncate to stay within token limits — summaries don't need the full text
    const truncatedSubtitles = subtitles.slice(0, 30000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: UAP_SUMMARY_PROMPT },
                { role: "user", content: `Analyze this UAP encounter transcript and return ONLY a JSON object with the summary:\n\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3, // Slightly higher for more natural writing
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as UapSummaryResult;

        // Validate we got a non-empty summary
        if (!result.uap_summary || result.uap_summary.trim().length < 20) {
            console.error("UAP summary too short or empty");
            return null;
        }

        return result;

    } catch (error) {
        console.error("Error in generateUapSummary:", error);
        return null;
    }
}
