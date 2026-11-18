/**
 * In-memory stand-ins for the Supabase client and the Anthropic client (no network, no
 * database). The fake database enforces the bt_stance_answers constraints from the migration
 * that matter to the writer (quote rules, verified offset, lineage, FKs) and computes
 * bt_final_stances with the TypeScript mirror of the SQL view.
 */
import type { Db } from '../lib/supabase';
import { resolveFinal, type AnswerLite } from '../job2/flags';

type Row = Record<string, any>;

function getPath(r: Row, path: string): unknown {
  const parts = path.split(/->>|->/);
  let v: any = r;
  for (const p of parts) v = v == null ? undefined : v[p];
  return v;
}

const SERIAL = new Set(['bt_raw_responses', 'bt_stance_answers', 'bt_gold_marks']);

export class FakeDb {
  tables: Record<string, Row[]> = {};
  writes: Array<{ table: string; op: string; n: number }> = [];
  private seq: Record<string, number> = {};
  private clock = 0;

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [k, v] of Object.entries(seed)) this.tables[k] = v.map((r) => ({ ...r }));
  }

  rows(table: string): Row[] {
    if (table === 'bt_final_stances') return this.finalStances();
    return this.tables[table] ?? (this.tables[table] = []);
  }

  from(table: string) { return new Query(this, table); }
  asDb(): Db { return this as unknown as Db; }

  nextId(table: string): number { return (this.seq[table] = (this.seq[table] ?? 0) + 1); }
  stamp(): string { return new Date(Date.UTC(2026, 10, 18, 0, 0, this.clock++)).toISOString(); }

  check(table: string, row: Row): string | null {
    if (table === 'bt_runs' && this.rows('bt_runs').some((r) => r.id === row.id)) return 'duplicate key bt_runs';
    if (table === 'bt_prompts' && this.rows('bt_prompts').some((r) => r.prompt_hash === row.prompt_hash)) return 'duplicate key bt_prompts';
    if (table === 'bt_raw_responses') {
      if (!this.rows('bt_runs').some((r) => r.id === row.run_id)) return 'fk run';
      if (this.rows(table).some((r) => r.run_id === row.run_id && r.custom_id === row.custom_id)) return 'duplicate raw';
    }
    if (table === 'bt_stance_answers') {
      if (!this.rows('bt_runs').some((r) => r.id === row.run_id)) return 'fk run';
      if (!this.rows('bt_prompts').some((r) => r.prompt_hash === row.prompt_hash)) return 'fk prompt';
      if (row.raw_response_id != null && !this.rows('bt_raw_responses').some((r) => r.id === row.raw_response_id)) return 'fk raw';
      if (row.stance && row.stance !== 'not_addressed' && row.quote == null) return 'claim needs quote';
      if (row.valid && (row.stance == null || row.confidence == null)) return 'valid complete';
      if (row.quote != null && row.quote.trim() === '') return 'quote not blank';
      if (row.quote_verified && row.quote_norm_offset == null) return 'verified has offset';
      if (['first', 'pilot'].includes(row.pass) && (row.trigger_answer_id != null || row.recheck_answer_id != null)) return 'lineage first/pilot';
      if (row.pass === 'recheck' && (row.trigger_answer_id == null || row.recheck_answer_id != null)) return 'lineage recheck';
      if (row.pass === 'arbiter' && row.trigger_answer_id == null) return 'lineage arbiter';
      const dup = this.rows(table).some((r) => ['run_id', 'video_id', 'question_id', 'pass', 'attempt', 'model'].every((k) => r[k] === row[k]));
      if (dup) return 'duplicate cell';
    }
    return null;
  }

  private finalStances(): Row[] {
    const all = this.rows('bt_stance_answers');
    const lite = (a: Row): AnswerLite => ({ valid: a.valid, stance: a.stance, confidence: a.confidence, quote: a.quote, quoteVerified: a.quote_verified });
    const latest = (rows: Row[]) => rows.reduce<Row | undefined>((m, r) => (!m || r.id > m.id ? r : m), undefined);
    const firsts = new Map<string, Row>();
    for (const a of all.filter((x) => x.pass === 'first')) {
      const k = `${a.video_id}|${a.question_id}`;
      if (!firsts.has(k) || a.id > firsts.get(k)!.id) firsts.set(k, a);
    }
    return [...firsts.values()].map((f) => {
      const r = latest(all.filter((x) => x.pass === 'recheck' && x.trigger_answer_id === f.id));
      const a = latest(all.filter((x) => x.pass === 'arbiter' && x.trigger_answer_id === f.id));
      const res = resolveFinal(lite(f), r && lite(r), a && lite(a));
      const chosen = res.resolvedBy === 'first' ? f : res.resolvedBy === 'recheck' ? r : res.resolvedBy === 'arbiter' ? a : null;
      return {
        video_id: f.video_id, question_id: f.question_id, stance: chosen?.stance ?? null, confidence: chosen?.confidence ?? null,
        quote: chosen?.quote ?? null, quote_verified: chosen?.quote_verified ?? null, start_seconds: chosen?.start_seconds ?? null,
        deciding_model: chosen?.model ?? null, deciding_pass: chosen?.pass ?? null,
        first_answer_id: f.id, recheck_answer_id: r?.id ?? null, arbiter_answer_id: a?.id ?? null,
        final_answer_id: chosen?.id ?? null, status: res.status,
      };
    });
  }
}

class Query implements PromiseLike<{ data: any; error: any }> {
  private cols = '*';
  private filters: Array<(r: Row) => boolean> = [];
  private orderCol: string | null = null;
  private rng: [number, number] | null = null;
  private op: 'select' | 'insert' | 'update' = 'select';
  private payload: any = null;
  private returning: string | null = null;

  constructor(private db: FakeDb, private table: string) {}

  select(cols = '*') { if (this.op === 'insert' || this.op === 'update') this.returning = cols; else this.cols = cols; return this; }
  eq(col: string, val: unknown) { this.filters.push((r) => getPath(r, col) === val); return this; }
  in(col: string, vals: unknown[]) { this.filters.push((r) => vals.includes(getPath(r, col))); return this; }
  gt(col: string, val: any) { this.filters.push((r) => getPath(r, col) > val); return this; }
  limit(n: number) { this.rng = [0, n - 1]; return this; }
  order(col: string) { this.orderCol = col; return this; }
  range(a: number, b: number) { this.rng = [a, b]; return this; }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this; }

  private project(rows: Row[], cols: string): Row[] {
    if (cols.trim() === '*') return rows.map((r) => ({ ...r }));
    const specs = cols.split(',').map((c) => c.trim()).map((c) => {
      const m = /^([A-Za-z0-9_]+):(.+)$/.exec(c);
      const path = m ? m[2] : c;
      const name = m ? m[1] : path.split(/->>|->/).pop()!;
      return { name, path };
    });
    return rows.map((r) => Object.fromEntries(specs.map((s) => [s.name, getPath(r, s.path)])));
  }

  private exec(): { data: any; error: any } {
    const t = this.table;
    if (this.op === 'insert') {
      const out: Row[] = [];
      for (const raw of this.payload as Row[]) {
        const row: Row = { ...raw };
        if (SERIAL.has(t) && row.id === undefined) row.id = this.db.nextId(t);
        if (row.created_at === undefined) row.created_at = this.db.stamp();
        if (t === 'bt_runs') { row.batch_ids ??= []; row.finished_at ??= null; row.actual_usage ??= null; }
        const err = this.db.check(t, row);
        if (err) return { data: null, error: { message: err } };
        this.db.rows(t).push(row);
        out.push(row);
      }
      this.db.writes.push({ table: t, op: 'insert', n: out.length });
      return { data: this.returning ? this.project(out, this.returning) : null, error: null };
    }
    if (this.op === 'update') {
      if (t !== 'bt_runs') return { data: null, error: { message: `update on ${t} not allowed` } };
      const bad = Object.keys(this.payload).filter((k) => !['status', 'actual_usage', 'batch_ids', 'finished_at'].includes(k));
      if (bad.length) return { data: null, error: { message: `bt_runs: cannot update ${bad.join(',')}` } };
      const hit = this.db.rows(t).filter((x) => this.filters.every((f) => f(x)));
      for (const r of hit) Object.assign(r, this.payload);
      this.db.writes.push({ table: t, op: 'update', n: hit.length });
      return { data: this.returning ? this.project(hit, this.returning) : null, error: null };
    }
    let rows = this.db.rows(t).filter((r) => this.filters.every((f) => f(r)));
    if (this.orderCol) rows = [...rows].sort((a, b) => (a[this.orderCol!] < b[this.orderCol!] ? -1 : a[this.orderCol!] > b[this.orderCol!] ? 1 : 0));
    if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
    return { data: this.project(rows, this.cols), error: null };
  }

  then<R1 = any, R2 = never>(res?: ((v: { data: any; error: any }) => R1 | PromiseLike<R1>) | null, rej?: ((e: unknown) => R2 | PromiseLike<R2>) | null) {
    return Promise.resolve().then(() => this.exec()).then(res, rej);
  }
}

// ---------------------------------------------------------------------------------------

export interface FakeBatchRequest { custom_id: string; params: any }

export type Responder = (customId: string, params: any) =>
  | { type: 'succeeded'; message: any }
  | { type: 'errored'; error: any }
  | { type: 'expired' };

export function message(model: string, answers: unknown[], usage: Record<string, number> = {}) {
  return {
    id: 'msg_x', type: 'message', role: 'assistant', model, stop_reason: 'end_turn', stop_sequence: null,
    content: [{ type: 'text', text: JSON.stringify({ answers }) }],
    usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, ...usage },
  };
}

export class FakeAnthropic {
  created: Array<{ id: string; requests: FakeBatchRequest[]; created_at: string }> = [];
  countCalls = 0;
  /** When > 0, the next N create() calls register the batch but throw (a lost response). */
  loseNextCreates = 0;
  createOptions: unknown[] = [];
  constructor(private responder: Responder, private tokens = 1000) {}

  messages = {
    countTokens: async (_p: unknown) => { this.countCalls++; return { input_tokens: this.tokens }; },
    batches: {
      create: async ({ requests }: { requests: FakeBatchRequest[] }, opts?: unknown) => {
        this.createOptions.push(opts);
        const id = `msgbatch_${this.created.length + 1}`;
        this.created.push({ id, requests, created_at: new Date().toISOString() });
        if (this.loseNextCreates > 0) { this.loseNextCreates--; throw new Error('connection reset (response lost)'); }
        return { id, processing_status: 'in_progress' };
      },
      retrieve: async (id: string) => {
        const b = this.created.find((x) => x.id === id)!;
        return { id, processing_status: 'ended', request_counts: { processing: 0, succeeded: b.requests.length, errored: 0, canceled: 0, expired: 0 } };
      },
      list: (_p?: unknown) => {
        const self = this;
        return (async function* () {
          for (const b of [...self.created].reverse()) {
            yield { id: b.id, created_at: b.created_at, processing_status: 'ended', request_counts: { processing: 0, succeeded: b.requests.length, errored: 0, canceled: 0, expired: 0 } };
          }
        })();
      },
      results: async (id: string) => {
        const b = this.created.find((x) => x.id === id)!;
        const self = this;
        return (async function* () {
          for (const r of b.requests) yield { custom_id: r.custom_id, result: self.responder(r.custom_id, r.params) };
        })();
      },
    },
  };
}
