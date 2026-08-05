/**
 * UAP-CTI: Contact Transformation Index Analysis Module
 *
 * Copy-Modify from: src/lib/ai/transformation.ts (NDE-TI scoring pattern)
 * Scale reference: docs/scales/UAP-CTI.md
 *
 * Measures self-reported aftereffects and life changes following UAP contact
 * across 12 domains (each scored 0-5).
 * - Full Score: 0-60 (all 12 domains)
 * - Comparable Score: 0-50 (10 mappable domains, for NDE-TI comparison)
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
  return wrapAiClient(new OpenAI({ apiKey }), { provider: 'openai', operation: 'uap-transformation' });
};

// ─── Prompt (engineered from UAP-CTI rubric) ─────────────────────────────────

export const UAP_TRANSFORMATION_PROMPT = `You are an academic researcher specializing in UAP contact aftereffects and transformation. Analyze a punctuated transcript of a UAP encounter account and score it using the UAP Contact Transformation Index (UAP-CTI), a 12-domain scale measuring transformation the experiencer describes as resulting from their UAP contact.

CRITICAL CONSTRAINTS:
1. Score ONLY described transformation. Do not infer transformation not mentioned. A score of 0 means the domain was NOT DISCUSSED, NOT that no change occurred.
2. Assess DEGREE OF CHANGE from the person's own baseline, not against an external standard.
3. VERIFY ATTRIBUTION: Score a change ONLY if the witness explicitly attributes it to the UAP encounter, or describes a clear "before and after" shift. Do NOT score pre-existing traits.
4. CAPTURE DIRECTION, not just magnitude. Use direction indicators.
5. NO EXTERNAL KNOWLEDGE: Score only what is in the transcript.
6. DESTRUCTION IS TRANSFORMATION: PTSD, relationship destruction, career loss, paranoia, substance abuse = Profound Transformation (score 4-5, direction = down). Magnitude is independent of valence.
7. Many accounts focus on the experience, not aftereffects. Low scores are expected and normal.

SCORING SCALE (per domain, 0-5):
- 0: Not Addressed
- 1: Briefly Noted
- 2: Mild Change
- 3: Moderate Change (clear, meaningful, with specific examples)
- 4: Significant Change (major, life-altering, described in detail)
- 5: Profound Transformation (dramatic, fundamental, central to account)

For each domain scored >= 1, provide:
- direction: "up" | "down" | "mixed" | "shifted" | "new" | "N/A"
- evidence_summary: Brief explanation of what change was described
- key_quote: Direct quote from transcript supporting the score

## THE 12 DOMAINS

### Shared Domains (1:1 with NDE-TI, included in Comparable Score)

1. Appreciation for Life (AL): Changes in gratitude, wonder, savoring ordinary moments, awareness of beauty.
2. Self-Perception & Identity (SI): Changes in self-acceptance, self-worth, inner peace, confidence, sense of being a "different person."
3. Compassion & Concern for Others (CC): Changes in empathy, desire to help/serve, tolerance, sensitivity to others' feelings.
4. Values & Priorities (VP): Changes in materialism, status-seeking, simplicity, authenticity.
5. Spiritual Awareness (SA): Changes in connection to the divine, universal consciousness, spiritual practices. Distinct from organized religion.
6. Psychic & Expanded Perception (PE): Emergence/increase of intuition, precognition, telepathy, healing, mediumship, OBEs, synchronicities. Distinguish from ES (electromagnetic/somatic).
7. Relationships & Social Dynamics (RS): Changes in partnerships, friendships, family dynamics, alienation. Often both positive AND negative.
8. Purpose, Meaning & Life Direction (PD): Changes in life purpose, mission, career path, knowledge-seeking.

### Adapted Domains (Modified from NDE-TI, included in Comparable Score with caveat)

9. Cosmological Orientation (CO): Changes in understanding of reality, non-human intelligence, multiverse, humanity's place in cosmos. NDE-TI equivalent: Religious Orientation. Both measure "how did your model of reality shift?" but through different lenses.
10. Existential Orientation (EO): Changes in relationship with mortality, existential anxiety, belief in consciousness continuity, sense of safety/threat. NDE-TI equivalent: Attitude Toward Death. Can move in EITHER direction (safer vs. more threatened).

### UAP-Specific Domains (NOT included in Comparable Score)

11. Disclosure & Advocacy (DA): Compulsion to share publicly, activism, joining organizations, writing, art, whistleblowing. Can double-score with PD if disclosure becomes life mission. Distinct from PD: DA is specifically about OUTWARD compulsion to inform.
12. Electromagnetic & Somatic Sensitivity (ES): New/increased sensitivity to electronics, EM fields, watches stopping, streetlights reacting, chronic health changes (positive or negative), energy sensations. Score ONLY persistent/ongoing aftereffects, NOT effects during the encounter itself (those are UAP-CDS CD-1d). Distinct from PE: ES is physical/somatic, PE is cognitive/psychic.

## OUTPUT FORMAT - Respond with ONLY valid JSON matching this schema:

{
  "quantitative_metrics": {
    "full_transformation_score": <number 0-60>,
    "comparable_transformation_score": <number 0-50, sum of AL+SI+CC+VP+SA+PE+RS+PD+CO+EO>,
    "transformation_breadth": <number 0-12, count of domains scoring >= 1>,
    "transformation_depth": <number 0.0-5.0, mean of domains scoring >= 1, or 0 if none>
  },
  "domain_analysis": {
    "AL": { "name": "Appreciation for Life", "score": <0-5>, "direction": "<up|down|mixed|shifted|new|N/A>", "evidence_summary": "<brief>", "key_quote": "<quote or empty>" },
    "SI": { "name": "Self-Perception & Identity", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "CC": { "name": "Compassion & Concern for Others", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "VP": { "name": "Values & Priorities", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "SA": { "name": "Spiritual Awareness", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "CO": { "name": "Cosmological Orientation", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "EO": { "name": "Existential Orientation", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "PE": { "name": "Psychic & Expanded Perception", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "RS": { "name": "Relationships & Social Dynamics", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "PD": { "name": "Purpose, Meaning & Life Direction", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "DA": { "name": "Disclosure & Advocacy", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" },
    "ES": { "name": "Electromagnetic & Somatic Sensitivity", "score": <0-5>, "direction": "<dir>", "evidence_summary": "<brief>", "key_quote": "<quote>" }
  },
  "qualitative_profile": {
    "dominant_themes": ["<Theme 1>", "<Theme 2>", "<Theme 3>"],
    "integration_notes": "<Observations on difficulty/ease of integrating changes>",
    "timeline_notes": "<Immediate vs gradual, time since encounter if mentioned>",
    "unique_features": "<Any distinctive aspects of this transformation>"
  }
}`;

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const TransformationDirectionSchema = z.enum(['up', 'down', 'mixed', 'shifted', 'new', 'N/A']);

const TransformationDomainItemSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(5),
  direction: TransformationDirectionSchema,
  evidence_summary: z.string(),
  key_quote: z.string(),
});

const TransformationQualitativeSchema = z.object({
  dominant_themes: z.array(z.string()),
  integration_notes: z.string(),
  timeline_notes: z.string(),
  unique_features: z.string(),
});

export const UAPTransformationScoreSchema = z.object({
  quantitative_metrics: z.object({
    full_transformation_score: z.number().min(0).max(60),
    comparable_transformation_score: z.number().min(0).max(50),
    transformation_breadth: z.number().min(0).max(12),
    transformation_depth: z.number().min(0).max(5),
  }),
  domain_analysis: z.object({
    AL: TransformationDomainItemSchema,
    SI: TransformationDomainItemSchema,
    CC: TransformationDomainItemSchema,
    VP: TransformationDomainItemSchema,
    SA: TransformationDomainItemSchema,
    CO: TransformationDomainItemSchema,
    EO: TransformationDomainItemSchema,
    PE: TransformationDomainItemSchema,
    RS: TransformationDomainItemSchema,
    PD: TransformationDomainItemSchema,
    DA: TransformationDomainItemSchema,
    ES: TransformationDomainItemSchema,
  }),
  qualitative_profile: TransformationQualitativeSchema,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type UAPTransformationDomainCode =
  | 'AL' | 'SI' | 'CC' | 'VP' | 'SA' | 'CO' | 'EO'
  | 'PE' | 'RS' | 'PD' | 'DA' | 'ES';

/** The 10 domains that map to NDE-TI for cross-domain comparison */
export const COMPARABLE_DOMAINS: UAPTransformationDomainCode[] = [
  'AL', 'SI', 'CC', 'VP', 'SA', 'PE', 'RS', 'PD', 'CO', 'EO',
];

/** UAP-specific domains NOT included in comparable score */
export const UAP_SPECIFIC_DOMAINS: UAPTransformationDomainCode[] = ['DA', 'ES'];

export type UAPTransformationDirection = z.infer<typeof TransformationDirectionSchema>;

export type UAPTransformationDomainItem = z.infer<typeof TransformationDomainItemSchema>;

export type UAPTransformationAnalysisResult = z.infer<typeof UAPTransformationScoreSchema>;

// ─── Classification Helpers ─────────────────────────────────────────────────

/**
 * Maps a Full CTI score (0-60) to its transformation level.
 */
export function classifyFullTransformationScore(score: number): string {
  if (score === 0) return 'No Transformation Discussed';
  if (score <= 12) return 'Minimal Transformation';
  if (score <= 24) return 'Moderate Transformation';
  if (score <= 36) return 'Significant Transformation';
  if (score <= 48) return 'Major Transformation';
  return 'Comprehensive Profound Transformation';
}

/**
 * Maps a Comparable CTI score (0-50) to its transformation level.
 * Uses identical thresholds to NDE-TI for cross-domain comparison.
 */
export function classifyComparableTransformationScore(score: number): string {
  if (score === 0) return 'No Transformation Discussed';
  if (score <= 10) return 'Minimal Transformation';
  if (score <= 20) return 'Moderate Transformation';
  if (score <= 30) return 'Significant Transformation';
  if (score <= 40) return 'Major Transformation';
  return 'Comprehensive Profound Transformation';
}

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Analyzes a UAP encounter transcript using the Contact Transformation Index.
 * Returns structured scoring across 12 domains, or null on failure.
 *
 * @param subtitles The punctuated transcript text to analyze
 * @returns UAPTransformationAnalysisResult or null on failure
 */
export async function analyzeUapTransformationScore(
  subtitles: string
): Promise<UAPTransformationAnalysisResult | null> {
  if (!subtitles) return null;

  // Truncate to stay within token limits
  const truncatedSubtitles = subtitles.slice(0, 50000);

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: UAP_TRANSFORMATION_PROMPT },
        {
          role: 'user',
          content: `Analyze this UAP encounter transcript for transformation aftereffects:\n\n${truncatedSubtitles}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low for consistent scoring
    });

    const content = completion.choices[0].message.content;
    if (!content) return null;

    const raw = JSON.parse(content);

    // gpt-4o-mini often omits domains that score 0 — backfill missing ones
    const ALL_DOMAIN_CODES: UAPTransformationDomainCode[] = [
      'AL', 'SI', 'CC', 'VP', 'SA', 'CO', 'EO', 'PE', 'RS', 'PD', 'DA', 'ES',
    ];
    const DOMAIN_NAMES: Record<UAPTransformationDomainCode, string> = {
      AL: 'Appreciation for Life', SI: 'Self-Perception & Identity',
      CC: 'Compassion & Concern for Others', VP: 'Values & Priorities',
      SA: 'Spiritual Awareness', CO: 'Cosmological Orientation',
      EO: 'Existential Orientation', PE: 'Psychic & Expanded Perception',
      RS: 'Relationships & Social Dynamics', PD: 'Purpose, Meaning & Life Direction',
      DA: 'Disclosure & Advocacy', ES: 'Electromagnetic & Somatic Sensitivity',
    };
    if (raw.domain_analysis) {
      for (const code of ALL_DOMAIN_CODES) {
        if (!raw.domain_analysis[code]) {
          raw.domain_analysis[code] = {
            name: DOMAIN_NAMES[code],
            score: 0,
            direction: 'N/A',
            evidence_summary: 'Not addressed in transcript',
            key_quote: '',
          };
        }
      }
    }

    // Validate with Zod
    const parsed = UAPTransformationScoreSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('UAP-CTI Zod validation failed:', parsed.error.issues);
      // Attempt to salvage: recalculate metrics
      if (raw.domain_analysis) {
        const domains = raw.domain_analysis as Record<string, { score: number }>;
        const allScores = ALL_DOMAIN_CODES.map((code) => domains[code]?.score || 0);
        const fullScore = allScores.reduce((sum, s) => sum + s, 0);
        const comparableScores = COMPARABLE_DOMAINS.map(
          (code) => (domains[code]?.score || 0)
        );
        const comparableScore = comparableScores.reduce((sum, s) => sum + s, 0);
        const scoredDomains = allScores.filter((s) => s >= 1);

        raw.quantitative_metrics = {
          full_transformation_score: fullScore,
          comparable_transformation_score: comparableScore,
          transformation_breadth: scoredDomains.length,
          transformation_depth:
            scoredDomains.length > 0
              ? Math.round((scoredDomains.reduce((a, b) => a + b, 0) / scoredDomains.length) * 10) / 10
              : 0,
        };
        const retry = UAPTransformationScoreSchema.safeParse(raw);
        if (retry.success) return retry.data;
      }
      return null;
    }

    const result = parsed.data;

    // Server-side validation: recalculate metrics from domain scores
    const domainEntries = Object.entries(result.domain_analysis) as Array<
      [UAPTransformationDomainCode, UAPTransformationDomainItem]
    >;
    const allScores = domainEntries.map(([, d]) => d.score);
    const fullScore = allScores.reduce((sum, s) => sum + s, 0);
    const comparableScore = COMPARABLE_DOMAINS.reduce(
      (sum, code) => sum + result.domain_analysis[code].score,
      0
    );
    const scoredDomains = allScores.filter((s) => s >= 1);

    result.quantitative_metrics.full_transformation_score = fullScore;
    result.quantitative_metrics.comparable_transformation_score = comparableScore;
    result.quantitative_metrics.transformation_breadth = scoredDomains.length;
    result.quantitative_metrics.transformation_depth =
      scoredDomains.length > 0
        ? Math.round(
            (scoredDomains.reduce((a, b) => a + b, 0) / scoredDomains.length) * 10
          ) / 10
        : 0;

    return result;
  } catch (error) {
    console.error('Error in analyzeUapTransformationScore:', error);
    return null;
  }
}
