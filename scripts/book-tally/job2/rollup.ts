/**
 * Person-level rollup (SPEC "Job 2" 7.). No API calls; read-only.
 *
 * Starts from the NDE set and asserts bt_unmapped_nde_videos is empty (every NDE video has an
 * accepted person link), then tallies bt_final_stances (status 'final' only; everything else
 * is counted in n_excluded_unverified) per effective person. The sensitivity file repeats the
 * count with every video as its own person.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { readActiveQuestions, readNdeVideoIds, selectAll } from '../lib/supabase';
import type { Stance } from './answers';
import { CliError, ensureOutDir, helpText, isDirectRun, makeCtx, parseCli, runCli, type Deps, type OptDef } from './cli';
import { toCsv } from './csv';
import { TALLY_HEADERS, tallyByQuestion, type FinalRow, type QuestionMeta, type TallyRow } from './tally';

const OPTIONS: Record<string, OptDef> = {
  'allow-partial': { type: 'boolean', help: 'tally even if some NDE videos have no stance rows yet (default: fail)' },
};

/** NDE videos with no stance row at all. */
export function uncoveredVideos(nde: readonly string[], rows: ReadonlyArray<{ video_id: string }>): string[] {
  const have = new Set(rows.map((r) => r.video_id));
  return nde.filter((v) => !have.has(v));
}

function csvRows(rows: TallyRow[]): Array<Record<string, unknown>> {
  const r1 = (x: number | null) => (x === null ? '' : Number(x.toFixed(2)));
  return rows.map((r) => {
    const o: Record<string, unknown> = { ...r };
    for (const k of Object.keys(o)) if (/^(pct_|.*_ci_)/.test(k)) o[k] = r1(o[k] as number | null);
    return o;
  });
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('rollup.ts', 'person rollup CSVs', OPTIONS)); return; }
  const db = ctx.getDb();
  const nde = await readNdeVideoIds(db);
  const ndeSet = new Set(nde);

  const unmapped = await selectAll<{ video_id: string }>(db, 'bt_unmapped_nde_videos', 'video_id', { orderBy: 'video_id' });
  if (unmapped.length) {
    throw new CliError(`${unmapped.length} NDE videos have no accepted person link (bt_unmapped_nde_videos is not empty); e.g. ${unmapped.slice(0, 5).map((r) => r.video_id).join(', ')}. Finish Job 1 first.`);
  }
  const map = await selectAll<{ video_id: string; person_key: string }>(db, 'bt_effective_person_map', 'video_id, person_key', { orderBy: 'video_id' });
  const personOf = new Map(map.map((m) => [m.video_id, m.person_key]));
  const missingMap = nde.filter((id) => !personOf.has(id));
  if (missingMap.length) throw new CliError(`${missingMap.length} NDE videos missing from bt_effective_person_map`);

  const all = await selectAll<FinalRow>(db, 'bt_final_stances', 'first_answer_id, video_id, question_id, stance, status', { orderBy: 'first_answer_id' });
  const rows = all.filter((r) => ndeSet.has(r.video_id));
  const outside = all.length - rows.length;
  const uncovered = uncoveredVideos(nde, rows);
  ctx.log(`NDE videos: ${nde.length}; persons: ${new Set(personOf.values()).size}; stance cells read: ${rows.length}${outside ? ` (+${outside} for non-NDE videos, ignored)` : ''}`);
  if (uncovered.length && v['allow-partial'] !== true) {
    throw new CliError(`${uncovered.length} NDE videos have no stance rows yet (run the first pass on all of them, or pass --allow-partial)`);
  }
  if (uncovered.length) ctx.log(`WARNING: partial tally; ${uncovered.length} NDE videos have no stance rows`);
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  ctx.log(`cells by status: ${Object.entries(byStatus).map(([k, n]) => `${k}=${n}`).join(', ')}`);

  const qs: QuestionMeta[] = (await readActiveQuestions(db)).map((q) => ({
    id: q.id, category: q.category, consumer_question: q.consumer_question ?? q.question,
  }));
  const person = tallyByQuestion(rows as FinalRow[], personOf, qs);
  const perVideo = tallyByQuestion(rows as FinalRow[], new Map(rows.map((r) => [r.video_id, r.video_id])), qs);
  const dir = ensureOutDir(ctx);
  writeFileSync(path.join(dir, 'tally_by_question.csv'), toCsv(TALLY_HEADERS, csvRows(person)));
  writeFileSync(path.join(dir, 'tally_by_question_sensitivity_per_video.csv'), toCsv(TALLY_HEADERS, csvRows(perVideo)));
  ctx.log(`wrote out/tally_by_question.csv and out/tally_by_question_sensitivity_per_video.csv (${qs.length} questions)`);
}

export type { Stance };
if (isDirectRun('rollup')) runCli((argv) => main(argv));
