/**
 * Validation of one parsed model answer set (stance pass) against the requested
 * question ids. Produces exactly one row per REQUESTED question id; rows that fail are
 * `valid: false` with `stance: null` (the raw response stays in bt_raw_responses) and an
 * `error`. Quote verification against the transcript is a separate step (lib/quote.ts).
 *
 * Rules:
 *  - parsed must be an object with an `answers` array, else every requested row is invalid
 *  - missing id            -> invalid ("missing")
 *  - duplicated id         -> invalid ("duplicate"); all copies discarded
 *  - extra id (not requested, or not an integer) -> NOT turned into a row (it has no legal
 *    question to attach to); listed in `extras` and `problems`; legit rows are unaffected
 *  - confidence must be an integer 0..100
 *  - stance must be yes | no | mixed | not_addressed
 *  - yes/no/mixed need a non-empty string quote
 *  - not_addressed with a quote: quote stored as null, row stays valid, `error` carries a note
 */

export const STANCES = ['yes', 'no', 'mixed', 'not_addressed'] as const;
export type Stance = (typeof STANCES)[number];

export interface StanceRow {
  question_id: number;
  valid: boolean;
  stance: Stance | null;
  confidence: number | null;
  quote: string | null;
  /** Reason when invalid; a "note: ..." message when valid but adjusted; otherwise null. */
  error: string | null;
}

export interface ValidatedAnswerSet {
  /** One row per requested question id, in the requested order. */
  rows: StanceRow[];
  /** Answers whose question_id was not requested (or not an integer). */
  extras: Array<{ question_id: unknown; error: string }>;
  /** Human-readable list of everything that was wrong (empty when clean). */
  problems: string[];
  /** True when every requested row is valid and there are no extras. */
  complete: boolean;
}

const invalid = (question_id: number, error: string): StanceRow => ({
  question_id, valid: false, stance: null, confidence: null, quote: null, error,
});

function validateOne(question_id: number, a: Record<string, unknown>): StanceRow {
  const { stance, confidence, quote } = a;
  if (typeof stance !== 'string' || !(STANCES as readonly string[]).includes(stance)) {
    return invalid(question_id, `invalid stance: ${typeof stance === 'string' ? JSON.stringify(stance.slice(0, 40)) : typeof stance}`);
  }
  if (typeof confidence !== 'number' || !Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
    return invalid(question_id, `confidence must be an integer 0..100 (got ${typeof confidence === 'number' ? confidence : typeof confidence})`);
  }
  if (quote !== null && quote !== undefined && typeof quote !== 'string') {
    return invalid(question_id, 'quote must be a string or null');
  }
  const q = typeof quote === 'string' ? quote.trim() : '';
  if (stance === 'not_addressed') {
    return {
      question_id, valid: true, stance, confidence, quote: null,
      error: q !== '' ? 'note: quote discarded because stance is not_addressed' : null,
    };
  }
  if (q === '') return invalid(question_id, `stance ${stance} requires a non-empty quote`);
  return { question_id, valid: true, stance: stance as Stance, confidence, quote: q, error: null };
}

export function validateAnswerSet(parsed: unknown, requested: readonly number[]): ValidatedAnswerSet {
  const wanted = new Set(requested);
  if (wanted.size !== requested.length) throw new Error('validateAnswerSet: duplicate ids in requested list');

  const answers = (parsed as { answers?: unknown } | null | undefined)?.answers;
  if (!Array.isArray(answers)) {
    const msg = 'output has no "answers" array';
    return {
      rows: requested.map((id) => invalid(id, msg)),
      extras: [],
      problems: [msg],
      complete: false,
    };
  }

  const byId = new Map<number, Array<Record<string, unknown>>>();
  const extras: ValidatedAnswerSet['extras'] = [];
  const problems: string[] = [];
  const malformed: string[] = [];
  for (const item of answers) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      malformed.push('non-object answer element');
      continue;
    }
    const rec = item as Record<string, unknown>;
    const id = rec.question_id;
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      extras.push({ question_id: id, error: 'question_id is not an integer' });
      continue;
    }
    if (!wanted.has(id)) {
      extras.push({ question_id: id, error: 'question_id was not requested' });
      continue;
    }
    const list = byId.get(id) ?? [];
    list.push(rec);
    byId.set(id, list);
  }
  if (malformed.length) problems.push(`${malformed.length} malformed answer element(s)`);
  if (extras.length) problems.push(`${extras.length} extra answer(s): ${extras.slice(0, 5).map((e) => String(e.question_id)).join(', ')}`);

  const rows = requested.map((id): StanceRow => {
    const list = byId.get(id);
    if (!list) return invalid(id, 'missing answer for requested question');
    if (list.length > 1) return invalid(id, `duplicate answers (${list.length}) for question`);
    return validateOne(id, list[0]);
  });
  const bad = rows.filter((r) => !r.valid).length;
  if (bad) problems.push(`${bad} of ${rows.length} requested answers invalid`);
  return { rows, extras, problems, complete: bad === 0 && extras.length === 0 && malformed.length === 0 };
}
