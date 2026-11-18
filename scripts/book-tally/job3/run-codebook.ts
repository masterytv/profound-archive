/**
 * Job 3: codebook coding of NDE videos (Message Batches API, paid). One request per video codes
 * every fact and question of codebook-v1 (see codebook/codebook-v1.md); job3/validate.ts checks
 * each answer and every quote, and one bt_coded_answers row is stored per item.
 *
 * Spend gate (the same as Job 1): --estimate counts tokens with the free endpoint and records an
 * 'estimated' run, ideally with --budget-usd <cap>; nothing is sent until
 * --confirm-spend <run_id> names that run; --resume collects a submitted run without new spend.
 * Retries (truncated, expired, transient errors) run only while spent + their worst case stays
 * within the approved ceiling (the cap).
 *
 * Targets: every NDE video (nde_analysis.experience_type = 'nde'), or --sample N videos drawn with a
 * seeded shuffle (a cheap trial before the full run). Videos already coded with this exact prompt
 * and model are skipped. Transcripts are read from the DB and sent straight to the API; nothing
 * is printed.
 */
import { createHash } from 'crypto';
import { buildParams, MAX_ATTEMPTS, messageText, type Effort } from '../lib/batch';
import { MODELS } from '../lib/cost';
import { prepareTranscript } from '../lib/quote';
import { assertQuestionIdsExist, assertVideoIdsExist, btInsert, readNdeVideoIds, selectAll } from '../lib/supabase';
import { fetchTranscripts, type TranscriptSource } from '../lib/transcript';
import { approvedBudget, confirmGate, prepareResume, resumeRun, submitRun, usageSummary, voidPendingCommand, type CollectedRow } from '../job1/batch-run';
import { CliError, finishRun, getRun, helpText, intOpt, isDirectRun, makeCtx, newRunId, parseCli, readOrEmpty, runCli, startRun, str, usdOpt, type Ctx, type Deps, type OptDef } from '../job1/cli';
import { parseModelJson } from '../job1/schema';
import { assertDigestMatches, assertNoOverlappingRuns, assertNothingDoneSince, assertResumable, estimateSpend, printEstimate, requestDigest, sdkTokenCounter, type EstItem } from '../job1/spend';
import { seededShuffle } from '../job2/sampling';
import { allItems, CODEBOOK_VERSION, loadCodebookPrompt, type CodebookPrompt } from './codebook';
import { checkCodedResponse, type ModelEntry } from './validate';

const SCRIPT = 'job3/run-codebook.ts';
const MODEL = MODELS.haiku;
/** Room for adaptive thinking (billed as output) plus 89 answers; truncated responses retry at double. */
export const DEFAULT_MAX_TOKENS = 20_000;
/** Visible answer estimate (89 entries, quotes for the addressed ones); recalibrate from a trial's actual usage. Thinking is added from lib/cost.THINKING_ALLOWANCE. */
export const VISIBLE_TOKENS = 6_000;
export const SAMPLE_SALT = 'codebook-trial';
export const RUN_KIND = 'codebook';
/** Videos per insert statement: each video's rows go in one statement, so a video is all-or-nothing. */
const VIDEOS_PER_INSERT = 10;

const OPTIONS: Record<string, OptDef> = {
  estimate: { type: 'boolean', help: 'count tokens (free), print the estimate, record a run with status "estimated"; no spend' },
  'confirm-spend': { type: 'string', help: 'run_id of an estimated run; submits exactly its requests (spends money)' },
  resume: { type: 'string', help: 'run_id of a submitted run: collect its results (no new spend)' },
  sample: { type: 'string', help: 'with --estimate: code only N videos drawn by a seeded shuffle (a trial run)' },
  seed: { type: 'string', help: 'seed for --sample (default 20261118)' },
  effort: { type: 'string', help: 'low|medium|high|xhigh|max (default medium)' },
  'max-tokens': { type: 'string', help: `max_tokens per request (default ${DEFAULT_MAX_TOKENS})` },
  'max-attempts': { type: 'string', help: 'attempts per request incl. retries (default 3)' },
  'budget-usd': { type: 'string', help: 'with --estimate: cap the approved ceiling at this many USD (refused if below the first-attempt worst case)' },
  'confirm-retries': { type: 'string', help: 'run_id: allow retry batches beyond the approved ceiling for this run' },
  'void-pending': { type: 'string', help: 'with --resume: release an UNRESOLVED pending submission marker (>= 30 min old; never automatic)' },
  'adopt-batch': { type: 'string', help: 'with --resume: record this existing batch id for a run whose submission response was lost' },
  'dry-run': { type: 'boolean', help: 'offline: target counts and a chars/4 token guess; no API call, no DB write' },
};

interface Built {
  items: EstItem[];
  transcripts: Map<string, { text: string; source: TranscriptSource }>;
  missing: string[];
}

export async function buildItems(ctx: Ctx, cp: CodebookPrompt, videoIds: string[], effort: Effort, maxTokens: number): Promise<Built> {
  const items: EstItem[] = [];
  const transcripts = new Map<string, { text: string; source: TranscriptSource }>();
  const missing: string[] = [];
  for await (const page of fetchTranscripts(ctx.db, videoIds, { pageSize: 20 })) {
    for (const t of page.transcripts) {
      transcripts.set(t.videoId, { text: t.text, source: t.source });
      items.push({ key: t.videoId, params: buildParams({ model: MODEL, system: cp.system, user: t.text, maxTokens, effort, schema: cp.schema, cacheSystem: true }) });
    }
    missing.push(...page.missing);
  }
  items.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { items, transcripts, missing };
}

/** Marks a whole response that failed (bad JSON or schema); such a video stays eligible for a later run. */
export const REJECTED_PREFIX = 'response rejected:';

/** Short fingerprint of a transcript, stored at estimate time and checked again on resume. */
export function transcriptSha(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

/** Postgres text and jsonb reject NUL characters; a model quote could contain one. */
export function stripNul<T>(v: T): T {
  if (typeof v === 'string') return v.replace(/\u0000/g, '') as unknown as T;
  if (Array.isArray(v)) return v.map(stripNul) as unknown as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, stripNul(x)])) as T;
  return v;
}

/**
 * Videos already coded with this prompt and model. A video counts as coded once one of its responses
 * was stored (its f0 row is written in the same statement as the rest), unless that response was
 * rejected as a whole: those videos are coded again by a later run.
 */
export async function codedVideos(ctx: Ctx, promptHash: string): Promise<Set<string>> {
  const rows = await readOrEmpty(
    () => selectAll<{ video_id: string; valid: boolean; error: string | null }>(ctx.db, 'bt_coded_answers', 'id, video_id, valid, error', {
      orderBy: 'id', filter: (q) => q.eq('item_key', 'f0').eq('prompt_hash', promptHash).eq('model', MODEL),
    }),
    () => ctx.log('note: bt_coded_answers not found (migration 20261118_002 not applied yet); treating as empty'),
  );
  return new Set(rows.filter((r) => r.valid || !(r.error ?? '').startsWith(REJECTED_PREFIX)).map((r) => r.video_id));
}

async function ensurePromptRow(ctx: Ctx, cp: CodebookPrompt): Promise<void> {
  const { data, error } = await ctx.db.from('bt_prompts').select('prompt_hash').eq('prompt_hash', cp.promptHash);
  if (error) throw new Error(`read bt_prompts failed: ${error.message}`);
  if (!data || data.length === 0) await btInsert(ctx.db, 'bt_prompts', cp.row, { validateRefs: false });
}

export function codebookStatsZero() {
  return { responses: 0, rejected_responses: 0, rows: 0, invalid_rows: 0, addressed_rows: 0, unverified_quotes: 0, unknown_keys: 0, truncated: 0, not_succeeded: 0 };
}

export async function makeHandler(ctx: Ctx, runId: string, cp: CodebookPrompt, transcripts: Built['transcripts']) {
  const have = await readOrEmpty(
    () => selectAll<{ raw_response_id: number | null }>(ctx.db, 'bt_coded_answers', 'id, raw_response_id', {
      orderBy: 'id', filter: (q) => q.eq('run_id', runId).eq('item_key', 'f0'),
    }),
    () => undefined,
  );
  const doneRaw = new Set(have.map((r) => r.raw_response_id));
  const stats = codebookStatsZero();
  return {
    stats,
    onCollected: async (rows: CollectedRow[]) => {
      let buf: Array<Record<string, unknown>> = [];
      let videosInBuf = 0;
      const flush = async () => {
        if (buf.length) await btInsert(ctx.db, 'bt_coded_answers', buf, { validateRefs: false, chunkSize: buf.length });
        buf = []; videosInBuf = 0;
      };
      for (const r of rows) {
        if (doneRaw.has(r.rawId)) continue;
        if (r.kind === 'truncated') { stats.truncated++; continue; } // the driver retries it with a larger max_tokens
        if (r.kind !== 'succeeded' || !r.message) { stats.not_succeeded++; continue; }
        const t = transcripts.get(r.key);
        if (!t) throw new Error(`no transcript loaded for ${r.key}`);
        const parsed = parseModelJson<{ items: ModelEntry[] }>(messageText(r.message), cp.schema);
        const checked = checkCodedResponse(parsed, cp.codebook, prepareTranscript(t.text));
        stats.responses++;
        if (!parsed.ok) stats.rejected_responses++;
        stats.unknown_keys += checked.unknownKeys.length;
        for (const c of checked.rows) {
          stats.rows++;
          if (!c.valid) stats.invalid_rows++;
          if (c.addressed) stats.addressed_rows++;
          if (c.addressed && !c.quote_verified) stats.unverified_quotes++;
          buf.push(stripNul({
            run_id: runId, video_id: r.key, item_key: c.item_key, question_id: c.question_id, kind: c.kind, attempt: r.attempt,
            addressed: c.addressed, stance: c.stance, quote: c.quote, quote_verified: c.quote_verified, quote_norm_offset: c.quote_norm_offset,
            choices: c.choices, confidence: c.confidence, transcript_source: t.source, model: MODEL, model_version: r.message.model,
            prompt_hash: cp.promptHash, codebook_version: CODEBOOK_VERSION, raw_response_id: r.rawId, valid: c.valid,
            error: [c.error, checked.unknownKeys.length && c.item_key === 'f0' ? `unknown keys ignored: ${checked.unknownKeys.join(',')}` : null].filter(Boolean).join('; ') || null,
          }));
        }
        doneRaw.add(r.rawId);
        if (++videosInBuf >= VIDEOS_PER_INSERT) await flush();
      }
      await flush();
    },
  };
}

/** Quotes are checked against the transcript read now; refuse if it is not the text that was sent. */
export function assertTranscriptsUnchanged(stored: Record<string, string> | undefined, now: Built['transcripts']): void {
  if (!stored) return; // runs estimated before fingerprints were recorded
  const changed = Object.entries(stored).filter(([id, sha]) => now.get(id) === undefined || transcriptSha(now.get(id)!.text) !== sha).map(([id]) => id);
  if (changed.length) {
    throw new CliError(`${changed.length} transcript(s) changed or disappeared since this run was estimated (e.g. ${changed.slice(0, 3).join(', ')}); quotes cannot be checked against the text that was sent. Ask the owner how to proceed.`);
  }
}

function parseEffort(v: string | undefined): Effort {
  const e = (v ?? 'medium') as Effort;
  if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(e)) throw new CliError('--effort must be low|medium|high|xhigh|max');
  return e;
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const parsed = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (parsed.help) return ctx.log(helpText(SCRIPT, 'Codebook coding of NDE videos via the Batch API, behind a mandatory spend gate.', OPTIONS));
  const v = parsed.values;
  const effort = parseEffort(str(v.effort));
  const maxTokens = intOpt(v['max-tokens'], 'max-tokens') ?? DEFAULT_MAX_TOKENS;
  const maxAttempts = intOpt(v['max-attempts'], 'max-attempts') ?? MAX_ATTEMPTS;
  if (maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) throw new CliError(`--max-attempts must be 1..${MAX_ATTEMPTS}`);
  if ((str(v['adopt-batch']) || str(v['void-pending'])) && !str(v.resume)) throw new CliError('--adopt-batch and --void-pending require --resume <run_id>');
  if (str(v['adopt-batch']) && str(v['void-pending'])) throw new CliError('choose only one of --adopt-batch and --void-pending');
  const modes = [v.estimate === true, !!str(v['confirm-spend']), !!str(v.resume), v['dry-run'] === true].filter(Boolean).length;
  if (modes === 0) throw new CliError('refusing to run: choose --dry-run, --estimate, --confirm-spend <run_id> or --resume <run_id> (no paid call is made without a confirmed estimate)');
  if (modes > 1) throw new CliError('choose only one of --dry-run, --estimate, --confirm-spend, --resume');
  if (str(v.sample) && v.estimate !== true && v['dry-run'] !== true) throw new CliError('--sample is chosen at --estimate (or --dry-run) time');
  const expect = { job: 'other', pass: 'haiku', model: MODEL };
  const { db, log } = ctx;
  const cp = loadCodebookPrompt();
  const checkKind = (run: { id: string; params: Record<string, unknown> }) => {
    if (run.params.kind !== RUN_KIND) throw new CliError(`run ${run.id} is not a codebook run`);
    if (run.params.prompt_hash !== cp.promptHash) throw new CliError(`run ${run.id} was estimated with a different prompt or codebook (hash ${String(run.params.prompt_hash).slice(0, 12)}, now ${cp.promptHash.slice(0, 12)}); re-estimate`);
  };

  // Spend gate first: nothing below runs for a bad --confirm-spend.
  const confirmRun = str(v['confirm-spend']) ? await confirmGate(ctx, str(v['confirm-spend']), expect) : null;

  if (str(v.resume)) {
    const run = assertResumable(await getRun(db, str(v.resume)!), str(v.resume)!, expect);
    checkKind(run);
    const ids = (run.params.video_ids ?? []) as string[];
    const built = await buildItems(ctx, cp, ids, (run.effort ?? effort) as Effort, Number(run.params.max_tokens ?? maxTokens));
    assertTranscriptsUnchanged(run.params.transcript_sha as Record<string, string> | undefined, built.transcripts);
    await ensurePromptRow(ctx, cp);
    const handler = await makeHandler(ctx, run.id, cp, built.transcripts);
    const client = ctx.makeClient();
    if (str(v['void-pending'])) return voidPendingCommand(ctx, client, run.id, str(v['void-pending'])!);
    const batchIds = await prepareResume(ctx, client, run.id, str(v['adopt-batch']));
    const out = await resumeRun({ ctx, client, runId: run.id, model: MODEL, pass: 'haiku', batchIds, onCollected: handler.onCollected });
    return finish(ctx, run.id, out, handler.stats);
  }

  if (confirmRun) {
    checkKind(confirmRun);
    const ids = (confirmRun.params.video_ids ?? []) as string[];
    const done = await codedVideos(ctx, cp.promptHash);
    assertNothingDoneSince(ids.filter((id) => done.has(id)), 'videos (codebook coding)');
    await assertNoOverlappingRuns(db, confirmRun, 'video_ids');
    await assertVideoIdsExist(db, ids);
    const built = await buildItems(ctx, cp, ids, (confirmRun.effort ?? effort) as Effort, Number(confirmRun.params.max_tokens));
    assertDigestMatches(confirmRun, requestDigest(built.items));
    await ensurePromptRow(ctx, cp);
    const handler = await makeHandler(ctx, confirmRun.id, cp, built.transcripts);
    log(`confirmed spend for run ${confirmRun.id}: ${built.items.length} requests, estimated cost_usd ${String(confirmRun.estimate?.cost_usd)}`);
    const budget = approvedBudget(confirmRun);
    log(`approved ceiling ${budget.ceilingUsd}; up to ${budget.maxAttempts} attempt(s) per request`);
    const out = await submitRun({
      ctx, client: ctx.makeClient(), runId: confirmRun.id, model: MODEL, pass: 'haiku', items: built.items, maxAttempts: budget.maxAttempts,
      ceilingUsd: budget.ceilingUsd, perKeyInputTokens: budget.perKeyInputTokens, confirmRetries: str(v['confirm-retries']) === confirmRun.id,
      onCollected: handler.onCollected,
    });
    return finish(ctx, confirmRun.id, out, handler.stats);
  }

  // --dry-run and --estimate
  const nde = await readNdeVideoIds(db);
  const done = await codedVideos(ctx, cp.promptHash);
  const sampleN = intOpt(v.sample, 'sample');
  const seed = intOpt(v.seed, 'seed') ?? 20261118;
  let targets = nde.filter((id) => !done.has(id));
  if (sampleN !== undefined) targets = seededShuffle(targets, seed, SAMPLE_SALT).slice(0, sampleN);
  log(`codebook ${cp.codebook.version}: ${allItems(cp.codebook).length} items (${cp.codebook.facts.length} facts, ${cp.codebook.items.length} question parts); prompt ${cp.promptHash.slice(0, 12)}`);
  log(`targets: ${nde.length} NDE videos; already coded with this prompt and model: ${done.size}; this run: ${targets.length}${sampleN !== undefined ? ` (seeded sample, seed ${seed})` : ''}`);
  const built = await buildItems(ctx, cp, targets, effort, maxTokens);
  log(`requests built: ${built.items.length}; videos without a usable transcript: ${built.missing.length}`);
  if (v['dry-run'] === true) {
    const chars = built.items.reduce((n, it) => n + JSON.stringify(it.params).length, 0);
    return log(`dry-run: ~${Math.round(chars / 4)} input tokens by a chars/4 heuristic (use --estimate for exact counts); nothing written`);
  }
  if (built.items.length === 0) return log('nothing to code');
  await assertVideoIdsExist(db, built.items.map((i) => i.key));
  await assertQuestionIdsExist(db, [...new Set(cp.codebook.items.map((i) => i.question_id!))]);

  const client = ctx.makeClient();
  const est = await estimateSpend({
    model: MODEL, effort, items: built.items, counter: sdkTokenCounter(client), visibleTokensPerRequest: VISIBLE_TOKENS,
    maxTokens, maxAttempts, budgetUsd: usdOpt(v['budget-usd'], 'budget-usd'),
  });
  const runId = newRunId('j3c', ctx.now());
  await startRun(db, {
    id: runId, job: 'other', pass: 'haiku', model: MODEL, effort, status: 'estimated',
    params: {
      kind: RUN_KIND, codebook_version: cp.codebook.version, prompt: cp.prompt.name, prompt_hash: cp.promptHash,
      video_ids: built.items.map((i) => i.key), missing_transcripts: built.missing.length, no_transcript_ids: [...built.missing].sort(),
      sample: sampleN ?? null, seed: sampleN !== undefined ? seed : null, max_tokens: maxTokens, max_attempts: maxAttempts,
      transcript_sha: Object.fromEntries([...built.transcripts].map(([id, t]) => [id, transcriptSha(t.text)])),
    },
    estimate: { ...est }, script: SCRIPT,
  });
  printEstimate(log, runId, est);
}

async function finish(ctx: Ctx, runId: string, out: Awaited<ReturnType<typeof submitRun>>, stats: ReturnType<typeof codebookStatsZero>) {
  const usage = usageSummary(out.usage);
  ctx.log(`run ${runId}: ${JSON.stringify(stats)}; unresolved after retries ${out.unresolved.length}`);
  ctx.log(`actual usage: ${JSON.stringify(usage)}`);
  await finishRun(ctx.db, runId, 'completed', { ...usage, ...stats, unresolved: out.unresolved.length }, ctx.now());
}

if (isDirectRun('run-codebook')) runCli(main);
