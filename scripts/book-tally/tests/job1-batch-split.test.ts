import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { realBatchIds } from '../lib/batch';
import { createGuardedClient } from '../lib/supabase';
import { makeCtx } from '../job1/cli';
import { submitRun, type CollectedRow } from '../job1/batch-run';
import { fakeAnthropic, fakeDb } from './job1-fakes';

describe('submitRun splits a large submission into several guarded batches', () => {
  it('5 requests with at most 2 per batch: 3 batches, every result collected once, run "submitted"', async () => {
    const fake = fakeDb({ bt_runs: [{ id: 'r-split', job: 'other', pass: 'haiku', model: 'claude-haiku-5-5', status: 'estimated', batch_ids: [], params: {} }] });
    const db = createGuardedClient(fake.db as unknown as SupabaseClient);
    const api = fakeAnthropic({ respond: () => '{"ok":true}', model: 'claude-haiku-5-5' });
    const ctx = makeCtx({ db, makeClient: () => api.client, log: () => undefined, now: () => new Date('2026-11-18T20:00:00Z'), sleep: async () => undefined });
    const seen: CollectedRow[] = [];
    const items = ['a', 'b', 'c', 'd', 'e'].map((key) => ({
      key, params: { model: 'claude-haiku-5-5', max_tokens: 100, messages: [{ role: 'user' as const, content: `text ${key}` }] },
    }));
    const out = await submitRun({
      ctx, client: api.client, runId: 'r-split', model: 'claude-haiku-5-5', pass: 'haiku', items, maxAttempts: 1,
      ceilingUsd: 10, perKeyInputTokens: {}, confirmRetries: false, chunkLimits: { maxRequests: 2 },
      onCollected: async (rows) => { seen.push(...rows); },
    });
    expect(api.create).toHaveBeenCalledTimes(3);
    expect(api.create.mock.calls.map((c) => c[0].requests.length)).toEqual([2, 2, 1]);
    expect(out.batchIds).toHaveLength(3);
    expect(realBatchIds(fake.tables.bt_runs[0].batch_ids as string[])).toEqual(out.batchIds);
    expect(fake.tables.bt_runs[0].status).toBe('submitted');
    expect(seen.map((r) => r.key).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(fake.tables.bt_raw_responses).toHaveLength(5);
    expect(out.unresolved).toEqual([]);
  });
});
