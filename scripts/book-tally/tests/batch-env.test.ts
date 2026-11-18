import { describe, expect, it } from 'vitest';
import {
  buildParams, chunkRequests, classifyResult, createBatch, makeCustomId, parseCustomId, type BatchRequest,
} from '../lib/batch';
import { ANTHROPIC_BASE_URL, createAnthropicClient, getAnthropicKey, getSupabaseConfig } from '../lib/env';

describe('env', () => {
  it('prefers ANTHROPIC_API_KEY, falls back to CLAUDE_API, reports NAME only', () => {
    expect(getAnthropicKey({ ANTHROPIC_API_KEY: 'k1', CLAUDE_API: 'k2' }).envName).toBe('ANTHROPIC_API_KEY');
    const r = getAnthropicKey({ CLAUDE_API: 'k2' });
    expect(r.envName).toBe('CLAUDE_API');
    expect(r.value).toBe('k2');
    expect(getAnthropicKey({ ANTHROPIC_API_KEY: '  ', CLAUDE_API: 'k2' }).envName).toBe('CLAUDE_API');
  });
  it('errors clearly when neither is set, naming both variables but no value', () => {
    expect(() => getAnthropicKey({})).toThrow(/ANTHROPIC_API_KEY or CLAUDE_API/);
  });
  it('builds the client with explicit apiKey and baseURL (ignores ANTHROPIC_BASE_URL)', () => {
    const h = createAnthropicClient({ CLAUDE_API: 'sk-test', ANTHROPIC_BASE_URL: 'https://evil.example' });
    expect(h.keyEnvName).toBe('CLAUDE_API');
    expect(h.client.baseURL).toBe(ANTHROPIC_BASE_URL);
    expect(h.client.baseURL).toBe('https://api.anthropic.com');
  });
  it('key is only required when a client is requested', () => {
    expect(() => getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 's' })).not.toThrow();
    expect(() => getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toThrow(/SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY/);
  });
});

describe('batch helpers', () => {
  it('buildParams sends structured output + effort + cached system, and no sampling params', () => {
    const p = buildParams({ model: 'claude-haiku-5-5', system: 'S', user: 'U', maxTokens: 4000, effort: 'medium', schema: { type: 'object' } });
    expect(p).not.toHaveProperty('temperature');
    expect(p).not.toHaveProperty('top_p');
    expect(p).not.toHaveProperty('top_k');
    expect(p.output_config).toEqual({ effort: 'medium', format: { type: 'json_schema', schema: { type: 'object' } } });
    expect(p.system).toEqual([{ type: 'text', text: 'S', cache_control: { type: 'ephemeral' } }]);
    expect(p.messages).toEqual([{ role: 'user', content: 'U' }]);
  });
  it('custom ids round-trip, including ids with underscores and hyphens', () => {
    const id = makeCustomId({ run: 'stance-first-01', key: 'a_b-cDEF123', pass: 'first', attempt: 2 });
    expect(id).toBe('stance-first-01_a_b-cDEF123_first_2');
    expect(parseCustomId(id, 'stance-first-01')).toEqual({ run: 'stance-first-01', key: 'a_b-cDEF123', pass: 'first', attempt: 2 });
    expect(() => parseCustomId(id, 'other')).toThrow();
    expect(() => makeCustomId({ run: 'r', key: 'k'.repeat(70), pass: 'first', attempt: 1 })).toThrow(/custom_id/);
    expect(() => makeCustomId({ run: 'r:x', key: 'k', pass: 'first', attempt: 1 })).toThrow();
  });
  it('classifies all four result kinds', () => {
    const msg = { id: 'm' } as never;
    expect(classifyResult({ custom_id: 'a', result: { type: 'succeeded', message: msg } })).toMatchObject({ kind: 'succeeded' });
    expect(classifyResult({ custom_id: 'a', result: { type: 'errored', error: { type: 'error', error: { type: 'x', message: 'm' } } } as never })).toMatchObject({ kind: 'errored' });
    expect(classifyResult({ custom_id: 'a', result: { type: 'canceled' } }).kind).toBe('canceled');
    expect(classifyResult({ custom_id: 'a', result: { type: 'expired' } }).kind).toBe('expired');
  });
  it('chunkRequests respects count and byte limits', () => {
    const reqs = Array.from({ length: 10 }, (_, i) => ({ custom_id: `r_${i}_first_1`, params: { model: 'm', max_tokens: 1, messages: [{ role: 'user', content: 'x'.repeat(100) }] } })) as BatchRequest[];
    expect(chunkRequests(reqs, { maxRequests: 4 }).map((c) => c.length)).toEqual([4, 4, 2]);
    const sz = Buffer.byteLength(JSON.stringify(reqs[0]));
    expect(chunkRequests(reqs, { maxBytes: sz * 3 + 1 }).map((c) => c.length)).toEqual([3, 3, 3, 1]);
  });
  it('createBatch records the batch id (callback) before returning and rejects duplicates', async () => {
    const order: string[] = [];
    const client = { messages: { batches: { create: async () => { order.push('create'); return { id: 'msgbatch_1' }; } } } } as never;
    const req = (id: string) => ({ custom_id: id, params: {} }) as unknown as BatchRequest;
    const b = await createBatch(client, [req('a_1_first_1'), req('a_2_first_1')], (id) => { order.push(`record:${id}`); });
    expect(b.id).toBe('msgbatch_1');
    expect(order).toEqual(['create', 'record:msgbatch_1']);
    await expect(createBatch(client, [req('dup'), req('dup')], () => {})).rejects.toThrow(/duplicate/);
  });
});
