/**
 * Job 1, step 6b: ingest the human's marked review CSV.
 *
 *   dedup_review_pairs.csv / dedup_auto_merges.csv  -> bt_merge_decisions (merge | keep_separate)
 *   link_proposals_review.csv / name_extractions_review.csv -> bt_link_decisions (accept | reject)
 *
 * decided_by is always 'human'. The whole file is validated first (ids exist, cross-check
 * columns agree, only the allowed words) and refused as a whole if anything is off. Only INSERTs;
 * a later row supersedes an earlier decision, so corrections are re-imports. Re-importing the
 * same file inserts nothing. A link sheet is also refused when applying it would leave any NDE
 * video it touches without an accepted link (the resulting map is simulated first). Rows marked
 * 'n/a' (no link row exists) are skipped.
 */
import { readFileSync } from 'fs';
import { btInsert, readNdeVideoIds, selectAll } from '../lib/supabase';
import { CliError, finishRun, helpText, isDirectRun, makeCtx, newRunId, parseCli, runCli, startRun, str, type Deps, type OptDef } from './cli';
import { parseDecisionSheet, planImport, unmappedAfter, type KnownTarget, type LatestDecision, type LinkLite } from './sheets';

const SCRIPT = 'job1/import-decisions.ts';
const OPTIONS: Record<string, OptDef> = {
  file: { type: 'string', help: 'path of the marked review CSV (required)' },
  'dry-run': { type: 'boolean', help: 'validate and print counts; write nothing' },
};

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const parsed = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (parsed.help) return ctx.log(helpText(SCRIPT, 'Imports human decisions from a marked review CSV.', OPTIONS));
  const file = str(parsed.values.file);
  if (!file) throw new CliError('--file <csv> is required');
  const dry = parsed.values['dry-run'] === true;
  const { db, log } = ctx;

  const sheet = parseDecisionSheet(readFileSync(file, 'utf8'));
  const known = new Map<number, KnownTarget>();
  const allLinks: LinkLite[] = [];
  const latest = new Map<number, LatestDecision>();
  if (sheet.kind === 'merge') {
    for (const c of await selectAll<{ id: number; key_a: string; key_b: string }>(db, 'bt_merge_candidates', 'id, key_a, key_b', { orderBy: 'id' })) known.set(c.id, { keyA: c.key_a, keyB: c.key_b });
    for (const d of await selectAll<{ id: number; candidate_id: number; decision: string; decided_by: string }>(db, 'bt_merge_decisions', 'id, candidate_id, decision, decided_by', { orderBy: 'id' })) latest.set(d.candidate_id, d);
  } else {
    for (const l of await selectAll<{ id: number; video_id: string }>(db, 'bt_person_links', 'id, video_id', { orderBy: 'id' })) {
      known.set(l.id, { videoId: l.video_id });
      allLinks.push(l);
    }
    for (const d of await selectAll<{ id: number; link_id: number; decision: string; decided_by: string }>(db, 'bt_link_decisions', 'id, link_id, decision, decided_by', { orderBy: 'id' })) latest.set(d.link_id, d);
  }
  const plan = planImport(sheet, known, latest);
  if (plan.problems.length) throw new CliError(`refusing to import (${plan.problems.length} problem(s)):\n  ${plan.problems.slice(0, 50).join('\n  ')}`);
  if (sheet.kind === 'link' && plan.insert.length > 0) {
    // Simulate the resulting map: no NDE video touched by this file may be left without an accepted link.
    const nde = new Set(await readNdeVideoIds(db));
    const scope = new Set(plan.insert.map((r) => known.get(r.id)!.videoId!).filter((v) => nde.has(v)));
    const unmapped = unmappedAfter(allLinks, new Map([...latest].map(([id, d]) => [id, d.decision])), plan.insert.map((r) => ({ id: r.id, decision: r.decision })), scope);
    if (unmapped.length) {
      throw new CliError(`refusing to import: applying this file would leave ${unmapped.length} NDE video(s) with no accepted link (e.g. ${unmapped.slice(0, 5).join(', ')}). Accept another link for each, or drop the reject.`);
    }
  }
  const counts: Record<string, number> = {};
  for (const r of plan.insert) counts[r.decision] = (counts[r.decision] ?? 0) + 1;
  log(`sheet type: ${sheet.kind}; marked rows: ${sheet.rows.length}; blank (undecided): ${sheet.blank}; already imported: ${plan.skippedSame}; to insert: ${plan.insert.length} ${JSON.stringify(counts)}`);
  if (dry) return log('dry-run: nothing written');

  const runId = newRunId('j1i', ctx.now());
  await startRun(db, { id: runId, job: 'other', params: { script: 'import-decisions', kind: sheet.kind, inserted: plan.insert.length, skipped_same: plan.skippedSame }, script: SCRIPT });
  try {
    const rows = plan.insert.map((r) => (sheet.kind === 'merge'
      ? { candidate_id: r.id, decision: r.decision, decided_by: 'human', note: r.note }
      : { link_id: r.id, decision: r.decision, decided_by: 'human', note: r.note }));
    await btInsert(db, sheet.kind === 'merge' ? 'bt_merge_decisions' : 'bt_link_decisions', rows, { validateRefs: false });
    await finishRun(db, runId, 'completed', undefined, ctx.now());
    log(`inserted ${rows.length} decision(s); run ${runId} completed`);
  } catch (e) {
    await finishRun(db, runId, 'failed', undefined, ctx.now()).catch(() => undefined);
    throw e;
  }
}

if (isDirectRun('import-decisions')) runCli(main);
