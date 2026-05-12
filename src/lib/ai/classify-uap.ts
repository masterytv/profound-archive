/**
 * UAP Content Classification Gate
 * 
 * Lightweight AI pre-screen to categorize UAP videos into:
 * - Tier 1 (First Person Encounter): Direct testimony or interview with experiencer
 * - Tier 2 (Research & Intelligence): Retold encounters, disclosure, research, journalism
 * - Tier 3 (out_of_scope): Cryptids, ghost hunting, entertainment, clickbait
 * 
 * Uses gpt-4o with structured CoT (chain-of-thought) prompting.
 * The model must reason about speaker role and pronoun targets BEFORE
 * outputting a tier classification. Few-shot examples inoculate against
 * common misclassification patterns (journalist-as-experiencer trap).
 * 
 * Multi-encounter detection: returns experiencer_names[] and has_multiple_encounters
 * for videos that describe more than one distinct encounter.
 * 
 * Cost: ~$0.01/call. Uses 5000 chars of transcript.
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UapClassificationResult {
  /** Content type classification */
  content_type: 'first_person' | 'interview' | 'retold_encounter' | 'research_analysis' | 'program_disclosure' | 'investigative_journalism' | 'documentary_survey' | 'news_commentary' | 'out_of_scope';
  /** Tier: 1 = first-person encounter, 2 = research/intelligence, 3 = out of scope */
  tier: 1 | 2 | 3;
  /** Track: encounters (Tier 1) or program (Tier 2) */
  track: 'encounters' | 'program';
  /** Source type for encounter analysis routing */
  source_type: 'direct_experiencer' | 'interview_with_experiencer' | 'retold_encounter' | 'research' | 'narrator' | 'commentary';
  /** Confidence in the classification (0-100) */
  confidence: number;
  /** Brief justification for the classification */
  justification: string;
  /** Role of the primary speaker */
  speaker_role: 'experiencer' | 'interviewer_with_experiencer' | 'journalist' | 'researcher' | 'narrator' | 'other';
  /** Names of the contactees/experiencers, empty array if unidentifiable */
  experiencer_names: string[];
  /** Whether the video describes multiple distinct encounters */
  has_multiple_encounters: boolean;
  /** Legacy field for backward compat — first name from experiencer_names */
  experiencer_name: string | null;
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

export const UAPClassificationSchema = z.object({
  // CoT reasoning fields (generated first, kept for debugging)
  speaker_analysis: z.string().optional(),
  pronoun_target: z.string().optional(),
  encounter_scan: z.string().optional(),
  // Classification output fields
  content_type: z.enum([
    'first_person', 'interview',
    'retold_encounter', 'research_analysis', 'program_disclosure',
    'investigative_journalism', 'documentary_survey', 'news_commentary',
    'out_of_scope',
  ]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  track: z.enum(['encounters', 'program']),
  source_type: z.enum([
    'direct_experiencer', 'interview_with_experiencer',
    'retold_encounter', 'research', 'narrator', 'commentary',
  ]),
  confidence: z.number().min(0).max(100),
  justification: z.string(),
  speaker_role: z.enum(['experiencer', 'interviewer_with_experiencer', 'journalist', 'researcher', 'narrator', 'other']),
  experiencer_names: z.array(z.string()).default([]),
  has_multiple_encounters: z.boolean().default(false),
});

// ─── Prompt ──────────────────────────────────────────────────────────────────

const UAP_CLASSIFICATION_PROMPT = `You are an expert classifier of UFO/UAP content. Your job is to classify video transcripts into Tiers based on whether they contain true first-person testimony.

## TIER DEFINITIONS
- **Tier 1 — First Person Encounter (track: "encounters")**:
  - content_type "first_person": The speaker IS the exact person who had the anomalous encounter. They describe what happened to THEM personally.
  - content_type "interview": A host/interviewer is talking WITH the actual experiencer, who answers questions about their own encounter. The experiencer speaks directly.
- **Tier 2 — Research & Intelligence (track: "program")**:
  - content_type "retold_encounter": A narrator/host retells someone else's encounter in detail. The experiencer does NOT speak directly. Still contains rich encounter data but is secondhand.
  - content_type "research_analysis": Scientific or investigative analysis of UAP patterns, physics, data.
  - content_type "program_disclosure": Government/military programs, whistleblower testimony about institutional knowledge, congressional hearings.
  - content_type "investigative_journalism": Journalists investigating cases, connecting evidence across multiple sources.
  - content_type "documentary_survey": Broad documentary covering multiple cases or ufology history.
  - content_type "news_commentary": News coverage, opinion, or reaction to UAP developments.
- **Tier 3 (track: "program")**: Unrelated content (cryptids, ghost hunting, entertainment, clickbait, gaming).

## SOURCE TYPE MAPPING
Map content_type to source_type as follows:
- first_person → "direct_experiencer"
- interview → "interview_with_experiencer"
- retold_encounter → "retold_encounter"
- research_analysis → "research"
- program_disclosure → "research"
- investigative_journalism → "narrator"
- documentary_survey → "narrator"
- news_commentary → "commentary"
- out_of_scope → "commentary"

## CRITICAL RULES FOR CLASSIFICATION
1. **The "Investigator" Trap**: Journalists and researchers often use first-person pronouns ("People are telling ME", "I am investigating"). Using "I" does NOT make someone an experiencer. "I" must refer to EXPERIENCING THE UAP EVENT DIRECTLY.
2. **The "Retelling" Trap**: A host reading someone else's detailed account ("Carl Higdon parked his truck... he saw a disc-shaped craft...") is Tier 2 retold_encounter, NOT Tier 1. The speaker is a conduit, not the witness.
3. **Interview vs Retold**: If the actual experiencer SPEAKS in the video (answers questions, tells their story in their own words), it's "interview" (Tier 1). If only a narrator describes the encounter while the experiencer never speaks, it's "retold_encounter" (Tier 2).
4. **Explicit Role Override**: If a speaker identifies as a journalist, reporter, podcaster, investigator, or researcher, they are ALWAYS Tier 2.
5. **Channel Name Is NOT Decisive**: Evaluate the TRANSCRIPT, not the channel name.
6. **Historical vs. Living Testimony**: The DATE of the event alone does NOT determine the tier. What matters is whether the EXPERIENCER is alive and speaking:
   - A narrator reading accounts from pre-modern eras (74 BC, 1561, 1896) where the witnesses are obviously dead = ALWAYS Tier 2 "documentary_survey". No living person can give testimony.
   - But Travis Walton recounting his 1975 encounter IN HIS OWN VOICE in a 2020 interview = Tier 1 "interview". The experiencer is alive and speaking. A 1970s event does not make it "historical" if the witness is present.
   - The key test: **Can you hear the actual experiencer's voice in the transcript?** If yes → potentially Tier 1. If the narrator is reading from documents/books/archives → Tier 2.
7. **"Primary Sources" Signal**: If the title mentions "Primary Sources", "Historical Accounts", or "From History", the content is virtually always a narrator reading historical documents = Tier 2 documentary_survey.

## MULTI-ENCOUNTER DETECTION
Scan the transcript for multiple distinct encounters:
- If the transcript describes encounters involving 2+ different experiencers (e.g., "Travis Walton's abduction... and then Betty Hill's encounter..."), set has_multiple_encounters: true.
- List ALL experiencer names you can identify in experiencer_names[].
- If an experiencer is unnamed, use a contextual label like "Unnamed Ranch Worker" or "Anonymous Military Pilot" or "Witness 1".
- For Tier 2 research/program content that doesn't describe specific encounters, set has_multiple_encounters: false and experiencer_names: [].

## OUTPUT FORMAT
Output ONLY valid JSON. Generate keys in this EXACT ORDER:

{
  "speaker_analysis": "1-2 sentences: Who is speaking? Do they state their profession?",
  "pronoun_target": "1 sentence: When 'I'/'me' is used, does it refer to experiencing the anomaly or investigating/reporting?",
  "encounter_scan": "1-2 sentences: How many distinct encounters are described? List experiencer names found.",
  "speaker_role": "experiencer | interviewer_with_experiencer | journalist | researcher | narrator | other",
  "content_type": "first_person | interview | retold_encounter | research_analysis | program_disclosure | investigative_journalism | documentary_survey | news_commentary | out_of_scope",
  "source_type": "direct_experiencer | interview_with_experiencer | retold_encounter | research | narrator | commentary",
  "tier": 1 | 2 | 3,
  "track": "encounters | program",
  "confidence": 0-100,
  "justification": "1-2 sentence final justification",
  "experiencer_names": ["Name1", "Name2"],
  "has_multiple_encounters": true | false
}

EXPERIENCER NAME RULES:
- Extract the FULL NAME of person(s) who HAD the UAP experience.
- DO NOT return the name of the host, interviewer, journalist, or researcher.
- ONLY include names that are EXPLICITLY MENTIONED in the transcript excerpt provided. Do NOT add names from your general knowledge of UFO cases.
- For unnamed witnesses, use contextual labels: "Unnamed [Role/Context]".
- For Tier 2 non-encounter content (research, news), return [].`;

// ─── Few-Shot Examples ───────────────────────────────────────────────────────

const FEW_SHOT_EXAMPLES: Array<{ role: 'user' | 'assistant'; content: string }> = [
  // Example 1: Journalist discussing encounters (Tier 2 research_analysis)
  {
    role: 'user',
    content: `Channel: "Mantis Encounters"\n\nVideo Title: "Ross Coulthart on Mantis Beings"\n\nTranscript excerpt:\n\nUm, you and I were talking yesterday about mantids. I'm talking to people who, um, who say that they have been visited by mantid beings. And I'll freely admit, 5-6 years ago I would have laughed them out of town. These people, whether what they're seeing is real or not, I believe that they have had what they perceived as mantid beings in their home. And what's interesting is those mantid beings are telling them to engage with me. And it's getting quite personal because this is happening quite a lot to me. And I don't think I'm important. I'm just a journalist. I really truly believe all I'm doing is following an absolute ball terror of a story.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "The speaker explicitly states 'I\\'m just a journalist' and describes talking to people who had experiences. He is receiving accounts from others.",
      pronoun_target: "When the speaker says 'me' and 'I', he refers to his journalism work, not to experiencing the anomaly directly.",
      encounter_scan: "No specific encounters are described in detail. The speaker references multiple unnamed people who reported mantid encounters but doesn't narrate any single encounter.",
      speaker_role: "journalist",
      content_type: "research_analysis",
      source_type: "research",
      tier: 2,
      track: "program",
      confidence: 97,
      justification: "Speaker explicitly identifies as a journalist reporting on other people's mantid encounter accounts. No specific encounter is narrated.",
      experiencer_names: [],
      has_multiple_encounters: false,
    }),
  },
  // Example 2: True first-person experiencer (Tier 1 first_person)
  {
    role: 'user',
    content: `Channel: "UFO Witness Stories"\n\nVideo Title: "My Terrifying Abduction - What They Did To Me"\n\nTranscript excerpt:\n\nI was driving down Route 66, it was about 2 AM. My car completely died. The radio went to static. I looked up and there was this massive triangular craft hovering directly above my windshield. I couldn't move. It felt like something was holding me in place. The next thing I remember, I woke up in my bed three hours later. I had this strange triangular mark on my forearm that wasn't there before.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "The speaker recounts their own direct experience with specific personal details (location, time, physical marks).",
      pronoun_target: "Every use of 'I' and 'my' refers to directly experiencing the anomalous event.",
      encounter_scan: "One encounter described: the speaker's own abduction experience on Route 66.",
      speaker_role: "experiencer",
      content_type: "first_person",
      source_type: "direct_experiencer",
      tier: 1,
      track: "encounters",
      confidence: 98,
      justification: "Speaker describes their own direct UAP encounter with specific personal details. Classic first-person testimony.",
      experiencer_names: [],
      has_multiple_encounters: false,
    }),
  },
  // Example 3: Narrator retelling one encounter (Tier 2 retold_encounter)
  {
    role: 'user',
    content: `Channel: "My Dark Path"\n\nVideo Title: "The Alien Abduction of Carl Higdon"\n\nTranscript excerpt:\n\nIt's Friday, October 25th, 1974. Around 400 p.m. In the remote Medicine Bow National Forest, Carl Higdon parks his truck. What Carl would find in the forest would change his life forever. Hi, I'm MF Thomas and this is my dark path. Carl aimed his rifle at an elk and pulled the trigger. The bullet left the barrel but moved in slow motion, falling to the ground about fifty feet away. Then he noticed a humanoid figure standing nearby. The being, who identified himself as Ausso One, offered Carl a pill.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "The speaker is MF Thomas, a narrator/host who introduces himself by name. He retells Carl Higdon's 1974 encounter in dramatic third person.",
      pronoun_target: "The speaker uses 'I' only to introduce himself as the host. All encounter details use 'he' and 'Carl', referring to Carl Higdon.",
      encounter_scan: "One distinct encounter described: Carl Higdon's 1974 alien abduction in Medicine Bow National Forest.",
      speaker_role: "narrator",
      content_type: "retold_encounter",
      source_type: "retold_encounter",
      tier: 2,
      track: "program",
      confidence: 96,
      justification: "Speaker is a narrator retelling Carl Higdon's encounter. Carl Higdon never speaks directly. Rich encounter data but secondhand.",
      experiencer_names: ["Carl Higdon"],
      has_multiple_encounters: false,
    }),
  },
  // Example 4: Interview with experiencer (Tier 1 interview)
  {
    role: 'user',
    content: `Channel: "UAP Research"\n\nVideo Title: "Travis Walton Tells His Story of Alien Abduction"\n\nTranscript excerpt:\n\nSo Travis, take us back to that night in 1975. What happened when you first saw the craft? Travis: Well, we were driving back from work, the whole crew. And I looked up ahead and I saw this kind of glow coming through the trees. And when we got closer, I could see it was, it was kind of a golden color, hovering just above the treetops. And I, I don't know what possessed me, but I jumped out of the truck and ran toward it.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "A host interviews Travis Walton, who answers in his own words about his personal experience. Travis speaks directly about his encounter.",
      pronoun_target: "When Travis says 'I', he refers to directly experiencing the event (seeing the craft, running toward it).",
      encounter_scan: "One encounter described: Travis Walton's 1975 alien abduction in Apache-Sitgreaves National Forest.",
      speaker_role: "interviewer_with_experiencer",
      content_type: "interview",
      source_type: "interview_with_experiencer",
      tier: 1,
      track: "encounters",
      confidence: 95,
      justification: "The actual experiencer (Travis Walton) speaks directly about his encounter in an interview format. First-person testimony through Q&A.",
      experiencer_names: ["Travis Walton"],
      has_multiple_encounters: false,
    }),
  },
  // Example 5: Multi-encounter documentary (Tier 2 documentary_survey)
  {
    role: 'user',
    content: `Channel: "UFO Files"\n\nVideo Title: "3 Terrifying Alien Abductions That Changed Everything"\n\nTranscript excerpt:\n\nOur first case takes us to Pascagoula, Mississippi, 1973. Charles Hickson and Calvin Parker were fishing on the Pascagoula River when they saw blue lights. According to Hickson, three creatures with wrinkled skin floated toward them. Both men were paralyzed and taken aboard. Our second case involves the Allagash abductions. In 1976, four young men were canoeing in Maine when a massive ball of light appeared over the lake. And finally, the case of Sergeant Charles Moody in New Mexico.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "An unnamed narrator presents three historical abduction cases in documentary format. None of the experiencers speak directly.",
      pronoun_target: "The narrator uses third person throughout. 'They', 'he', 'both men' refer to the experiencers. No first-person encounter claims.",
      encounter_scan: "Three distinct encounters: (1) Hickson/Parker in Pascagoula 1973, (2) Allagash four in Maine 1976, (3) Sgt. Charles Moody in New Mexico.",
      speaker_role: "narrator",
      content_type: "documentary_survey",
      source_type: "narrator",
      tier: 2,
      track: "program",
      confidence: 95,
      justification: "Documentary narrator retells three separate encounters. Rich encounter data but entirely secondhand. No experiencers speak.",
      experiencer_names: ["Charles Hickson", "Calvin Parker", "Charles Moody"],
      has_multiple_encounters: true,
    }),
  },
  // Example 6: Historical primary source narration (Tier 2 documentary_survey)
  // This is the exact trap: a narrator reading ancient first-person accounts sounds like first_person
  {
    role: 'user',
    content: `Channel: "Voices of the Past"\n\nVideo Title: "5 Bizarre Accounts From History of UFO Sightings (74 BC - 1896) // Primary Sources"\n\nTranscript excerpt:\n\nToday we're going to look at some historical accounts of what we might today call UFO sightings. Our first account comes from 74 BC, written by Plutarch. According to Plutarch, when the Roman army marched against King Mithridates, a great body of flame shaped like a barrel fell from the sky between the two armies. It landed on the ground with an incredible noise. No action was fought, and both armies drew off. Our second account is from the Nuremberg Chronicle of 1561. On April 14th, the citizens of Nuremberg witnessed what they described as an aerial battle. Numerous spheres, cylinders, and crosses appeared in the sky.`,
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      speaker_analysis: "A narrator from the 'Voices of the Past' channel reads translated primary source accounts from antiquity (74 BC, 1561, 1896). The narrator introduces each historical account and reads from ancient texts.",
      pronoun_target: "Any first-person language comes from the narrator's introduction ('we're going to look at') or from translated historical texts, not from living experiencers speaking.",
      encounter_scan: "Multiple historical encounters described: (1) Roman army sighting 74 BC from Plutarch, (2) Nuremberg 1561 aerial phenomenon. Title indicates 5 total accounts spanning 74 BC to 1896.",
      speaker_role: "narrator",
      content_type: "documentary_survey",
      source_type: "narrator",
      tier: 2,
      track: "program",
      confidence: 98,
      justification: "A modern narrator reading and translating primary source documents from centuries ago. No living experiencer speaks. The title '// Primary Sources' confirms this is historical retelling.",
      experiencer_names: ["Plutarch's Roman soldiers", "Nuremberg citizens (1561)"],
      has_multiple_encounters: true,
    }),
  },
];

// ─── Classifier ──────────────────────────────────────────────────────────────

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
  return new OpenAI({ apiKey });
};

/**
 * Classify a UAP video into Tier 1/2/3 with track, content type, and source type.
 * 
 * Detects multiple encounters and extracts experiencer names.
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
      source_type: 'commentary',
      confidence: 0,
      justification: 'Insufficient content to classify',
      speaker_role: 'other',
      experiencer_names: [],
      has_multiple_encounters: false,
      experiencer_name: null,
    };
  }

  // 5000 chars gives enough context to determine speaker role accurately
  const truncatedTranscript = transcript ? transcript.slice(0, 5000) : '';

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: UAP_CLASSIFICATION_PROMPT },
        ...FEW_SHOT_EXAMPLES,
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
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    const raw = JSON.parse(content);

    // Log CoT reasoning for debugging
    if (raw.speaker_analysis) {
      console.log(`[UAP Classify] Speaker analysis: ${raw.speaker_analysis}`);
      console.log(`[UAP Classify] Pronoun target: ${raw.pronoun_target}`);
      console.log(`[UAP Classify] Encounter scan: ${raw.encounter_scan}`);
    }

    // Validate with Zod
    const parsed = UAPClassificationSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('UAP classification Zod validation failed:', parsed.error.issues);
      // Graceful fallback
      return {
        content_type: raw.content_type || 'out_of_scope',
        tier: raw.tier || 3,
        track: raw.track || 'program',
        source_type: raw.source_type || 'commentary',
        confidence: raw.confidence || 0,
        justification: raw.justification || 'Zod validation failed',
        speaker_role: raw.speaker_role || 'other',
        experiencer_names: raw.experiencer_names || [],
        has_multiple_encounters: raw.has_multiple_encounters || false,
        experiencer_name: raw.experiencer_names?.[0] || null,
      };
    }

    const result = parsed.data;
    return {
      ...result,
      // Legacy compat: first name from array
      experiencer_name: result.experiencer_names[0] || null,
    };
  } catch (error) {
    console.error('Error in classifyUapContent:', error);
    throw error;
  }
}
