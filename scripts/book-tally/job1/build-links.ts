/**
 * Job 1, step 2: video -> person links. No API calls.
 *
 *  - profile_video_ids links for NDE videos (auto-accepted, decided_by auto:profile_video_ids)
 *  - for NDE videos in no profile's video_ids whose experiencerFullName matches exactly one
 *    profile: exact_key equal -> exact_name_match link, auto-accepted (auto:exact_name);
 *    core_key equal -> link left pending (human decides); >1 profile -> not linked (listed in
 *    out/build_links_report.json and in the link review CSV)
 *  - baseline links for every unlinked NDE video: named:<exact_key> or anon:<videoId>
 *    (auto-accepted, auto:baseline; lowest precedence in bt_effective_person_map)
 *
 * Idempotent: only links / decisions that do not exist yet are inserted.
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { btInsert, selectAll } from '../lib/supabase';
import { CliError, finishRun, isDirectRun, helpText, makeCtx, newRunId, parseCli, readOrEmpty, runCli, startRun, type Deps, type OptDef } from './cli';
import { loadWorld } from './data';
import { planLinks, type PlannedLink } from './logic';

const SCRIPT = 'job1/build-links.ts';
const OPTIONS: Record<string, OptDef> = {
  'dry-run': { type: 'boolean', help: 'read-only: print counts, write nothing (no bt_runs row, no files)' },
};

export const linkKey = (l: { video_id: string; person_key: string; source: string }) => `${l.video_id}\u0000${l.person_key}\u0000${l.source}`;

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const parsed = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (parsed.help) return ctx.log(helpText(SCRIPT, 'Builds video->person links and name-match proposals (no API calls).', OPTIONS));
  const dry = parsed.values['dry-run'] === true;
  const { db, log } = ctx;

  const world = await loadWorld(db);
  const plan = planLinks(world);
  const namedSizes = new Map<string, number>();
  for (const l of plan.links) if (l.person_key.startsWith('named:')) namedSizes.set(l.person_key, (namedSizes.get(l.person_key) ?? 0) + 1);
  const sizes = [...namedSizes.values()];
  const named = {
    named_persons: sizes.length,
    named_persons_with_5plus_videos: sizes.filter((s) => s >= 5).length,
    named_person_max_videos: sizes.length ? Math.max(...sizes) : 0,
  };

  const existingLinks = await readOrEmpty(
    () => selectAll<{ id: number; video_id: string; person_key: string; source: string }>(db, 'bt_person_links', 'id, video_id, person_key, source', { orderBy: 'id' }),
    () => log('note: bt_person_links not found (migration not applied); treating as empty'),
  );
  const existingDecisions = await readOrEmpty(
    () => selectAll<{ id: number; link_id: number }>(db, 'bt_link_decisions', 'id, link_id', { orderBy: 'id' }),
    () => log('note: bt_link_decisions not found; treating as empty'),
  );
  const have = new Map(existingLinks.map((l) => [linkKey(l), l.id]));
  const decided = new Set(existingDecisions.map((d) => d.link_id));
  const newLinks = plan.links.filter((l) => !have.has(linkKey(l)));
  const bySource = (ls: PlannedLink[]) => {
    const c: Record<string, number> = {};
    for (const l of ls) c[`${l.source}/${l.match_level}`] = (c[`${l.source}/${l.match_level}`] ?? 0) + 1;
    return c;
  };

  log('plan: ' + JSON.stringify(plan.stats));
  log('named persons (baseline): ' + JSON.stringify(named));
  log(`planned links: ${plan.links.length} ${JSON.stringify(bySource(plan.links))}`);
  log(`already in bt_person_links: ${plan.links.length - newLinks.length}; to insert: ${newLinks.length} ${JSON.stringify(bySource(newLinks))}`);
  log(`ambiguous name matches (not linked): ${plan.ambiguous.length}`);
  log(`unnamed unlinked NDE videos (name-extraction targets): ${plan.anonVideoIds.length}`);
  if (dry) return log('dry-run: nothing written');

  const runId = newRunId('j1l', ctx.now());
  await startRun(db, { id: runId, job: 'other', params: { script: 'build-links', stats: plan.stats, named, ambiguous: plan.ambiguous.length }, script: SCRIPT });
  try {
    const rows = newLinks.map((l) => ({
      video_id: l.video_id, person_key: l.person_key, profile_id: l.profile_id, source: l.source,
      match_level: l.match_level, evidence: l.evidence, run_id: runId,
    }));
    const inserted = await btInsert(db, 'bt_person_links', rows, { select: 'id, video_id, person_key, source' });
    for (const r of inserted) have.set(linkKey(r as { video_id: string; person_key: string; source: string }), r.id as number);

    const decisions: Array<{ link_id: number; decision: 'accept'; decided_by: string }> = [];
    for (const l of plan.links) {
      const id = have.get(linkKey(l));
      if (id === undefined) throw new CliError(`internal: no link id for planned link (${l.source})`);
      if (l.autoAcceptBy && !decided.has(id)) decisions.push({ link_id: id, decision: 'accept', decided_by: l.autoAcceptBy });
    }
    await btInsert(db, 'bt_link_decisions', decisions, { validateRefs: false });
    log(`inserted links: ${inserted.length}; auto-accept decisions: ${decisions.length}`);

    const report = {
      run_id: runId, stats: plan.stats, named,
      ambiguous: plan.ambiguous,
      pending_core_links: plan.links.filter((l) => !l.autoAcceptBy).length,
    };
    mkdirSync(ctx.outDir, { recursive: true });
    writeFileSync(path.join(ctx.outDir, 'build_links_report.json'), JSON.stringify(report, null, 2));
    await finishRun(db, runId, 'completed', undefined, ctx.now());
    log(`run ${runId} completed`);
  } catch (e) {
    await finishRun(db, runId, 'failed', undefined, ctx.now()).catch(() => undefined);
    throw e;
  }
}

if (isDirectRun('build-links')) runCli(main);
