/**
 * Loads the reviewer's marked out/gold_review.csv into bt_gold_marks (append-only).
 * Validates ids against the existing tables and the answer row each mark refers to;
 * rows whose latest stored mark is identical are skipped, so re-importing is idempotent.
 * `--dry-run` validates and reports without writing.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { assertQuestionIdsExist, assertVideoIdsExist, btInsert, selectAll } from '../lib/supabase';
import { STANCES, type Stance } from './answers';
import { CliError, helpText, isDirectRun, makeCtx, parseCli, runCli, str, type Deps, type OptDef } from './cli';
import { parseCsv } from './csv';
import { fetchAnswersByIds } from './db';
import { latestMarks, parseYN } from './gold';

const OPTIONS: Record<string, OptDef> = {
  file: { type: 'string', help: 'marked CSV (default out/gold_review.csv)' },
  'marked-by': { type: 'string', help: "marked_by value (default 'human')" },
  'dry-run': { type: 'boolean', help: 'validate only; write nothing' },
};

export interface ParsedMark {
  video_id: string;
  question_id: number;
  stance_answer_id: number;
  final_stance: Stance;
  correct: boolean;
  quote_is_experiencer: boolean | null;
  note: string | null;
}

export interface ParsedSheet { marks: ParsedMark[]; unmarked: number; errors: string[] }

/** Pure CSV -> marks parsing and per-row validation (database checks happen afterwards). */
export function parseGoldSheet(text: string): ParsedSheet {
  const rows = parseCsv(text);
  const marks: ParsedMark[] = [];
  const errors: string[] = [];
  let unmarked = 0;
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const line = i + 2;
    try {
      const correct = parseYN(r['correct (Y/N)'], 'correct (Y/N)');
      if (correct === null) { unmarked++; return; }
      const qid = Number(r.question_id);
      const aid = Number(r.answer_id);
      if (!r.video_id?.trim()) throw new Error('video_id is blank');
      if (!Number.isInteger(qid)) throw new Error('question_id is not an integer');
      if (!Number.isInteger(aid)) throw new Error('answer_id is not an integer');
      if (!(STANCES as readonly string[]).includes(r.final_stance)) throw new Error(`final_stance "${r.final_stance}" is not a stance`);
      const key = `${r.video_id}:${qid}`;
      if (seen.has(key)) throw new Error(`duplicate row for ${key}`);
      seen.add(key);
      marks.push({
        video_id: r.video_id.trim(), question_id: qid, stance_answer_id: aid, final_stance: r.final_stance as Stance,
        correct, quote_is_experiencer: parseYN(r['quote_is_experiencer (Y/N)'], 'quote_is_experiencer (Y/N)'),
        note: r.note?.trim() ? r.note.trim() : null,
      });
    } catch (e) {
      errors.push(`line ${line}: ${(e as Error).message}`);
    }
  });
  return { marks, unmarked, errors };
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('import-gold.ts', 'import gold marks', OPTIONS)); return; }
  const file = str(v.file) ?? path.join(ctx.outDir, 'gold_review.csv');
  const parsed = parseGoldSheet(readFileSync(file, 'utf8'));
  ctx.log(`rows marked: ${parsed.marks.length}; unmarked (skipped): ${parsed.unmarked}; invalid: ${parsed.errors.length}`);
  if (parsed.errors.length) throw new CliError(`invalid rows (nothing written):\n${parsed.errors.slice(0, 20).join('\n')}`);
  if (parsed.marks.length === 0) throw new CliError('no marked rows in the file');

  const db = ctx.getDb();
  await assertVideoIdsExist(db, parsed.marks.map((m) => m.video_id));
  await assertQuestionIdsExist(db, parsed.marks.map((m) => m.question_id));
  const answers = await fetchAnswersByIds(db, parsed.marks.map((m) => m.stance_answer_id));
  const cellOf = new Map<number, { id: number; video_id: string; question_id: number }>();
  const aids = [...new Set(parsed.marks.map((m) => m.stance_answer_id))];
  for (let i = 0; i < aids.length; i += 200) {
    const { data, error } = await db.from('bt_stance_answers').select('id, video_id, question_id').in('id', aids.slice(i, i + 200));
    if (error) throw new Error(`read bt_stance_answers failed: ${error.message}`);
    for (const r of (data ?? []) as Array<{ id: number; video_id: string; question_id: number }>) cellOf.set(r.id, r);
  }
  const problems: string[] = [];
  for (const m of parsed.marks) {
    const a = answers.get(m.stance_answer_id);
    const c = cellOf.get(m.stance_answer_id);
    if (!a || !c) problems.push(`answer ${m.stance_answer_id} not found`);
    else if (c.video_id !== m.video_id || c.question_id !== m.question_id) problems.push(`answer ${m.stance_answer_id} belongs to a different video/question`);
    else if (a.stance !== m.final_stance) problems.push(`answer ${m.stance_answer_id}: sheet says ${m.final_stance}, database says ${a.stance}`);
  }
  if (problems.length) throw new CliError(`sheet does not match the database (nothing written):\n${problems.slice(0, 20).join('\n')}`);

  const videos = [...new Set(parsed.marks.map((m) => m.video_id))];
  const existing = await selectAll<{ id: number; video_id: string; question_id: number; stance_answer_id: number | null; final_stance: Stance; correct: boolean; quote_is_experiencer: boolean | null; note: string | null }>(
    db, 'bt_gold_marks', 'id, video_id, question_id, stance_answer_id, final_stance, correct, quote_is_experiencer, note',
    { orderBy: 'id', filter: (q) => q.in('video_id', videos) },
  );
  const latest = new Map(latestMarks(existing).map((m) => [`${m.video_id}:${m.question_id}`, m]));
  const fresh = parsed.marks.filter((m) => {
    const e = latest.get(`${m.video_id}:${m.question_id}`);
    return !(e && e.stance_answer_id === m.stance_answer_id && e.final_stance === m.final_stance && e.correct === m.correct
      && e.quote_is_experiencer === m.quote_is_experiencer && (e.note ?? null) === m.note);
  });
  const claimsMissingQuoteMark = parsed.marks.filter((m) => m.final_stance !== 'not_addressed' && m.quote_is_experiencer === null).length;
  ctx.log(`new or changed marks: ${fresh.length}; already stored identically: ${parsed.marks.length - fresh.length}; answers with no quote_is_experiencer mark: ${claimsMissingQuoteMark}`);
  if (v['dry-run'] === true) { ctx.log('DRY RUN: nothing written'); return; }
  if (fresh.length) {
    await btInsert(db, 'bt_gold_marks', fresh.map((m) => ({ ...m, marked_by: str(v['marked-by']) ?? 'human' })), { validateRefs: false });
  }
  ctx.log(`inserted ${fresh.length} rows into bt_gold_marks`);
}

if (isDirectRun('import-gold')) runCli((argv) => main(argv));
