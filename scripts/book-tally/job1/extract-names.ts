/**
 * Job 1, step 5: self-stated names for unnamed, unlinked NDE videos (Message Batches API, paid).
 *
 * Targets are the videos build-links leaves as anon:<videoId> (no usable experiencerFullName,
 * in no profile). Haiku returns a name only if the speaker states their own name, with the
 * verbatim quote. Code then checks (1) the quote verifies against the transcript (lib/quote)
 * and (2) the name's normalized tokens occur inside the normalized quote. Everything is stored
 * in bt_name_extractions; verified multi-token names become PENDING bt_person_links
 * (source transcript_self_name) for human review. A first-name-only result is stored but never
 * creates or joins a named:* key (the video stays anon:<videoId>).
 *
 * Same spend gate as judge-pairs: --estimate, then --confirm-spend <run_id>; --resume collects.
 * Transcripts are read from the DB and sent straight to the API; nothing is printed.
 */
import { buildParams, messageText, type Effort } from '../lib/batch';
import { MODELS } from '../lib/cost';
import { computePromptHash, loadPrompt, PROMPTS_DIR } from '../lib/prompts';
import { prepareTranscript, verifyQuote } from '../lib/quote';
import { btInsert, selectAll } from '../lib/supabase';
import { fetchTranscripts, type TranscriptSource } from '../lib/transcript';
import { readFileSync } from 'fs';
import path from 'path';
import { resumeRun, submitRun, usageSummary, type CollectedRow } from './batch-run';
import { CliError, finishRun, getRun, helpText, intOpt, isDirectRun, makeCtx, newRunId, parseCli, readOrEmpty, runCli, startRun, str, type Ctx, type Deps, type OptDef } from './cli';
import { ensurePrompt, loadProfiles, loadWorld } from './data';
import { classifySelfName, indexProfiles, nameInQuote, planLinks, type ProfileRow } from './logic';
import { parseModelJson, type JsonSchema } from './schema';
import { assertDigestMatches, assertResumable, estimateSpend, loadRunForConfirm, printEstimate, requestDigest, sdkTokenCounter, type EstItem } from './spend';

const SCRIPT = 'job1/extract-names.ts';
export const PROMPT_NAME = 'name-extract-v1';
export const MAX_TOKENS = 1024;
export const EXPECTED_OUTPUT_TOKENS = 80;
export const OUTPUT_ASSUMPTION = 'assumes ~80 output tokens per response (name + quote JSON, or nulls), no extended thinking';
const MODEL = MODELS.haiku;

const OPTIONS: Record<string, OptDef> = {
  estimate: { type: 'boolean', help: 'count tokens (free), print the estimate, record a run with status "estimated"; no spend' },
  'confirm-spend': { type: 'string', help: 'run_id of an estimated run; submits exactly its requests (spends money)' },
  resume: { type: 'string', help: 'run_id of a submitted run: collect its results (no new spend)' },
  effort: { type: 'string', help: 'low|medium|high|xhigh|max (default medium)' },
  limit: { type: 'string', help: 'only the first N target videos (trial runs)' },
  'sample-size': { type: 'string', help: 'force a stratified token-count sample of this size (min 50) instead of counting all' },
  'max-attempts': { type: 'string', help: 'attempts for errored/expired requests (default 2)' },
  'dry-run': { type: 'boolean', help: 'offline: list target counts and transcript availability; no API call, no DB write' },
};

export function loadNamePrompt(dir = PROMPTS_DIR) {
  const prompt = loadPrompt(PROMPT_NAME, dir);
  const schema = JSON.parse(readFileSync(path.join(dir, `${PROMPT_NAME}.schema.json`), 'utf8')) as JsonSchema;
  return { prompt, schema, promptHash: computePromptHash({ templateBytes: prompt.bytes, outputSchema: schema }) };
}

export interface ExtractionRow {
  id: number; run_id: string; video_id: string; name: string | null; quote: string | null;
  quote_verified: boolean; name_in_quote: boolean; valid: boolean; prompt_hash: string; model: string;
}

/** Result of checking one model answer against its transcript. Pure. */
export interface Checked {
  valid: boolean;
  error: string | null;
  name: string | null;
  quote: string | null;
  quote_verified: boolean;
  name_in_quote: boolean;
  quote_norm_offset: number | null;
}

export function checkExtraction(
  answer: { name: string | null; quote: string | null },
  transcript: string | { normalized: string },
): Checked {
  const bad = (error: string): Checked => ({ valid: false, error, name: null, quote: null, quote_verified: false, name_in_quote: false, quote_norm_offset: null });
  const name = answer.name?.trim() ? answer.name.trim() : null;
  if (answer.name !== null && name === null) return bad('empty name');
  if (name === null) {
    if (answer.quote !== null && answer.quote.trim() !== '') return bad('quote without name');
    return { valid: true, error: null, name: null, quote: null, quote_verified: false, name_in_quote: false, quote_norm_offset: null };
  }
  if (answer.quote === null || answer.quote.trim() === '') return bad('name without quote');
  const v = verifyQuote(answer.quote, transcript);
  return {
    valid: true, error: v.verified ? null : `quote not verified: ${v.reason}`, name, quote: answer.quote,
    quote_verified: v.verified, name_in_quote: nameInQuote(name, answer.quote), quote_norm_offset: v.offset,
  };
}

export interface NameItems {
  items: EstItem[];
  transcripts: Map<string, { text: string; source: TranscriptSource }>;
  missing: string[];
}

export async function buildNameItems(ctx: Ctx, videoIds: string[], effort: Effort): Promise<NameItems> {
  const { prompt, schema } = loadNamePrompt();
  const items: EstItem[] = [];
  const transcripts = new Map<string, { text: string; source: TranscriptSource }>();
  const missing: string[] = [];
  for await (const page of fetchTranscripts(ctx.db, videoIds, { pageSize: 20 })) {
    for (const t of page.transcripts) {
      transcripts.set(t.videoId, { text: t.text, source: t.source });
      items.push({
        key: t.videoId,
        params: buildParams({ model: MODEL, system: prompt.text, user: t.text, maxTokens: MAX_TOKENS, effort, schema, cacheSystem: false }),
      });
    }
    missing.push(...page.missing);
  }
  items.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { items, transcripts, missing };
}

async function readExtractions(ctx: Ctx): Promise<ExtractionRow[]> {
  return readOrEmpty(
    () => selectAll<ExtractionRow>(ctx.db, 'bt_name_extractions', 'id, run_id, video_id, name, quote, quote_verified, name_in_quote, valid, prompt_hash, model', { orderBy: 'id' }),
    () => ctx.log('note: bt_name_extractions not found (migration not applied); treating as empty'),
  );
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const parsed = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (parsed.help) return ctx.log(helpText(SCRIPT, 'Self-stated name extraction for unnamed NDE videos via the Batch API, behind a mandatory spend gate.', OPTIONS));
  const v = parsed.values;
  const effort = (str(v.effort) ?? 'medium') as Effort;
  if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) throw new CliError('--effort must be low|medium|high|xhigh|max');
  const limit = intOpt(v.limit, 'limit');
  const maxAttempts = intOpt(v['max-attempts'], 'max-attempts') ?? 2;
  if (maxAttempts < 1 || maxAttempts > 3) throw new CliError('--max-attempts must be 1..3');
  const modes = [v.estimate === true, !!str(v['confirm-spend']), !!str(v.resume), v['dry-run'] === true].filter(Boolean).length;
  if (modes === 0) throw new CliError('refusing to run: choose --dry-run, --estimate, --confirm-spend <run_id> or --resume <run_id> (no paid call is made without a confirmed estimate)');
  if (modes > 1) throw new CliError('choose only one of --dry-run, --estimate, --confirm-spend, --resume');
  const expect = { job: 'name_extract', pass: 'haiku', model: MODEL };
  const { db, log } = ctx;
  const { prompt, schema, promptHash } = loadNamePrompt();

  // Spend gate first: nothing below runs for a bad --confirm-spend.
  const confirmRun = str(v['confirm-spend']) ? await loadRunForConfirm(db, str(v['confirm-spend']), expect) : null;

  if (str(v.resume)) {
    const run = assertResumable(await getRun(db, str(v.resume)!), str(v.resume)!, expect);
    const ids = (run.params.video_ids ?? []) as string[];
    const built = await buildNameItems(ctx, ids, (run.effort ?? effort) as Effort);
    const handler = await makeHandler(ctx, run.id, await ensurePrompt(db, prompt, schema), built.transcripts);
    const out = await resumeRun({ ctx, client: ctx.makeClient(), runId: run.id, model: MODEL, pass: 'haiku', batchIds: run.batch_ids, onCollected: handler.onCollected });
    return finish(ctx, run.id, out, handler.stats);
  }

  if (confirmRun) {
    const ids = (confirmRun.params.video_ids ?? []) as string[];
    const built = await buildNameItems(ctx, ids, (confirmRun.effort ?? effort) as Effort);
    assertDigestMatches(confirmRun, requestDigest(built.items));
    const handler = await makeHandler(ctx, confirmRun.id, await ensurePrompt(db, prompt, schema), built.transcripts);
    log(`confirmed spend for run ${confirmRun.id}: ${built.items.length} requests, estimated cost_usd ${String(confirmRun.estimate?.cost_usd)}`);
    const out = await submitRun({ ctx, client: ctx.makeClient(), runId: confirmRun.id, model: MODEL, pass: 'haiku', items: built.items, maxAttempts, onCollected: handler.onCollected });
    return finish(ctx, confirmRun.id, out, handler.stats);
  }

  // --dry-run and --estimate: find targets
  const world = await loadWorld(db);
  const plan = planLinks(world);
  const done = new Set((await readExtractions(ctx)).filter((e) => e.valid && e.prompt_hash === promptHash && e.model === MODEL).map((e) => e.video_id));
  let targets = plan.anonVideoIds.filter((id) => !done.has(id));
  if (limit) targets = targets.slice(0, limit);
  log(`targets: ${plan.anonVideoIds.length} unnamed unlinked NDE videos; already extracted with this prompt+model: ${plan.anonVideoIds.length - plan.anonVideoIds.filter((id) => !done.has(id)).length}; to extract: ${targets.length}`);
  log(`  of which no experiencerFullName: ${plan.stats.baseline_anon_no_name}; placeholder/single-token name: ${plan.stats.baseline_anon_unusable_name}`);
  const built = await buildNameItems(ctx, targets, effort);
  log(`requests built: ${built.items.length}; videos without a usable transcript: ${built.missing.length}`);
  if (v['dry-run'] === true) {
    const chars = built.items.reduce((n, it) => n + JSON.stringify(it.params).length, 0);
    return log(`dry-run: ~${Math.round(chars / 4)} input tokens by a chars/4 heuristic (use --estimate for exact counts); nothing written`);
  }
  if (built.items.length === 0) return log('nothing to extract');

  const client = ctx.makeClient();
  const est = await estimateSpend({
    model: MODEL, effort, items: built.items, counter: sdkTokenCounter(client), expectedOutputTokens: EXPECTED_OUTPUT_TOKENS,
    outputAssumption: OUTPUT_ASSUMPTION, maxTokens: MAX_TOKENS, sampleSize: intOpt(v['sample-size'], 'sample-size'), forceSample: v['sample-size'] !== undefined,
  });
  const runId = newRunId('j1n', ctx.now());
  await startRun(db, {
    id: runId, job: 'name_extract', pass: 'haiku', model: MODEL, effort, status: 'estimated',
    params: { prompt: PROMPT_NAME, video_ids: built.items.map((i) => i.key), missing_transcripts: built.missing.length, limit: limit ?? null },
    estimate: { ...est }, script: SCRIPT,
  });
  printEstimate(log, runId, est);
}

async function makeHandler(ctx: Ctx, runId: string, promptHash: string, transcripts: NameItems['transcripts']) {
  const { schema } = loadNamePrompt();
  const have = await readOrEmpty(
    () => selectAll<{ raw_response_id: number | null }>(ctx.db, 'bt_name_extractions', 'id, raw_response_id', { orderBy: 'id', filter: (q) => q.eq('run_id', runId) }),
    () => undefined,
  );
  const doneRaw = new Set(have.map((r) => r.raw_response_id));
  const stats = { stored: 0, invalid: 0, truncated: 0, not_succeeded: 0, no_name: 0, name_returned: 0, quote_verified: 0, name_in_quote: 0, fully_verified: 0 };
  return {
    stats,
    onCollected: async (rows: CollectedRow[]) => {
      const out: Array<Record<string, unknown>> = [];
      for (const r of rows) {
        if (doneRaw.has(r.rawId)) continue;
        if (r.kind !== 'succeeded' || !r.message) { stats.not_succeeded++; continue; }
        const t = transcripts.get(r.key);
        if (!t) throw new Error(`no transcript loaded for ${r.key}`);
        let c: Checked;
        if (r.message.stop_reason === 'max_tokens') {
          stats.truncated++;
          c = { valid: false, error: 'truncated at max_tokens', name: null, quote: null, quote_verified: false, name_in_quote: false, quote_norm_offset: null };
        } else {
          const p = parseModelJson<{ name: string | null; quote: string | null }>(messageText(r.message), schema);
          c = p.ok ? checkExtraction(p.value, prepareTranscript(t.text)) : { valid: false, error: p.error, name: null, quote: null, quote_verified: false, name_in_quote: false, quote_norm_offset: null };
        }
        if (!c.valid) stats.invalid++;
        else if (c.name === null) stats.no_name++;
        else {
          stats.name_returned++;
          if (c.quote_verified) stats.quote_verified++;
          if (c.name_in_quote) stats.name_in_quote++;
          if (c.quote_verified && c.name_in_quote) stats.fully_verified++;
        }
        out.push({
          run_id: runId, video_id: r.key, name: c.name, quote: c.quote, quote_verified: c.quote_verified, name_in_quote: c.name_in_quote,
          quote_norm_offset: c.quote_norm_offset, transcript_source: t.source, model: MODEL, model_version: r.message.model,
          prompt_hash: promptHash, raw_response_id: r.rawId, valid: c.valid, error: c.error,
        });
        doneRaw.add(r.rawId);
        stats.stored++;
      }
      await btInsert(ctx.db, 'bt_name_extractions', out);
    },
  };
}

export interface SelfLinkResult { inserted: number; first_name_only: number; unusable: number; ambiguous: number; already: number }

/** Pending transcript_self_name links for verified, multi-token self-stated names. Idempotent. */
export async function createSelfNameLinks(ctx: Ctx, runId: string, profiles: ProfileRow[]): Promise<SelfLinkResult> {
  const { db } = ctx;
  const idx = indexProfiles(profiles);
  const exts = (await readExtractions(ctx)).filter((e) => e.valid && e.name && e.quote_verified && e.name_in_quote);
  const latest = new Map<string, ExtractionRow>();
  for (const e of exts) latest.set(e.video_id, e); // ascending id: last wins
  const links = await selectAll<{ video_id: string; person_key: string }>(db, 'bt_person_links', 'id, video_id, person_key, source', {
    orderBy: 'id', filter: (q) => q.eq('source', 'transcript_self_name'),
  });
  const have = new Set(links.map((l) => `${l.video_id}\u0000${l.person_key}`));
  const res: SelfLinkResult = { inserted: 0, first_name_only: 0, unusable: 0, ambiguous: 0, already: 0 };
  const rows: Array<Record<string, unknown>> = [];
  for (const e of latest.values()) {
    const cls = classifySelfName(e.name!, idx);
    if (cls.kind === 'first_name_only') { res.first_name_only++; continue; }
    if (cls.kind === 'unusable') { res.unusable++; continue; }
    if (cls.kind === 'ambiguous') { res.ambiguous++; continue; }
    const personKey = cls.kind === 'profile' ? `profile:${cls.profileId}` : `named:${cls.key}`;
    if (have.has(`${e.video_id}\u0000${personKey}`)) { res.already++; continue; }
    rows.push({
      video_id: e.video_id, person_key: personKey, profile_id: cls.kind === 'profile' ? cls.profileId : null,
      source: 'transcript_self_name', match_level: 'self_name', name_extraction_id: e.id,
      evidence: { profile_match: cls.kind === 'profile' ? cls.level : 'none' }, run_id: runId,
    });
  }
  await btInsert(db, 'bt_person_links', rows);
  res.inserted = rows.length;
  return res;
}

async function finish(ctx: Ctx, runId: string, out: Awaited<ReturnType<typeof submitRun>>, stats: Awaited<ReturnType<typeof makeHandler>>['stats']) {
  const profiles = await loadProfiles(ctx.db);
  const usage = usageSummary(out.usage);
  ctx.log(`run ${runId}: ${JSON.stringify(stats)}; unresolved after retries ${out.unresolved.length}`);
  ctx.log(`actual usage: ${JSON.stringify(usage)}`);
  const links = await createSelfNameLinks(ctx, runId, profiles);
  ctx.log(`pending self-name links: ${JSON.stringify(links)}`);
  await finishRun(ctx.db, runId, 'completed', { ...usage, ...stats, unresolved: out.unresolved.length, links }, ctx.now());
}

if (isDirectRun('extract-names')) runCli(main);
