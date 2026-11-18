/**
 * Parsing and validation of one model response into one row per REQUESTED question.
 *
 * Rules (SPEC "Job 2" 2.):
 *  - the response must be JSON matching the output schema envelope; otherwise every
 *    requested question is invalid;
 *  - exactly one answer per requested question id: missing or duplicated -> that question
 *    is invalid; ids that were not requested are ignored (reported in `extraIds`);
 *  - an answer failing the item schema, with confidence not an integer in 0..100, or a
 *    non-not_addressed stance without a quote is invalid (stance stored as null);
 *  - a quote that fails verification keeps the stance (valid) with quote_verified=false and
 *    error 'quote_<reason>'; such rows are flagged for the recheck, never counted;
 *  - not_addressed ignores any quote (stored as null).
 * Invalid rows carry stance/confidence/quote = null and an error string.
 */
import { alignTimestamp, verifyQuote, type NormalizedTranscript } from '../lib/quote';
import type { TimestampedSegment } from '../lib/transcript';
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

  const itemSchema = itemSchemaOf(schema);
  const requested = new Set(requestedIds);
  const seen = new Map<number, unknown[]>();
  const extra = new Set<number>();
  for (const item of (doc as { answers: unknown[] }).answers) {
    const id = item && typeof item === 'object' ? (item as Record<string, unknown>).question_id : undefined;
    if (typeof id !== 'number' || !Number.isInteger(id)) continue; // unattributable: cannot belong to a question
    if (!requested.has(id)) { extra.add(id); continue; }
    const list = seen.get(id) ?? [];
    list.push(item);
    seen.set(id, list);
  }

  const rows = requestedIds.map((qid): AnswerRow => {
    const items = seen.get(qid);
    if (!items) return invalid(qid, 'missing_answer');
    if (items.length > 1) return invalid(qid, 'duplicate_answer');
    const item = items[0] as { stance: string; confidence: number; quote: string | null };
    const errs = validateSchema(itemSchema, item);
    if (errs.length) return invalid(qid, `schema: ${errs[0]}`);
    if (item.confidence < 0 || item.confidence > 100) return invalid(qid, 'bad_confidence');
    const stance = item.stance as Stance;
    if (stance === 'not_addressed') {
      return {
        questionId: qid, valid: true, stance, confidence: item.confidence, quote: null,
        quoteVerified: false, quoteNormOffset: null, startSeconds: null, error: null,
      };
    }
    if (item.quote == null || item.quote.trim() === '') return invalid(qid, 'missing_quote');
    const v = verifyQuote(item.quote, ctx.transcript);
    return {
      questionId: qid, valid: true, stance, confidence: item.confidence, quote: item.quote,
      quoteVerified: v.verified, quoteNormOffset: v.verified ? v.offset : null,
      startSeconds: v.verified ? alignTimestamp(item.quote, ctx.segments) : null,
      error: v.verified ? null : `quote_${v.reason}`,
    };
  });
  return { rows, extraIds: [...extra].sort((a, b) => a - b), envelopeError: null };
}
