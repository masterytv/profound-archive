/**
 * Supabase service-role client + guarded helpers.
 *
 * Reads are generic (paged). Writes go through btInsert / btUpdateRun ONLY, which
 * refuse any table whose name does not start with `bt_`, so a bug in a job script
 * cannot touch the existing tables. Migration also blocks UPDATE/DELETE on bt_*.
 * There are no DB foreign keys to existing tables, so btInsert validates video /
 * question / profile ids against them (batched SELECTs) before writing.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, type Env } from './env';

export type Db = SupabaseClient;

/** RPC functions a job script may call. Empty by default: any rpc() call throws. */
export const READ_ONLY_RPC_ALLOWLIST: ReadonlySet<string> = new Set<string>();

const WRITE_OPS = new Set(['insert', 'update', 'upsert', 'delete']);
const BT_TABLE_NAME = /^bt_[a-z][a-z0-9_]*$/;

export interface GuardOptions {
  /** Function names rpc() may call (must be read-only in the database). */
  rpcAllowlist?: ReadonlySet<string>;
}

/**
 * Wraps a Supabase client so job code cannot write outside bt_*:
 *  - from(t) for a non-bt_ table exposes ONLY select(); insert/update/upsert/delete throw
 *  - rpc(name) throws unless `name` is in the explicit read-only allowlist (empty by default)
 *  - every other client member (schema, storage, functions, auth, channel, ...) is unavailable,
 *    so there is no side door around from()/rpc().
 * bt_ tables are fully accessible here; the database itself enforces append-only there.
 */
export function createGuardedClient(real: SupabaseClient, opts: GuardOptions = {}): Db {
  const allow = opts.rpcAllowlist ?? READ_ONLY_RPC_ALLOWLIST;
  const from = (table: string) => {
    const builder = real.from(table);
    if (BT_TABLE_NAME.test(table)) return builder;
    return new Proxy(builder, {
      get(target, prop) {
        if (prop === 'select') return target.select.bind(target);
        if (typeof prop === 'string' && WRITE_OPS.has(prop)) {
          return () => {
            throw new Error(`Refusing ${prop} on "${table}": only bt_ tables may be written`);
          };
        }
        if (typeof prop === 'symbol' || prop === 'then') return undefined;
        throw new Error(`"${String(prop)}" is not available on non-bt_ table "${table}" (read-only: select only)`);
      },
    });
  };
  const rpc = (name: string, ...rest: unknown[]) => {
    if (!allow.has(name)) throw new Error(`rpc("${name}") is not in the read-only allowlist`);
    return (real.rpc as (n: string, ...r: unknown[]) => unknown)(name, ...rest);
  };
  return new Proxy({} as SupabaseClient, {
    get(_t, prop) {
      if (prop === 'from') return from;
      if (prop === 'rpc') return rpc;
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      throw new Error(`Supabase client member "${String(prop)}" is not available through the guarded client`);
    },
  });
}

/** Service-role client, always wrapped by the write guard. */
export function createServiceClient(env: Env = process.env, opts: GuardOptions = {}): Db {
  const cfg = getSupabaseConfig(env);
  return createGuardedClient(
    createClient(cfg.url, cfg.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    opts,
  );
}

const BT_TABLE = /^bt_[a-z][a-z0-9_]*$/;

export function assertBtTable(table: string): void {
  if (!BT_TABLE.test(table)) {
    throw new Error(`Refusing to write to "${table}": only tables starting with "bt_" may be written`);
  }
}

/** Bookkeeping columns of bt_runs, the only UPDATE the schema permits. */
export const RUN_BOOKKEEPING_COLUMNS = ['status', 'actual_usage', 'batch_ids', 'finished_at'] as const;

// ---- referential checks against existing tables (no DB-level FKs; see migration) ----

/** Existing-table id columns that bt_* rows refer to, by the bt_* column that holds them. */
export const REF_TARGETS = {
  video_id: { table: 'nde_vids', column: 'videoId' },
  question_id: { table: 'nde_questions', column: 'id' },
  profile_id: { table: 'experiencer_profiles', column: 'id' },
} as const;

export type RefColumn = keyof typeof REF_TARGETS;

/**
 * Returns the ids (deduplicated) that do NOT exist in `table.column`, using batched
 * `SELECT column ... WHERE column IN (...)`. Read-only.
 */
export async function findMissingIds<T extends string | number>(
  db: Db,
  table: string,
  column: string,
  ids: Iterable<T>,
  chunkSize = 200,
): Promise<T[]> {
  const wanted = [...new Set(ids)];
  const found = new Set<T>();
  for (let i = 0; i < wanted.length; i += chunkSize) {
    const chunk = wanted.slice(i, i + chunkSize);
    const { data, error } = await db.from(table).select(column).in(column, chunk);
    if (error) throw new Error(`existence check on ${table}.${column} failed: ${error.message}`);
    for (const row of (data ?? []) as unknown as Array<Record<string, T>>) found.add(row[column]);
  }
  return wanted.filter((id) => !found.has(id));
}

async function assertAllExist<T extends string | number>(db: Db, col: RefColumn, ids: Iterable<T>): Promise<void> {
  const { table, column } = REF_TARGETS[col];
  const missing = await findMissingIds(db, table, column, ids);
  if (missing.length) {
    const shown = missing.slice(0, 10).join(', ');
    throw new Error(`${missing.length} ${col}(s) not found in ${table}.${column}: ${shown}${missing.length > 10 ? ', ...' : ''}`);
  }
}

export const assertVideoIdsExist = (db: Db, ids: Iterable<string>) => assertAllExist(db, 'video_id', ids);
export const assertQuestionIdsExist = (db: Db, ids: Iterable<number>) => assertAllExist(db, 'question_id', ids);
export const assertProfileIdsExist = (db: Db, ids: Iterable<number>) => assertAllExist(db, 'profile_id', ids);

export interface CollectedRefs {
  video_id: Set<string>;
  question_id: Set<number>;
  profile_id: Set<number>;
}

/**
 * Gathers every video / question / profile id referenced by the rows: the `video_id`,
 * `question_id` and `profile_id` columns, plus the id inside `person_key` ("profile:<id>")
 * and merge-candidate keys (`key_a`, `key_b`).
 */
export function collectRefs(rows: ReadonlyArray<Record<string, unknown>>): CollectedRefs {
  const refs: CollectedRefs = { video_id: new Set(), question_id: new Set(), profile_id: new Set() };
  const addProfileKey = (v: unknown) => {
    if (typeof v !== 'string') return;
    const m = /^profile:(\d+)$/.exec(v);
    if (m) refs.profile_id.add(Number(m[1]));
  };
  for (const r of rows) {
    if (r.video_id != null) refs.video_id.add(String(r.video_id));
    if (r.question_id != null) refs.question_id.add(Number(r.question_id));
    if (r.profile_id != null) refs.profile_id.add(Number(r.profile_id));
    addProfileKey(r.person_key);
    addProfileKey(r.key_a);
    addProfileKey(r.key_b);
  }
  return refs;
}

/** Validates every id the rows refer to against the existing tables (batched SELECTs). */
export async function validateRowRefs(db: Db, rows: ReadonlyArray<Record<string, unknown>>): Promise<void> {
  const refs = collectRefs(rows);
  await assertVideoIdsExist(db, refs.video_id);
  await assertQuestionIdsExist(db, refs.question_id);
  await assertProfileIdsExist(db, refs.profile_id);
}

/**
 * Append rows to a bt_* table. Refuses non-bt_ tables, and (unless `validateRefs: false`)
 * checks every referenced video / question / profile id exists BEFORE inserting anything.
 */
export async function btInsert<T extends Record<string, unknown>>(
  db: Db,
  table: string,
  rows: T | T[],
  opts: { select?: string; chunkSize?: number; validateRefs?: boolean } = {},
): Promise<Record<string, unknown>[]> {
  assertBtTable(table);
  const list = Array.isArray(rows) ? rows : [rows];
  if (list.length === 0) return [];
  if (opts.validateRefs !== false) await validateRowRefs(db, list);
  const chunkSize = opts.chunkSize ?? 500;
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    const chunk = list.slice(i, i + chunkSize);
    const q = db.from(table).insert(chunk);
    const { data, error } = opts.select ? await q.select(opts.select) : await q;
    if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
    if (data) out.push(...(data as unknown as Record<string, unknown>[]));
  }
  return out;
}

/** Updates only the bookkeeping columns of one bt_runs row. */
export async function btUpdateRun(
  db: Db,
  runId: string,
  patch: Partial<Record<(typeof RUN_BOOKKEEPING_COLUMNS)[number], unknown>>,
): Promise<void> {
  const keys = Object.keys(patch);
  const bad = keys.filter((k) => !(RUN_BOOKKEEPING_COLUMNS as readonly string[]).includes(k));
  if (bad.length) throw new Error(`bt_runs: only ${RUN_BOOKKEEPING_COLUMNS.join(', ')} are updatable (got ${bad.join(', ')})`);
  if (keys.length === 0) return;
  const { error } = await db.from('bt_runs').update(patch).eq('id', runId);
  if (error) throw new Error(`update bt_runs ${runId} failed: ${error.message}`);
}

/**
 * Paged read of every row. `orderBy` must be a unique column so paging is stable.
 * Never pass transcript columns here; use transcript.ts.
 */
export async function selectAll<T = Record<string, unknown>>(
  db: Db,
  table: string,
  columns: string,
  opts: { orderBy: string; pageSize?: number; filter?: (q: any) => any } = { orderBy: 'id' },
): Promise<T[]> {
  const pageSize = opts.pageSize ?? 1000;
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    let q = db.from(table).select(columns).order(opts.orderBy, { ascending: true }).range(from, from + pageSize - 1);
    if (opts.filter) q = opts.filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`select from ${table} failed: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

export interface QuestionRow {
  id: number;
  category: string | null;
  /** The consumer-facing wording used in prompts and tallies (SPEC: consumer_question). */
  consumer_question: string | null;
  /** Curated question text; fallback when consumer_question is null. */
  question: string;
}

/** Active question bank (id, category, consumer_question, question). */
export function readActiveQuestions(db: Db): Promise<QuestionRow[]> {
  return selectAll<QuestionRow>(db, 'nde_questions', 'id, category, consumer_question, question', {
    orderBy: 'id',
    filter: (q) => q.eq('is_active', true),
  });
}

/** Video ids of the NDE set (nde_analysis.experience_type = 'nde'). */
export async function readNdeVideoIds(db: Db): Promise<string[]> {
  const rows = await selectAll<{ video_id: string }>(db, 'nde_analysis', 'video_id', {
    orderBy: 'video_id',
    filter: (q) => q.eq('experience_type', 'nde'),
  });
  return rows.map((r) => r.video_id);
}
