/** Pure helpers: outcome classification of batch results and construction of stance-answer rows. */
import { MAX_ATTEMPTS, isRetryableError, raiseMaxTokens } from '../lib/batch';
import type { AnswerRow } from './answers';
import type { PassKind } from './requests';

export { MAX_ATTEMPTS };

export interface OutcomeInput {
  resultType: 'succeeded' | 'errored' | 'canceled' | 'expired';
  stopReason?: string | null;
  errorType?: string | null;
  /** HTTP-like status of an errored result when the body carries one (5xx is retryable even without a type). */
  errorStatus?: number | null;
  attempt: number;
}

export type Outcome =
  | { action: 'answers' }
  | { action: 'invalid'; error: string }
  | { action: 'retry'; bumpTokens: boolean; reason: string };


/**
 * What to do with one result:
 *  - succeeded -> parse answers (refusals are handled by the parser);
 *  - succeeded but truncated at max_tokens -> retry with a larger max_tokens, never store
 *    partial JSON as answers;
 *  - errored with a non-retryable type -> invalid rows now;
 *  - expired / canceled / transient errors -> retry (attempt + 1), invalid rows once
 *    MAX_ATTEMPTS is used up (the recheck then treats them as disagreements).
 */
export function classifyOutcome(i: OutcomeInput, maxAttempts = MAX_ATTEMPTS): Outcome {
  const exhausted = i.attempt >= maxAttempts;
  if (i.resultType === 'succeeded') {
    if (i.stopReason === 'max_tokens') {
      return exhausted ? { action: 'invalid', error: 'truncated_max_tokens' } : { action: 'retry', bumpTokens: true, reason: 'truncated' };
    }
    return { action: 'answers' };
  }
  // Same retry policy as lib/batch (isRetryableError): overloaded/api/rate-limit types, or any 5xx status.
  if (i.resultType === 'errored' && !isRetryableError(i.errorType, i.errorStatus)) {
    return { action: 'invalid', error: `request_error:${i.errorType ?? 'unknown'}` };
  }
  const what = i.resultType === 'errored' ? `error:${i.errorType ?? (i.errorStatus != null ? `status_${i.errorStatus}` : 'unknown')}` : i.resultType;
  return exhausted
    ? { action: 'invalid', error: `request_${what}_after_${i.attempt}_attempts` }
    : { action: 'retry', bumpTokens: false, reason: what };
}

/** max_tokens for the next attempt: lib/batch.raiseMaxTokens applied once per earlier truncation. */
export function maxTokensFor(base: number, truncatedBefore: number): number {
  let m = base;
  for (let i = 0; i < truncatedBefore; i++) m = raiseMaxTokens(m);
  return m;
}

export function invalidAnswerRows(questionIds: readonly number[], error: string): AnswerRow[] {
  return questionIds.map((questionId) => ({
    questionId, valid: false, stance: null, confidence: null, quote: null,
    quoteVerified: false, quoteNormOffset: null, startSeconds: null, error,
  }));
}

export interface StanceInsertRow {
  run_id: string;
  video_id: string;
  question_id: number;
  pass: PassKind;
  attempt: number;
  stance: string | null;
  confidence: number | null;
  quote: string | null;
  quote_verified: boolean;
  quote_norm_offset: number | null;
  start_seconds: number | null;
  model: string;
  model_version: string | null;
  prompt_hash: string;
  transcript_source: string | null;
  raw_response_id: number | null;
  valid: boolean;
  error: string | null;
  trigger_answer_id: number | null;
  recheck_answer_id: number | null;
}

export interface BuildRowsInput {
  runId: string;
  videoId: string;
  kind: PassKind;
  attempt: number;
  model: string;
  modelVersion: string | null;
  promptHash: string;
  transcriptSource: string | null;
  rawId: number | null;
  rows: readonly AnswerRow[];
  /** recheck / arbiter lineage: [question_id, first_answer_id, recheck_answer_id | null] */
  cells?: ReadonlyArray<readonly [number, number, number | null]>;
}

export function buildAnswerRows(i: BuildRowsInput): StanceInsertRow[] {
  const lineage = new Map((i.cells ?? []).map((c) => [c[0], c] as const));
  return i.rows.map((r) => {
    const c = lineage.get(r.questionId);
    if ((i.kind === 'recheck' || i.kind === 'arbiter') && !c) {
      throw new Error(`no lineage for ${i.videoId} question ${r.questionId} in ${i.kind} pass`);
    }
    return {
      run_id: i.runId, video_id: i.videoId, question_id: r.questionId, pass: i.kind, attempt: i.attempt,
      stance: r.stance, confidence: r.confidence, quote: r.quote,
      quote_verified: r.quoteVerified, quote_norm_offset: r.quoteNormOffset, start_seconds: r.startSeconds,
      model: i.model, model_version: i.modelVersion, prompt_hash: i.promptHash,
      transcript_source: i.transcriptSource, raw_response_id: i.rawId, valid: r.valid, error: r.error,
      trigger_answer_id: i.kind === 'recheck' || i.kind === 'arbiter' ? c![1] : null,
      recheck_answer_id: i.kind === 'arbiter' ? c![2] : null,
    };
  });
}
