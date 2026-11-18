import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { parseCsv } from '../job1/csv';
import { main as exportReview } from '../job1/export-review';
import { loadNamePrompt, main as extract } from '../job1/extract-names';
import { SpendGateError } from '../job1/spend';
import { createGuardedClient } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fakeAnthropic, fakeDb, type Row } from './job1-fakes';

const T = {
  a1: "We talked about many things. Hi, I'm Pat O'Brien, and this is the story of the night my heart stopped. It was a very cold winter.",
  a2: 'We were in the kitchen. Well my name is Sarah and I live in Ohio near the lake. It happened on a Tuesday.',
  a3: 'I remember the light and the tunnel and the feeling of peace that washed over me completely.',
  a5: 'We welcomed the guest. Thanks for coming on today Jane Roe it is great to have you here with us.',
  a4: 'The surgeon told us the operation went well but I had left my body for several minutes during the procedure.',
};
const vids = Object.keys(T).sort();

const seed = (): Record<string, Row[]> => ({
  experiencer_profiles: [{ id: 7, slug: 'pat', full_name: 'Pat OBrien', summary: null, video_ids: [], first_shared_year: null }],
  nde_analysis: vids.map((v) => ({ video_id: v, experience_type: 'nde' })),
  nde_vids: vids.map((v) => ({ videoId: v, title: `t ${v}`, channelName: 'c', channelId: 'c', experiencerFullName: v === 'a4' ? '  ' : null, subtitles_punctuated: T[v as keyof typeof T],
    raw_timestamped_subtitles: v === 'a1' ? [{ start: 12, duration: 3, text: 'We talked about many things.' }, { start: 42, duration: 5, text: "Hi, I'm Pat O'Brien, and this is the story" }, { start: 47, duration: 4, text: 'of the night my heart stopped.' }] : null })),
});

const answerFor = (p: Record<string, any>): string => {
  const text = String(p.messages[0].content);
  if (text === T.a1) return JSON.stringify({ name: "Pat O'Brien", quote: "Hi, I'm Pat O'Brien, and this is the story of the night my heart stopped." });
  if (text === T.a2) return JSON.stringify({ name: 'Sarah', quote: 'my name is Sarah and I live in Ohio near the lake' });
  if (text === T.a5) return JSON.stringify({ name: 'Jane Roe', quote: 'Thanks for coming on today Jane Roe it is great to have you here' }); // host talking, not self-introduced
  if (text === T.a4) return JSON.stringify({ name: 'Mary Jones', quote: 'hello everybody my name is Mary Jones and welcome to the show' }); // not in the transcript
  return JSON.stringify({ name: null, quote: null });
};

function harness() {
  const fake = fakeDb(seed());
  const guarded = createGuardedClient(fake.db as unknown as SupabaseClient); // real write guard in the path
  const api = fakeAnthropic({ respond: (_c, p) => answerFor(p), model: 'claude-haiku-5-5' });
  const makeClient = vi.fn(() => api.client);
  const logs: string[] = [];
  let tick = 0;
  const call = (argv: string[]) => extract(argv, { db: guarded, makeClient, log: (l) => logs.push(l), now: () => new Date(Date.UTC(2026, 10, 18, 10, 0, tick++)), sleep: async () => undefined });
  return { fake, guarded, api, makeClient, logs, call };
}

describe('extract-names (mock DB + mock Anthropic)', () => {
  it('refuses without a mode and for an unknown --confirm-spend; --dry-run is offline', async () => {
    const h = harness();
    await expect(h.call([])).rejects.toThrow(/refusing to run/);
    await expect(h.call(['--confirm-spend', 'j1n-20261118000000'])).rejects.toThrow(SpendGateError);
    await h.call(['--dry-run']);
    expect(h.makeClient).not.toHaveBeenCalled();
    expect(h.api.create).not.toHaveBeenCalled();
    expect(h.fake.ops.filter((o) => o.op !== 'select')).toEqual([]);
    expect(h.logs.join('\n')).toMatch(/requests built: 5/);
  });

  it('estimate -> confirm: verifies quotes, stores every extraction, proposes only verified multi-token names (pending), prints no transcript text', async () => {
    const h = harness();
    await h.call(['--estimate']);
    const run = h.fake.tables.bt_runs[0];
    expect(run).toMatchObject({ status: 'estimated', job: 'name_extract', pass: 'haiku', model: 'claude-haiku-5-5' });
    expect((run.params as { video_ids: string[] }).video_ids).toEqual(vids);
    expect(h.api.create).not.toHaveBeenCalled();
    await h.call(['--confirm-spend', String(run.id)]);
    expect(h.api.create).toHaveBeenCalledTimes(1);

    const ex = Object.fromEntries(h.fake.tables.bt_name_extractions.map((e) => [e.video_id, e]));
    expect(Object.keys(ex).sort()).toEqual(vids);
    expect(ex.a5).toMatchObject({ name: 'Jane Roe', quote_verified: true, name_in_quote: true, error: 'no_self_introducer', valid: true });
    expect(ex.a1).toMatchObject({ valid: true, quote_verified: true, name_in_quote: true, transcript_source: 'subtitles_punctuated', model_version: 'claude-haiku-5-5' });
    expect(ex.a2).toMatchObject({ quote_verified: true, name_in_quote: true, name: 'Sarah' });
    expect(ex.a3).toMatchObject({ name: null, quote: null, valid: true });
    expect(ex.a4).toMatchObject({ name: 'Mary Jones', quote_verified: false });
    expect(ex.a1.raw_response_id).toBeTruthy();

    // pending links: a1 -> the profile with the same name; a2 (first name only), a3, a4 (unverified) -> none
    const links = h.fake.tables.bt_person_links;
    expect(links.map((l) => [l.video_id, l.person_key, l.source, l.match_level])).toEqual([['a1', 'profile:7', 'transcript_self_name', 'self_name']]);
    expect(h.fake.tables.bt_link_decisions ?? []).toEqual([]);
    expect(h.logs.join('\n')).toMatch(/"first_name_only":1/);

    const out = h.logs.join('\n');
    for (const secret of ['heart stopped', 'Ohio', 'kitchen', 'Mary Jones', "Pat O'Brien", 'surgeon']) expect(out).not.toContain(secret);
    expect(h.fake.tables.bt_runs[0].status).toBe('completed');

    // everything already extracted: nothing left to estimate
    await h.call(['--estimate']);
    expect(h.logs.at(-1)).toBe('nothing to extract');
  });

  it('review CSV: verified names with a YouTube link at the aligned time; first-name-only flagged and not importable', async () => {
    const h = harness();
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    const dir = mkdtempSync(path.join(tmpdir(), 'ne-'));
    await exportReview([], { db: h.guarded, log: () => undefined, outDir: dir, now: () => new Date('2026-11-18T13:00:00Z') });
    const rows = parseCsv(readFileSync(path.join(dir, 'name_extractions_review.csv'), 'utf8')).rows;
    expect(rows.map((r) => r.video_id)).toEqual(['a1', 'a2']); // unverified (a4), host-mention (a5) and null (a3) are not listed
    expect(rows[0]).toMatchObject({ flag: 'profile_exact', person_key: 'profile:7', youtube_url: 'https://www.youtube.com/watch?v=a1&t=42s', name: "Pat O'Brien" });
    expect(rows[0].link_id).not.toBe('');
    expect(rows[1]).toMatchObject({ flag: 'first_name_only', link_id: '', person_key: '', 'decision (accept/reject)': 'n/a', youtube_url: 'https://www.youtube.com/watch?v=a2' });
  });

  it('refuses to submit when an estimated video gained an extraction since the estimate', async () => {
    const h = harness();
    await h.call(['--estimate']);
    h.fake.tables.bt_name_extractions = [{ id: 1, run_id: 'x', video_id: 'a3', name: null, quote: null, quote_verified: false, name_in_quote: false, valid: true, prompt_hash: loadNamePrompt().promptHash, model: 'claude-haiku-5-5' }];
    await expect(h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)])).rejects.toThrow(/already have a result since the estimate/);
    expect(h.api.create).not.toHaveBeenCalled();
  });

  it('estimate states the thinking assumption and prints a hard ceiling; requests carry max_tokens 8192', async () => {
    const h = harness();
    await h.call(['--estimate']);
    const out = h.logs.join('\n');
    expect(out).toMatch(/adaptive thinking is on/);
    expect(out).not.toMatch(/no extended thinking/);
    expect(out).toMatch(/HARD CEILING/);
    const est = h.fake.tables.bt_runs[0].estimate as Record<string, number>;
    expect(est.ceiling_usd).toBeGreaterThan(est.worst_case_cost_usd);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    expect(h.api.batchRequests.every((r) => r.params.max_tokens === 8192)).toBe(true);
  });

  it('writes only to bt_* tables', async () => {
    const h = harness();
    await h.call(['--estimate']);
    await h.call(['--confirm-spend', String(h.fake.tables.bt_runs[0].id)]);
    for (const o of h.fake.ops.filter((x) => x.op !== 'select')) expect(o.table.startsWith('bt_')).toBe(true);
  });
});
