/**
 * UAP-ESS: Evidence Strength Scale Analysis Module
 *
 * Copy-Modify from: src/lib/ai/cvnde.ts (NDE evidence scoring pattern)
 * Scale reference: docs/scales/UAP-ESS.md
 *
 * Evaluates the evidential strength of UAP encounter claims
 * across 7 criteria (each scored 1-4, total 7-28).
 *
 * Uses gpt-4o-mini + OpenAI JSON mode (~$0.001/call).
 * Tier 1 only (first-person encounter accounts).
 */

import OpenAI from 'openai';
import { wrapAiClient } from './usage-tracker';
import { z } from 'zod';

// ─── Lazy OpenAI client ─────────────────────────────────────────────────────

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
  return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'uap-evidence' });
};

// ─── Prompt (engineered from UAP-ESS rubric) ─────────────────────────────────

export const UAP_EVIDENCE_PROMPT = `You are an expert UAP researcher specializing in encounter evidence assessment. Analyze the following UAP encounter transcript using the UAP Evidence Strength Scale (UAP-ESS).

The UAP-ESS evaluates the evidential strength of UAP encounter claims within first-person accounts or detailed reports. You evaluate the NARRATIVE CLAIMS made by the speaker. You are NOT a video forensics tool.

CRITICAL CONSTRAINTS:
1. TRANSCRIPT-ONLY: Score based ONLY on what the speaker SAYS. Do not analyze video/images shown on screen.
2. NO EXTERNAL KNOWLEDGE: Do not supplement with training data about famous cases, named witnesses, or known events. Score only what is explicitly stated.
3. EMOTIONAL DELIVERY IS NOT EVIDENCE: Tone, sincerity, crying, or conviction do NOT affect scoring. Score the CONTENT of claims, not the DELIVERY.

BEFORE SCORING, classify the source type:
- "first_person" — The speaker IS the experiencer
- "reported" — The speaker describes someone else's experience with specific detail
- "commentary" — The speaker analyzes/discusses UAP topics without presenting a specific first-person account

For "commentary" sources: Score criteria 2-4 based on the BEST specific case discussed. If no specific case is discussed in sufficient detail, assign minimum scores (all 1s).

HANDLING MISSING DATA:
When a criterion cannot be evaluated because the account omits that category of information:
1. Score the criterion as 1 (minimum)
2. Flag the reasoning as "[insufficient_data] ..."
3. Do NOT assume or infer information not present in the transcript

## THE 7 CRITERIA (each scored 1-4)

### Criterion 1: Witness Credibility Context
What is the credibility context of the primary witness?
- 1: Anonymous or unverifiable; no professional context; pseudonym
- 2: Named individual with general background; single untrained civilian; OR small group of dependent/related civilians
- 3: Trained observer (pilot, military, law enforcement, scientist) OR multiple independent witnesses (2-9)
- 4: Official capacity witness (on-duty military, radar operator, flight crew with instruments) OR large group (10+) with independent reports

### Criterion 2: Perceptual Clarity
How clear and detailed was the observation?
- 1: Vague, fleeting — flash of light, peripheral glimpse, fragmentary dream
- 2: Moderate clarity — distinct shape/color/behavior but limited detail; brief (seconds)
- 3: Clear observation — structured object/entity, sustained viewing (minutes), good conditions
- 4: Exceptional clarity — prolonged close-range, multiple sensory channels; or hyper-lucid non-physical encounter

### Criterion 3: Specificity of Details
How specific and potentially verifiable are the reported details?
- 1: General impressions only ("bright light", "something in the sky")
- 2: Some specifics — color, approximate size, general location, time of day
- 3: Precise details — exact time, specific location, detailed descriptions, quoted communications, specific maneuvers
- 4: Highly precise, unique details — exact measurements, names of unknown personnel, technical specifications, information later confirmed independently

### Criterion 4: Corroboration
Is the account supported by other witnesses or independent evidence?
- 1: Single witness, no supporting evidence
- 2: Single witness with circumstantial support — consistent with other reports, or one non-independent witness
- 3: Multiple independent witnesses OR single instrumental record (photo, radar, video, audio)
- 4: Multiple independent witnesses AND instrumental/physical evidence; OR official investigation confirming anomalous nature

### Criterion 5: Unpredictability
Could the experience have been anticipated, sought, or fabricated?
- 1: Expected context — skywatch, CE5 meditation, known hotspot
- 2: Somewhat expected — outdoors at night, interest in topic but not actively seeking
- 3: Unexpected — routine activity, no prior interest, skeptic/agnostic
- 4: Highly unexpected — during professional duty, hostile witness, career/reputation damaged by reporting

### Criterion 6: Physical Effects
Were there measurable physical effects on the witness or environment?
- 1: No physical effects reported
- 2: Subjective physiological effects only — tingling, heat, nausea, temporary paralysis
- 3: Observable physiological effects (burns, rashes, sunburn marks) OR environmental effects (vehicle interference, compass deviation, animal reactions)
- 4: Documented/medical physiological effects (medical records, lab results) OR measurable environmental evidence (radiation readings, EM anomalies on calibrated instruments)

### Criterion 7: Temporal Precedence of Report
When was the experience first reported relative to public knowledge and potential contamination?
- 1: No information about when first reported; long after the fact; or only after consuming significant UAP media
- 2: Reported within weeks/months; could have been influenced by media
- 3: Reported shortly after (hours/days) before significant exposure to similar accounts; or filed with an organization
- 4: Documented contemporaneously — written report same day, told multiple witnesses immediately, official filing with timestamp

## SCORING LEVELS
- 7-12: Low Evidential Strength
- 13-17: Moderate Evidential Strength
- 18-22: High Evidential Strength
- 23-28: Exceptional Evidential Strength

## OUTPUT JSON SCHEMA
{
  "source_type": "first_person" | "reported" | "commentary",
  "total_score": number,
  "level": "Low Evidential Strength" | "Moderate Evidential Strength" | "High Evidential Strength" | "Exceptional Evidential Strength",
  "data_completeness": "N/7",
  "summary_reason": "2-3 sentence summary explaining the score and key evidence elements (or lack thereof)",
  "criteria": {
    "witness_credibility": { "score": 1-4, "reasoning": "brief explanation with quotes if available" },
    "perceptual_clarity": { "score": 1-4, "reasoning": "string" },
    "specificity": { "score": 1-4, "reasoning": "string" },
    "corroboration": { "score": 1-4, "reasoning": "string" },
    "unpredictability": { "score": 1-4, "reasoning": "string" },
    "physical_effects": { "score": 1-4, "reasoning": "string" },
    "temporal_precedence": { "score": 1-4, "reasoning": "string" }
  }
}

Respond ONLY with the JSON object. Do not include markdown code blocks, explanations, or any other text.`;

// ─── Zod Schema ──────────────────────────────────────────────────────────────
// LEARNINGS.md: Zod strips unknown properties. Every field MUST match.

const UAPEvidenceCriterionSchema = z.object({
  score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  reasoning: z.string(),
});

export const UAPEvidenceScoreSchema = z.object({
  source_type: z.enum(['first_person', 'reported', 'commentary']),
  total_score: z.number().min(7).max(28),
  level: z.enum([
    'Low Evidential Strength',
    'Moderate Evidential Strength',
    'High Evidential Strength',
    'Exceptional Evidential Strength',
  ]),
  data_completeness: z.string(),
  summary_reason: z.string(),
  criteria: z.object({
    witness_credibility: UAPEvidenceCriterionSchema,
    perceptual_clarity: UAPEvidenceCriterionSchema,
    specificity: UAPEvidenceCriterionSchema,
    corroboration: UAPEvidenceCriterionSchema,
    unpredictability: UAPEvidenceCriterionSchema,
    physical_effects: UAPEvidenceCriterionSchema,
    temporal_precedence: UAPEvidenceCriterionSchema,
  }),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type UAPEvidenceCriterionScore = z.infer<typeof UAPEvidenceCriterionSchema>;

export type UAPEvidenceCriteria = z.infer<typeof UAPEvidenceScoreSchema>['criteria'];

export type UAPEvidenceAnalysisResult = z.infer<typeof UAPEvidenceScoreSchema>;

// ─── Classification Helper ──────────────────────────────────────────────────

/**
 * Maps a total UAP-ESS score (7-28) to its evidential strength level.
 * Identical thresholds to cvNDE for cross-domain comparison.
 */
export function classifyEvidenceScore(score: number): string {
  if (score <= 12) return 'Low Evidential Strength';
  if (score <= 17) return 'Moderate Evidential Strength';
  if (score <= 22) return 'High Evidential Strength';
  return 'Exceptional Evidential Strength';
}

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Analyzes a UAP encounter transcript using the UAP Evidence Strength Scale.
 * Returns structured scoring across 7 criteria, or null on failure.
 *
 * @param subtitles The punctuated transcript text to analyze
 * @returns UAPEvidenceAnalysisResult or null on failure
 */
export async function analyzeUapEvidenceScore(
  subtitles: string
): Promise<UAPEvidenceAnalysisResult | null> {
  if (!subtitles) return null;

  // Truncate to stay within token limits (gpt-4o-mini handles 128k, but
  // 50k chars covers most hour-long videos and keeps costs reasonable)
  const truncatedSubtitles = subtitles.slice(0, 50000);

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: UAP_EVIDENCE_PROMPT },
        {
          role: 'user',
          content: `Analyze this UAP encounter transcript for evidential strength:\n\n${truncatedSubtitles}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low for consistent scoring
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    const raw = JSON.parse(content);

    // Validate with Zod (catches malformed LLM output)
    const parsed = UAPEvidenceScoreSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('UAP-ESS Zod validation failed:', parsed.error.issues);
      // Attempt to salvage: recalculate total and level from criteria
      if (raw.criteria) {
        const criteriaSum = Object.values(raw.criteria as Record<string, { score: number }>).reduce(
          (sum, c) => sum + (c.score || 1),
          0
        );
        raw.total_score = criteriaSum;
        raw.level = classifyEvidenceScore(criteriaSum);
        // Retry parse
        const retry = UAPEvidenceScoreSchema.safeParse(raw);
        if (retry.success) return retry.data;
      }
      return null;
    }

    const result = parsed.data;

    // Server-side validation: recalculate total_score from criteria
    const criteriaSum = Object.values(result.criteria).reduce(
      (sum, c) => sum + c.score,
      0
    );
    if (result.total_score !== criteriaSum) {
      result.total_score = criteriaSum;
    }

    // Ensure correct level classification
    result.level = classifyEvidenceScore(result.total_score);

    return result;
  } catch (error) {
    console.error('Error in analyzeUapEvidenceScore:', error);
    return null;
  }
}
