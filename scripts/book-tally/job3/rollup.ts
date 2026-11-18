/**
 * Job 3 rollup: person-level tallies of the codebook coding (no API calls, no spend, writes only files).
 *
 * Reads every bt_coded_answers row of the completed codebook runs coded with the CURRENT prompt
 * (or only --run <id>), the Job 1 person map, and writes to out/:
 *   coded_tally_by_item.csv          one row per (item, group, answer), people as the unit
 *   coded_tally_per_video.csv        the same with each video counted separately (sensitivity)
 *   coded_tally_report.md            a readable summary per question
 * Refuses, like the Job 2 rollup, when an NDE video has no accepted person link or Job 1 has a
 * merge conflict, and (unless --allow-partial) when some NDE videos with a transcript are not yet coded.
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { readNdeVideoIds, selectAll, selectAllKeyset, type Db } from '../lib/supabase';
import { CliError, helpText, isDirectRun, makeCtx, parseCli, runCli, str, type Deps, type OptDef } from '../job1/cli';
import { findMergeConflicts, type MergeConflict } from '../job1/merge-conflicts';
import { toCsv } from '../job2/csv';
import { loadCodebookPrompt, type Codebook } from './codebook';
import { RUN_KIND } from './run-codebook';
import { tallyAll, tallyCsvRows, TALLY_HEADERS, type ItemTally, type TallyInputRow, type TallyResult } from './tally';

const OPTIONS: Record<string, OptDef> = {
  run: { type: 'string', help: 'tally only this codebook run (default: every completed codebook run with the current prompt)' },
  'allow-partial': { type: 'boolean', help: 'tally even though some NDE videos are not coded yet (the report says so)' },
};

export interface RollupDeps extends Deps { findMergeConflicts?: (db: Db) => Promise<MergeConflict[]> }

export const NOTICE =
  'Coded by one model (Claude Haiku) reading each full transcript, unchecked by a second model. Every counted answer has a quote ' +
  'that was found word for word in the transcript; answers whose quote was not found are left out and counted as excluded. ' +
  'Accuracy evidence comes from the owner-reviewed gold set, not from this tally.';

const pct = (x: number | null) => (x === null ? 'n/a' : `${(100 * x).toFixed(1)}%`);
const ci = (lo: number | null, hi: number | null) => (lo === null || hi === null ? '' : ` (95% CI ${(100 * lo).toFixed(1)}–${(100 * hi).toFixed(1)}%)`);

export function reportMarkdown(cb: Codebook, res: TallyResult, meta: { runs: string[]; partialVideos: number; nde: number }): string {
  const byKey = new Map([...cb.facts, ...cb.items].map((i) => [i.key, i]));
  const lines: string[] = [
    `# Codebook tally (${cb.version})`, '', NOTICE, '',
    `Runs: ${meta.runs.join(', ')}. NDE videos: ${meta.nde}; coded: ${res.n_videos_coded}; people (Job 1 person map): ${res.n_people}.`,
    ...(meta.partialVideos ? ['', `**PARTIAL:** ${meta.partialVideos} NDE videos with a transcript are not coded yet. Do not publish these figures.`] : []),
    '',
    'How to read: "addressed" is the share of people who speak to the question, out of those whose answer counted or who did not address it ',
    '(people whose only answer was excluded are listed separately). Answer shares are out of the people who addressed it. For multiple-choice ',
    'questions one person can give several answers, so the shares can add up to more than 100%.',
    '',
  ];
  const section = (t: ItemTally) => {
    const it = byKey.get(t.item_key)!;
    const head = it.question_id ? `Q${it.question_id}${it.part ? it.part : ''}` : it.key.toUpperCase();
    lines.push(`## ${head}${t.group === 'all' ? '' : ` — among people with ${t.group}`}: ${it.ask}`);
    if (it.question && it.question !== it.ask) lines.push('', `Question as asked on the site: ${it.question}`);
    lines.push('',
      `Addressed by **${t.n_addressed}** of ${t.n_addressed + t.n_not_addressed} people: **${pct(t.addressed.p)}**${ci(t.addressed.lo, t.addressed.hi)}. ` +
      `Excluded: ${t.n_excluded_unverified} (quote not found), ${t.n_excluded_invalid} (invalid answer).`, '',
      '| Answer | People | Share of those who addressed it |', '|---|---|---|',
      ...t.answers.map((a) => `| ${a.label} | ${a.share.k} | ${pct(a.share.p)}${ci(a.share.lo, a.share.hi)} |`), '');
    if (it.type === 'mc') lines.push('_Several answers per person: shares can add up to more than 100%._', '');
  };
  lines.push('# Facts about each account', '');
  for (const t of res.tallies.filter((x) => x.item_key.startsWith('f'))) section(t);
  lines.push('# Questions', '');
  for (const t of res.tallies.filter((x) => x.item_key.startsWith('q'))) section(t);
  for (const [from, to] of Object.entries(cb.merged)) lines.push(`_${from.toUpperCase()} is merged into ${to.toUpperCase()}._`);
  return lines.join('\n') + '\n';
}

export async function main(argv: string[], deps: RollupDeps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) return ctx.log(helpText('job3/rollup.ts', 'person-level codebook tallies (files only, no spend)', OPTIONS));
  const { db } = ctx;
  const cp = loadCodebookPrompt();

  const runs = (await selectAll<{ id: string; status: string; params: Record<string, unknown> }>(db, 'bt_runs', 'id, status, params', {
    orderBy: 'id', filter: (q) => q.eq('job', 'other'),
  })).filter((r) => r.params?.kind === RUN_KIND && r.params?.prompt_hash === cp.promptHash && (str(v.run) ? r.id === str(v.run) : true));
  if (str(v.run) && runs.length === 0) throw new CliError(`no codebook run ${str(v.run)} with the current prompt`);
  const notDone = runs.filter((r) => r.status !== 'completed' && r.status !== 'canceled');
  if (notDone.length) throw new CliError(`codebook run(s) not finished: ${notDone.map((r) => `${r.id} (${r.status})`).join(', ')}; collect them first (--resume)`);
  const done = runs.filter((r) => r.status === 'completed');
  if (done.length === 0) throw new CliError('no completed codebook run with the current prompt');

  const nde = await readNdeVideoIds(db);
  const unmapped = await selectAllKeyset<{ video_id: string }>(db, 'bt_unmapped_nde_videos', 'video_id', 'video_id');
  if (unmapped.length) throw new CliError(`${unmapped.length} NDE videos have no accepted person link (bt_unmapped_nde_videos is not empty); finish Job 1 first`);
  const conflicts = await (deps.findMergeConflicts ?? findMergeConflicts)(db);
  if (conflicts.length) throw new CliError(`${conflicts.length} merge conflict(s) in Job 1 decisions; resolve them before tallying`);
  const map = await selectAllKeyset<{ video_id: string; person_key: string }>(db, 'bt_effective_person_map', 'video_id, person_key', 'video_id');
  const ndeSet = new Set(nde);
  const personOf = new Map(map.filter((m) => ndeSet.has(m.video_id)).map((m) => [m.video_id, m.person_key]));

  const rows: TallyInputRow[] = [];
  for (const r of done) {
    // a loop, not push(...rows): one run has ~535k rows, more than a spread call can take
    const got = await selectAllKeyset<TallyInputRow & Record<string, unknown>>(
      db, 'bt_coded_answers', 'id, video_id, item_key, kind, attempt, addressed, stance, quote_verified, choices, valid', 'id', (q) => q.eq('run_id', r.id),
    );
    for (const x of got) rows.push(x);
  }
  const codedVideos = new Set(rows.map((r) => r.video_id));
  const noTranscript = new Set(done.flatMap((r) => (r.params?.no_transcript_ids as string[] | undefined) ?? []));
  const uncoded = nde.filter((id) => !codedVideos.has(id) && !noTranscript.has(id));
  ctx.log(`runs: ${done.map((r) => r.id).join(', ')}; rows: ${rows.length}; NDE videos coded: ${codedVideos.size} of ${nde.length}`);
  if (uncoded.length && v['allow-partial'] !== true) {
    throw new CliError(`${uncoded.length} NDE videos are not coded yet (run the full pass, or pass --allow-partial for a clearly marked partial tally)`);
  }

  const res = tallyAll(cp.codebook, rows, personOf, 'person');
  const perVideo = tallyAll(cp.codebook, rows, personOf, 'video');
  const dir = ctx.outDir;
  mkdirSync(dir, { recursive: true });
  const suffix = uncoded.length ? '_PARTIAL' : '';
  writeFileSync(path.join(dir, `coded_tally_by_item${suffix}.csv`), toCsv(TALLY_HEADERS, tallyCsvRows(cp.codebook, res)));
  writeFileSync(path.join(dir, `coded_tally_per_video${suffix}.csv`), toCsv(TALLY_HEADERS, tallyCsvRows(cp.codebook, perVideo)));
  writeFileSync(path.join(dir, `coded_tally_report${suffix}.md`), reportMarkdown(cp.codebook, res, { runs: done.map((r) => r.id), partialVideos: uncoded.length, nde: nde.length }));
  ctx.log(`wrote coded_tally_by_item${suffix}.csv, coded_tally_per_video${suffix}.csv and coded_tally_report${suffix}.md (${res.n_people} people, ${res.n_videos_coded} videos)`);
}

if (isDirectRun('rollup')) runCli((argv) => main(argv));
