/**
 * Job 1, step 4: LLM judging of candidate pairs (Message Batches API, paid).
 *
 *   --stage haiku   one request per candidate without a Haiku judgment
 *   --stage sonnet  one request per candidate whose Haiku verdict is same/unsure and that has no
 *                   Sonnet judgment; Sonnet is blind to Haiku (same input, no verdict shown)
 *
 * Spend gate: `--estimate` prints requests / tokens / cost and records a bt_runs row with status
 * 'estimated'; `--confirm-spend <run_id>` submits exactly those requests. `--resume <run_id>`
 * collects the results of an already submitted run (no new spend). The Sonnet stage needs its
 * own estimate after Haiku has finished.
 *
 * Decisions (only INSERTs into bt_merge_decisions; a candidate that already has any decision,
 * human included, is never touched): Haiku different -> keep_separate (auto:haiku); Haiku same
 * and Sonnet same -> merge (auto:haiku+sonnet); anything else -> no row (goes to the review CSV).
 */
import { readFileSync } from 'fs';
import path from 'path';
import { messageText } from '../lib/batch';
import { MODELS } from '../lib/cost';
import { loadPrompt, PROMPTS_DIR } from '../lib/prompts';
import { btInsert, selectAll } from '../lib/supabase';
import { resumeRun, submitRun, usageSummary, type CollectedRow } from './batch-run';
import { CliError, finishRun, type RunRow, getRun, helpText, intOpt, isDirectRun, makeCtx, newRunId, parseCli, readOrEmpty, runCli, startRun, str, type Ctx, type Deps, type OptDef } from './cli';
import { ensurePrompt } from './data';
import { decideFromVerdicts, type Verdict } from './logic';
import { parseModelJson, type JsonSchema } from './schema';
import { assertDigestMatches, assertResumable, estimateSpend, loadRunForConfirm, printEstimate, requestDigest, sdkTokenCounter, type EstItem, type TokenCounter } from './spend';
import { buildParams, type Effort } from '../lib/batch';

const SCRIPT = 'job1/judge-pairs.ts';
export const PROMPT_NAME = 'pair-judge-v1';
export const MAX_TOKENS = 2048;
/** ~1-3 sentences of reason + verdict JSON; deliberately generous. Worst case is also printed. */
export const EXPECTED_OUTPUT_TOKENS = 120;
export const OUTPUT_ASSUMPTION = 'assumes ~120 output tokens per response (verdict + 1-3 sentence reason, no extended thinking)';

const OPTIONS: Record<string, OptDef> = {
  stage: { type: 'string', help: 'haiku | sonnet (default haiku)' },
  estimate: { type: 'boolean', help: 'count tokens (free), print the estimate, record a run with status "estimated"; no spend' },
  'confirm-spend': { type: 'string', help: 'run_id of an estimated run; submits exactly its requests (spends money)' },
  resume: { type: 'string', help: 'run_id of a submitted run: collect its results (no new spend)' },
  effort: { type: 'string', help: 'low|medium|high|xhigh|max (default medium)' },
  limit: { type: 'string', help: 'only judge the first N candidates by id (trial runs)' },
  'sample-size': { type: 'string', help: 'force a stratified token-count sample of this size (min 50) instead of counting all' },
  'max-attempts': { type: 'string', help: 'attempts for errored/expired requests (default 2)' },
  'dry-run': { type: 'boolean', help: 'offline: build requests and print counts; no API call, no DB write' },
};

export type Stage = 'haiku' | 'sonnet';

export interface CandidateRow { id: number; key_a: string; key_b: string; rule: string; features: Record<string, unknown> }
export interface JudgmentRow { id: number; candidate_id: number; judge: Stage; verdict: Verdict; reason: string | null; raw_response_id: number | null; run_id: string }
export interface DecisionRow { id: number; candidate_id: number; decision: string; decided_by: string }

export function loadPairPrompt(dir = PROMPTS_DIR) {
  const prompt = loadPrompt(PROMPT_NAME, dir);
  const schema = JSON.parse(readFileSync(path.join(dir, `${PROMPT_NAME}.schema.json`), 'utf8')) as JsonSchema;
  const parts = prompt.text.split('{{PAIR_JSON}}');
  if (parts.length !== 2) throw new Error('pair-judge prompt must contain exactly one {{PAIR_JSON}} placeholder');
  return { prompt, schema, system: parts[0].trimEnd() };
}

/** Latest (highest id) judgment per candidate and judge. */
export function latestJudgments(js: JudgmentRow[]): Map<number, Partial<Record<Stage, JudgmentRow>>> {
  const out = new Map<number, Partial<Record<Stage, JudgmentRow>>>();
  for (const j of [...js].sort((a, b) => a.id - b.id)) {
    const cur = out.get(j.candidate_id) ?? {};
    cur[j.judge] = j;
    out.set(j.candidate_id, cur);
  }
  return out;
}

/** Candidates that still need a judgment at this stage, ordered by id. */
export function candidatesForStage(stage: Stage, cands: CandidateRow[], latest: Map<number, Partial<Record<Stage, JudgmentRow>>>, limit?: number): CandidateRow[] {
  const todo = cands
    .filter((c) => {
      const l = latest.get(c.id) ?? {};
      if (stage === 'haiku') return !l.haiku;
      return !l.sonnet && !!l.haiku && l.haiku.verdict !== 'different';
    })
    .sort((a, b) => a.id - b.id);
  return limit ? todo.slice(0, limit) : todo;
}

export function buildJudgeItems(cands: CandidateRow[], stage: Stage, effort: Effort, system: string, schema: JsonSchema): EstItem[] {
  return cands.map((c) => {
    const input = c.features.pair_input;
    if (!input) throw new CliError(`candidate ${c.id} has no features.pair_input; re-run find-pairs`);
    return {
      key: `c${c.id}`,
      params: buildParams({
        model: MODELS[stage], system, user: JSON.stringify(input, null, 2), maxTokens: MAX_TOKENS, effort, schema,
        cacheSystem: false, // system prompt is far below the minimum cacheable length
      }),
    };
  });
}

export interface AutoDecision { candidate_id: number; decision: 'merge' | 'keep_separate'; decided_by: string }

/** Auto decisions for candidates that have no decision row yet. Pure. */
export function computeAutoDecisions(cands: CandidateRow[], latest: Map<number, Partial<Record<Stage, JudgmentRow>>>, decided: Set<number>): { rows: AutoDecision[]; counts: Record<string, number> } {
  const rows: AutoDecision[] = [];
  const counts: Record<string, number> = { auto_merge: 0, auto_keep_separate: 0, review: 0, awaiting_sonnet: 0, awaiting_haiku: 0, already_decided: 0 };
  for (const c of cands) {
    if (decided.has(c.id)) { counts.already_decided++; continue; }
    const l = latest.get(c.id) ?? {};
    const o = decideFromVerdicts(l.haiku?.verdict, l.sonnet?.verdict);
    counts[o.status]++;
    if (o.decision) rows.push({ candidate_id: c.id, decision: o.decision, decided_by: o.decidedBy });
  }
  return { rows, counts };
}

async function readAll(ctx: Ctx) {
  const { db, log } = ctx;
  const miss = (t: string) => () => log(`note: ${t} not found (migration not applied); treating as empty`);
  const cands = await readOrEmpty(() => selectAll<CandidateRow>(db, 'bt_merge_candidates', 'id, key_a, key_b, rule, features', { orderBy: 'id' }), miss('bt_merge_candidates'));
  const judgments = await readOrEmpty(() => selectAll<JudgmentRow>(db, 'bt_merge_judgments', 'id, candidate_id, judge, verdict, reason, raw_response_id, run_id', { orderBy: 'id' }), miss('bt_merge_judgments'));
  const decisions = await readOrEmpty(() => selectAll<DecisionRow>(db, 'bt_merge_decisions', 'id, candidate_id, decision, decided_by', { orderBy: 'id' }), miss('bt_merge_decisions'));
  return { cands, judgments, decisions };
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const parsed = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (parsed.help) return ctx.log(helpText(SCRIPT, 'Haiku -> Sonnet pair judging via the Batch API, behind a mandatory spend gate.', OPTIONS));
  const v = parsed.values;
  const stage = (str(v.stage) ?? 'haiku') as Stage;
  if (stage !== 'haiku' && stage !== 'sonnet') throw new CliError('--stage must be haiku or sonnet');
  const effort = (str(v.effort) ?? 'medium') as Effort;
  if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) throw new CliError('--effort must be low|medium|high|xhigh|max');
  const limit = intOpt(v.limit, 'limit');
  const maxAttempts = intOpt(v['max-attempts'], 'max-attempts') ?? 2;
  if (maxAttempts < 1 || maxAttempts > 3) throw new CliError('--max-attempts must be 1..3');
  const modes = [v.estimate === true, !!str(v['confirm-spend']), !!str(v.resume), v['dry-run'] === true].filter(Boolean).length;
  if (modes === 0) throw new CliError('refusing to run: choose --dry-run, --estimate, --confirm-spend <run_id> or --resume <run_id> (no paid call is made without a confirmed estimate)');
  if (modes > 1) throw new CliError('choose only one of --dry-run, --estimate, --confirm-spend, --resume');
  const model = MODELS[stage];
  const expect = { job: 'pair_judge', pass: stage, model };
  const { log, db } = ctx;
  const { prompt, schema, system } = loadPairPrompt();

  // Spend gate first: nothing below this block runs for a bad --confirm-spend.
  let confirmRun: RunRow | null = null;
  if (str(v['confirm-spend'])) confirmRun = await loadRunForConfirm(db, str(v['confirm-spend']), expect);

  const { cands, judgments } = await readAll(ctx);
  const latest = latestJudgments(judgments);

  if (v['dry-run'] === true) {
    const todo = candidatesForStage(stage, cands, latest, limit);
    const items = buildJudgeItems(todo, stage, effort, system, schema);
    const chars = items.reduce((n, it) => n + JSON.stringify(it.params).length, 0);
    log(`dry-run (${stage}): candidates ${cands.length}; requests that would be built: ${items.length}; ~${Math.round(chars / 4)} input tokens by a chars/4 heuristic (use --estimate for exact counts)`);
    return;
  }

  if (str(v.resume)) {
    const run = assertResumable(await getRun(db, str(v.resume)!), str(v.resume)!, expect);
    const handler = makeHandler(ctx, run.id, stage, model, await ensurePrompt(db, prompt, schema), schema, judgments);
    const out = await resumeRun({ ctx, client: ctx.makeClient(), runId: run.id, model, pass: stage, batchIds: run.batch_ids, onCollected: handler.onCollected });
    return finish(ctx, run.id, stage, out, handler.stats, maxAttempts);
  }

  if (confirmRun) {
    const ids = (confirmRun.params.candidate_ids ?? []) as number[];
    const wanted = new Set(ids);
    const picked = cands.filter((c) => wanted.has(c.id)).sort((a, b) => a.id - b.id);
    if (picked.length !== ids.length) throw new CliError('some estimated candidates no longer exist');
    const items = buildJudgeItems(picked, stage, ((confirmRun.effort ?? effort) as Effort), system, schema);
    assertDigestMatches(confirmRun, requestDigest(items));
    const promptHash = await ensurePrompt(db, prompt, schema);
    const handler = makeHandler(ctx, confirmRun.id, stage, model, promptHash, schema, judgments);
    log(`confirmed spend for run ${confirmRun.id}: ${items.length} requests, estimated ${JSON.stringify({ cost_usd: confirmRun.estimate?.cost_usd })}`);
    const out = await submitRun({ ctx, client: ctx.makeClient(), runId: confirmRun.id, model, pass: stage, items, maxAttempts, onCollected: handler.onCollected });
    return finish(ctx, confirmRun.id, stage, out, handler.stats, maxAttempts);
  }

  // --estimate
  if (stage === 'sonnet') {
    const missing = cands.filter((c) => !latest.get(c.id)?.haiku).length;
    if (missing > 0) throw new CliError(`${missing} candidate(s) have no Haiku judgment yet; finish the haiku stage first`);
  }
  const todo = candidatesForStage(stage, cands, latest, limit);
  if (todo.length === 0) return log(`nothing to judge at stage ${stage}`);
  const items = buildJudgeItems(todo, stage, effort, system, schema);
  const client = ctx.makeClient();
  const counter: TokenCounter = sdkTokenCounter(client);
  const est = await estimateSpend({
    model, effort, items, counter, expectedOutputTokens: EXPECTED_OUTPUT_TOKENS, outputAssumption: OUTPUT_ASSUMPTION,
    maxTokens: MAX_TOKENS, sampleSize: intOpt(v['sample-size'], 'sample-size'), forceSample: v['sample-size'] !== undefined,
  });
  const runId = newRunId(stage === 'haiku' ? 'j1h' : 'j1s', ctx.now());
  await startRun(db, {
    id: runId, job: 'pair_judge', pass: stage, model, effort, status: 'estimated',
    params: { stage, prompt: PROMPT_NAME, candidate_ids: todo.map((c) => c.id), limit: limit ?? null },
    estimate: { ...est }, script: SCRIPT,
  });
  printEstimate(log, runId, est);
}

function makeHandler(ctx: Ctx, runId: string, stage: Stage, model: string, promptHash: string, schema: JsonSchema, existing: JudgmentRow[]) {
  const doneRaw = new Set(existing.filter((j) => j.run_id === runId).map((j) => j.raw_response_id));
  const stats = { judged: 0, invalid: 0, not_succeeded: 0, truncated: 0, verdicts: { same: 0, different: 0, unsure: 0 } as Record<string, number> };
  return {
    stats,
    onCollected: async (rows: CollectedRow[]) => {
      const out: Array<Record<string, unknown>> = [];
      for (const r of rows) {
        if (doneRaw.has(r.rawId)) continue;
        if (r.kind !== 'succeeded' || !r.message) { stats.not_succeeded++; continue; }
        if (r.message.stop_reason === 'max_tokens') { stats.truncated++; stats.invalid++; continue; }
        const p = parseModelJson<{ verdict: Verdict; reason: string }>(messageText(r.message), schema);
        if (!p.ok) { stats.invalid++; continue; }
        const cid = Number(/^c(\d+)$/.exec(r.key)?.[1]);
        if (!Number.isInteger(cid)) throw new Error(`unexpected request key "${r.key}"`);
        out.push({
          candidate_id: cid, judge: stage, verdict: p.value.verdict, reason: p.value.reason, model,
          model_version: r.message.model, prompt_hash: promptHash, run_id: runId, raw_response_id: r.rawId,
        });
        stats.judged++;
        stats.verdicts[p.value.verdict]++;
        doneRaw.add(r.rawId);
      }
      await btInsert(ctx.db, 'bt_merge_judgments', out, { validateRefs: false });
    },
  };
}

async function finish(ctx: Ctx, runId: string, stage: Stage, out: Awaited<ReturnType<typeof submitRun>>, stats: ReturnType<typeof makeHandler>['stats'], _maxAttempts: number) {
  const { log, db } = ctx;
  const usage = usageSummary(out.usage);
  log(`run ${runId}: judged ${stats.judged}, invalid ${stats.invalid} (truncated ${stats.truncated}), not succeeded ${stats.not_succeeded}, unresolved after retries ${out.unresolved.length}`);
  log(`verdicts: ${JSON.stringify(stats.verdicts)}`);
  log(`actual usage: ${JSON.stringify(usage)}`);
  const { cands, judgments, decisions } = await readAll(ctx);
  const auto = computeAutoDecisions(cands, latestJudgments(judgments), new Set(decisions.map((d) => d.candidate_id)));
  await btInsert(db, 'bt_merge_decisions', auto.rows.map((r) => ({ ...r })), { validateRefs: false });
  log(`auto decisions written: ${auto.rows.length}; status counts ${JSON.stringify(auto.counts)}`);
  await finishRun(db, runId, 'completed', { ...usage, stage, ...stats, unresolved: out.unresolved.length }, ctx.now());
}

if (isDirectRun('judge-pairs')) runCli(main);
