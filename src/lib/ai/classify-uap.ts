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
 * Uses gpt-4o with structured CoT (chain-of-thought) prompting.
 * The model must reason about speaker role and pronoun targets BEFORE
 * outputting a tier classification. Few-shot examples inoculate against
 * common misclassification patterns (journalist-as-experiencer trap).
 * 
 * Cost: ~$0.01/call. Uses 5000 chars of transcript.
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
  /** Role of the primary speaker */
  speaker_role: 'experiencer' | 'interviewer_with_experiencer' | 'journalist' | 'researcher' | 'narrator' | 'other';
  /** Name of the contactee/experiencer, or null if unidentifiable */
  experiencer_name: string | null;
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────
// Zod strips unknown fields (like CoT reasoning fields). That's intentional —
// we want the model to generate them for reasoning but only keep what we need.

export const UAPClassificationSchema = z.object({
  // CoT reasoning fields (generated first, kept for debugging)
  speaker_analysis: z.string().optional(),
  pronoun_target: z.string().optional(),
  // Classification output fields
  content_type: z.enum(['first_person', 'retold_story', 'research_analysis', 'program_disclosure', 'out_of_scope']),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  track: z.enum(['encounters', 'program']),
  confidence: z.number().min(0).max(100),
  justification: z.string(),
  speaker_role: z.enum(['experiencer', 'interviewer_with_experiencer', 'journalist', 'researcher', 'narrator', 'other']),
  experiencer_name: z.string().nullable(),
});

// ─── Prompt ──────────────────────────────────────────────────────────────────

const UAP_CLASSIFICATION_PROMPT = `You are an expert classifier of UFO/UAP content. Your job is to classify video transcripts into Tiers based on whether they contain true first-person testimony.

## TIER DEFINITIONS
- **Tier 1 (track: "encounters")**: The speaker in the video is the EXACT person who had the anomalous encounter. They are describing what happened to THEM personally — seeing a craft, being abducted, encountering an entity, etc.
- **Tier 2 (track: "program")**: The speaker is a journalist, researcher, host, or narrator discussing encounters that happened to OTHER people. Also: government disclosure, whistleblower testimony about programs, documentary analysis, retold/secondhand encounter narratives.
- **Tier 3 (track: "program")**: Unrelated content — cryptids, ghost hunting, entertainment, clickbait, gaming.

## CRITICAL RULES FOR AVOIDING FALSE TIER 1s
1. **The "Investigator" Trap**: Journalists and researchers often use first-person pronouns ("People are telling ME", "I am investigating this", "this is happening to ME"). Using "I" or "me" does NOT make someone an experiencer. The "I" must refer to EXPERIENCING THE UAP EVENT DIRECTLY (seeing a craft, being taken aboard, encountering an entity), not investigating/reporting/receiving emails about it.
2. **The "Retelling" Trap**: A host reading someone else's detailed account (e.g., "John emailed me and said the mantis was 7 feet tall...") is Tier 2. The speaker is just a conduit.
3. **Explicit Role Override**: If a speaker explicitly identifies themselves as a journalist, reporter, podcaster, investigator, or researcher, they are ALWAYS Tier 2 — regardless of how vividly they describe encounters or how often they use first-person pronouns.
4. **Channel Name Is NOT Decisive**: A channel named "Mantis Encounters" or "UFO Witness" does not mean the speaker is an experiencer. Evaluate the TRANSCRIPT, not the channel name.

## OUTPUT FORMAT
You must output ONLY valid JSON. Generate the keys in this EXACT ORDER — the first two keys are your reasoning scratchpad:

{
  "speaker_analysis": "1-2 sentences: Who is speaking? Do they state their profession? Are they the subject of the encounter, or reporting on others?",
  "pronoun_target": "1 sentence: When the speaker says 'I' or 'me', are they referring to experiencing the anomaly directly, or to investigating/reporting/receiving accounts?",
  "speaker_role": "experiencer | interviewer_with_experiencer | journalist | researcher | narrator | other",
  "content_type": "first_person | retold_story | research_analysis | program_disclosure | out_of_scope",
  "tier": 1 | 2 | 3,
  "track": "encounters | program",
  "confidence": 0-100,
  "justification": "1-2 sentence final justification referencing your speaker_analysis",
  "experiencer_name": "Full Name | null"
}

EXPERIENCER NAME RULES (Tier 1 only):
- Extract the FULL NAME of the person who HAD the UAP experience.
- DO NOT return the name of the host, interviewer, journalist, or researcher.
- For Tier 2 and Tier 3, always return null.`;

// ─── Few-Shot Examples ───────────────────────────────────────────────────────
// These are injected as user/assistant message pairs for maximum effectiveness.
// They inoculate the model against the most common misclassification patterns.

const FEW_SHOT_EXAMPLES: Array<{ role: 'user' | 'assistant'; content: string }> = [
  // Example 1: Journalist discussing encounters (Tier 2) — THE KEY NEGATIVE EXAMPLE
  {
    role: 'user',
    content: `Channel: "Mantis Encounters"\n\nVideo Title: "Ross Coulthart on Mantis Beings"\n\nTranscript excerpt:\n\nUm, you and I were talking yesterday about mantids. I'm talking to people who, um, who say that they have been visited by mantid beings. And I'll freely admit, 5-6 years ago I would have laughed them out of town. These people, whether what they're seeing is real or not, I believe that they have had what they perceived as mantid beings in their home. And what's interesting is those mantid beings are telling them to engage with me. And it's getting quite personal because this is happening quite a lot to me. And I don't think I'm important. I'm just a journalist. I really truly believe all I'm doing is following an absolute ball terror of a story. Okay, Ross, this is an email coming in from John. Can you give some examples of what these experiences entail? Look, out of respect for the people involved who've been giving me their very personal accounts. There's a couple I'm talking to who describe the beings as deeply benevolent. These beings are often 7 or 9 ft tall, very elongated, thin bodies.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "The speaker explicitly states 'I\\'m just a journalist' and describes talking to people who had experiences. He is receiving emails and accounts from others — he is a reporter, not an experiencer.",
      pronoun_target: "When the speaker says 'me' and 'I', he refers to his journalism work — receiving reports, talking to witnesses, following a story. NOT to experiencing the anomaly directly.",
      speaker_role: "journalist",
      content_type: "research_analysis",
      tier: 2,
      track: "program",
      confidence: 97,
      justification: "Speaker explicitly identifies as a journalist reporting on other people's mantid encounter accounts. First-person pronouns refer to the investigation, not the anomaly.",
      experiencer_name: null,
    }),
  },
  // Example 2: True first-person experiencer (Tier 1) — POSITIVE EXAMPLE
  {
    role: 'user',
    content: `Channel: "UFO Witness Stories"\n\nVideo Title: "My Terrifying Abduction - What They Did To Me"\n\nTranscript excerpt:\n\nI was driving down Route 66, it was about 2 AM. My car completely died. The radio went to static. I looked up and there was this massive triangular craft hovering directly above my windshield. I couldn't move. It felt like something was holding me in place. The next thing I remember, I woke up in my bed three hours later. I had this strange triangular mark on my forearm that wasn't there before. My wife said I was gone the whole night. I still have nightmares about it.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "The speaker is recounting their own direct experience — their car died, they saw a craft, they lost time, they woke up with marks. This is primary testimony.",
      pronoun_target: "Every use of 'I' and 'my' refers to directly experiencing the anomalous event — seeing the craft, being paralyzed, waking up with marks.",
      speaker_role: "experiencer",
      content_type: "first_person",
      tier: 1,
      track: "encounters",
      confidence: 98,
      justification: "Speaker describes their own direct UAP encounter with specific personal details (location, time, physical marks). Classic first-person testimony.",
      experiencer_name: null,
    }),
  },
  // Example 3: Documentary narrator retelling (Tier 2) — ANOTHER NEGATIVE EXAMPLE
  {
    role: 'user',
    content: `Channel: "UFO Documentaries"\n\nVideo Title: "The Travis Walton Case - 1975"\n\nTranscript excerpt:\n\nIn 1975, a logging crew was working in the Apache-Sitgreaves National Forest when they spotted a luminous disc hovering above the trees. Travis Walton approached the glowing disk and was struck by a beam of light. His terrified crewmates fled in their truck. When I spoke to his crewmate Mike Rogers last year, he told me the memory still haunts him. Travis was missing for five days before reappearing confused and dehydrated.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "The speaker is narrating a historical case from 1975. They mention interviewing a witness ('When I spoke to...'), acting as a documentarian, not an experiencer.",
      pronoun_target: "The speaker uses 'I' only to describe their research process — interviewing Mike Rogers. The anomalous events happened to Travis Walton, not the speaker.",
      speaker_role: "narrator",
      content_type: "retold_story",
      tier: 2,
      track: "program",
      confidence: 96,
      justification: "Speaker is narrating someone else's historical encounter and references their own role as an interviewer/researcher.",
      experiencer_name: null,
    }),
  },
];

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
 * Uses gpt-4o with structured chain-of-thought prompting and few-shot
 * examples. The model must reason about speaker role and pronoun targets
 * BEFORE outputting a tier classification.
 * 
 * @param transcript The raw or punctuated transcript text
 * @param title Video title
 * @param description Video description
 * @param channelName YouTube channel name
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
      speaker_role: 'other',
      experiencer_name: null,
    };
  }

  // 5000 chars gives enough context to determine speaker role accurately
  const truncatedTranscript = transcript ? transcript.slice(0, 5000) : '';

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',  // Frontier model — classification is the most consequential gate
      messages: [
        { role: 'system', content: UAP_CLASSIFICATION_PROMPT },
        // Few-shot examples (user/assistant pairs)
        ...FEW_SHOT_EXAMPLES,
        // Actual classification request
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
      max_tokens: 400, // Increased for CoT reasoning fields
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    const raw = JSON.parse(content);

    // Log CoT reasoning for debugging (these fields exist in raw but may be stripped by Zod)
    if (raw.speaker_analysis) {
      console.log(`[UAP Classify] Speaker analysis: ${raw.speaker_analysis}`);
      console.log(`[UAP Classify] Pronoun target: ${raw.pronoun_target}`);
    }

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
        speaker_role: raw.speaker_role || 'other',
        experiencer_name: raw.experiencer_name || null,
      };
    }

    return parsed.data;
  } catch (error) {
    console.error('Error in classifyUapContent:', error);
    throw error; // Re-throw so batch scripts can catch the actual message
  }
}
