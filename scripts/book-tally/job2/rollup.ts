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
 *
 * `--resolution haiku-first-pass` (budget decision: only the Haiku first pass runs on all NDE
 * videos) tallies Haiku's latest first-pass answers directly from bt_stance_answers (see
 * haiku.ts), without bt_final_stances. Pending cells are expected, so there is no pending
 * refusal; unmapped videos, merge conflicts and an incomplete first pass (unless
 * --allow-partial) still refuse. Files are suffixed _haiku_only, every CSV row carries
 * resolution=haiku_first_pass_unchecked, and the report says that no answer was re-checked.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { readActiveQuestions, readNdeVideoIds, selectAllKeyset, type Db } from '../lib/supabase';
import { CliError, ensureOutDir, helpText, isDirectRun, makeCtx, parseCli, runCli, str, type Ctx, type Deps, type OptDef } from './cli';
import { toCsv } from './csv';
import { VIEW_VIDEO_CHUNK, fetchStanceRuns } from './db';
import { findMergeConflicts, type MergeConflict } from '../job1/merge-conflicts';
import {
  HAIKU_EXTRA_HEADERS, TALLY_HEADERS, tallyByQuestion, type FinalRow, type QuestionMeta, type TallyRow,
} from './tally';
import {
  HAIKU_RESOLUTION_LABEL, HAIKU_SUFFIX, completeVideos, countCategories, fetchFirstPassAnswers, haikuCells, parseResolution,
  toFinalRows, type CategoryCounts,
} from './haiku';

const OPTIONS: Record<string, OptDef> = {
  'allow-partial': { type: 'boolean', help: 'tally even if some NDE videos have no stance rows yet (default: fail)' },
  resolution: { type: 'string', help: "full (default: bt_final_stances, needs the recheck/arbiter passes) | haiku-first-pass (Haiku answers only, NOT independently re-checked; files suffixed _haiku_only)" },
  'allow-pending': { type: 'boolean', help: 'tally even though pending_recheck/pending_arbiter cells exist (default: fail)' },
};

export interface RollupDeps extends Deps { findMergeConflicts?: (db: Db) => Promise<MergeConflict[]> }

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

function csvRows(rows: TallyRow[], warnings: string, extra: Record<string, unknown> = {}): Array<Record<string, unknown>> {
  const r1 = (x: number | null) => (x === null ? '' : Number(x.toFixed(2)));
  return rows.map((r) => {
    const o: Record<string, unknown> = { ...r, ...extra, warnings };
    for (const k of Object.keys(o)) if (/^(pct_|.*_ci_)/.test(k)) o[k] = r1(o[k] as number | null);
    return o;
  });
}

interface HaikuInput {
  nde: readonly string[];
  ndeSet: ReadonlySet<string>;
  personOf: ReadonlyMap<string, string>;
  qs: readonly QuestionMeta[];
  allowPartial: boolean;
  allowPending: boolean;
}

/** Plain statement repeated in the report; the CSVs carry the `resolution` column instead. */
export const HAIKU_NOTICE = 'Every answer in this tally is the unchecked first-pass answer of one model (Haiku). No answer was independently re-checked by a second model (no Sonnet re-check, no Opus arbiter). How reliable these answers are is measured only by the human-reviewed gold set: see gold_report_haiku_only.md for precision per stance, split by confidence band and by whether the answer would have been flagged for a re-check.';

export function haikuReport(a: {
  warningText: string; nVideos: number; nPersons: number; noTranscriptVideos: number; noTranscriptPersons: number;
  incomplete: number; counts: CategoryCounts; nCells: number;
}): string {
  return [
    '# Tally report (Haiku-only, unchecked)', '',
    `**${HAIKU_NOTICE}**`, '',
    `resolution = ${HAIKU_RESOLUTION_LABEL}`, '',
    a.warningText ? `**WARNING: incomplete data: ${a.warningText}**\n` : 'Complete: every NDE video with a transcript has a full first-pass row set.\n',
    `- NDE videos: ${a.nVideos}; persons: ${a.nPersons}`,
    `- videos recorded as having no transcript: ${a.noTranscriptVideos} (persons with no usable video: ${a.noTranscriptPersons})`,
    `- videos with an incomplete first pass: ${a.incomplete}`,
    `- first-pass cells read (latest row per video and question): ${a.nCells}`,
    `- counted (valid, and not_addressed or quote verified in the transcript): ${a.counts.counted}`,
    `- of the counted cells, would have been flagged for a re-check (no, mixed or confidence < 70) and were NOT re-checked: ${a.counts.counted_flagged}`,
    `- excluded, invalid (schema or coverage failure): ${a.counts.invalid}`,
    `- excluded, unverified_quote (a claim whose quote was not found in the transcript): ${a.counts.unverified_quote}`,
    '- *_cells columns count video-level answers; n_persons_* columns count persons; n_unchecked_flagged_cells and n_persons_with_unchecked_flagged show how much of each question rests on answers that would normally have been re-checked.', '',
  ].join('\n');
}

async function haikuRollup(ctx: Ctx, db: Db, i: HaikuInput): Promise<void> {
  const qIds = i.qs.map((q) => q.id);
  const cells = haikuCells(await fetchFirstPassAnswers(db, i.nde), qIds);
  const complete = completeVideos(cells, qIds);
  const stanceRuns = await fetchStanceRuns(db);
  const noTranscript = new Set(stanceRuns.filter((r) => r.status !== 'canceled').flatMap((r) => (r.params?.plan?.skippedNoTranscript as string[] | undefined) ?? []).filter((x) => i.ndeSet.has(x)));
  const notComplete = i.nde.filter((x) => !complete.has(x));
  const noTranscriptVideos = notComplete.filter((x) => noTranscript.has(x));
  const incomplete = notComplete.filter((x) => !noTranscript.has(x));
  const counts = countCategories(cells);
  ctx.log(`resolution: haiku-first-pass (Haiku answers only, NOT independently re-checked)`);
  ctx.log(`NDE videos: ${i.nde.length}; persons: ${new Set(i.personOf.values()).size}; first-pass cells read: ${cells.length}`);
  ctx.log(`cells: counted=${counts.counted} (of which would-have-been-flagged=${counts.counted_flagged}), excluded invalid=${counts.invalid}, excluded unverified_quote=${counts.unverified_quote}`);
  ctx.log(`videos without a complete first-pass row set: ${noTranscriptVideos.length} recorded as no-transcript, ${incomplete.length} incomplete (not yet run)`);
  if (i.allowPending) ctx.log('note: --allow-pending has no effect with --resolution haiku-first-pass (pending re-checks are expected)');
  if (incomplete.length && !i.allowPartial) {
    throw new CliError(`${incomplete.length} NDE videos lack a complete first-pass row set and are not recorded as lacking a transcript (run the first pass on all of them, or pass --allow-partial)`);
  }
  const warningText = incomplete.length ? `INCOMPLETE_COVERAGE videos=${incomplete.length}` : '';
  if (warningText) ctx.log(`WARNING: partial tally (${warningText})`);

  const rows = toFinalRows(cells);
  const noTranscriptPersons = noTranscriptPersonCount(new Map(i.nde.map((x) => [x, i.personOf.get(x)!])), noTranscript);
  const person = tallyByQuestion(rows, i.personOf, i.qs, { noTranscriptPersons });
  const perVideo = tallyByQuestion(rows, new Map(rows.map((r) => [r.video_id, r.video_id])), i.qs, { noTranscriptPersons: noTranscript.size });
  const dir = ensureOutDir(ctx);
  const warnHeader = warningText ? 'WARNING_incomplete_data' : 'warnings';
  const headers = [...TALLY_HEADERS, ...HAIKU_EXTRA_HEADERS, 'resolution', warnHeader];
  const out = (rs: TallyRow[]) => csvRows(rs, warningText, { resolution: HAIKU_RESOLUTION_LABEL }).map((r) => ({ ...r, [warnHeader]: r.warnings }));
  writeFileSync(path.join(dir, `tally_by_question${HAIKU_SUFFIX}.csv`), toCsv(headers, out(person)));
  writeFileSync(path.join(dir, `tally_by_question_sensitivity_per_video${HAIKU_SUFFIX}.csv`), toCsv(headers, out(perVideo)));
  writeFileSync(path.join(dir, `tally_report${HAIKU_SUFFIX}.md`), haikuReport({
    warningText, nVideos: i.nde.length, nPersons: new Set(i.personOf.values()).size, noTranscriptVideos: noTranscriptVideos.length,
    noTranscriptPersons, incomplete: incomplete.length, counts, nCells: cells.length,
  }));
  ctx.log(`wrote out/tally_by_question${HAIKU_SUFFIX}.csv, out/tally_by_question_sensitivity_per_video${HAIKU_SUFFIX}.csv and out/tally_report${HAIKU_SUFFIX}.md (${i.qs.length} questions)`);
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
  const conflicts = await (deps.findMergeConflicts ?? findMergeConflicts)(db);
  if (conflicts.length) {
    throw new CliError(`${conflicts.length} merge conflict(s) in Job 1 decisions (e.g. component ${conflicts[0].component}: ${conflicts[0].conflicting.length} keep_separate decision(s) inside a merged group); resolve them before tallying.`);
  }
  const map = await selectAllKeyset<{ video_id: string; person_key: string }>(db, 'bt_effective_person_map', 'video_id, person_key', 'video_id');
  const personOf = new Map(map.map((m) => [m.video_id, m.person_key]));
  const missingMap = nde.filter((id) => !personOf.has(id));
  if (missingMap.length) throw new CliError(`${missingMap.length} NDE videos missing from bt_effective_person_map`);

  const resolution = parseResolution(str(v.resolution));
  const qs: QuestionMeta[] = (await readActiveQuestions(db)).map((q) => ({
    id: q.id, category: q.category, consumer_question: q.consumer_question ?? q.question,
  }));
  if (resolution === 'haiku-first-pass') {
    await haikuRollup(ctx, db, { nde, ndeSet, personOf, qs, allowPartial: v['allow-partial'] === true, allowPending: v['allow-pending'] === true });
    return;
  }

  // bt_final_stances is read per chunk of <= 200 videos so the filter is applied inside the view.
  const rows: FinalRow[] = [];
  for (let i = 0; i < nde.length; i += VIEW_VIDEO_CHUNK) {
    const chunk = nde.slice(i, i + VIEW_VIDEO_CHUNK);
    rows.push(...(await selectAllKeyset<FinalRow & Record<string, unknown>>(
      db, 'bt_final_stances', 'first_answer_id, video_id, question_id, stance, status', 'first_answer_id', (q) => q.in('video_id', chunk),
    )));
  }

  const stanceRuns = await fetchStanceRuns(db);
  const noTranscript = new Set(stanceRuns.filter((r) => r.status !== 'canceled').flatMap((r) => (r.params?.plan?.skippedNoTranscript as string[] | undefined) ?? []).filter((x) => ndeSet.has(x)));
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
