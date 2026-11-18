import { describe, expect, it, vi } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { prepareTranscript } from '../lib/quote';
import { createGuardedClient } from '../lib/supabase';
import { PROMPTS_DIR } from '../lib/prompts';
import { allItems, checkCodebook, CODEBOOK_DIR, loadCodebook, loadCodebookPrompt, OTHER, renderItem, type Codebook } from '../job3/codebook';
import { checkCodedResponse, countedChoices, rowOutcome, type ModelEntry } from '../job3/validate';
import { main as runCodebook, makeHandler } from '../job3/run-codebook';
import { SpendGateError } from '../job1/spend';
import { fakeAnthropic, fakeDb, type Row } from './job1-fakes';

const cb = loadCodebook();
const keys = allItems(cb).map((i) => i.key);

describe('codebook-v1', () => {
  it('loads the approved codebook: 7 facts, 82 question parts, Q24 merged into Q22', () => {
    expect(cb.facts.map((f) => f.key)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6']);
    expect(cb.items).toHaveLength(82);
    expect(cb.items.filter((i) => i.type === 'mc')).toHaveLength(24);
    expect(cb.merged).toEqual({ q24: 'q22' });
    expect(keys).not.toContain('q24');
    expect(keys).toEqual(expect.arrayContaining(['q2a', 'q2b', 'q54a', 'q54b']));
    const qids = new Set(cb.items.map((i) => i.question_id));
    for (let q = 1; q <= 81; q++) if (q !== 24) expect(qids.has(q)).toBe(true);
  });

  it('Q38 is the reworded yes/no question, Q78 a multiple-choice list, Q29 reported among people who suffered', () => {
    const q = (k: string) => cb.items.find((i) => i.key === k)!;
    expect(q('q38')).toMatchObject({ type: 'yn', ask: 'Did peace come over them as they died?', yes_means: 'calm or peace', no_means: 'panic or terror' });
    expect(q('q78').choices!.map((c) => c.label)).toEqual(expect.arrayContaining(['To love', 'To learn or grow', 'To experience life']));
    expect(q('q29').subgroup).toEqual({ fact: 'f2' });
    expect(q('q22').subgroup).toEqual({ fact: 'f0', choice: 'suicide_attempt' });
  });

  it('refuses a broken codebook', () => {
    const bad = (mut: (c: Codebook) => void) => { const c = structuredClone(cb); mut(c); return () => checkCodebook(c); };
    expect(bad((c) => { c.items[0].key = c.items[1].key; })).toThrow(/duplicate key/);
    expect(bad((c) => { c.items.find((i) => i.type === 'mc')!.choices!.push({ code: OTHER, label: 'Other' }); })).toThrow(/implicit/);
    expect(bad((c) => { c.items.find((i) => i.type === 'yn')!.yes_means = ''; })).toThrow(/without yes_means/);
    expect(bad((c) => { c.items.find((i) => i.key === 'q22')!.subgroup = { fact: 'f0', choice: 'nope' }; })).toThrow(/not a choice of f0/);
    expect(bad((c) => { c.items.find((i) => i.key === 'q29')!.subgroup = { fact: 'f9' }; })).toThrow(/does not exist/);
    expect(bad((c) => { c.merged.q99 = 'q100'; })).toThrow(/points at missing/);
  });

  it('every multiple-choice item offers "other"; the prompt lists all 89 keys in order; the hash covers the codebook', () => {
    expect(renderItem(cb.items.find((i) => i.key === 'q78')!)).toMatchObject({ type: 'multiple_choice', choices: expect.objectContaining({ other: expect.any(String), love: 'To love' }) });
    const p = loadCodebookPrompt();
    const listed = [...p.system.matchAll(/^\{"key":"([a-z0-9]+)"/gm)].map((m) => m[1]);
    expect(listed).toEqual(keys);
    expect(p.system).not.toContain('{{');
    expect(loadCodebookPrompt().promptHash).toBe(p.promptHash);
    // editing any wording changes the hash
    const dir = mkdtempSync(path.join(tmpdir(), 'cb-'));
    cpSync(CODEBOOK_DIR, dir, { recursive: true });
    const file = path.join(dir, 'codebook-v1.json');
    writeFileSync(file, readFileSync(file, 'utf8').replace('Did peace come over them as they died?', 'Did calm come over them as they died?'));
    expect(loadCodebookPrompt(PROMPTS_DIR, dir).promptHash).not.toBe(p.promptHash);
  });
});

// ---------- validation ----------

const TRANSCRIPT = 'It was raining that night. The car hit the tree at full speed and everything went dark. ' +
  'Then a deep calm came over me and I was not afraid at all. ' +
  'I understood that we are here to learn how to love one another. I was raised Catholic by my parents.';
const nt = prepareTranscript(TRANSCRIPT);
const na = (key: string): ModelEntry => ({ key, addressed: false, stance: 'none', quote: null, choices: [], confidence: 90 });
const full = (over: Record<string, Partial<ModelEntry>> = {}, drop: string[] = []): { items: ModelEntry[] } => ({
  items: keys.filter((k) => !drop.includes(k)).map((k) => ({ ...na(k), ...(over[k] ?? {}) })),
});
const check = (v: { items: ModelEntry[] }) => checkCodedResponse({ ok: true, value: v }, cb, nt);
const row = (res: ReturnType<typeof check>, key: string) => res.rows.find((r) => r.item_key === key)!;

describe('checkCodedResponse', () => {
  it('a clean response: one row per item, yes/no and multiple-choice answers with verified quotes', () => {
    const res = check(full({
      q38: { addressed: true, stance: 'yes', quote: 'a deep calm came over me and I was not afraid at all' },
      q78: { addressed: true, choices: [{ code: 'love', quote: 'we are here to learn how to love one another', other_text: null }] },
      f0: { addressed: true, choices: [{ code: 'accident', quote: 'The car hit the tree at full speed', other_text: null }] },
    }));
    expect(res.rows).toHaveLength(89);
    expect(res.rows.every((r) => r.valid)).toBe(true);
    expect(row(res, 'q38')).toMatchObject({ kind: 'yn', addressed: true, stance: 'yes', quote_verified: true, question_id: 38 });
    expect(rowOutcome(row(res, 'q38'))).toBe('counted');
    expect(row(res, 'q78')).toMatchObject({ kind: 'mc', stance: null, quote: null, quote_verified: true });
    expect(countedChoices(row(res, 'q78'))).toEqual(['love']);
    expect(row(res, 'f0')).toMatchObject({ question_id: null, addressed: true });
    expect(rowOutcome(row(res, 'q1'))).toBe('not_addressed');
  });

  it('an unverified quote is kept and flagged, never counted', () => {
    const res = check(full({
      q38: { addressed: true, stance: 'no', quote: 'I was screaming in terror the whole time' },
      q78: { addressed: true, choices: [
        { code: 'love', quote: 'we are here to learn how to love one another', other_text: null },
        { code: 'learn_grow', quote: 'we come here to grow our souls every day', other_text: null },
      ] },
      q69: { addressed: true, choices: [{ code: OTHER, quote: 'it looked like a library made of glass', other_text: 'a glass library' }] },
    }));
    expect(row(res, 'q38')).toMatchObject({ valid: true, quote_verified: false, error: expect.stringMatching(/not verified/) });
    expect(rowOutcome(row(res, 'q38'))).toBe('unverified_quote');
    expect(countedChoices(row(res, 'q78'))).toEqual(['love']);
    expect(rowOutcome(row(res, 'q78'))).toBe('counted');
    expect(row(res, 'q78').quote_verified).toBe(false); // not every answer verified
    expect(rowOutcome(row(res, 'q69'))).toBe('unverified_quote');
    expect(row(res, 'q69').choices![0].other_text).toBe('a glass library');
  });

  it.each([
    ['not addressed but a stance given', { q38: { stance: 'yes' as const } }, /not addressed, but an answer/],
    ['yes/no without a stance', { q38: { addressed: true, quote: 'a deep calm came over me and I was not afraid at all' } }, /without a stance/],
    ['yes/no without a quote', { q38: { addressed: true, stance: 'yes' as const } }, /without a quote/],
    ['yes/no with choices', { q38: { addressed: true, stance: 'yes' as const, quote: 'a deep calm came over me', choices: [{ code: 'x', quote: 'y', other_text: null }] } }, /with choices/],
    ['multiple choice with a stance', { q78: { addressed: true, stance: 'yes' as const, choices: [{ code: 'love', quote: 'learn how to love one another', other_text: null }] } }, /with a stance/],
    ['multiple choice with no answer', { q78: { addressed: true } }, /without any answer/],
    ['only answer has an unknown code', { q78: { addressed: true, choices: [{ code: 'to_dance', quote: 'learn how to love one another', other_text: null }] } }, /no usable answer: unknown answer code/],
    ['only answer is "other" without a description', { q78: { addressed: true, choices: [{ code: OTHER, quote: 'learn how to love one another', other_text: '  ' }] } }, /no usable answer: "other" without a description/],
    ['confidence out of range', { q1: { confidence: 140 } }, /confidence/],
  ])('invalid: %s', (_n, over, re) => {
    const res = check(full(over as Record<string, Partial<ModelEntry>>));
    const bad = res.rows.filter((r) => !r.valid);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ addressed: null, stance: null, quote: null, choices: null, error: expect.stringMatching(re) });
    expect(rowOutcome(bad[0])).toBe('invalid');
  });

  it('single bad answers are dropped with a note; the rest of the item still counts', () => {
    const res = check(full({
      q69: { addressed: true, choices: [
        { code: 'bright_loving_light', quote: 'a deep calm came over me and I was not afraid at all', other_text: null },
        { code: 'bright_loving_light', quote: 'a deep calm came over me and I was not afraid', other_text: null },
        { code: 'to_dance', quote: 'The car hit the tree at full speed', other_text: null },
        { code: 'landscapes', quote: 'The car hit the tree at full speed', other_text: null },
        { code: 'water', quote: 'everything went dark. Then a deep calm', other_text: null },
        { code: 'tunnel', quote: 'It was raining that night. The car hit', other_text: null },
      ] },
    }));
    const r = row(res, 'q69');
    expect(r.valid).toBe(true);
    expect(r.choices!.map((c) => c.code)).toEqual(['bright_loving_light', 'landscapes', 'water']);
    expect(r.error).toMatch(/given twice/);
    expect(r.error).toMatch(/unknown answer code "to_dance" dropped/);
    expect(r.error).toMatch(/more than 3 answers; "tunnel" dropped/);
    expect(countedChoices(r)).toEqual(['bright_loving_light', 'landscapes', 'water']);
  });

  it('missing and duplicated items are invalid; unknown keys are reported and ignored', () => {
    const v = full({}, ['q5']);
    v.items.push(na('q7'), na('q999'));
    const res = check(v);
    expect(row(res, 'q5')).toMatchObject({ valid: false, error: 'missing from the response' });
    expect(row(res, 'q7')).toMatchObject({ valid: false, error: 'listed more than once' });
    expect(res.unknownKeys).toEqual(['q999']);
    expect(res.rows.filter((r) => !r.valid)).toHaveLength(2);
  });

  it('a rejected response gives one invalid row per item', () => {
    const res = checkCodedResponse({ ok: false, error: 'not valid JSON' }, cb, nt);
    expect(res.rows).toHaveLength(89);
    expect(res.rows.every((r) => !r.valid && r.error === 'response rejected: not valid JSON')).toBe(true);
  });
});

// ---------- run-codebook end to end (mock DB + mock Anthropic) ----------

const VT: Record<string, string> = {
  v1: TRANSCRIPT,
  v2: 'I was in hospital for surgery and I left my body. I saw a meadow full of flowers with a river running through it.',
  v3: 'This one comes back broken.',
};
const vids = Object.keys(VT).sort();
const seed = (): Record<string, Row[]> => ({
  nde_analysis: [...vids.map((v) => ({ video_id: v, experience_type: 'nde' })), { video_id: 'x9', experience_type: 'ste' }],
  nde_vids: vids.map((v) => ({ videoId: v, title: `t ${v}`, subtitles_punctuated: VT[v], subtitles_cleaned: null, subtitles: null })),
  nde_questions: Array.from({ length: 81 }, (_, i) => ({ id: i + 1, is_active: true })),
});
const answer = (params: Record<string, any>): string => {
  const text = String(params.messages[0].content);
  if (text === VT.v3) return '{"items": [';
  if (text === VT.v1) return JSON.stringify(full({
    q38: { addressed: true, stance: 'yes', quote: 'a deep calm came over me and I was not afraid at all' },
    q78: { addressed: true, choices: [{ code: 'love', quote: 'we are here to learn how to love one another', other_text: null }] },
    f0: { addressed: true, choices: [{ code: 'accident', quote: 'The car hit the tree at full speed', other_text: null }] },
  }));
  return JSON.stringify(full({
    q69: { addressed: true, choices: [{ code: 'landscapes', quote: 'I saw a meadow full of flowers with a river running through it', other_text: null }] },
    f0: { addressed: true, choices: [{ code: 'surgery_medical_procedure', quote: 'I was in hospital for surgery and I left my body', other_text: null }] },
  }));
};

function harness(stopFor?: (customId: string) => string | undefined) {
  const fake = fakeDb(seed());
  const guarded = createGuardedClient(fake.db as unknown as SupabaseClient);
  const api = fakeAnthropic({ respond: (_c, p) => answer(p), model: 'claude-haiku-5-5', stopFor });
  const makeClient = vi.fn(() => api.client);
  const logs: string[] = [];
  let tick = 0;
  const call = (argv: string[]) => runCodebook(argv, { db: guarded, makeClient, log: (l) => logs.push(l), now: () => new Date(Date.UTC(2026, 10, 19, 10, 0, tick++)), sleep: async () => undefined });
  return { fake, guarded, api, makeClient, logs, call };
}

describe('run-codebook (mock DB + mock Anthropic)', () => {
  it('refuses without a mode or with an unknown run; --dry-run is offline', async () => {
    const h = harness();
    await expect(h.call([])).rejects.toThrow(/refusing to run/);
    await expect(h.call(['--confirm-spend', 'j3c-20261119000000'])).rejects.toThrow(SpendGateError);
    await expect(h.call(['--sample', '2'])).rejects.toThrow(/refusing to run/);
    await h.call(['--dry-run']);
    expect(h.makeClient).not.toHaveBeenCalled();
    expect(h.fake.ops.filter((o) => o.op !== 'select')).toEqual([]);
    expect(h.logs.join('\n')).toMatch(/targets: 3 NDE videos/);
  });

  it('estimate with a cap -> confirm: one row per item per video, quotes checked, nothing printed from transcripts', async () => {
    const h = harness();
    await h.call(['--estimate', '--budget-usd', '5']);
    const run = h.fake.tables.bt_runs[0];
    expect(run).toMatchObject({ status: 'estimated', job: 'other', pass: 'haiku', model: 'claude-haiku-5-5' });
    expect(run.params).toMatchObject({ kind: 'codebook', codebook_version: 'codebook-v1', video_ids: vids, max_tokens: 20000 });
    expect((run.estimate as Record<string, number>).ceiling_usd).toBeLessThanOrEqual(5);
    expect(h.api.create).not.toHaveBeenCalled();

    await h.call(['--confirm-spend', String(run.id)]);
    expect(h.api.create).toHaveBeenCalledTimes(1);
    expect(h.api.batchRequests.every((r) => r.params.max_tokens === 20000 && r.params.system[0].cache_control)).toBe(true);
    const rows = h.fake.tables.bt_coded_answers;
    expect(rows).toHaveLength(89 * 3);
    const by = (v: string, k: string) => rows.find((r) => r.video_id === v && r.item_key === k)!;
    expect(by('v1', 'q38')).toMatchObject({ addressed: true, stance: 'yes', quote_verified: true, valid: true, codebook_version: 'codebook-v1', attempt: 1, transcript_source: 'subtitles_punctuated' });
    expect(by('v1', 'f0').choices).toEqual([expect.objectContaining({ code: 'accident', quote_verified: true })]);
    expect(by('v2', 'q69').choices).toEqual([expect.objectContaining({ code: 'landscapes', quote_verified: true })]);
    expect(rows.filter((r) => r.video_id === 'v3').every((r) => r.valid === false && /response rejected/.test(String(r.error)))).toBe(true);
    expect(h.fake.tables.bt_prompts).toHaveLength(1);
    expect(h.fake.tables.bt_runs[0].status).toBe('completed');

    const out = h.logs.join('\n');
    for (const secret of ['car hit the tree', 'meadow', 'raised Catholic', 'comes back broken']) expect(out).not.toContain(secret);
    for (const o of h.fake.ops.filter((x) => x.op !== 'select')) expect(o.table.startsWith('bt_')).toBe(true);

    // v1 and v2 are coded with this prompt; v3's whole response was rejected, so a later run codes it again
    await h.call(['--estimate']);
    expect(h.fake.tables.bt_runs.at(-1)!.params).toMatchObject({ video_ids: ['v3'] });
  });

  it('a cap below the first-attempt worst case is refused at estimate time', async () => {
    const h = harness();
    await expect(h.call(['--estimate', '--budget-usd', '0.0001'])).rejects.toThrow(/below the first-attempt worst case/);
    expect(h.fake.tables.bt_runs ?? []).toEqual([]);
  });

  it('--sample draws a seeded subset; the same seed draws the same videos', async () => {
    const a = harness();
    await a.call(['--estimate', '--sample', '2']);
    const b = harness();
    await b.call(['--estimate', '--sample', '2']);
    const ids = (a.fake.tables.bt_runs[0].params as { video_ids: string[] }).video_ids;
    expect(ids).toHaveLength(2);
    expect((b.fake.tables.bt_runs[0].params as { video_ids: string[] }).video_ids).toEqual(ids);
  });

  it('refuses to submit when a video was coded since the estimate', async () => {
    const h = harness();
    await h.call(['--estimate']);
    h.fake.tables.bt_coded_answers = [{ id: 1, run_id: 'x', video_id: 'v2', item_key: 'f0', prompt_hash: loadCodebookPrompt().promptHash, model: 'claude-haiku-5-5' }];
    await expect(h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)])).rejects.toThrow(/already have a result since the estimate/);
    expect(h.api.create).not.toHaveBeenCalled();
  });

  it('a truncated response is retried with a larger max_tokens; only the successful attempt is stored', async () => {
    const h = harness((cid) => (cid.includes('_v1_') && cid.endsWith('_1') ? 'max_tokens' : undefined));
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    expect(h.api.create).toHaveBeenCalledTimes(2);
    const retry = h.api.batchRequests.filter((r) => r.custom_id.includes('_v1_'));
    expect(retry.map((r) => r.params.max_tokens)).toEqual([20000, 40000]);
    const v1 = h.fake.tables.bt_coded_answers.filter((r) => r.video_id === 'v1');
    expect(v1).toHaveLength(89);
    expect(new Set(v1.map((r) => r.attempt))).toEqual(new Set([2]));
    expect(v1.find((r) => r.item_key === 'q38')).toMatchObject({ stance: 'yes', quote_verified: true });
  });

  it('truncated on every attempt: nothing stored for that video, which stays eligible for a later run', async () => {
    const h = harness((cid) => (cid.includes('_v1_') ? 'max_tokens' : undefined));
    await h.call(['--estimate', '--max-attempts', '2']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    expect(h.fake.tables.bt_coded_answers.filter((r) => r.video_id === 'v1')).toEqual([]);
    expect(h.logs.join('\n')).toMatch(/unresolved after retries 1/);
    await h.call(['--estimate']);
    expect((h.fake.tables.bt_runs.at(-1)!.params as { video_ids: string[] }).video_ids).toEqual(expect.arrayContaining(['v1', 'v3']));
  });

  it('crash after the batch was created: --resume collects without a new batch, and nothing is stored twice', async () => {
    const crash = harness();
    await crash.call(['--estimate']);
    const id = String(crash.fake.tables.bt_runs[0].id);
    const crashing = fakeAnthropic({ respond: (_c, p) => answer(p), model: 'claude-haiku-5-5', crashOnResults: true });
    const logs: string[] = [];
    const deps = (api: ReturnType<typeof fakeAnthropic>) => ({ db: crash.guarded, makeClient: () => api.client, log: (l: string) => logs.push(l), now: () => new Date('2026-11-19T12:00:00Z'), sleep: async () => undefined });
    await expect(runCodebook(['--confirm-spend', id], deps(crashing))).rejects.toThrow(/simulated crash/);
    expect(crash.fake.tables.bt_runs[0]).toMatchObject({ status: 'submitted' });
    expect(crash.fake.tables.bt_coded_answers ?? []).toEqual([]);

    const api2 = fakeAnthropic({ respond: (_c, p) => answer(p), model: 'claude-haiku-5-5', seed: { batch_1: crashing.batchRequests } });
    await runCodebook(['--resume', id], deps(api2));
    expect(api2.create).not.toHaveBeenCalled();
    expect(crash.fake.tables.bt_coded_answers).toHaveLength(89 * 3);
    expect(crash.fake.tables.bt_runs[0].status).toBe('completed');

    // replaying responses that are already stored adds nothing (the handler skips known raw responses)
    const raw = crash.fake.tables.bt_raw_responses;
    const cp = loadCodebookPrompt();
    const ctx = { db: crash.guarded, log: () => undefined, makeClient: () => api2.client, now: () => new Date(), outDir: '' } as never;
    const handler = await makeHandler(ctx, id, cp, new Map(vids.map((v) => [v, { text: VT[v], source: 'subtitles_punctuated' as const }])));
    await handler.onCollected(raw.map((r) => ({
      customId: String(r.custom_id), key: String(r.custom_id).split('_').slice(-3, -2)[0], attempt: 1, kind: 'succeeded',
      message: r.response as never, rawId: Number(r.id),
    })));
    expect(crash.fake.tables.bt_coded_answers).toHaveLength(89 * 3);
  });

  it('refuses to resume when a transcript changed after the estimate (quotes would be checked against other text)', async () => {
    const h = harness();
    await h.call(['--estimate']);
    const id = String(h.fake.tables.bt_runs[0].id);
    const crashing = fakeAnthropic({ respond: (_c, p) => answer(p), model: 'claude-haiku-5-5', crashOnResults: true });
    const deps = { db: h.guarded, makeClient: () => crashing.client, log: () => undefined, now: () => new Date('2026-11-19T12:00:00Z'), sleep: async () => undefined };
    await expect(runCodebook(['--confirm-spend', id], deps)).rejects.toThrow(/simulated crash/);
    h.fake.tables.nde_vids.find((r) => r.videoId === 'v2')!.subtitles_punctuated += ' Something new.';
    await expect(runCodebook(['--resume', id], deps)).rejects.toThrow(/transcript\(s\) changed or disappeared/);
  });
});
