/**
 * Parsing and validation of one model response into one row per REQUESTED question.
 *
 * Rules (SPEC "Job 2" 2.):
 *  - the response must be JSON matching the output schema envelope; otherwise every
 *    requested question is invalid;
 *  - exactly one answer per requested question id: missing or duplicated -> that question
 *    is invalid; ids that were not requested are ignored (reported in `extraIds`);
 *  - validation of coverage/stance/confidence/quote presence is lib/validate-stance (one bad
 *    item never fails a whole insert chunk); this module adds the envelope and item JSON-schema
 *    checks and quote verification;
 *  - an answer failing the item schema, with confidence not an integer in 0..100, or a
 *    non-not_addressed stance without a quote is invalid (stance stored as null);
 *  - a quote that fails verification keeps the stance (valid) with quote_verified=false and
 *    error 'quote_<reason>'; such rows are flagged for the recheck, never counted;
 *  - not_addressed ignores any quote (stored as null; the row's error carries a note).
 * Invalid rows carry stance/confidence/quote = null and an error string.
 */
import { alignTimestamp, verifyQuote, type NormalizedTranscript } from '../lib/quote';
import type { TimestampedSegment } from '../lib/transcript';
import { validateAnswerSet } from '../lib/validate-stance';
import { validateSchema, type JsonSchema } from './schema';

export const STANCES = ['yes', 'no', 'mixed', 'not_addressed'] as const;
export type Stance = (typeof STANCES)[number];

export interface AnswerRow {
  questionId: number;
  valid: boolean;
  stance: Stance | null;
  confidence: number | null;
  quote: string | null;
  quoteVerified: boolean;
  quoteNormOffset: number | null;
  startSeconds: number | null;
  error: string | null;
}

export interface ParseResult {
  /** One row per requested id, in the requested order. */
  rows: AnswerRow[];
  /** Question ids the model answered although they were not requested. */
  extraIds: number[];
  /** Set when the whole response was unusable. */
  envelopeError: string | null;
}

export interface ParseContext {
  transcript: NormalizedTranscript;
  segments?: TimestampedSegment[] | null;
  stopReason?: string | null;
}

function invalid(questionId: number, error: string): AnswerRow {
  return {
    questionId, valid: false, stance: null, confidence: null, quote: null,
    quoteVerified: false, quoteNormOffset: null, startSeconds: null, error,
  };
}

function itemSchemaOf(schema: JsonSchema): JsonSchema {
  const answers = ((schema.properties as Record<string, JsonSchema> | undefined) ?? {}).answers;
  return (answers?.items as JsonSchema | undefined) ?? {};
}

function envelopeSchemaOf(schema: JsonSchema): JsonSchema {
  const props = { ...((schema.properties as Record<string, JsonSchema> | undefined) ?? {}) };
  if (props.answers) props.answers = { ...props.answers, items: {} };
  return { ...schema, properties: props };
}

export function parseAnswers(
  text: string,
  requestedIds: readonly number[],
  ctx: ParseContext,
  schema: JsonSchema,
): ParseResult {
  const failAll = (error: string): ParseResult => ({
    rows: requestedIds.map((id) => invalid(id, error)), extraIds: [], envelopeError: error,
  });
  if (ctx.stopReason === 'max_tokens') return failAll('truncated_max_tokens');
  if (ctx.stopReason === 'refusal') return failAll('refusal');

  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return failAll('json_parse_error');
  }
  const envErrors = validateSchema(envelopeSchemaOf(schema), doc);
  if (envErrors.length) return failAll(`schema: ${envErrors[0]}`);

  // Coverage / stance / confidence / quote-presence rules: shared lib validator, so one bad
  // item can never fail a whole insert chunk.
  const validated = validateAnswerSet(doc, requestedIds);

  // Item-level JSON-schema check (additional properties, types) for ids answered exactly once.
  const itemSchema = itemSchemaOf(schema);
  const byId = new Map<number, unknown[]>();
  for (const item of (doc as { answers: unknown[] }).answers) {
    const id = item && typeof item === 'object' ? (item as Record<string, unknown>).question_id : undefined;
    if (typeof id === 'number') (byId.get(id) ?? byId.set(id, []).get(id)!).push(item);
  }

  const rows = validated.rows.map((r): AnswerRow => {
    const qid = r.question_id;
    if (!r.valid || r.stance === null || r.confidence === null) return invalid(qid, r.error ?? 'invalid');
    const items = byId.get(qid);
    if (items && items.length === 1) {
      const errs = validateSchema(itemSchema, items[0]);
      if (errs.length) return invalid(qid, `schema: ${errs[0]}`);
    }
    if (r.stance === 'not_addressed') {
      return {
        questionId: qid, valid: true, stance: r.stance, confidence: r.confidence, quote: null,
        quoteVerified: false, quoteNormOffset: null, startSeconds: null, error: r.error,
      };
    }
    if (r.quote == null || r.quote.trim() === '') return invalid(qid, 'missing_quote');
    const v = verifyQuote(r.quote, ctx.transcript);
    return {
      questionId: qid, valid: true, stance: r.stance, confidence: r.confidence, quote: r.quote,
      quoteVerified: v.verified, quoteNormOffset: v.verified ? v.offset : null,
      startSeconds: v.verified ? alignTimestamp(r.quote, ctx.segments) : null,
      error: v.verified ? null : `quote_${v.reason}`,
    };
  });
  const extraIds = validated.extras.map((e) => e.question_id).filter((x): x is number => typeof x === 'number').sort((a, b) => a - b);
  return { rows, extraIds, envelopeError: null };
}
