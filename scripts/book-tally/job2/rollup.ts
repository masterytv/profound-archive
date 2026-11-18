/**
 * Person-level rollup (SPEC "Job 2" 7.). No API calls; read-only.
 *
 * Refuses unless: bt_unmapped_nde_videos is empty, job 1 has no merge conflicts, no
 * pending_recheck / pending_arbiter cells exist (--allow-pending overrides, loudly), and
 * every NDE video has stance rows or is recorded as having no transcript (--allow-partial
 * overrides). Tallies bt_final_stances (status 'final' only; everything else is counted in
 * *_cells columns) per effective person. The sensitivity file counts each video as its own
 * person. A `warnings` column (header WARNING_incomplete_data when non-empty) carries any
 * override into every CSV row, and out/tally_report.md repeats it.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { readActiveQuestions, readNdeVideoIds, selectAllKeyset, type Db } from '../lib/supabase';
import { CliError, ensureOutDir, helpText, isDirectRun, makeCtx, parseCli, runCli, type Deps, type OptDef } from './cli';
import { toCsv } from './csv';
import { VIEW_VIDEO_CHUNK, fetchStanceRuns } from './db';
import { TALLY_HEADERS, tallyByQuestion, type FinalRow, type QuestionMeta, type TallyRow } from './tally';

const OPTIONS: Record<string, OptDef> = {
  'allow-partial': { type: 'boolean', help: 'tally even if some NDE videos have no stance rows yet (default: fail)' },
  'allow-pending': { type: 'boolean', help: 'tally even though pending_recheck/pending_arbiter cells exist (default: fail)' },
};

export interface MergeConflict { component: string[]; keyA: string; keyB: string }
export type FindMergeConflicts = (db: Db) => Promise<MergeConflict[]>;
export interface RollupDeps extends Deps { findMergeConflicts?: FindMergeConflicts }

/** job1's findMergeConflicts (added by the job 1 builder); resolved lazily so this module has no hard import. */
async function defaultFindMergeConflicts(): Promise<FindMergeConflicts> {
  for (const mod of ['../job1/data', '../job1/logic', '../job1/find-pairs']) {
    try {
      const m = (await import(mod)) as Record<string, unknown>;
      if (typeof m.findMergeConflicts === 'function') return m.findMergeConflicts as FindMergeConflicts;
    } catch { /* try the next module */ }
  }
  throw new CliError('findMergeConflicts is not available from job1; cannot verify that no merge decisions conflict');
}

/** NDE videos with no stance row at all. */
export function uncoveredVideos(nde: readonly string[], rows: ReadonlyArray<{ video_id: string }>): string[] {
  const have = new Set(rows.map((r) => r.video_id));
  return nde.filter((v) => !have.has(v));
}

/** Persons (by key) none of whose NDE videos can be tallied because none has a usable transcript. */
export function noTranscriptPersonCount(personOf: ReadonlyMap<string, string>, noTranscript: ReadonlySet<string>): number {
  const byPerson = new Map<string, boolean>();
  for (const [video, person] of personOf) byPerson.set(person, (byPerson.get(person) ?? true) && noTranscript.has(video));
  return [...byPerson.values()].filter(Boolean).length;
}

function csvRows(rows: TallyRow[], warnings: string): Array<Record<string, unknown>> {
  const r1 = (x: number | null) => (x === null ? '' : Number(x.toFixed(2)));
  return rows.map((r) => {
    const o: Record<string, unknown> = { ...r, warnings };
    for (const k of Object.keys(o)) if (/^(pct_|.*_ci_)/.test(k)) o[k] = r1(o[k] as number | null);
    return o;
  });
}

export async function main(argv: string[], deps: RollupDeps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('rollup.ts', 'person rollup CSVs', OPTIONS)); return; }
  const db = ctx.getDb();
  const nde = await readNdeVideoIds(db);
  const ndeSet = new Set(nde);

  const unmapped = await selectAllKeyset<{ video_id: string }>(db, 'bt_unmapped_nde_videos', 'video_id', 'video_id');
  if (unmapped.length) {
    throw new CliError(`${unmapped.length} NDE videos have no accepted person link (bt_unmapped_nde_videos is not empty); e.g. ${unmapped.slice(0, 5).map((r) => r.video_id).join(', ')}. Finish Job 1 first.`);
  }
  const conflicts = await (deps.findMergeConflicts ?? (await defaultFindMergeConflicts()))(db);
  if (conflicts.length) {
    throw new CliError(`${conflicts.length} merge conflict(s) in Job 1 decisions (e.g. ${conflicts[0].keyA} / ${conflicts[0].keyB} are merged transitively but also decided keep_separate); resolve them before tallying.`);
  }
  const map = await selectAllKeyset<{ video_id: string; person_key: string }>(db, 'bt_effective_person_map', 'video_id, person_key', 'video_id');
  const personOf = new Map(map.map((m) => [m.video_id, m.person_key]));
  const missingMap = nde.filter((id) => !personOf.has(id));
  if (missingMap.length) throw new CliError(`${missingMap.length} NDE videos missing from bt_effective_person_map`);

  // bt_final_stances is read per chunk of <= 200 videos so the filter is applied inside the view.
  const rows: FinalRow[] = [];
  for (let i = 0; i < nde.length; i += VIEW_VIDEO_CHUNK) {
    const chunk = nde.slice(i, i + VIEW_VIDEO_CHUNK);
    rows.push(...(await selectAllKeyset<FinalRow & Record<string, unknown>>(
      db, 'bt_final_stances', 'first_answer_id, video_id, question_id, stance, status', 'first_answer_id', (q) => q.in('video_id', chunk),
    )));
  }

  const stanceRuns = await fetchStanceRuns(db);
  const noTranscript = new Set(stanceRuns.flatMap((r) => (r.params?.plan?.skippedNoTranscript as string[] | undefined) ?? []).filter((x) => ndeSet.has(x)));
  const uncoveredAll = uncoveredVideos(nde, rows);
  const noTranscriptVideos = uncoveredAll.filter((x) => noTranscript.has(x));
  const incomplete = uncoveredAll.filter((x) => !noTranscript.has(x));
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const pendingRecheck = byStatus.pending_recheck ?? 0, pendingArbiter = byStatus.pending_arbiter ?? 0;
  ctx.log(`NDE videos: ${nde.length}; persons: ${new Set(personOf.values()).size}; stance cells read: ${rows.length}`);
  ctx.log(`cells by status: ${Object.entries(byStatus).map(([k, n]) => `${k}=${n}`).join(', ')}`);
  ctx.log(`videos without stance rows: ${noTranscriptVideos.length} recorded as no-transcript, ${incomplete.length} incomplete (not yet run)`);

  if (pendingRecheck + pendingArbiter > 0 && v['allow-pending'] !== true) {
    throw new CliError(`${pendingRecheck} cells await the recheck and ${pendingArbiter} await the arbiter; finish those passes (or pass --allow-pending for a clearly marked partial tally)`);
  }
  if (incomplete.length && v['allow-partial'] !== true) {
    throw new CliError(`${incomplete.length} NDE videos have no stance rows yet and are not recorded as lacking a transcript (run the first pass on all of them, or pass --allow-partial)`);
  }
  const warnings: string[] = [];
  if (pendingRecheck + pendingArbiter > 0) warnings.push(`PENDING_CELLS recheck=${pendingRecheck} arbiter=${pendingArbiter}`);
  if (incomplete.length) warnings.push(`INCOMPLETE_COVERAGE videos=${incomplete.length}`);
  const warningText = warnings.join('; ');
  if (warningText) ctx.log(`WARNING: partial tally (${warningText})`);

  const qs: QuestionMeta[] = (await readActiveQuestions(db)).map((q) => ({
    id: q.id, category: q.category, consumer_question: q.consumer_question ?? q.question,
  }));
  const noTranscriptPersons = noTranscriptPersonCount(new Map(nde.map((x) => [x, personOf.get(x)!])), noTranscript);
  const person = tallyByQuestion(rows, personOf, qs, { noTranscriptPersons });
  const perVideo = tallyByQuestion(rows, new Map(rows.map((r) => [r.video_id, r.video_id])), qs, { noTranscriptPersons: noTranscript.size });
  const dir = ensureOutDir(ctx);
  const headers = [...TALLY_HEADERS, warningText ? 'WARNING_incomplete_data' : 'warnings'];
  const withWarn = (rs: Array<Record<string, unknown>>) => rs.map((r) => ({ ...r, [headers[headers.length - 1]]: r.warnings }));
  writeFileSync(path.join(dir, 'tally_by_question.csv'), toCsv(headers, withWarn(csvRows(person, warningText))));
  writeFileSync(path.join(dir, 'tally_by_question_sensitivity_per_video.csv'), toCsv(headers, withWarn(csvRows(perVideo, warningText))));
  writeFileSync(path.join(dir, 'tally_report.md'), [
    '# Tally report', '',
    warningText ? `**WARNING: incomplete data: ${warningText}**\n` : 'Complete: no pending cells, no uncovered videos.\n',
    `- NDE videos: ${nde.length}; persons: ${new Set(personOf.values()).size}`,
    `- videos recorded as having no transcript: ${noTranscriptVideos.length} (persons with no usable video: ${noTranscriptPersons})`,
    `- videos not yet run (incomplete): ${incomplete.length}`,
    `- stance cells by status: ${Object.entries(byStatus).map(([k, n]) => `${k}=${n}`).join(', ')}`,
    '- *_cells columns count video-level answers; n_persons_* columns count persons.', '',
  ].join('\n'));
  ctx.log(`wrote out/tally_by_question.csv, out/tally_by_question_sensitivity_per_video.csv and out/tally_report.md (${qs.length} questions)`);
}

if (isDirectRun('rollup')) runCli((argv) => main(argv));
