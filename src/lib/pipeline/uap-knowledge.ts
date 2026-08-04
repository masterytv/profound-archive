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
 * Uses Claude via the direct Anthropic API with structured outputs
 * (output_config.format), so the model is constrained to emit schema-valid JSON.
 * gpt-4o-mini lacks the nuance for cross-referencing and
 * contextual extraction from investigative content.
 *
 * Tier 2 only (program/investigative content).
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// ─── Lazy Clients ────────────────────────────────────────────────────────────

export const getAnthropic = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  return new Anthropic({ apiKey });
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

// ─── JSON Schema (for Anthropic structured outputs) ──────────────────────────

/*
 * Mirrors the Zod schema above. It has to be hand-maintained because Anthropic's
 * structured outputs impose rules Zod doesn't model: every object needs
 * `additionalProperties: false` and an explicit `required` list, and numeric /
 * length constraints are rejected. The `obj()` helper below fills both in so a
 * new field can't silently ship without them.
 *
 * Everything is required. Fields that were `.optional().default('')` in Zod stay
 * required here and the model emits `""` when it has nothing — that's cheaper
 * than an optional field the model quietly omits. If the two schemas ever drift,
 * the Zod parse in parseKnowledgeMessage() fails loudly and the row is marked as
 * a failed extraction rather than silently losing data.
 */

const str = { type: 'string' } as const;
const bool = { type: 'boolean' } as const;
const nullableStr = { anyOf: [{ type: 'string' }, { type: 'null' }] } as const;
const enumOf = (...values: string[]) => ({ type: 'string', enum: values });
const arrayOf = (items: unknown) => ({ type: 'array', items });
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const EVIDENCE_LEVEL = enumOf('documented', 'testimony', 'analysis', 'speculation');
const LOW_MED_HIGH = enumOf('low', 'medium', 'high');

export const UAP_KNOWLEDGE_JSON_SCHEMA = obj({
  summary: str,
  content_category: enumOf(
    'documentary', 'interview', 'news_report', 'panel_discussion',
    'lecture', 'analysis', 'hearing', 'other',
  ),
  people_mentioned: arrayOf(obj({
    name: str,
    role: enumOf(
      'researcher', 'witness', 'military', 'government',
      'journalist', 'whistleblower', 'scientist', 'other',
    ),
    title_or_affiliation: str,
    context: str,
    is_primary_subject: bool,
  })),
  programs_mentioned: arrayOf(obj({
    name: str,
    type: enumOf('government', 'military', 'intelligence', 'civilian', 'academic', 'other'),
    country: str,
    status: enumOf('active', 'historical', 'alleged', 'unknown'),
    context: str,
  })),
  claims: arrayOf(obj({
    statement: str,
    claimant: str,
    evidence_level: EVIDENCE_LEVEL,
    category: enumOf(
      'craft_technology', 'biological', 'government_coverup', 'contact',
      'crash_retrieval', 'reverse_engineering', 'consciousness', 'policy',
      'scientific', 'other',
    ),
    key_quote: str,
  })),
  timeline_events: arrayOf(obj({
    date_text: str,
    date_approx: nullableStr,
    event: str,
    location: str,
    source: str,
  })),
  entities_discussed: arrayOf(obj({
    type: enumOf('craft', 'being', 'phenomenon', 'material', 'technology'),
    description: str,
    context: str,
  })),
  technology_described: arrayOf(obj({
    name: str,
    description: str,
    attribution: str,
    evidence_level: EVIDENCE_LEVEL,
  })),
  consciousness_connections: arrayOf(obj({
    connection_type: enumOf(
      'telepathy', 'precognition', 'obe', 'nde_parallel', 'psi',
      'altered_states', 'meditation', 'other',
    ),
    description: str,
    context: str,
  })),
  content_safety: obj({
    has_safety_concerns: bool,
    concern_types: arrayOf(str),
    notes: str,
  }),
  metadata: obj({
    data_density: LOW_MED_HIGH,
    primary_topic: str,
    cross_reference_potential: LOW_MED_HIGH,
  }),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type UAPKnowledgeResult = z.infer<typeof UAPKnowledgeSchema>;

/** Outcome of turning one model response into a validated extraction. */
export type KnowledgeOutcome =
  | { ok: true; data: UAPKnowledgeResult }
  | { ok: false; reason: string };

// ─── Request Construction ────────────────────────────────────────────────────

export const UAP_KNOWLEDGE_MODEL_DEFAULT = 'claude-haiku-4-5';
export const UAP_KNOWLEDGE_MAX_TOKENS = 8000;
/** Transcript cap; leaves room for the prompt and the JSON output. */
export const UAP_TRANSCRIPT_CHAR_LIMIT = 100_000;

/**
 * Models that run adaptive thinking unless told otherwise. Thinking tokens share
 * the max_tokens budget with the JSON output, so extraction turns it off — the
 * schema does the shaping work that thinking would otherwise do.
 */
const THINKS_BY_DEFAULT = new Set(['claude-sonnet-5', 'claude-opus-5', 'claude-fable-5']);

/**
 * Builds the Messages API params for one video. Shared by the single-video path
 * and the batch path so both send byte-identical requests.
 *
 * No `temperature`: Sonnet 5 and later reject non-default sampling parameters,
 * and the JSON schema already constrains the output shape.
 */
export function buildKnowledgeParams(
  subtitles: string,
  title?: string,
  model: string = UAP_KNOWLEDGE_MODEL_DEFAULT,
): Anthropic.MessageCreateParamsNonStreaming {
  const truncated = subtitles.slice(0, UAP_TRANSCRIPT_CHAR_LIMIT);
  const userContent = title
    ? `VIDEO TITLE: ${title}\n\nTRANSCRIPT:\n${truncated}`
    : `Analyze this UAP investigative/program content transcript:\n\n${truncated}`;

  return {
    model,
    max_tokens: UAP_KNOWLEDGE_MAX_TOKENS,
    system: UAP_KNOWLEDGE_EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    output_config: {
      format: { type: 'json_schema', schema: UAP_KNOWLEDGE_JSON_SCHEMA },
    },
    ...(THINKS_BY_DEFAULT.has(model) ? { thinking: { type: 'disabled' as const } } : {}),
  };
}

// ─── Response Parsing ────────────────────────────────────────────────────────

/**
 * Turns a model response into a validated extraction, or an explained failure.
 *
 * Structured outputs make malformed JSON a non-event, so the old fence-stripping
 * and array-defaulting salvage passes are gone. What remains are the failures a
 * retry would not fix: a truncated response, a refusal, or schema drift between
 * UAP_KNOWLEDGE_JSON_SCHEMA and UAPKnowledgeSchema.
 */
export function parseKnowledgeMessage(message: Anthropic.Message): KnowledgeOutcome {
  if (message.stop_reason === 'max_tokens') {
    return { ok: false, reason: 'truncated: hit max_tokens' };
  }
  if (message.stop_reason === 'refusal') {
    return { ok: false, reason: 'model refused the request' };
  }

  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!block) {
    return { ok: false, reason: `no text block (stop_reason=${message.stop_reason})` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(block.text);
  } catch {
    return { ok: false, reason: 'invalid JSON despite json_schema' };
  }

  const parsed = UAPKnowledgeSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || '(root)';
    return { ok: false, reason: `schema mismatch at ${path}: ${issue?.message}` };
  }

  return { ok: true, data: parsed.data };
}

// ─── Persistence Shapes ──────────────────────────────────────────────────────

/** The `uap_analysis` columns this pipeline owns. */
export function knowledgeRowUpdate(knowledge: UAPKnowledgeResult) {
  return {
    people_mentioned: knowledge.people_mentioned,
    claims: knowledge.claims,
    programs_mentioned: knowledge.programs_mentioned,
    timeline_events: knowledge.timeline_events,
    technology_described: knowledge.technology_described,
    consciousness_connections: knowledge.consciousness_connections,
    content_safety: knowledge.content_safety,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Row written when extraction fails in a way a retry won't fix.
 *
 * The pending set is `people_mentioned IS NULL`, so a permanently-failed video
 * that stays NULL gets re-bought on every run — that was the money treadmill.
 * Writing empty arrays drops it out of the pending set, and the flag inside
 * `content_safety` (a jsonb column only this pipeline writes) records why,
 * without needing a schema migration on a database shared with production.
 *
 * Requeue everything that failed:
 *   UPDATE uap_analysis SET people_mentioned = NULL
 *   WHERE content_safety->>'extraction_failed' = 'true';
 */
export function failedExtractionRowUpdate(reason: string, model: string) {
  const now = new Date().toISOString();
  return {
    people_mentioned: [],
    claims: [],
    programs_mentioned: [],
    timeline_events: [],
    technology_described: [],
    consciousness_connections: [],
    content_safety: {
      has_safety_concerns: false,
      concern_types: [],
      notes: '',
      extraction_failed: true,
      extraction_error: reason,
      extraction_model: model,
      extraction_failed_at: now,
    },
    updated_at: now,
  };
}

// ─── Analysis Function ───────────────────────────────────────────────────────

/**
 * Extracts structured knowledge from a Tier 2 UAP video transcript.
 * Single-video path; the backlog runs through the Batch API instead
 * (scripts/uap-knowledge-batch.ts) for the 50% batch discount.
 *
 * @param subtitles The punctuated transcript text to analyze
 * @param title Optional video title for additional context
 * @param model Claude model id; defaults to UAP_KNOWLEDGE_MODEL_DEFAULT
 * @returns UAPKnowledgeResult or null on failure
 */
export async function extractUapKnowledge(
  subtitles: string,
  title?: string,
  model: string = UAP_KNOWLEDGE_MODEL_DEFAULT,
): Promise<UAPKnowledgeResult | null> {
  if (!subtitles) return null;

  try {
    const message = await getAnthropic().messages.create(
      buildKnowledgeParams(subtitles, title, model),
    );
    const outcome = parseKnowledgeMessage(message);
    if (!outcome.ok) {
      console.error(`UAP Knowledge extraction failed: ${outcome.reason}`);
      return null;
    }
    return outcome.data;
  } catch (error) {
    console.error('Error in extractUapKnowledge:', error);
    return null;
  }
}
