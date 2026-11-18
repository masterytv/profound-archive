/**
 * Gold-set report from bt_gold_marks (latest mark per cell): precision per stance with
 * Wilson 95% CI and n, quote_is_experiencer rate, not_addressed spot-check accuracy.
 * Writes out/gold_report.md. Read-only; no API calls.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { readActiveQuestions, readNdeVideoIds, selectAll, type Db } from '../lib/supabase';
import { ensureOutDir, helpText, intOpt, isDirectRun, makeCtx, parseCli, runCli, str, CliError, type Ctx, type Deps, type OptDef } from './cli';
import { fetchStanceRuns } from './db';
import { CONFIDENCE_BANDS, fmtProportion, goldStats, haikuGoldStats, latestMarks, type GoldMark, type GoldStats, type HaikuGoldStats, type HaikuMark } from './gold';
import { HAIKU_SUFFIX, fetchFirstPassAnswers, haikuCells, haikuGoldSheetCells, parseResolution, type HaikuCell } from './haiku';
import { completeEligible, goldIdsFromRuns, haikuGoldSample } from './plan';

const OPTIONS: Record<string, OptDef> = {
  resolution: { type: 'string', help: 'full (default) | haiku-first-pass: precision of the unchecked Haiku answers, split by would_be_flagged and confidence band' },
  seed: { type: 'string', help: 'haiku-first-pass: sampling seed (default 20261118; must match gold-sheet)' },
  'pilot-n': { type: 'string', help: 'haiku-first-pass: pilot size (default 100; must match gold-sheet)' },
  'gold-n': { type: 'string', help: 'haiku-first-pass: gold size (default 25; must match gold-sheet)' },
  'allow-unmarked': { type: 'boolean', help: 'haiku-first-pass: write the report even if some sheet rows have no mark (the report then states the coverage); default is to refuse' },
};

export interface SheetCoverage { marked: number; rows: number; videosWithoutMarks: number }

export function renderHaikuGoldMarkdown(h: HaikuGoldStats, nVideos: number, dropped = 0, coverage?: SheetCoverage): string {
  const s = h.base;
  const partial = coverage && coverage.marked < coverage.rows;
  const L = [
    '# Gold-set report (Haiku-only, unchecked answers)', '',
    'The answers measured here are the unchecked first-pass answers of one model (Haiku): no second model re-checked them. This report is the only measure of how reliable they are. A human reviewer judged each sampled answer against the video.', '',
    `${s.nMarked} reviewed cells over ${nVideos} gold videos (latest mark per cell). Intervals are Wilson 95%.${dropped ? ` ${dropped} imported marks were left out because they do not refer to a row of the Haiku-only gold sheet, i.e. to the current, counted first-pass Haiku answer of a sheet cell (for example marks from a full-mode gold sheet, or on an answer that was later superseded).` : ''}`, '',
    ...(coverage ? [`Coverage: ${coverage.marked} of ${coverage.rows} sheet rows marked.`, ''] : []),
    ...(partial ? [`**WARNING: partial coverage.** ${coverage!.rows - coverage!.marked} sheet rows have no mark${coverage!.videosWithoutMarks ? ` (${coverage!.videosWithoutMarks} gold videos have none at all)` : ''}. The figures below rest on the rows the reviewer chose to mark, which may not be representative. Do not publish them as the gold-set precision.`, ''] : []),
    '## Precision per stance', '', '| stance | precision (correct / n) |', '|---|---|',
    `| yes | ${fmtProportion(s.perStance.yes)} |`,
    `| no | ${fmtProportion(s.perStance.no)} |`,
    `| mixed | ${fmtProportion(s.perStance.mixed)} |`,
    `| all non-not_addressed answers | ${fmtProportion(s.allClaims)} |`, '',
    '## Precision by would_be_flagged', '',
    'would_be_flagged = Y means the answer is a no, a mixed, or has confidence below 70: the kind of answer the full pipeline would have sent to a second model. Here none were re-checked.', '',
    '| would_be_flagged | precision (correct / n) |', '|---|---|',
    `| Y | ${fmtProportion(h.byFlag.flagged)} |`,
    `| N | ${fmtProportion(h.byFlag.unflagged)} |`, '',
    '## Precision by confidence band', '', '| confidence | precision (correct / n) |', '|---|---|',
    ...CONFIDENCE_BANDS.map((b) => `| ${b} | ${fmtProportion(h.byBand[b])} |`), '',
    '## Quote attribution', '',
    `Quote spoken by the experiencer (not the interviewer): ${fmtProportion(s.quoteIsExperiencer)}. Answers without a quote_is_experiencer mark: ${s.quoteUnmarked}.`, '',
    '## not_addressed spot check', '',
    `Share of sampled not_addressed answers where "not_addressed" was right: ${fmtProportion(s.notAddressed)}. A low value means the first pass misses answers (recall problem).`, '',
    '## Reading this report', '',
    'Precision is measured on the answers the Haiku-only tally counts (valid, and not_addressed or verified quote). Small n gives wide intervals: do not publish a per-stance or per-band figure whose interval is too wide for the claim made.', '',
  ];
  return L.join('\n');
}

/** Mark row as read from bt_gold_marks. */
type MarkRow = GoldMark & { id: number; stance_answer_id: number | null };

/**
 * Keeps only the marks that measure what the Haiku-only tally counts: the mark's cell must be on the
 * Haiku gold sheet (`sheetCells`, from haikuGoldSheetCells) and its answer must be that cell's
 * CURRENT counted first-pass answer (latest id). Marks on Sonnet/Opus-decided cells, on superseded
 * answers, on excluded claims, or on cells that are not sheet rows (e.g. extra not_addressed rows of a
 * full-mode sheet) are dropped and counted. Then the latest kept mark per cell. Pure.
 */
export function haikuGoldMarks(raw: readonly MarkRow[], sheetCells: readonly HaikuCell[]): { marks: HaikuMark[]; dropped: number; videosMarked: Set<string>; markedCells: Set<string> } {
  const key = (v: string, q: number) => `${v}\u0000${q}`;
  const current = new Map(sheetCells.map((c) => [key(c.video_id, c.question_id), c]));
  const kept: MarkRow[] = [];
  let dropped = 0;
  for (const m of raw) {
    const c = current.get(key(m.video_id, m.question_id));
    if (c && c.category === 'counted' && m.stance_answer_id === c.id) kept.push(m);
    else dropped++;
  }
  const marks = latestMarks(kept).map((m) => {
    const c = current.get(key(m.video_id, m.question_id))!;
    return { ...m, confidence: c.confidence, wouldBeFlagged: c.flagged };
  });
  return { marks, dropped, videosMarked: new Set(marks.map((m) => m.video_id)), markedCells: new Set(marks.map((m) => key(m.video_id, m.question_id))) };
}

async function haikuReport(ctx: Ctx, db: Db, seed: number, pilotN: number, goldN: number, allowUnmarked: boolean): Promise<void> {
  const qIds = (await readActiveQuestions(db)).map((q) => q.id);
  const s = await haikuGoldSample(db, { seed, pilotN, goldN }, await readNdeVideoIds(db), await fetchStanceRuns(db), completeEligible(db, qIds));
  if (s.chosen.length < goldN) throw new CliError(`only ${s.chosen.length} pilot-disjoint NDE videos with a complete first-pass row set (need ${goldN})`);
  const raw: MarkRow[] = [];
  for (let i = 0; i < s.chosen.length; i += 25) {
    raw.push(...(await selectAll<MarkRow>(
      db, 'bt_gold_marks', 'id, video_id, question_id, stance_answer_id, final_stance, correct, quote_is_experiencer',
      { orderBy: 'id', filter: (q) => q.in('video_id', s.chosen.slice(i, i + 25)) },
    )));
  }
  if (raw.length === 0) throw new CliError('no gold marks imported yet for the haiku gold videos');
  // The sample and the sheet rows are re-derived here exactly as gold-sheet derived them; the marks
  // must cover those rows. A blank "correct" cell is skipped on import, so missing rows are detected here.
  const sheet = haikuGoldSheetCells(haikuCells(await fetchFirstPassAnswers(db, s.chosen, 25), qIds), seed);
  const { marks, dropped, videosMarked, markedCells } = haikuGoldMarks(raw, sheet);
  if (marks.length === 0) throw new CliError(`none of the ${raw.length} imported marks on the haiku gold videos is on a row of the Haiku-only gold sheet; build and mark the sheet with gold-sheet.ts --resolution haiku-first-pass`);
  const unmarkedRows = sheet.filter((c) => !markedCells.has(`${c.video_id}\u0000${c.question_id}`));
  const sheetVideos = new Set(sheet.map((c) => c.video_id));
  const videosWithoutMarks = s.chosen.filter((v) => sheetVideos.has(v) && !videosMarked.has(v));
  const coverage: SheetCoverage = { marked: sheet.length - unmarkedRows.length, rows: sheet.length, videosWithoutMarks: videosWithoutMarks.length };
  if (unmarkedRows.length && !allowUnmarked) {
    throw new CliError(`${unmarkedRows.length} of the ${sheet.length} rows of the Haiku-only gold sheet have no usable mark${videosWithoutMarks.length ? `; ${videosWithoutMarks.length} gold videos have none at all (e.g. ${videosWithoutMarks.slice(0, 5).join(', ')})` : ''}. Either rows were left blank or not imported (import-gold skips rows with a blank "correct" cell), or the gold selection is not the one the marked sheet was built from (seed / pilot-n / gold-n differ, a pilot run was added, or first-pass rows changed). Mark every row and import again, or pass --allow-unmarked to report on the marked subset with its coverage stated. No report was written.`);
  }
  if (dropped) ctx.log(`NOTE: ${dropped} imported marks on these videos are not on a row of the Haiku-only gold sheet and were left out (see the report).`);
  if (unmarkedRows.length) ctx.log(`WARNING: --allow-unmarked: ${unmarkedRows.length} of ${sheet.length} sheet rows have no mark; the report says so and its figures must not be published as the gold-set precision.`);
  const stats = haikuGoldStats(marks);
  writeFileSync(path.join(ensureOutDir(ctx), `gold_report${HAIKU_SUFFIX}.md`), renderHaikuGoldMarkdown(stats, s.chosen.length, dropped, coverage));
  ctx.log(`wrote out/gold_report${HAIKU_SUFFIX}.md (${stats.base.nMarked} cells; ${coverage.marked} of ${coverage.rows} sheet rows marked; all-claims precision ${fmtProportion(stats.base.allClaims)}; ${dropped} marks left out)`);
}

export function renderGoldMarkdown(s: GoldStats, nVideos: number): string {
  const L = [
    '# Gold-set report', '',
    `${s.nMarked} reviewed cells over ${nVideos} gold videos (latest mark per cell). Intervals are Wilson 95%.`, '',
    '## Precision per stance', '', '| stance | precision (correct / n) |', '|---|---|',
    `| yes | ${fmtProportion(s.perStance.yes)} |`,
    `| no | ${fmtProportion(s.perStance.no)} |`,
    `| mixed | ${fmtProportion(s.perStance.mixed)} |`,
    `| all non-not_addressed answers | ${fmtProportion(s.allClaims)} |`, '',
    '## Quote attribution', '',
    `Quote spoken by the experiencer (not the interviewer): ${fmtProportion(s.quoteIsExperiencer)}. Answers without a quote_is_experiencer mark: ${s.quoteUnmarked}.`, '',
    '## not_addressed spot check', '',
    `Share of sampled not_addressed answers where "not_addressed" was right: ${fmtProportion(s.notAddressed)}. A low value means the pipeline misses answers (recall problem).`, '',
    '## Reading this report', '',
    'Precision is measured on the answers the pipeline would tally (status final, verified quote). Small n gives wide intervals: do not publish a per-stance figure whose interval is too wide for the claim made.', '',
  ];
  return L.join('\n');
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('gold-report.ts', 'write out/gold_report.md', OPTIONS)); return; }
  const db = ctx.getDb();
  let resolution;
  try { resolution = parseResolution(str(v.resolution)); } catch (e) { throw new CliError((e as Error).message); }
  if (resolution === 'haiku-first-pass') {
    await haikuReport(ctx, db, intOpt(v.seed, 'seed') ?? 20261118, intOpt(v['pilot-n'], 'pilot-n') ?? 100, intOpt(v['gold-n'], 'gold-n') ?? 25, v['allow-unmarked'] === true);
    return;
  }
  const ids = goldIdsFromRuns(await fetchStanceRuns(db));
  if (!ids) throw new CliError('no gold run found');
  const marks: Array<GoldMark & { id: number }> = [];
  for (let i = 0; i < ids.length; i += 25) {
    marks.push(...(await selectAll<GoldMark & { id: number }>(
      db, 'bt_gold_marks', 'id, video_id, question_id, final_stance, correct, quote_is_experiencer',
      { orderBy: 'id', filter: (q) => q.in('video_id', ids.slice(i, i + 25)) },
    )));
  }
  if (marks.length === 0) throw new CliError('no gold marks imported yet');
  const stats = goldStats(marks);
  writeFileSync(path.join(ensureOutDir(ctx), 'gold_report.md'), renderGoldMarkdown(stats, ids.length));
  ctx.log(`wrote out/gold_report.md (${stats.nMarked} cells; all-claims precision ${fmtProportion(stats.allClaims)})`);
}

if (isDirectRun('gold-report')) runCli((argv) => main(argv));
