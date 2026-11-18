/**
 * Builds out/gold_review.csv for the 25 gold videos: every status 'final' non-not_addressed
 * answer plus 3 seeded not_addressed rows per video, with blank reviewer columns.
 * Read-only. The CSV holds model-returned quotes: it goes to out/ (gitignored) only.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { readActiveQuestions, readNdeVideoIds, selectAll, type Db } from '../lib/supabase';
import { ensureOutDir, helpText, intOpt, isDirectRun, makeCtx, parseCli, runCli, str, CliError, type Ctx, type Deps, type OptDef } from './cli';
import { neutralizeFormula, toCsv } from './csv';
import { fetchStanceRuns } from './db';
import { NA_ROWS_PER_VIDEO, selectGoldRows, youtubeLink } from './gold';
import { completeEligible, goldIdsFromRuns, haikuGoldSample, incompleteSkipped } from './plan';
import { HAIKU_SUFFIX, fetchFirstPassAnswers, haikuCells, parseResolution } from './haiku';
import type { Stance } from './answers';

const OPTIONS: Record<string, OptDef> = {
  seed: { type: 'string', help: 'seed for the not_addressed spot-check rows (default 20261118)' },
  resolution: { type: 'string', help: 'full (default) | haiku-first-pass: 25 pilot-disjoint videos with a complete first-pass row set; sheet = counted Haiku answers (no spend)' },
  'pilot-n': { type: 'string', help: 'haiku-first-pass: pilot size to stay disjoint from (default 100)' },
  'gold-n': { type: 'string', help: 'haiku-first-pass: gold size (default 25)' },
  'allow-pending': { type: 'boolean', help: 'write the sheet even if some gold cells are not resolved yet' },
};

export const GOLD_HEADERS = [
  'video_id', 'title', 'question_id', 'category', 'question', 'final_stance', 'confidence', 'quote',
  'youtube_link', 'deciding_model', 'deciding_pass', 'answer_id',
  'correct (Y/N)', 'quote_is_experiencer (Y/N)', 'note',
];

/** Haiku-only sheet: the same columns plus would_be_flagged (Y/N), before the reviewer columns. */
export const HAIKU_GOLD_HEADERS = [...GOLD_HEADERS.slice(0, GOLD_HEADERS.indexOf('correct (Y/N)')), 'would_be_flagged', ...GOLD_HEADERS.slice(GOLD_HEADERS.indexOf('correct (Y/N)'))];

interface FinalRowDb {
  video_id: string;
  question_id: number;
  stance: Stance | null;
  confidence: number | null;
  quote: string | null;
  start_seconds: number | null;
  deciding_model: string | null;
  deciding_pass: string | null;
  final_answer_id: number | null;
  first_answer_id: number;
  status: string;
}

async function readTitles(db: Db, ids: readonly string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 25) {
    const { data, error } = await db.from('nde_vids').select('videoId, title').in('videoId', ids.slice(i, i + 25));
    if (error) throw new Error(`title read failed: ${error.message}`);
    for (const t of (data ?? []) as Array<{ videoId: string; title: string | null }>) titles.set(t.videoId, t.title ?? '');
  }
  return titles;
}

/**
 * Haiku-only gold sheet: every counted non-not_addressed first-pass answer plus 3 seeded
 * not_addressed rows per video, over `goldN` seeded videos that are disjoint from the pilot and
 * already have a complete first-pass row set (so building the sheet costs nothing).
 */
async function haikuSheet(ctx: Ctx, db: Db, seed: number, pilotN: number, goldN: number): Promise<void> {
  const qs = new Map((await readActiveQuestions(db)).map((q) => [q.id, q]));
  const qIds = [...qs.keys()];
  const nde = await readNdeVideoIds(db);
  const s = await haikuGoldSample(db, { seed, pilotN, goldN }, nde, await fetchStanceRuns(db), completeEligible(db, qIds));
  if (s.chosen.length < goldN) throw new CliError(`only ${s.chosen.length} pilot-disjoint NDE videos with a complete first-pass row set (need ${goldN}); finish the first pass first`);
  const incomplete = await incompleteSkipped(db, s.skipped); // videos without a transcript never get rows and do not make the selection unstable
  if (incomplete.length) ctx.log(`WARNING: ${incomplete.length} earlier candidates in the seeded order have a transcript but lack a complete first-pass row set and were skipped; the selection will change when they complete. Build the final sheet after the full first pass.`);
  const cells = haikuCells(await fetchFirstPassAnswers(db, s.chosen, 25), qIds).filter((c) => c.category === 'counted');
  const chosen = selectGoldRows(cells.map((c) => ({ ...c, stance: c.stance as Stance, status: 'final' })), seed, NA_ROWS_PER_VIDEO);
  const detail = new Map<number, { quote: string | null; start_seconds: number | null; model: string }>();
  const aids = chosen.map((c) => c.id);
  for (let i = 0; i < aids.length; i += 200) {
    const { data, error } = await db.from('bt_stance_answers').select('id, quote, start_seconds, model').in('id', aids.slice(i, i + 200));
    if (error) throw new Error(`read bt_stance_answers failed: ${error.message}`);
    for (const r of (data ?? []) as Array<{ id: number; quote: string | null; start_seconds: number | null; model: string }>) detail.set(r.id, r);
  }
  const titles = await readTitles(db, s.chosen);
  const out = chosen.map((r) => {
    const q = qs.get(r.question_id);
    const d = detail.get(r.id);
    return {
      video_id: r.video_id,
      title: neutralizeFormula(titles.get(r.video_id) ?? ''),
      question_id: r.question_id,
      category: q?.category ?? '',
      question: neutralizeFormula(q?.consumer_question ?? q?.question ?? ''),
      final_stance: r.stance,
      confidence: r.confidence,
      quote: d?.quote ? neutralizeFormula(d.quote) : '',
      youtube_link: youtubeLink(r.video_id, r.stance === 'not_addressed' ? null : d?.start_seconds),
      deciding_model: d?.model ?? '',
      deciding_pass: 'first',
      answer_id: r.id,
      would_be_flagged: r.flagged ? 'Y' : 'N',
      'correct (Y/N)': '', 'quote_is_experiencer (Y/N)': '', note: '',
    };
  });
  writeFileSync(path.join(ensureOutDir(ctx), `gold_review${HAIKU_SUFFIX}.csv`), toCsv(HAIKU_GOLD_HEADERS, out));
  const na = chosen.filter((r) => r.stance === 'not_addressed').length;
  ctx.log(`wrote out/gold_review${HAIKU_SUFFIX}.csv: ${out.length} rows (${out.length - na} counted answers, ${na} not_addressed spot checks, ${chosen.filter((r) => r.flagged).length} would have been flagged) over ${s.chosen.length} videos; pilot-disjoint (${s.pilotExcluded} ids excluded); no API calls, no spend`);
  ctx.log(`import the reviewed sheet with: import-gold.ts --file out/gold_review${HAIKU_SUFFIX}.csv`);
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('gold-sheet.ts', 'write out/gold_review.csv', OPTIONS)); return; }
  const db = ctx.getDb();
  const seed = intOpt(v.seed, 'seed') ?? 20261118;
  let resolution;
  try { resolution = parseResolution(str(v.resolution)); } catch (e) { throw new CliError((e as Error).message); }
  if (resolution === 'haiku-first-pass') { await haikuSheet(ctx, db, seed, intOpt(v['pilot-n'], 'pilot-n') ?? 100, intOpt(v['gold-n'], 'gold-n') ?? 25); return; }
  const ids = goldIdsFromRuns(await fetchStanceRuns(db));
  if (!ids) throw new CliError('no gold run found');

  const rows: FinalRowDb[] = [];
  for (let i = 0; i < ids.length; i += 25) {
    rows.push(...(await selectAll<FinalRowDb>(
      db, 'bt_final_stances',
      'video_id, question_id, stance, confidence, quote, start_seconds, deciding_model, deciding_pass, final_answer_id, first_answer_id, status',
      { orderBy: 'first_answer_id', filter: (q) => q.in('video_id', ids.slice(i, i + 25)) },
    )));
  }
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  ctx.log(`gold cells by status: ${Object.entries(counts).map(([k, n]) => `${k}=${n}`).join(', ') || 'none'}`);
  const pending = (counts.pending_recheck ?? 0) + (counts.pending_arbiter ?? 0);
  if (pending && v['allow-pending'] !== true) throw new CliError(`${pending} gold cells are not resolved yet; finish the recheck/arbiter passes (or pass --allow-pending)`);

  const cells = rows.filter((r) => r.stance !== null && r.final_answer_id !== null)
    .map((r) => ({ ...r, stance: r.stance as Stance }));
  const chosen = selectGoldRows(cells, seed, NA_ROWS_PER_VIDEO);

  const qs = new Map((await readActiveQuestions(db)).map((q) => [q.id, q]));
  const titles = await readTitles(db, ids);
  const out = chosen.map((r) => {
    const q = qs.get(r.question_id);
    return {
      video_id: r.video_id,
      title: neutralizeFormula(titles.get(r.video_id) ?? ''),
      question_id: r.question_id,
      category: q?.category ?? '',
      question: neutralizeFormula(q?.consumer_question ?? q?.question ?? ''),
      final_stance: r.stance,
      confidence: r.confidence,
      quote: r.quote ? neutralizeFormula(r.quote) : '',
      youtube_link: youtubeLink(r.video_id, r.stance === 'not_addressed' ? null : r.start_seconds),
      deciding_model: r.deciding_model,
      deciding_pass: r.deciding_pass,
      answer_id: r.final_answer_id,
      'correct (Y/N)': '', 'quote_is_experiencer (Y/N)': '', note: '',
    };
  });
  const file = path.join(ensureOutDir(ctx), 'gold_review.csv');
  writeFileSync(file, toCsv(GOLD_HEADERS, out));
  const na = chosen.filter((r) => r.stance === 'not_addressed').length;
  ctx.log(`wrote out/gold_review.csv: ${out.length} rows (${out.length - na} answers, ${na} not_addressed spot checks) over ${ids.length} videos`);
}

if (isDirectRun('gold-sheet')) runCli((argv) => main(argv));
