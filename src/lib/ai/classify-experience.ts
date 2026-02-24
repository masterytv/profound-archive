/**
 * Experience Classification Gate
 * 
 * Lightweight AI pre-screen to determine if a video contains a genuine
 * profound experience (NDE, OBE, STE, etc.) before running expensive
 * analysis passes (Greyson, Transformation, etc.).
 * 
 * Also extracts the experiencer's full name when identifiable.
 * 
 * Why this exists: Running all 7 analysis passes costs ~$0.02-0.05 per video
 * in API calls and ~30s of processing time. This gate costs ~$0.001 and
 * takes ~2s, filtering out non-NDE content early.
 */

import OpenAI from 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassificationResult {
    /** Whether this qualifies as a profound experience */
    is_profound: boolean;
    /** What type of experience: nde, obe, sde, adc, ste, dream, meditation, other, none */
    experience_type: string;
    /** Confidence in the classification (0-100) */
    confidence: number;
    /** Brief justification for the classification */
    justification: string;
    /** Maps to the isNde database enum */
    isNde_value: 'clear_nde' | 'possible_nde' | 'not_nde' | 'insufficient_info';
    /** Full name (or first name) of the NDE experiencer, or null if unidentifiable */
    experiencerFullName: string | null;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const CLASSIFICATION_PROMPT = `You are an expert classifier of near-death and related experiences.

Given a video transcript, determine if it contains a FIRST-PERSON ACCOUNT of a profound experience.

Qualifying experience types:
- NDE (Near-Death Experience): Person was clinically dead or in a life-threatening crisis
- OBE (Out-of-Body Experience): Person perceived themselves outside their physical body
- SDE (Shared Death Experience): Person shared in another's dying/transition experience
- ADC (After-Death Communication): Person received communication from a deceased individual
- STE (Spiritually Transformative Experience): Mystical/transcendent experience without death proximity

NOT qualifying (mark as not profound):
- Discussions ABOUT NDEs without a first-person account
- Documentary narration without experiencer testimony
- Guided meditations, hypnosis recordings
- Fiction, creepypasta, or entertainment content
- News reports about NDEs without experiencer accounts
- Book reviews or academic lectures about NDEs
- Interviews where the host discusses NDEs but the guest doesn't share their own experience

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "is_profound": true/false,
  "experience_type": "nde" | "obe" | "sde" | "adc" | "ste" | "none",
  "confidence": 0-100,
  "justification": "1-2 sentence explanation",
  "experiencerFullName": "Full Name" | null
}

EXPERIENCER NAME RULES:
- Extract the FULL NAME (first and last) of the person who EXPERIENCED the NDE.
- DO NOT return the name of the host, interviewer, narrator, podcaster, or commentator.
- DO NOT return the name of someone describing another person's NDE secondhand.
- Look for self-identification ("My name is Jane Doe"), host introductions ("Welcome, Jane Doe"), or names in the video title/description.
- If only a first name is clearly identifiable as the experiencer, return just the first name.
- If no name is identifiable, or the content is not an NDE, return null.

SCORING RULES:
- confidence >= 70 with is_profound=true → clear_nde
- confidence 40-69 with is_profound=true → possible_nde  
- is_profound=false → not_nde
- transcript too short or unclear → insufficient_info (set confidence < 20)`;

// ─── Classifier ──────────────────────────────────────────────────────────────

// Lazy init to avoid build-time errors (see LEARNINGS.md)
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
    return new OpenAI({ apiKey });
};

/**
 * Classify whether a video transcript contains a profound experience.
 * Also extracts the experiencer's full name when identifiable.
 * 
 * Uses a lightweight GPT-4o-mini call with a focused prompt.
 * Only examines the first ~15,000 characters (enough to determine content type).
 * 
 * @param transcript The punctuated transcript text
 * @param title Optional video title (helps identify experiencer name)
 * @param description Optional video description (helps identify experiencer name)
 * @returns ClassificationResult or null on failure
 */
export async function classifyExperience(
    transcript: string,
    title?: string,
    description?: string,
): Promise<ClassificationResult | null> {
    if (!transcript || transcript.length < 50) {
        return {
            is_profound: false,
            experience_type: 'none',
            confidence: 0,
            justification: 'Transcript too short to classify',
            isNde_value: 'insufficient_info',
            experiencerFullName: null,
        };
    }

    // Only need the beginning to classify — saves tokens
    const truncated = transcript.slice(0, 15000);

    try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: CLASSIFICATION_PROMPT },
                {
                    role: 'user', content: [
                        title ? `Video Title: "${title}"` : '',
                        description ? `Video Description: "${description.slice(0, 500)}"` : '',
                        `\nClassify this video transcript:\n\n${truncated}`,
                    ].filter(Boolean).join('\n\n')
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1, // Low temp for consistent classification
            max_tokens: 200,  // Classification is a short response
        });

        const content = completion.choices[0].message.content;
        if (!content) return null;

        const result = JSON.parse(content);

        // Map to database enum
        let isNde_value: ClassificationResult['isNde_value'];
        if (!result.is_profound) {
            isNde_value = 'not_nde';
        } else if (result.confidence < 20) {
            isNde_value = 'insufficient_info';
        } else if (result.confidence >= 70) {
            isNde_value = 'clear_nde';
        } else {
            isNde_value = 'possible_nde';
        }

        return {
            is_profound: result.is_profound,
            experience_type: result.experience_type || 'none',
            confidence: result.confidence || 0,
            justification: result.justification || '',
            isNde_value,
            experiencerFullName: result.experiencerFullName || null,
        };
    } catch (error) {
        console.error('Error in classifyExperience:', error);
        throw error; // Re-throw so intake.ts can catch the actual message
    }
}
