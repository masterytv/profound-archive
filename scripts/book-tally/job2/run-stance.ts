/**
 * Job 2 stance tally runner.
 *
 *   --pilot | --gold | --full      which request set (pilot: Haiku AND Sonnet, pass 'pilot')
 *   --pass first|recheck|arbiter   which pass (ignored for --pilot)
 *   --estimate                     no spend: build exact requests, count tokens (free endpoint),
 *                                  print cost, record bt_runs rows with status 'estimated'
 *   --dry-run                      like --estimate but offline: char-based token approximation,
 *                                  no API call, no database write
 *   --confirm-spend <group>        submit exactly what that estimate covered (resumes if batch
 *                                  ids were already recorded; settles lost submissions first)
 *   --resolution haiku-first-pass  Haiku-only scope (budget decision). With --gold: the gold videos are
 *                                  the pilot-disjoint seeded sample; normally every one already has a
 *                                  complete first-pass row set, so NOTHING is spent. Any that lack one get
 *                                  only the Haiku first pass, through the normal estimate/confirm gate.
 *                                  Never plans or runs recheck/arbiter.
 *   --i-understand-this-is-the-expensive-pass
 *                                  required in addition to --confirm-spend for a full-corpus
 *                                  recheck/arbiter group (Sonnet/Opus). The pilot's Sonnet arm is unaffected.
 * Nothing is submitted without --confirm-spend matching an estimate whose request digest still
 * equals the rebuilt requests.
 */
import { projectFullCost } from './estimate';
import { CliError, helpText, intOpt, isDirectRun, makeCtx, numOpt, parseCli, runCli, str, type Deps, type OptDef } from './cli';
import { EXPENSIVE_FLAG, cancelEstimate, executeGroup, runEstimate, voidPendingMarker, type Group } from './execute';
import { assumptionFrom, loadPilot } from './pilot-data';
import { parseResolution } from './haiku';
import { kindOf, loadQuestions, makeHaikuGoldPlan, makePlan, type Mode, type PassOpt } from './plan';
import { DEFAULT_EFFORT, DEFAULT_MAX_TOKENS, loadStancePrompts } from './requests';
import type { Effort } from '../lib/batch';

export const OPTIONS: Record<string, OptDef> = {
  pilot: { type: 'boolean', help: 'pilot: 100 seeded videos, Haiku and Sonnet independently, all questions' },
  gold: { type: 'boolean', help: 'gold set: 25 seeded videos disjoint from the pilot, full pipeline (with --resolution haiku-first-pass: Haiku first pass only, usually no spend)' },
  full: { type: 'boolean', help: 'all NDE videos not already completed for the pass' },
  pass: { type: 'string', help: 'first (default) | recheck | arbiter' },
  resolution: { type: 'string', help: 'full (default) | haiku-first-pass: Haiku-only scope; with --gold needs no recheck/arbiter and usually no spend' },
  [EXPENSIVE_FLAG]: { type: 'boolean', help: 'required with --confirm-spend for a full-corpus recheck/arbiter group (the expensive Sonnet/Opus passes)' },
  estimate: { type: 'boolean', help: 'print the cost estimate and record it; spends nothing' },
  'dry-run': { type: 'boolean', help: 'offline estimate (no API call, no DB write)' },
  'confirm-spend': { type: 'string', help: 'group id printed by --estimate; required to submit' },
  seed: { type: 'string', help: 'sampling seed (default 20261118)' },
  'pilot-n': { type: 'string', help: 'pilot size (default 100)' },
  'gold-n': { type: 'string', help: 'gold size (default 25)' },
  'effort-haiku': { type: 'string', help: 'low|medium|high|xhigh|max (default medium)' },
  'effort-sonnet': { type: 'string', help: 'default medium' },
  'effort-opus': { type: 'string', help: 'default high' },
  'max-tokens': { type: 'string', help: `max_tokens per request (default ${DEFAULT_MAX_TOKENS})` },
  'assumed-output-tokens': { type: 'string', help: 'output tokens (incl. thinking) per 81-question request (default: pilot actuals, else allowance + visible)' },
  'assumed-visible-per-question': { type: 'string', help: 'visible output tokens per answered question (default: pilot actuals, else 32/60/70)' },
  'adopt-batch': { type: 'string', help: 'with --confirm-spend: batch id to adopt for a run left in "submitting" after a lost create response' },
  'confirm-retries': { type: 'string', help: 'group id: allow retries beyond the approved ceiling' },
  'budget-usd': { type: 'string', help: 'with --estimate: cap the group\'s approved ceiling at this many USD, split across its runs (refused if below the first-attempt worst case); retries must fit under it' },
  'void-pending': { type: 'string', help: 'with --confirm-spend: pending marker (>= 30 min old) confirmed by a human to have produced no batch' },
  cancel: { type: 'string', help: 'group id of a never-submitted estimate to cancel' },
  'poll-seconds': { type: 'string', help: 'batch poll interval (default 30)' },
};

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
function effortOf(v: string | undefined, dflt: Effort, name: string): Effort {
  if (v === undefined) return dflt;
  if (!EFFORTS.includes(v)) throw new CliError(`--${name} must be one of ${EFFORTS.join(', ')}`);
  return v as Effort;
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('run-stance.ts', 'Job 2 stance runner', OPTIONS)); return; }

  const modes = (['pilot', 'gold', 'full'] as const).filter((m) => v[m] === true);
  if (modes.length > 1) throw new CliError('choose only one of --pilot, --gold, --full');
  const confirm = str(v['confirm-spend']);
  if (str(v.cancel)) { await cancelEstimate(ctx, str(v.cancel)!); return; }
  if (str(v['void-pending'])) {
    if (!confirm) throw new CliError('--void-pending requires --confirm-spend <group>');
    await voidPendingMarker(ctx, confirm, str(v['void-pending'])!);
    return;
  }
  if (str(v['adopt-batch']) && !confirm) throw new CliError('--adopt-batch requires --confirm-spend <group>');
  const estimating = v.estimate === true || v['dry-run'] === true;
  if (confirm && estimating) throw new CliError('--confirm-spend cannot be combined with --estimate / --dry-run');
  const passRaw = str(v.pass) ?? 'first';
  if (!['first', 'recheck', 'arbiter'].includes(passRaw)) throw new CliError('--pass must be first, recheck or arbiter');
  const pass = passRaw as PassOpt;
  const mode = modes[0] as Mode | undefined;
  let resolution;
  try { resolution = parseResolution(str(v.resolution)); } catch (e) { throw new CliError((e as Error).message); }
  const haiku = resolution === 'haiku-first-pass';
  if (haiku && pass !== 'first') throw new CliError('--resolution haiku-first-pass only ever runs the Haiku first pass; it cannot be combined with --pass recheck or --pass arbiter');
  const ack = v[EXPENSIVE_FLAG] === true;
  if (confirm && mode === 'full' && pass !== 'first' && !ack) {
    throw new CliError(`refusing to spend: --pass ${pass} --full is the expensive full-corpus pass; it needs --${EXPENSIVE_FLAG} in addition to --confirm-spend`);
  }

  if (confirm) {
    // Gate first: nothing below runs (no DB, no API client) unless the confirmation matches.
    await executeGroup(ctx, confirm, confirm, { mode, pass: v.pass ? pass : undefined }, { pollMs: (intOpt(v['poll-seconds'], 'poll-seconds') ?? 30) * 1000, adoptBatch: str(v['adopt-batch']), confirmRetries: str(v['confirm-retries']), expensiveAck: ack });
    return;
  }
  if (!estimating) {
    throw new CliError('refusing to spend: run with --estimate first, then re-run with --confirm-spend <group> (use --dry-run for an offline look)');
  }
  if (!mode) throw new CliError('choose one of --pilot, --gold, --full');

  const seed = intOpt(v.seed, 'seed') ?? 20261118;
  const db = ctx.getDb();
  const planReq = { mode, pass, seed, pilotN: intOpt(v['pilot-n'], 'pilot-n') ?? 100, goldN: intOpt(v['gold-n'], 'gold-n') ?? 25 };
  let made;
  if (haiku && mode === 'gold') {
    const hg = await makeHaikuGoldPlan(db, planReq);
    for (const n of hg.notes) ctx.log(`plan: ${n}`);
    if (!hg.plan) {
      ctx.log(`NO SPEND NEEDED: all ${hg.goldIds.length} gold videos already have a complete first-pass row set. Nothing was estimated, recorded or submitted. Build the sheet with gold-sheet.ts --resolution haiku-first-pass.`);
      return;
    }
    ctx.log(`${hg.todo.length} gold videos lack first-pass rows: only the Haiku first pass is planned for them (no recheck, no arbiter).`);
    made = { kind: kindOf(mode, pass), plan: hg.plan, notes: [] as string[] };
  } else {
    made = await makePlan(db, planReq, ctx.log);
  }
  const kind = kindOf(mode, pass);
  for (const n of made.notes) ctx.log(`plan: ${n}`);

  const pilot = await loadPilot(db).catch(() => null);
  const base = assumptionFrom(pilot, kind);
  const outOverride = intOpt(v['assumed-output-tokens'], 'assumed-output-tokens');
  const visOverride = numOpt(v['assumed-visible-per-question'], 'assumed-visible-per-question');
  const assumption = {
    ...base,
    ...(outOverride !== undefined ? { perVideoOverride: { haiku: outOverride, sonnet: outOverride } } : {}),
    ...(visOverride !== undefined ? { visiblePerQuestion: { pilot: visOverride, first: visOverride, recheck: visOverride, arbiter: visOverride } } : {}),
    source: outOverride !== undefined || visOverride !== undefined ? `command-line override (base: ${base.source})` : base.source,
  };
  const budgetUsd = numOpt(v['budget-usd'], 'budget-usd');
  if (budgetUsd !== undefined && !(budgetUsd > 0)) throw new CliError('--budget-usd must be a positive number of USD');
  const group: Group = {
    mode, pass, kind, seed,
    maxTokens: intOpt(v['max-tokens'], 'max-tokens') ?? DEFAULT_MAX_TOKENS,
    effort: {
      haiku: effortOf(str(v['effort-haiku']), DEFAULT_EFFORT.haiku, 'effort-haiku'),
      sonnet: effortOf(str(v['effort-sonnet']), DEFAULT_EFFORT.sonnet, 'effort-sonnet'),
      opus: effortOf(str(v['effort-opus']), DEFAULT_EFFORT.opus, 'effort-opus'),
    },
    plan: made.plan,
    ...(haiku && mode === 'gold' ? { resolution: 'haiku-first-pass' as const } : {}),
    ...(budgetUsd !== undefined ? { budgetUsd } : {}),
  };
  const questions = await loadQuestions(db);
  const res = await runEstimate(
    ctx,
    { group, options: { assumption, dryRun: v['dry-run'] === true } },
    loadStancePrompts(),
    questions,
  );

  if (mode === 'full' && pass === 'first') {
    if (!pilot) {
      ctx.log('PROJECTION: no completed pilot yet, so recheck/arbiter costs cannot be projected from actuals. Their estimates are produced after the previous pass completes.');
    } else {
      const proj = projectFullCost({
        nVideos: res.ests[0].estimate.requests,
        haikuPerVideo: [...pilot.usage.haiku.perVideo.values()],
        sonnetPerVideo: pilot.usage.sonnet.perVideo,
        flaggedByVideo: pilot.stats.flaggedByVideo,
        disputedByVideo: pilot.stats.disputedByVideo,
        pilotVideos: pilot.stats.videos,
        assumption,
      });
      ctx.log(`PROJECTION from pilot ${pilot.group} (first ${proj.firstUsd.toFixed(2)} + recheck ${proj.recheckUsd.toFixed(2)} + arbiter ${proj.arbiterUsd.toFixed(2)} = ${proj.totalUsd.toFixed(2)} USD); the recheck/arbiter estimates follow once the previous pass completes`);
    }
  }
}

if (isDirectRun('run-stance')) runCli((argv) => main(argv));
