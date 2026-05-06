/**
 * UAP Content Classification Gate
 * 
 * Copy-Modify from: src/lib/ai/classify-experience.ts
 * 
 * Lightweight AI pre-screen to categorize UAP videos into:
 * - Tier 1 (encounters): First-person contact/sighting accounts
 * - Tier 2 (program): Disclosure, research, investigative content
 * - Tier 3 (out_of_scope): Cryptids, ghost hunting, entertainment, clickbait
 * 
 * Uses gpt-4o-mini + OpenAI JSON mode (mirrors NDE classifier pattern).
 * Cost: ~$0.001/call. Truncates to 2000 chars (cheaper than NDE's 15000,
 * sufficient for classification since channel name is a strong signal).
 * 
 * Tier 3 gate: if tier === 3, intake_status = 'out_of_scope', skip all
 * downstream processing (no punctuation, no analysis, no embedding).
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UapClassificationResult {
  /** Content type classification */
  content_type: 'first_person' | 'retold_story' | 'research_analysis' | 'program_disclosure' | 'out_of_scope';
  /** Tier: 1 = first-person encounter, 2 = program/research, 3 = out of scope */
  tier: 1 | 2 | 3;
  /** Track: encounters (Tier 1) or program (Tier 2) */
  track: 'encounters' | 'program';
  /** Confidence in the classification (0-100) */
  confidence: number;
  /** Brief justification for the classification */
  justification: string;
  /** Name of the contactee/experiencer, or null if unidentifiable */
  experiencer_name: string | null;
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────
// LEARNINGS.md: Zod strips unknown properties. Every field in the interface
// MUST have a matching field in the Zod schema.

export const UAPClassificationSchema = z.object({
  content_type: z.enum(['first_person', 'retold_story', 'research_analysis', 'program_disclosure', 'out_of_scope']),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  track: z.enum(['encounters', 'program']),
  confidence: z.number().min(0).max(100),
  justification: z.string(),
  experiencer_name: z.string().nullable(),
});

// ─── Prompt ──────────────────────────────────────────────────────────────────

const UAP_CLASSIFICATION_PROMPT = `You are an expert classifier of UFO/UAP content.

Given a video's title, description, channel name, and transcript excerpt, classify the content into one of three tiers:

TIER 1 - ENCOUNTERS (track: "encounters"):
First-person accounts of UFO sightings, UAP contact, alien abduction, CE-5 meditation contact, or anomalous aerial phenomena witnessed directly. The experiencer MUST be speaking about their OWN experience.
Content types: "first_person" or "retold_story" (someone else telling an experiencer's story with substantial detail)

TIER 2 - PROGRAM/RESEARCH (track: "program"):
Investigative journalism, government disclosure analysis, whistleblower testimony about programs (not personal encounters), documentary analysis, researcher presentations, FOIA document reviews, congressional hearing coverage.
Content types: "research_analysis" or "program_disclosure"

TIER 3 - OUT OF SCOPE (track: "program"):
Content that does NOT belong in a UAP archive:
- Cryptid/Bigfoot/ghost hunting content
- Pure entertainment, clickbait, or reaction videos
- Conspiracy theory content without UAP focus
- Gaming, music, or unrelated vlogs
- Debunking-only content with no substantive UAP analysis
- News anchors briefly mentioning UAP without depth
Content type: "out_of_scope"

CHANNEL NAME IS A STRONG SIGNAL:
- Channels like "Richard Dolan", "Jeremy Corbell", "Dr. Steven Greer" = likely Tier 1 or 2
- Channels focused on general paranormal = check content carefully
- Entertainment/reaction channels = likely Tier 3

CRITICAL: Output ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT SCHEMA:
{
  "content_type": "first_person" | "retold_story" | "research_analysis" | "program_disclosure" | "out_of_scope",
  "tier": 1 | 2 | 3,
  "track": "encounters" | "program",
  "confidence": 0-100,
  "justification": "1-2 sentence explanation",
  "experiencer_name": "Full Name" | null
}

EXPERIENCER NAME RULES (Tier 1 only):
- Extract the FULL NAME of the person who HAD the UAP experience.
- DO NOT return the name of the host, interviewer, or researcher.
- If only a first name is identifiable, return just the first name.
- For Tier 2 and Tier 3, always return null.`;

// ─── Classifier ──────────────────────────────────────────────────────────────

// Lazy init to avoid build-time errors
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
  return new OpenAI({ apiKey });
};

/**
 * Classify a UAP video into Tier 1/2/3 with track and content type.
 * 
 * Uses gpt-4o-mini with OpenAI JSON mode (response_format: json_object).
 * Only examines first 2000 chars of transcript (sufficient for classification).
 * 
 * @param transcript The raw or punctuated transcript text
 * @param title Video title
 * @param description Video description
 * @param channelName YouTube channel name (strong classification signal)
 * @returns UapClassificationResult or null on failure
 */
export async function classifyUapContent(
  transcript: string,
  title?: string,
  description?: string,
  channelName?: string,
): Promise<UapClassificationResult | null> {
  // Minimum content check
  if ((!transcript || transcript.length < 30) && !title) {
    return {
      content_type: 'out_of_scope',
      tier: 3,
      track: 'program',
      confidence: 0,
      justification: 'Insufficient content to classify',
      experiencer_name: null,
    };
  }

  // Only need the beginning to classify (saves tokens)
  const truncatedTranscript = transcript ? transcript.slice(0, 2000) : '';

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: UAP_CLASSIFICATION_PROMPT },
        {
          role: 'user', content: [
            channelName ? `Channel: "${channelName}"` : '',
            title ? `Video Title: "${title}"` : '',
            description ? `Video Description: "${description.slice(0, 500)}"` : '',
            truncatedTranscript ? `\nTranscript excerpt:\n\n${truncatedTranscript}` : '',
          ].filter(Boolean).join('\n\n')
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temp for consistent classification
      max_tokens: 250,
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    const raw = JSON.parse(content);

    // Validate with Zod (catches malformed LLM output)
    const parsed = UAPClassificationSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('UAP classification Zod validation failed:', parsed.error.issues);
      // Attempt graceful fallback with raw data
      return {
        content_type: raw.content_type || 'out_of_scope',
        tier: raw.tier || 3,
        track: raw.track || 'program',
        confidence: raw.confidence || 0,
        justification: raw.justification || 'Zod validation failed',
        experiencer_name: raw.experiencer_name || null,
      };
    }

    return parsed.data;
  } catch (error) {
    console.error('Error in classifyUapContent:', error);
    throw error; // Re-throw so batch scripts can catch the actual message
  }
}
