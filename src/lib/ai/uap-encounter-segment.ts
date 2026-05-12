/**
 * UAP Encounter Segmentation
 * 
 * Runs on videos flagged with has_multiple_encounters = true by the classifier.
 * Identifies distinct encounter segments within a single transcript, each with:
 * - Experiencer name (or contextual label for unnamed witnesses)
 * - Source type (direct, interview, retold)
 * - Encounter label (human-readable summary)
 * - Approximate character ranges in the transcript
 * 
 * This is a lightweight gpt-4o-mini call (~$0.002/video).
 * For single-encounter videos, the pipeline skips this and uses the full transcript.
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EncounterSegment {
  /** Name of the experiencer (or contextual label like "Unnamed Ranch Worker") */
  experiencer_name: string;
  /** Brief, descriptive label for the encounter */
  encounter_label: string;
  /** How the encounter is presented in this transcript */
  source_type: 'direct_experiencer' | 'interview_with_experiencer' | 'retold_encounter';
  /** Approximate start character in the transcript */
  start_char_approx: number;
  /** Approximate end character in the transcript */
  end_char_approx: number;
}

export interface EncounterSegmentationResult {
  encounters: EncounterSegment[];
  /** Total encounters detected */
  count: number;
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const EncounterSegmentSchema = z.object({
  experiencer_name: z.string(),
  encounter_label: z.string(),
  source_type: z.enum(['direct_experiencer', 'interview_with_experiencer', 'retold_encounter']),
  grounding_quote: z.string().optional(),
  start_char_approx: z.number(),
  end_char_approx: z.number(),
});

const SegmentationResultSchema = z.object({
  encounters: z.array(EncounterSegmentSchema),
  count: z.number(),
});

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SEGMENTATION_PROMPT = `You are an expert at identifying distinct UAP/UFO encounters within a transcript.

## TASK
Given a transcript, scan it from BEGINNING TO END and identify EVERY distinct UAP encounter described.
Documentaries often feature multiple experiencers — some named early, others introduced later in the video. You must scan the ENTIRE transcript, not stop after finding the first encounter. The classifier hint may only list names from the first few minutes — you are responsible for finding encounters throughout the full transcript.

## GROUNDING RULES
- Identify ALL encounters that are **explicitly described in the transcript text provided**. Be thorough — missing real encounters is as bad as inventing fake ones.
- DO NOT invent or add encounters from your general knowledge of UFO history. Only report what the transcript actually discusses.
- For each encounter, include a "grounding_quote" field: a SHORT verbatim quote (10-30 words) from the transcript proving this encounter is discussed.
- The classifier may only list 1-2 names (it only sees the first part of the transcript). YOU see the FULL transcript — there may be additional encounters later in the video. Find them all.

## NAME DEDUPLICATION (YouTube Transcript Quality)
YouTube auto-transcription frequently MISSPELLS proper names, creating multiple spellings for the same person:
- Example: "Dr. Lynn", "Dr. Katai", "Cataria" are all "Dr. Lynn Kitei" — a single person.
- Before listing encounters, scan for names that sound similar or appear in the same context. Consolidate them into ONE encounter with the BEST spelling.
- Use the video title as a hint — if the title says "Phoenix Lights" and the transcript has "Dr. Lynn" and "Cataria" both discussing Phoenix Lights, they are likely the same person.
- When consolidating, pick the most complete/correct-looking name variant.

## RULES
1. Each encounter involves a DIFFERENT person/group experiencing a UAP event.
2. If the same person has multiple separate encounters at different times, list each one separately.
3. Two people experiencing the SAME event together (e.g., a married couple abducted together) = 1 encounter, not 2. List both names: "Betty & Barney Hill".
4. FAMILY/HOUSEHOLD GROUPING: If a parent describes their children's experiences as part of the same family encounter, that is ONE encounter under the parent's name (e.g., "Jody & Family"), NOT separate encounters per child. Children briefly mentioned ("my son saw shadows", "Paula drew a picture") are part of the parent's encounter.
5. MINIMUM SUBSTANCE THRESHOLD: Only create a separate encounter if the person's experience is described in SUBSTANTIAL detail — at least several sentences of their own testimony or a detailed narrative about their specific encounter. Brief mentions, single-line references, or names dropped in passing do NOT qualify as separate encounters. Fold them into the encounter of whoever is telling the story.
6. A narrator describing 3 historical cases = 3 encounters (if all 3 are actually in the transcript).
7. For unnamed witnesses, create a descriptive contextual label based on details IN THE TRANSCRIPT:
   - Use context from the transcript itself, e.g., "Unnamed Farmer (described at 30:00)" 
   - NEVER just "Unknown" or "Unnamed" alone — always add context from the transcript.
8. Number unnamed witnesses sequentially: "Unnamed Witness 1", "Unnamed Witness 2"
9. Determine source_type for each encounter:
   - "direct_experiencer": The person speaks directly in the transcript about their own experience IN THEIR OWN VOICE. You can hear THEM talking.
   - "interview_with_experiencer": The person answers interview questions about their experience in their own voice.
   - "retold_encounter": A narrator/host retells the person's experience; the person does NOT speak in their own voice.
10. CRITICAL — Historical and Primary Source Rule:
   - If the witnesses are obviously deceased (pre-modern accounts from 74 BC, 1561, 1896, etc.), the source_type is ALWAYS "retold_encounter" — a modern narrator is reading from historical documents.
   - However, if a living experiencer tells their own story from decades ago (e.g., an experiencer recounting their 1975 event), that is "direct_experiencer" or "interview_with_experiencer" — the EVENT date does not matter, the SPEAKER matters.
   - "Primary Sources" in the title = retold_encounter for ALL encounters (the narrator is reading archived texts).
   - A narrator who says "according to [person]" or reads from a historical document is retelling, not direct testimony.
11. NEVER classify as "direct_experiencer" unless you can clearly distinguish the experiencer's own voice/speech from the narrator's voice in the transcript.
12. DOCUMENTARY HYBRID RULE: Many documentaries introduce a case via narrator, then cut to the actual experiencer speaking (archival footage, interview clips, hypnosis recordings). If the experiencer speaks ANYWHERE in their segment — even if a narrator introduces the case first — classify as "direct_experiencer" or "interview_with_experiencer", NOT "retold_encounter". The experiencer's voice TRUMPS narrator introduction. Scan the ENTIRE segment, not just the beginning.

## CHARACTER RANGES
Provide approximate start and end character positions in the transcript where each encounter is discussed.
These don't need to be exact — they help extract the relevant section for deeper analysis.
If encounters overlap or are interspersed, use the broadest range that covers the encounter's discussion.

## OUTPUT
Return ONLY valid JSON:
{
  "encounters": [
    {
      "experiencer_name": "Person Name",
      "encounter_label": "Brief description of what happened",
      "source_type": "retold_encounter",
      "grounding_quote": "verbatim quote from transcript proving this encounter is discussed",
      "start_char_approx": 0,
      "end_char_approx": 5000
    }
  ],
  "count": 1
}`;

// ─── Segmenter ───────────────────────────────────────────────────────────────

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
  return new OpenAI({ apiKey });
};

/**
 * Segment a transcript into distinct encounter blocks.
 * Only call this when has_multiple_encounters is true.
 * 
 * For single-encounter videos, skip this and use the full transcript.
 */
export async function segmentEncounters(
  transcript: string,
  experiencerNamesHint?: string[],
  title?: string,
): Promise<EncounterSegmentationResult> {
  const openai = getOpenAIClient();

  // Use full transcript for better segmentation accuracy
  // gpt-4o-mini handles up to 128K tokens, so even 2-hour transcripts fit
  const transcriptToSend = transcript.slice(0, 100000); // 100K char safety limit

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: SEGMENTATION_PROMPT },
    {
      role: 'user',
      content: [
        title ? `Video Title: "${title}"` : '',
        experiencerNamesHint?.length
          ? `Known experiencer names from classifier: ${experiencerNamesHint.join(', ')}`
          : '',
        `Transcript length: ${transcript.length} characters`,
        `\n--- TRANSCRIPT ---\n${transcriptToSend}`,
      ].filter(Boolean).join('\n'),
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from segmentation model');
    }

    const raw = JSON.parse(content);
    const parsed = SegmentationResultSchema.safeParse(raw);

    if (!parsed.success) {
      console.error('[UAP Segment] Zod validation failed:', parsed.error.issues);
      // Fallback: try to extract what we can
      if (raw.encounters && Array.isArray(raw.encounters)) {
        const validEncounters = raw.encounters.filter((e: any) => e.experiencer_name);
        return {
          encounters: validEncounters.map((e: any, i: number) => ({
            experiencer_name: e.experiencer_name || `Unnamed Witness ${i + 1}`,
            encounter_label: e.encounter_label || `Encounter ${i + 1}`,
            source_type: e.source_type || 'retold_encounter',
            start_char_approx: e.start_char_approx || 0,
            end_char_approx: e.end_char_approx || transcript.length,
          })),
          count: validEncounters.length,
        };
      }
      throw new Error('Segmentation output invalid');
    }

    console.log(`[UAP Segment] Raw model output: ${parsed.data.count} encounters: ${parsed.data.encounters.map(e => e.experiencer_name).join(', ')}`);

    // Warn if surprisingly few encounters for a long transcript
    if (parsed.data.count <= 1 && transcript.length > 20000) {
      console.warn(`[UAP Segment] ⚠️ Only ${parsed.data.count} encounter(s) for a ${transcript.length}-char transcript — model may be under-reporting`);
    }

    // ── Grounding Validation: filter out hallucinated encounters ──
    // Check that each encounter's content actually exists in the transcript
    const transcriptLower = transcript.toLowerCase();
    const groundedEncounters = parsed.data.encounters.filter((enc) => {
      // Check 1: Does the grounding quote exist in the transcript?
      if (enc.grounding_quote) {
        const quoteLower = enc.grounding_quote.toLowerCase().trim();
        // Allow fuzzy match — check for a substantial substring (first 40 chars)
        const quoteSnippet = quoteLower.slice(0, 40);
        if (quoteSnippet.length >= 10 && transcriptLower.includes(quoteSnippet)) {
          return true;
        }
      }

      // Check 2: Does the experiencer name appear in the transcript?
      const nameParts = enc.experiencer_name.toLowerCase().split(/\s+/);
      const significantParts = nameParts.filter(p => p.length > 2 && !['the', 'and', 'unnamed', 'anonymous', 'witness'].includes(p));
      if (significantParts.length > 0 && significantParts.some(part => transcriptLower.includes(part))) {
        return true;
      }

      // Check 3: Does the encounter label mention something in the transcript?
      const labelWords = enc.encounter_label.toLowerCase().split(/\s+/)
        .filter(w => w.length > 4 && !['encounter', 'experience', 'abduction', 'sighting'].includes(w));
      if (labelWords.some(word => transcriptLower.includes(word))) {
        return true;
      }

      console.warn(`[UAP Segment] FILTERED hallucinated encounter: "${enc.experiencer_name}" — not found in transcript`);
      return false;
    });

    if (groundedEncounters.length === 0) {
      console.warn('[UAP Segment] All encounters filtered as hallucinated — this should not happen');
      // Fallback: return the first encounter from classifier hints
      return { encounters: parsed.data.encounters.slice(0, 1), count: 1 };
    }

    console.log(`[UAP Segment] After grounding: ${groundedEncounters.length} encounters (filtered ${parsed.data.encounters.length - groundedEncounters.length} hallucinated)`);
    return { encounters: groundedEncounters, count: groundedEncounters.length };

  } catch (error) {
    console.error('[UAP Segment] Error:', error);
    throw error;
  }
}

/**
 * Extract the transcript segment for a specific encounter.
 * Falls back to the full transcript if char ranges are invalid.
 */
export function extractEncounterText(
  fullTranscript: string,
  segment: EncounterSegment,
): string {
  const start = Math.max(0, segment.start_char_approx);
  const end = Math.min(fullTranscript.length, segment.end_char_approx);

  // Validate range
  if (start >= end || end - start < 100) {
    // Range is too small or invalid — use full transcript
    return fullTranscript;
  }

  return fullTranscript.slice(start, end);
}

// ─── Name Deduplication ──────────────────────────────────────────────────────

const NAME_DEDUP_PROMPT = `You are an expert at detecting when YouTube auto-transcription has produced multiple spellings for the same person's name.

Given a list of encounter names from a video transcript, identify which names are likely the SAME PERSON but misspelled by auto-transcription.

Rules:
- Only merge names when you are highly confident they are the same person.
- Consider phonetic similarity, context, and the video title.
- "Dr. Lynn", "Dr. Katai", "Dr. Kitai", "Cataria" could all be the same person if they appear in a video about the same topic.
- Names that are clearly different people (e.g., "Kurt Russell" vs "Dr. Lynn") should NOT be merged.
- Pick the most complete/correct-looking name as the canonical name.

Return ONLY valid JSON:
{
  "merges": [
    {
      "canonical_name": "Dr. Lynn Kitei",
      "aliases": ["Dr. Lynn", "Dr. Katai", "Cataria"]
    }
  ]
}

If no names need merging, return: { "merges": [] }`;

/**
 * Detect and merge duplicate encounter names caused by ASR misspellings.
 * Ultra-cheap gpt-4o-mini call (~$0.001).
 * 
 * Returns the deduplicated segments with merged character ranges.
 */
export async function deduplicateEncounterNames(
  segments: EncounterSegment[],
  title?: string,
): Promise<EncounterSegment[]> {
  if (segments.length <= 1) return segments;

  const names = segments.map(s => s.experiencer_name);
  
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: NAME_DEDUP_PROMPT },
        {
          role: 'user',
          content: [
            title ? `Video Title: "${title}"` : '',
            `Encounter names to check for duplicates:`,
            ...names.map((n, i) => `${i + 1}. "${n}"`),
          ].filter(Boolean).join('\n'),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 300,
    });

    const content = completion.choices[0].message.content;
    if (!content) return segments;

    const result = JSON.parse(content);
    if (!result.merges || !Array.isArray(result.merges) || result.merges.length === 0) {
      console.log('[UAP Dedup] No name duplicates detected');
      return segments;
    }

    // Build merge map: alias -> canonical name
    const mergeMap = new Map<string, string>();
    for (const merge of result.merges) {
      for (const alias of merge.aliases) {
        mergeMap.set(alias.toLowerCase(), merge.canonical_name);
      }
      mergeMap.set(merge.canonical_name.toLowerCase(), merge.canonical_name);
    }

    // Merge segments: group by canonical name, combine char ranges
    const grouped = new Map<string, EncounterSegment[]>();
    for (const seg of segments) {
      const canonical = mergeMap.get(seg.experiencer_name.toLowerCase()) || seg.experiencer_name;
      const existing = grouped.get(canonical) || [];
      existing.push(seg);
      grouped.set(canonical, existing);
    }

    const merged: EncounterSegment[] = [];
    for (const [canonicalName, group] of grouped) {
      if (group.length === 1) {
        merged.push({ ...group[0], experiencer_name: canonicalName });
      } else {
        // Merge: combine char ranges, use the best source_type
        const minStart = Math.min(...group.map(g => g.start_char_approx));
        const maxEnd = Math.max(...group.map(g => g.end_char_approx));
        const sourceRank: Record<string, number> = { direct_experiencer: 3, interview_with_experiencer: 2, retold_encounter: 1 };
        const bestSource = group.sort((a, b) =>
          (sourceRank[b.source_type] || 0) - (sourceRank[a.source_type] || 0)
        )[0].source_type;

        const mergedNames = group.map(g => g.experiencer_name).join(', ');
        console.log(`[UAP Dedup] Merged "${mergedNames}" → "${canonicalName}"`);

        merged.push({
          experiencer_name: canonicalName,
          encounter_label: group[0].encounter_label,
          source_type: bestSource,
          grounding_quote: group[0].grounding_quote,
          start_char_approx: minStart,
          end_char_approx: maxEnd,
        });
      }
    }

    console.log(`[UAP Dedup] ${segments.length} segments → ${merged.length} after dedup`);
    return merged;

  } catch (error) {
    console.error('[UAP Dedup] Error, returning original segments:', error);
    return segments;
  }
}
