/**
 * Checks one model response against the codebook and the video's transcript. Pure.
 *
 * One row per codebook item (facts and questions), always, so coverage is visible:
 * - the whole response failed (bad JSON, schema): every row is invalid with that reason;
 * - an item missing from the response, or listed twice: that row is invalid;
 * - not addressed, but an answer was given anyway: invalid;
 * - yes/no: stance yes|no|mixed and a quote are required; choices must be empty;
 * - multiple choice: 1..max_choices distinct listed codes (or "other" with a description), each with
 *   its own quote; stance "none" and quote null.
 * Every quote is checked word for word against the transcript (lib/quote). A failed quote is
 * recorded (quote_verified false), never dropped: the rollup decides what counts.
 */
import { verifyQuote, type NormalizedTranscript } from '../lib/quote';
import { allItems, OTHER, type Codebook, type CodeItem, type ItemType } from './codebook';

/** The schema-level shape of one entry (prompts/codebook-v1.schema.json). */
export interface ModelEntry {
  key: string;
  addressed: boolean;
  stance: 'yes' | 'no' | 'mixed' | 'none';
  quote: string | null;
  choices: Array<{ code: string; quote: string; other_text: string | null }>;
  confidence: number;
}

export interface CheckedChoice {
  code: string;
  quote: string;
  other_text: string | null;
  quote_verified: boolean;
  quote_norm_offset: number | null;
  /** 'ok' or the lib/quote failure reason. */
  quote_check: string;
}

export interface CodedRow {
  item_key: string;
  question_id: number | null;
  kind: ItemType;
  /** null when the row is invalid. */
  addressed: boolean | null;
  stance: 'yes' | 'no' | 'mixed' | null;
  quote: string | null;
  quote_verified: boolean;
  quote_norm_offset: number | null;
  choices: CheckedChoice[] | null;
  confidence: number | null;
  valid: boolean;
  error: string | null;
}

/** Longest "other" description kept; longer text is cut (and flagged). */
export const OTHER_TEXT_MAX = 160;

function invalidRow(it: CodeItem, error: string): CodedRow {
  return {
    item_key: it.key, question_id: it.question_id ?? null, kind: it.type, addressed: null, stance: null, quote: null,
    quote_verified: false, quote_norm_offset: null, choices: null, confidence: null, valid: false, error,
  };
}

function checkEntry(it: CodeItem, e: ModelEntry, cb: Codebook, transcript: NormalizedTranscript): CodedRow {
  const bad = (error: string) => invalidRow(it, error);
  if (!Number.isInteger(e.confidence) || e.confidence < 0 || e.confidence > 100) return bad('confidence must be an integer 0-100');
  const quote = e.quote?.trim() ? e.quote : null;
  const base = { item_key: it.key, question_id: it.question_id ?? null, kind: it.type, confidence: e.confidence, error: null as string | null };
  if (!e.addressed) {
    if (e.stance !== 'none' || quote !== null || e.choices.length) return bad('not addressed, but an answer was given');
    return { ...base, addressed: false, stance: null, quote: null, quote_verified: false, quote_norm_offset: null, choices: null, valid: true };
  }
  if (it.type === 'yn') {
    if (e.stance === 'none') return bad('addressed yes/no item without a stance');
    if (e.choices.length) return bad('yes/no item with choices');
    if (quote === null) return bad('addressed yes/no item without a quote');
    const v = verifyQuote(quote, transcript);
    return {
      ...base, addressed: true, stance: e.stance, quote, quote_verified: v.verified, quote_norm_offset: v.offset, choices: null, valid: true,
      error: v.verified ? null : `quote not verified: ${v.reason}`,
    };
  }
  // multiple choice
  if (e.stance !== 'none') return bad('multiple-choice item with a stance');
  if (quote !== null) return bad('multiple-choice item with a top-level quote');
  if (e.choices.length === 0) return bad('addressed multiple-choice item without any answer');
  // Structured outputs cannot enforce the answer limit, so problems with single answers drop that
  // answer (noted in error) instead of the whole item; the item is invalid only when nothing usable is left.
  const allowed = new Set([...(it.choices ?? []).map((c) => c.code), OTHER]);
  const seen = new Set<string>();
  const notes: string[] = [];
  const choices: CheckedChoice[] = [];
  for (const c of e.choices) {
    if (!allowed.has(c.code)) { notes.push(`unknown answer code "${c.code}" dropped`); continue; }
    if (seen.has(c.code)) { notes.push(`answer "${c.code}" given twice; the repeat dropped`); continue; }
    let other: string | null = null;
    if (c.code === OTHER) {
      const t = (c.other_text ?? '').trim();
      if (!t) { notes.push('"other" without a description dropped'); continue; }
      other = t.length > OTHER_TEXT_MAX ? t.slice(0, OTHER_TEXT_MAX) : t;
      if (t.length > OTHER_TEXT_MAX) notes.push('other_text cut');
    }
    if (choices.length >= cb.max_choices) { notes.push(`more than ${cb.max_choices} answers; "${c.code}" dropped`); continue; }
    seen.add(c.code);
    const v = verifyQuote(c.quote, transcript);
    if (!v.verified) notes.push(`${c.code}: quote not verified: ${v.reason}`);
    choices.push({ code: c.code, quote: c.quote, other_text: other, quote_verified: v.verified, quote_norm_offset: v.offset, quote_check: v.reason });
  }
  if (choices.length === 0) return bad(`no usable answer: ${notes.join('; ')}`);
  return {
    ...base, addressed: true, stance: null, quote: null, quote_verified: choices.every((c) => c.quote_verified), quote_norm_offset: null,
    choices, valid: true, error: notes.length ? notes.join('; ') : null,
  };
}

export interface CheckedResponse {
  rows: CodedRow[];
  /** Keys in the response that are not in the codebook (ignored). */
  unknownKeys: string[];
}

/** `parsed` is the schema-checked response, or a failure reason for the whole response. */
export function checkCodedResponse(
  parsed: { ok: true; value: { items: ModelEntry[] } } | { ok: false; error: string },
  cb: Codebook,
  transcript: NormalizedTranscript,
): CheckedResponse {
  const items = allItems(cb);
  if (parsed.ok === false) {
    const reason = `response rejected: ${parsed.error}`;
    return { rows: items.map((it) => invalidRow(it, reason)), unknownKeys: [] };
  }
  const byKey = new Map<string, ModelEntry[]>();
  for (const e of parsed.value.items) byKey.set(e.key, [...(byKey.get(e.key) ?? []), e]);
  const known = new Set(items.map((i) => i.key));
  const unknownKeys = [...byKey.keys()].filter((k) => !known.has(k)).sort();
  const rows = items.map((it) => {
    const es = byKey.get(it.key) ?? [];
    if (es.length === 0) return invalidRow(it, 'missing from the response');
    if (es.length > 1) return invalidRow(it, 'listed more than once');
    return checkEntry(it, es[0], cb, transcript);
  });
  return { rows, unknownKeys };
}

/** What a row contributes to a tally. */
export type RowOutcome = 'not_addressed' | 'counted' | 'unverified_quote' | 'invalid';

/**
 * - yes/no: counted only when the quote verified.
 * - multiple choice: counted when at least one answer's quote verified (only verified answers count);
 *   unverified_quote when none did.
 */
export function rowOutcome(r: Pick<CodedRow, 'valid' | 'addressed' | 'kind' | 'quote_verified' | 'choices'>): RowOutcome {
  if (!r.valid || r.addressed === null) return 'invalid';
  if (!r.addressed) return 'not_addressed';
  if (r.kind === 'yn') return r.quote_verified ? 'counted' : 'unverified_quote';
  return (r.choices ?? []).some((c) => c.quote_verified) ? 'counted' : 'unverified_quote';
}

/** The verified answer codes of a counted multiple-choice row. */
export function countedChoices(r: Pick<CodedRow, 'choices'>): string[] {
  return (r.choices ?? []).filter((c) => c.quote_verified).map((c) => c.code);
}
