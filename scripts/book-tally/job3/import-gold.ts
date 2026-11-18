/**
 * Job 3 gold marks import: loads the owner's marks into bt_coded_gold_marks (append-only INSERTs;
 * nothing is ever updated or deleted). No API calls.
 *
 * --file is a .json file (an array of marks) or the sheet .csv with its mark columns filled in.
 * Mark: { coded_answer_id, addressed_correct 'Y'|'N', answer_correct? 'Y'|'N'|'', wrong_choices?
 * (array, or space-separated text in the CSV), missing_answer?, quote_is_experiencer? 'Y'|'N'|'', note? }.
 *
 * Rules (the whole file is refused, nothing written, on any problem; the first few are listed):
 *   - a blank addressed_correct means unmarked: the row is skipped and counted. If such a row has any
 *     other mark field filled in it is a problem (the entry would be lost silently);
 *   - Y/N values only; one entry per coded_answer_id;
 *   - the coded answer must exist and its outcome (job3/validate.rowOutcome) must be counted or
 *     not_addressed: the sheet never shows anything else;
 *   - a not_addressed row takes no answer_correct and no wrong_choices;
 *   - wrong_choices must be a subset of the row's counted choice codes (so a yes/no row takes none),
 *     and answer_correct = Y contradicts a non-empty wrong_choices;
 *   - only marks that are new, or differ from the latest stored mark (highest id) for that coded
 *     answer, are inserted, so re-importing the same file inserts nothing.
 * --dry-run validates and reports without writing. marked_by is 'owner'.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { btInsert, selectAll, type Db } from '../lib/supabase';
import { CliError, helpText, isDirectRun, makeCtx, parseCli, runCli, str, type Deps, type OptDef } from '../job1/cli';
import { parseCsv } from '../job2/csv';
import { SHEET_CSV } from './gold-sheet';
import { countedChoices, rowOutcome, type CheckedChoice } from './validate';

const OPTIONS: Record<string, OptDef> = {
  file: { type: 'string', help: `marks: a .json array or the marked sheet .csv (default out/${SHEET_CSV})` },
  'dry-run': { type: 'boolean', help: 'validate and report; write nothing' },
};

export const MARKED_BY = 'owner';
const MAX_SHOWN = 10;

export interface ParsedMark {
  coded_answer_id: number;
  addressed_correct: boolean;
  answer_correct: boolean | null;
  /** Sorted, de-duplicated. */
  wrong_choices: string[];
  missing_answer: string | null;
  quote_is_experiencer: boolean | null;
  note: string | null;
}

export interface ParsedMarks { marks: ParsedMark[]; unmarked: number; errors: string[] }

/** Y/N (any case) -> boolean; blank -> null; anything else throws. */
export function parseYN(v: unknown, field: string): boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new Error(`${field} must be Y or N`);
  const s = v.trim().toUpperCase();
  if (s === '') return null;
  if (s === 'Y') return true;
  if (s === 'N') return false;
  throw new Error(`${field} must be Y or N, got "${v.trim().slice(0, 12)}"`);
}

function parseCodes(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\s,]+/) : null;
  if (list === null || list.some((x) => typeof x !== 'string')) throw new Error('wrong_choices must be an array of codes or space-separated text');
  return [...new Set(list.map((x: string) => x.trim()).filter(Boolean))].sort();
}

function parseText(v: unknown, field: string): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new Error(`${field} must be text`);
  return v.trim() === '' ? null : v.trim();
}

/** One raw record -> a mark, or null when unmarked. Throws for a problem in the record itself. */
export function parseMark(r: Record<string, unknown>): ParsedMark | null {
  const addressed = parseYN(r.addressed_correct, 'addressed_correct');
  const answer = parseYN(r.answer_correct, 'answer_correct');
  const wrong = parseCodes(r.wrong_choices);
  const missing = parseText(r.missing_answer, 'missing_answer');
  const quote = parseYN(r.quote_is_experiencer, 'quote_is_experiencer');
  const note = parseText(r.note, 'note');
  if (addressed === null) {
    if (answer !== null || wrong.length || missing !== null || quote !== null || note !== null) {
      throw new Error('addressed_correct is blank but other mark fields are filled in');
    }
    return null;
  }
  const id = typeof r.coded_answer_id === 'number' ? r.coded_answer_id : /^\d+$/.test(String(r.coded_answer_id ?? '').trim()) ? Number(String(r.coded_answer_id).trim()) : NaN;
  if (!Number.isInteger(id) || id < 1) throw new Error('coded_answer_id is not a positive integer');
  if (answer === true && wrong.length) throw new Error('answer_correct is Y but wrong_choices is not empty');
  return { coded_answer_id: id, addressed_correct: addressed, answer_correct: answer, wrong_choices: wrong, missing_answer: missing, quote_is_experiencer: quote, note };
}

/** Parses a .json (array of marks) or .csv (sheet with mark columns) file body. Pure. */
export function parseMarksFile(text: string, format: 'json' | 'csv'): ParsedMarks {
  let records: Array<Record<string, unknown>>;
  if (format === 'json') {
    let data: unknown;
    try { data = JSON.parse(text); } catch (e) { return { marks: [], unmarked: 0, errors: [`not valid JSON: ${(e as Error).message}`] }; }
    if (!Array.isArray(data) || data.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) {
      return { marks: [], unmarked: 0, errors: ['a JSON file must be an array of mark objects'] };
    }
    records = data as Array<Record<string, unknown>>;
  } else {
    try { records = parseCsv(text); } catch (e) { return { marks: [], unmarked: 0, errors: [`not valid CSV: ${(e as Error).message}`] }; }
  }
  const marks: ParsedMark[] = [];
  const errors: string[] = [];
  const seen = new Set<number>();
  let unmarked = 0;
  records.forEach((r, i) => {
    const at = format === 'csv' ? `line ${i + 2}` : `entry ${i + 1}`;
    try {
      const m = parseMark(r);
      if (m === null) { unmarked++; return; }
      if (seen.has(m.coded_answer_id)) throw new Error(`coded_answer_id ${m.coded_answer_id} appears twice`);
      seen.add(m.coded_answer_id);
      marks.push(m);
    } catch (e) {
      errors.push(`${at}: ${(e as Error).message}`);
    }
  });
  return { marks, unmarked, errors };
}

/** The columns of a coded answer needed to validate a mark. */
export interface CodedAnswerLite {
  id: number;
  video_id: string;
  item_key: string;
  kind: 'yn' | 'mc';
  addressed: boolean | null;
  quote_verified: boolean;
  choices: CheckedChoice[] | null;
  valid: boolean;
}

/** Marks checked against the coded answers they refer to. Pure. */
export function validateMarks(marks: readonly ParsedMark[], answers: ReadonlyMap<number, CodedAnswerLite>): string[] {
  const errors: string[] = [];
  for (const m of marks) {
    const a = answers.get(m.coded_answer_id);
    const at = `coded_answer_id ${m.coded_answer_id}`;
    if (!a) { errors.push(`${at}: not found in bt_coded_answers`); continue; }
    const outcome = rowOutcome(a);
    if (outcome !== 'counted' && outcome !== 'not_addressed') {
      errors.push(`${at}: outcome is ${outcome}; only counted and not_addressed rows are on the sheet`);
      continue;
    }
    if (outcome === 'not_addressed') {
      if (m.answer_correct !== null) errors.push(`${at}: not_addressed row must have a blank answer_correct`);
      if (m.wrong_choices.length) errors.push(`${at}: not_addressed row must have blank wrong_choices`);
      continue;
    }
    const allowed = new Set(countedChoices(a));
    const bad = m.wrong_choices.filter((c) => !allowed.has(c));
    if (bad.length) errors.push(`${at}: wrong_choices ${bad.join(' ')} not among this row's counted answers (${[...allowed].join(' ') || 'none'})`);
  }
  return errors;
}

/** A stored row of bt_coded_gold_marks. */
export interface DbMark {
  id: number;
  coded_answer_id: number;
  video_id: string;
  item_key: string;
  addressed_correct: boolean;
  answer_correct: boolean | null;
  wrong_choices: string[] | null;
  missing_answer: string | null;
  quote_is_experiencer: boolean | null;
  note: string | null;
}

/** Latest stored mark (highest id) per coded answer. */
export function latestMarkByAnswer<T extends { id: number; coded_answer_id: number }>(rows: readonly T[]): Map<number, T> {
  const out = new Map<number, T>();
  for (const r of rows) {
    const cur = out.get(r.coded_answer_id);
    if (!cur || r.id > cur.id) out.set(r.coded_answer_id, r);
  }
  return out;
}

/** True when the stored mark says the same thing as the new one (null and [] wrong_choices are the same). */
export function sameMark(e: DbMark, m: ParsedMark): boolean {
  const wrong = [...new Set(e.wrong_choices ?? [])].sort();
  return e.addressed_correct === m.addressed_correct && (e.answer_correct ?? null) === m.answer_correct
    && wrong.length === m.wrong_choices.length && wrong.every((c, i) => c === m.wrong_choices[i])
    && (e.missing_answer ?? null) === m.missing_answer && (e.quote_is_experiencer ?? null) === m.quote_is_experiencer && (e.note ?? null) === m.note;
}

export const MARK_SELECT = 'id, coded_answer_id, video_id, item_key, addressed_correct, answer_correct, wrong_choices, missing_answer, quote_is_experiencer, note';

export async function readMarksByAnswer(db: Db, ids: readonly number[]): Promise<DbMark[]> {
  const out: DbMark[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    out.push(...(await selectAll<DbMark>(db, 'bt_coded_gold_marks', MARK_SELECT, { orderBy: 'id', filter: (q) => q.in('coded_answer_id', chunk) })));
  }
  return out;
}

async function readAnswers(db: Db, ids: readonly number[]): Promise<Map<number, CodedAnswerLite>> {
  const out = new Map<number, CodedAnswerLite>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    for (const r of await selectAll<CodedAnswerLite>(db, 'bt_coded_answers', 'id, video_id, item_key, kind, addressed, quote_verified, choices, valid', {
      orderBy: 'id', filter: (q) => q.in('id', chunk),
    })) out.set(r.id, r);
  }
  return out;
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) return ctx.log(helpText('job3/import-gold.ts', 'import the owner\'s gold marks into bt_coded_gold_marks (append-only)', OPTIONS));
  const file = str(v.file) ?? path.join(ctx.outDir, SHEET_CSV);
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.json' && ext !== '.csv') throw new CliError('--file must be a .json or .csv file');
  const parsed = parseMarksFile(readFileSync(file, 'utf8'), ext === '.json' ? 'json' : 'csv');
  ctx.log(`rows marked: ${parsed.marks.length}; unmarked (skipped): ${parsed.unmarked}; problems: ${parsed.errors.length}`);
  const refuse = (errors: string[]) => {
    throw new CliError(`${errors.length} problem(s), nothing written; first ${Math.min(errors.length, 5)}:\n${errors.slice(0, 5).join('\n')}`);
  };
  if (parsed.errors.length) refuse(parsed.errors);
  if (parsed.marks.length === 0) throw new CliError('no marked rows in the file');

  const ids = parsed.marks.map((m) => m.coded_answer_id);
  const answers = await readAnswers(ctx.db, ids);
  const problems = validateMarks(parsed.marks, answers);
  if (problems.length) refuse(problems);

  const latest = latestMarkByAnswer(await readMarksByAnswer(ctx.db, ids));
  const fresh = parsed.marks.filter((m) => {
    const e = latest.get(m.coded_answer_id);
    return !e || !sameMark(e, m);
  });
  const noAnswerMark = parsed.marks.filter((m) => m.addressed_correct && m.answer_correct === null && rowOutcome(answers.get(m.coded_answer_id)!) === 'counted' && answers.get(m.coded_answer_id)!.kind === 'yn').length;
  ctx.log(`new or changed marks: ${fresh.length}; already stored identically: ${parsed.marks.length - fresh.length}; counted yes/no rows marked addressed but with no answer_correct: ${noAnswerMark}`);
  if (v['dry-run'] === true) return ctx.log('DRY RUN: nothing written');
  if (fresh.length) {
    await btInsert(ctx.db, 'bt_coded_gold_marks', fresh.map((m) => {
      const a = answers.get(m.coded_answer_id)!;
      return {
        coded_answer_id: m.coded_answer_id, video_id: a.video_id, item_key: a.item_key, addressed_correct: m.addressed_correct,
        answer_correct: m.answer_correct, wrong_choices: rowOutcome(a) === 'counted' ? m.wrong_choices : null,
        missing_answer: m.missing_answer, quote_is_experiencer: m.quote_is_experiencer, note: m.note, marked_by: MARKED_BY,
      };
    }));
  }
  ctx.log(`inserted ${fresh.length} rows into bt_coded_gold_marks`);
}

if (isDirectRun('import-gold')) runCli((argv) => main(argv));
