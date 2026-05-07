/**
 * UAP Knowledge Extraction Pipeline (Tier 2)
 *
 * Copy-Modify from: src/lib/pipeline/blog-article.ts (extraction pattern)
 * Reference: SPRINT.md Story 2.4.1
 *
 * Extracts structured knowledge from Tier 2 (program/investigative) UAP content:
 * - Claims and assertions made in the content
 * - People mentioned (witnesses, researchers, officials)
 * - Programs mentioned (government, military, civilian)
 * - Timeline events with dates
 * - Entity descriptions (if discussed)
 * - Technology described
 * - Consciousness connections (overlap with NDE/psi phenomena)
 * - Content safety flags
 *
 * Uses Claude Sonnet via OpenRouter for long-form extraction.
 * gpt-4o-mini lacks the nuance for cross-referencing and
 * contextual extraction from investigative content.
 *
 * Tier 2 only (program/investigative content).
 */

import OpenAI from 'openai';
import { z } from 'zod';

// ─── Lazy Clients ────────────────────────────────────────────────────────────

const getOpenRouter = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY environment variable');
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://projectprofound.org',
      'X-Title': 'Project Profound UAP Knowledge Pipeline',
    },
  });
};

// ─── Extraction Prompt ───────────────────────────────────────────────────────

export const UAP_KNOWLEDGE_EXTRACTION_PROMPT = `You are an expert UAP researcher and investigative journalist. Analyze a transcript of UAP program/investigative content and extract structured knowledge.

This is NOT a first-person encounter account (those use the UAP-CET triad). This is program, documentary, investigative, or analytical content about UAP phenomena. Your job is to extract factual claims, people, programs, events, and connections mentioned.

CRITICAL CONSTRAINTS:
1. EXTRACT, DO NOT EVALUATE. Report what the content claims, not whether you believe it. Use "claimed" language for unverified assertions.
2. NO EXTERNAL KNOWLEDGE. Only extract information present in the transcript.
3. ATTRIBUTE CLAIMS. Every claim should reference who made it, if identifiable.
4. DISTINGUISH FACT FROM SPECULATION. Mark each claim's evidence_level as "documented" (official records, FOIA), "testimony" (witness/whistleblower statement), "analysis" (researcher conclusion), or "speculation" (unverified assertion).
5. CAPTURE TEMPORAL CONTEXT. Include dates, time periods, and sequences when mentioned.
6. FLAG CONTENT SAFETY. Note any content that promotes violence, harmful conspiracy theories targeting specific individuals, or demonstrably false medical/scientific claims.

## OUTPUT JSON SCHEMA

{
  "summary": "2-3 sentence summary of the content's main thesis/topic",
  "content_category": "documentary" | "interview" | "news_report" | "panel_discussion" | "lecture" | "analysis" | "hearing" | "other",
  "people_mentioned": [
    {
      "name": "Full Name",
      "role": "researcher" | "witness" | "military" | "government" | "journalist" | "whistleblower" | "scientist" | "other",
      "title_or_affiliation": "Organization or title if mentioned",
      "context": "Brief description of their relevance to the content",
      "is_primary_subject": true | false
    }
  ],
  "programs_mentioned": [
    {
      "name": "Program name",
      "type": "government" | "military" | "intelligence" | "civilian" | "academic" | "other",
      "country": "Country if mentioned",
      "status": "active" | "historical" | "alleged" | "unknown",
      "context": "Brief description of what the program does/did"
    }
  ],
  "claims": [
    {
      "statement": "The specific claim made",
      "claimant": "Who made this claim (name or 'narrator')",
      "evidence_level": "documented" | "testimony" | "analysis" | "speculation",
      "category": "craft_technology" | "biological" | "government_coverup" | "contact" | "crash_retrieval" | "reverse_engineering" | "consciousness" | "policy" | "scientific" | "other",
      "key_quote": "Direct quote supporting the claim if available"
    }
  ],
  "timeline_events": [
    {
      "date_text": "The date or period as stated in the content",
      "date_approx": "YYYY-MM-DD or YYYY-MM or YYYY (best guess ISO format, or null)",
      "event": "What happened",
      "location": "Where it happened, if mentioned",
      "source": "Who reported this event"
    }
  ],
  "entities_discussed": [
    {
      "type": "craft" | "being" | "phenomenon" | "material" | "technology",
      "description": "Physical or behavioral description",
      "context": "Where/when/how this entity was discussed"
    }
  ],
  "technology_described": [
    {
      "name": "Technology or capability name",
      "description": "What it does or how it works",
      "attribution": "Who described or developed it",
      "evidence_level": "documented" | "testimony" | "analysis" | "speculation"
    }
  ],
  "consciousness_connections": [
    {
      "connection_type": "telepathy" | "precognition" | "obe" | "nde_parallel" | "psi" | "altered_states" | "meditation" | "other",
      "description": "How consciousness relates to the UAP phenomena discussed",
      "context": "Specific discussion or claim about consciousness"
    }
  ],
  "content_safety": {
    "has_safety_concerns": false,
    "concern_types": [],
    "notes": "Any safety concerns flagged"
  },
  "metadata": {
    "data_density": "low" | "medium" | "high",
    "primary_topic": "Brief topic label (e.g., 'Congressional hearings', 'Crash retrieval programs')",
    "cross_reference_potential": "low" | "medium" | "high"
  }
}

If a section has no relevant data, use an empty array [] or appropriate defaults.
Respond ONLY with the JSON object. Do not include markdown code blocks, explanations, or any other text.`;

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const PersonMentionedSchema = z.object({
  name: z.string(),
  role: z.enum(['researcher', 'witness', 'military', 'government', 'journalist', 'whistleblower', 'scientist', 'other']),
  title_or_affiliation: z.string().optional().default(''),
  context: z.string(),
  is_primary_subject: z.boolean(),
});

const ProgramMentionedSchema = z.object({
  name: z.string(),
  type: z.enum(['government', 'military', 'intelligence', 'civilian', 'academic', 'other']),
  country: z.string().optional().default(''),
  status: z.enum(['active', 'historical', 'alleged', 'unknown']),
  context: z.string(),
});

const ClaimSchema = z.object({
  statement: z.string(),
  claimant: z.string(),
  evidence_level: z.enum(['documented', 'testimony', 'analysis', 'speculation']),
  category: z.enum([
    'craft_technology', 'biological', 'government_coverup', 'contact',
    'crash_retrieval', 'reverse_engineering', 'consciousness', 'policy',
    'scientific', 'other',
  ]),
  key_quote: z.string().optional().default(''),
});

const TimelineEventSchema = z.object({
  date_text: z.string(),
  date_approx: z.string().nullable().optional(),
  event: z.string(),
  location: z.string().optional().default(''),
  source: z.string().optional().default(''),
});

const EntityDiscussedSchema = z.object({
  type: z.enum(['craft', 'being', 'phenomenon', 'material', 'technology']),
  description: z.string(),
  context: z.string(),
});

const TechnologyDescribedSchema = z.object({
  name: z.string(),
  description: z.string(),
  attribution: z.string().optional().default(''),
  evidence_level: z.enum(['documented', 'testimony', 'analysis', 'speculation']),
});

const ConsciousnessConnectionSchema = z.object({
  connection_type: z.enum([
    'telepathy', 'precognition', 'obe', 'nde_parallel', 'psi',
    'altered_states', 'meditation', 'other',
  ]),
  description: z.string(),
  context: z.string(),
});

const ContentSafetySchema = z.object({
  has_safety_concerns: z.boolean(),
  concern_types: z.array(z.string()),
  notes: z.string().optional().default(''),
});

const KnowledgeMetadataSchema = z.object({
  data_density: z.enum(['low', 'medium', 'high']),
  primary_topic: z.string(),
  cross_reference_potential: z.enum(['low', 'medium', 'high']),
});

export const UAPKnowledgeSchema = z.object({
  summary: z.string(),
  content_category: z.enum([
    'documentary', 'interview', 'news_report', 'panel_discussion',
    'lecture', 'analysis', 'hearing', 'other',
  ]),
  people_mentioned: z.array(PersonMentionedSchema),
  programs_mentioned: z.array(ProgramMentionedSchema),
  claims: z.array(ClaimSchema),
  timeline_events: z.array(TimelineEventSchema),
  entities_discussed: z.array(EntityDiscussedSchema),
  technology_described: z.array(TechnologyDescribedSchema),
  consciousness_connections: z.array(ConsciousnessConnectionSchema),
  content_safety: ContentSafetySchema,
  metadata: KnowledgeMetadataSchema,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type UAPKnowledgeResult = z.infer<typeof UAPKnowledgeSchema>;

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Extracts structured knowledge from a Tier 2 UAP video transcript.
 * Uses Claude Sonnet via OpenRouter for nuanced long-form extraction.
 *
 * @param subtitles The punctuated transcript text to analyze
 * @param title Optional video title for additional context
 * @returns UAPKnowledgeResult or null on failure
 */
export async function extractUapKnowledge(
  subtitles: string,
  title?: string,
): Promise<UAPKnowledgeResult | null> {
  if (!subtitles) return null;

  // Truncate to fit Claude context window (leaving room for prompt + output)
  const truncatedSubtitles = subtitles.slice(0, 100000);

  try {
    const openRouter = getOpenRouter();

    const userContent = title
      ? `VIDEO TITLE: ${title}\n\nTRANSCRIPT:\n${truncatedSubtitles}`
      : `Analyze this UAP investigative/program content transcript:\n\n${truncatedSubtitles}`;

    const completion = await openRouter.chat.completions.create({
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        { role: 'system', content: UAP_KNOWLEDGE_EXTRACTION_PROMPT },
        { role: 'user', content: userContent },
        // Claude JSON forcing via assistant prefill
        { role: 'assistant', content: '{' },
      ],
      max_tokens: 8000,
      temperature: 0.2, // Low for factual extraction
    });

    const rawContent = '{' + (completion.choices[0]?.message?.content ?? '{}');
    // Strip markdown code fences if model wraps JSON
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(cleaned);
    } catch {
      console.error('UAP Knowledge: Claude returned invalid JSON:', cleaned.slice(0, 200));
      return null;
    }

    // Ensure arrays exist (Claude sometimes omits empty arrays)
    const arrayFields = [
      'people_mentioned', 'programs_mentioned', 'claims',
      'timeline_events', 'entities_discussed', 'technology_described',
      'consciousness_connections',
    ];
    for (const field of arrayFields) {
      if (!raw[field]) raw[field] = [];
    }

    // Ensure content_safety defaults
    if (!raw.content_safety) {
      raw.content_safety = {
        has_safety_concerns: false,
        concern_types: [],
        notes: '',
      };
    }

    // Ensure metadata defaults
    if (!raw.metadata) {
      raw.metadata = {
        data_density: 'low',
        primary_topic: 'Unknown',
        cross_reference_potential: 'low',
      };
    }

    // Validate with Zod
    const parsed = UAPKnowledgeSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('UAP Knowledge Zod validation failed:', parsed.error.issues);
      // Attempt lenient re-parse: strip invalid items from arrays
      for (const field of arrayFields) {
        const arr = raw[field] as unknown[];
        if (Array.isArray(arr)) {
          raw[field] = arr.filter((item) => {
            if (typeof item !== 'object' || item === null) return false;
            return true;
          });
        }
      }
      const retry = UAPKnowledgeSchema.safeParse(raw);
      if (retry.success) return retry.data;
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Error in extractUapKnowledge:', error);
    return null;
  }
}
