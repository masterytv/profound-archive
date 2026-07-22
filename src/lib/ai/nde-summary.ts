
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
 * NDE Summary Generator — produces a concise, factual summary of an NDE account.
 *
 * Output: 80-150 word summary structured as Trigger → Experience → Aftermath.
 * Grade 8 reading level, factual and objective tone.
 */
export const NDE_SUMMARY_PROMPT = `You are an expert NDE researcher. Your task is to analyze transcripts and produce simple, clear, and factual summaries.

You write at a Grade 8 reading level. You follow instructions precisely.

You output ONLY raw JSON with no markdown, no code blocks, and no extra text.

## SUMMARY REQUIREMENTS

Write a clear, 80-150 word summary of this NDE account. Use simple sentences. Structure the summary in this exact order:

1. **Trigger:** Start by stating who the person was and what caused the NDE (e.g., cardiac arrest, accident, surgery complication).
2. **Experience:** Briefly list the key events the person experienced during the NDE in chronological order (e.g., left their body, saw a light, met relatives, was told to return).
3. **Aftermath:** Conclude with the main transformation or change in their life after the NDE (e.g., new sense of purpose, career change, loss of fear of death).

## TONE & STYLE GUIDANCE

- Write for a Grade 8 reading level.
- Use simple, clear, and direct sentences.
- Be factual and objective. Do not add narrative flair or emotional language.
- Report the events as the person described them.
- Use active voice.
- Refer to the experiencer in the third person.

## OUTPUT JSON FORMAT

Return this exact structure with NO other text:

{
  "nde_summary": "Your 80-150 word factual summary here."
}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type NdeSummaryResult = {
    nde_summary: string;
};

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Generates a concise factual summary of an NDE transcript.
 * Returns a 80-150 word summary or null on failure.
 */
export async function generateNdeSummary(subtitles: string): Promise<NdeSummaryResult | null> {
    if (!subtitles) return null;

    // Truncate to stay within token limits — summaries don't need the full text
    const truncatedSubtitles = subtitles.slice(0, 30000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: NDE_SUMMARY_PROMPT },
                { role: "user", content: `Analyze this NDE transcript and return ONLY a JSON object with the summary:\n\n${truncatedSubtitles}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3, // Slightly higher for more natural writing
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content) as NdeSummaryResult;

        // Validate we got a non-empty summary
        if (!result.nde_summary || result.nde_summary.trim().length < 20) {
            console.error("NDE summary too short or empty");
            return null;
        }

        return result;

    } catch (error) {
        console.error("Error in generateNdeSummary:", error);
        return null;
    }
}
