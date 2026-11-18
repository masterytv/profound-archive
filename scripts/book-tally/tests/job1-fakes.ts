/**
 * Test doubles for the Job 1 scripts: an in-memory Supabase-like client (the query-builder
 * subset the scripts use) and a fake Anthropic client (count_tokens + Message Batches).
 * No network, no real database. Not a *.test.ts file, so vitest does not collect it.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { vi } from 'vitest';
import type { Db } from '../lib/supabase';

export type Row = Record<string, unknown>;
type Err = { message: string } | null;

const UNIQUE: Record<string, string[]> = {
  bt_runs: ['id'],
  bt_prompts: ['prompt_hash'],
  bt_person_links: ['video_id', 'person_key', 'source'],
  bt_raw_responses: ['run_id', 'custom_id'],
  bt_merge_candidates: ['key_a', 'key_b'],
};
const NO_AUTO_ID = new Set(['bt_runs', 'bt_prompts']);

export interface FakeDbOptions {
  /** Extra per-table insert check; return an error message to reject the row. */
  check?: (table: string, row: Row) => string | null;
}

export function fakeDb(seed: Record<string, Row[]> = {}, opts: FakeDbOptions = {}) {
  const tables: Record<string, Row[]> = Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const ops: Array<{ table: string; op: 'select' | 'insert' | 'update'; n: number }> = [];
  const nextId: Record<string, number> = {};
  const missing = new Set<string>();

  class Q implements PromiseLike<{ data: Row[] | null; error: Err }> {
    private op: 'select' | 'insert' | 'update' = 'select';
    private cols = '*';
    private rows: Row[] = [];
    private patch: Row = {};
    private filters: Array<(r: Row) => boolean> = [];
    private orderBy: { col: string; asc: boolean } | null = null;
    private from_ = 0;
    private to_ = Infinity;
    private selectAfterInsert = false;
    private selectAfterUpdate = false;
    constructor(private table: string) {}
    select(cols = '*') { if (this.op === 'insert') this.selectAfterInsert = true; if (this.op === 'update') this.selectAfterUpdate = true; this.cols = cols; return this; }
    insert(rows: Row | Row[]) { this.op = 'insert'; this.rows = Array.isArray(rows) ? rows : [rows]; return this; }
    update(patch: Row) { this.op = 'update'; this.patch = patch; return this; }
    eq(col: string, val: unknown) { this.filters.push((r) => r[col] === val); return this; }
    in(col: string, vals: unknown[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
    order(col: string, o: { ascending?: boolean } = {}) { this.orderBy = { col, asc: o.ascending !== false }; return this; }
    range(a: number, b: number) { this.from_ = a; this.to_ = b; return this; }
    private project(r: Row): Row {
      if (this.cols === '*') return { ...r };
      return Object.fromEntries(this.cols.split(',').map((c) => c.trim()).map((c) => [c, r[c]]));
    }
    private run(): { data: Row[] | null; error: Err } {
      const t = this.table;
      if (missing.has(t)) return { data: null, error: { message: `Could not find the table 'public.${t}' in the schema cache` } };
      const store = (tables[t] ??= []);
      if (this.op === 'insert') {
        const added: Row[] = [];
        for (const raw of this.rows) {
          const row = { ...raw };
          const u = UNIQUE[t];
          if (u && [...store, ...added].some((x) => u.every((c) => x[c] === row[c]))) return { data: null, error: { message: `duplicate key value violates unique constraint on ${t}` } };
          const bad = opts.check?.(t, row);
          if (bad) return { data: null, error: { message: bad } };
          if (!NO_AUTO_ID.has(t) && row.id === undefined) { nextId[t] = (nextId[t] ?? store.reduce((m, r) => Math.max(m, Number(r.id ?? 0)), 0)) + 1; row.id = nextId[t]; }
          added.push(row);
        }
        store.push(...added);
        ops.push({ table: t, op: 'insert', n: added.length });
        return { data: this.selectAfterInsert ? added.map((r) => this.project(r)) : null, error: null };
      }
      let rows = store.filter((r) => this.filters.every((f) => f(r)));
      if (this.op === 'update') {
        rows.forEach((r) => Object.assign(r, this.patch));
        ops.push({ table: t, op: 'update', n: rows.length });
        return { data: this.selectAfterUpdate ? rows.map((r) => this.project(r)) : null, error: null };
      }
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        rows = [...rows].sort((a, b) => ((a[col] as number) < (b[col] as number) ? -1 : (a[col] as number) > (b[col] as number) ? 1 : 0) * (asc ? 1 : -1));
      }
      rows = rows.slice(this.from_, this.to_ === Infinity ? undefined : this.to_ + 1);
      ops.push({ table: t, op: 'select', n: rows.length });
      return { data: rows.map((r) => this.project(r)), error: null };
    }
    then<A, B>(ok?: ((v: { data: Row[] | null; error: Err }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
      return Promise.resolve().then(() => this.run()).then(ok, bad);
    }
  }
  const db = { from: (t: string) => new Q(t) } as unknown as Db;
  return { db, tables, ops, setMissing: (t: string) => missing.add(t) };
}

export type FakeDb = ReturnType<typeof fakeDb>;

export function textMessage(model: string, text: string, stopReason = 'end_turn') {
  return {
    id: 'msg_x', type: 'message', role: 'assistant', model, content: [{ type: 'text', text }],
    stop_reason: stopReason, stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 100 },
  };
}

export interface FakeClientOptions {
  /** Text of the model answer for one request (return null to make the request error). */
  respond: (customId: string, params: Record<string, unknown>) => string | null;
  model: string;
  stopReason?: string;
  /** Per-request stop reason (e.g. 'max_tokens' to simulate truncation); overrides stopReason. */
  stopFor?: (customId: string, params: Record<string, unknown>) => string | undefined;
  /** Pre-existing batches (id -> requests), for resume tests. */
  seed?: Record<string, Array<{ custom_id: string; params: Record<string, any> }>>;
  /** Make batches.results throw (simulates a crash after the batch was created). */
  crashOnResults?: boolean;
  /**
   * batches.create behaviour per call number (1-based): 'fail' = reject before anything is created,
   * 'lost' = the batch IS created but the response is lost (rejects). Default: always succeeds.
   */
  createMode?: (call: number) => 'ok' | 'fail' | 'lost';
  /** Clock for batch created_at (default 2026-11-18T10:00:30Z). */
  clock?: () => Date;
}

/** Fake Anthropic client. `batchRequests` records every submitted request (custom_id + params). */
export function fakeAnthropic(o: FakeClientOptions) {
  const batchRequests: Array<{ custom_id: string; params: Record<string, any> }> = [];
  const batches = new Map<string, Array<{ custom_id: string; params: Record<string, any> }>>(Object.entries(o.seed ?? {}));
  const countTokens = vi.fn(async (p: Record<string, any>) => ({
    input_tokens: Math.ceil((JSON.stringify(p.system ?? '').length + JSON.stringify(p.messages ?? '').length) / 4),
  }));
  const create = vi.fn(async (body: { requests: Array<{ custom_id: string; params: Record<string, any> }> }, _opts?: unknown) => {
    const mode = o.createMode?.(create.mock.calls.length) ?? 'ok';
    if (mode === 'fail') throw new Error('network down');
    batchRequests.push(...body.requests);
    const id = `batch_${create.mock.calls.length}`;
    batches.set(id, body.requests);
    if (mode === 'lost') throw new Error('response lost');
    return { id, processing_status: 'in_progress' };
  });
  const clock = o.clock ?? (() => new Date(Date.UTC(2026, 10, 18, 10, 0, 30)));
  const list = vi.fn((_p?: unknown) => ({
    async *[Symbol.asyncIterator]() {
      for (const [id, reqs] of [...batches.entries()].reverse()) {
        yield { id, created_at: clock().toISOString(), request_counts: { processing: reqs.length, succeeded: 0, errored: 0, canceled: 0, expired: 0 } };
      }
    },
  }));
  const retrieve = vi.fn(async (id: string) => ({ id, processing_status: 'ended', request_counts: {} }));
  const results = vi.fn(async (id: string) => ({
    async *[Symbol.asyncIterator]() {
      if (o.crashOnResults) throw new Error('simulated crash while collecting');
      for (const r of batches.get(id) ?? []) {
        const text = o.respond(r.custom_id, r.params);
        yield text === null
          ? { custom_id: r.custom_id, result: { type: 'errored', error: { type: 'error', error: { type: 'api_error', message: 'x' } } } }
          : { custom_id: r.custom_id, result: { type: 'succeeded', message: textMessage(o.model, text, o.stopFor?.(r.custom_id, r.params) ?? o.stopReason) } };
      }
    },
  }));
  const client = { messages: { countTokens, batches: { create, retrieve, results, list } } } as unknown as Anthropic;
  return { client, countTokens, create, retrieve, results, list, batchRequests, batches };
}
