/**
 * Database glue for Job 2. Large tables are read with keyset paging; every write goes
 * through btInsert / btUpdateRun[If] (bt_* tables only). Transcript text never passes here.
 */
import { btInsert, selectAll, selectAllKeyset, type Db } from '../lib/supabase';
import type { AnswerLite } from './flags';
import type { Stance } from './answers';

export interface RunRow {
  id: string;
  job: string;
  pass: string | null;
  model: string;
  effort: string | null;
  status: string;
  params: Record<string, any>;
  estimate: Record<string, any> | null;
  batch_ids: string[];
  created_at?: string;
}

/** Statuses of a run that may still produce or collect paid work. */
export const NON_TERMINAL = ['estimated', 'submitting', 'submitted', 'collecting'] as const;

export async function fetchRunsByGroup(db: Db, group: string): Promise<RunRow[]> {
  const { data, error } = await db.from('bt_runs').select('*').eq('params->>group', group);
  if (error) throw new Error(`read bt_runs failed: ${error.message}`);
  return (data ?? []) as unknown as RunRow[];
}

export async function fetchRun(db: Db, id: string): Promise<RunRow | null> {
  const { data, error } = await db.from('bt_runs').select('*').eq('id', id);
  if (error) throw new Error(`read bt_runs failed: ${error.message}`);
  return ((data ?? [])[0] as RunRow | undefined) ?? null;
}

/** All stance runs (any status), oldest first. */
export async function fetchStanceRuns(db: Db): Promise<RunRow[]> {
  const rows = await selectAll<RunRow>(db, 'bt_runs', '*', { orderBy: 'id', filter: (q) => q.eq('job', 'stance') });
  return rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

/** Inserts the rows whose ids do not exist yet (idempotent estimate). Returns the ids inserted. */
export async function insertRunsIfAbsent(db: Db, rows: Array<Record<string, unknown> & { id: string }>): Promise<string[]> {
  const { data, error } = await db.from('bt_runs').select('id').in('id', rows.map((r) => r.id));
  if (error) throw new Error(`read bt_runs failed: ${error.message}`);
  const have = new Set(((data ?? []) as Array<{ id: string }>).map((r) => r.id));
  const fresh = rows.filter((r) => !have.has(r.id));
  if (fresh.length) await btInsert(db, 'bt_runs', fresh, { validateRefs: false });
  return fresh.map((r) => r.id);
}

export async function ensurePrompts(
  db: Db,
  rows: ReadonlyArray<{ prompt_hash: string; name: string; template: string; question_list: unknown; output_schema: unknown }>,
): Promise<number> {
  const uniq = new Map(rows.map((r) => [r.prompt_hash, r]));
  const hashes = [...uniq.keys()];
  const have = new Set<string>();
  for (let i = 0; i < hashes.length; i += 100) {
    const { data, error } = await db.from('bt_prompts').select('prompt_hash').in('prompt_hash', hashes.slice(i, i + 100));
    if (error) throw new Error(`read bt_prompts failed: ${error.message}`);
    for (const r of (data ?? []) as Array<{ prompt_hash: string }>) have.add(r.prompt_hash);
  }
  const fresh = hashes.filter((h) => !have.has(h)).map((h) => uniq.get(h)!);
  if (fresh.length) await btInsert(db, 'bt_prompts', fresh, { validateRefs: false, chunkSize: 50 });
  return fresh.length;
}

export interface RawRef {
  id: number;
  custom_id: string;
  result_type: 'succeeded' | 'errored' | 'canceled' | 'expired';
  stop_reason: string | null;
  /** error.type of an errored result (batch error body: {type:'error', error:{type,message}}). */
  err_type: string | null;
  /** response->>status when the stored error body carries one (string from the JSON path), else null. */
  err_status?: string | number | null;
}

export async function fetchRawRefs(db: Db, runId: string): Promise<RawRef[]> {
  return selectAllKeyset<RawRef & Record<string, unknown>>(
    db, 'bt_raw_responses', 'id, custom_id, result_type, stop_reason:response->>stop_reason, err_type:response->error->error->>type, err_status:response->>status',
    'id', (q) => q.eq('run_id', runId),
  );
}

/** Stored response bodies for the given raw ids (used when resuming after a crash). */
export async function fetchRawResponses(db: Db, ids: readonly number[]): Promise<Map<number, any>> {
  const out = new Map<number, any>();
  for (let i = 0; i < ids.length; i += 20) {
    const { data, error } = await db.from('bt_raw_responses').select('id, response').in('id', ids.slice(i, i + 20));
    if (error) throw new Error(`read bt_raw_responses failed: ${error.message}`);
    for (const r of (data ?? []) as Array<{ id: number; response: unknown }>) out.set(r.id, r.response);
  }
  return out;
}

/** Number of stance-answer rows per raw_response_id for a run (keyset-paged). */
export async function answerCountsByRaw(db: Db, runId: string): Promise<Map<number, number>> {
  const rows = await selectAllKeyset<{ id: number; raw_response_id: number | null }>(
    db, 'bt_stance_answers', 'id, raw_response_id', 'id', (q) => q.eq('run_id', runId),
  );
  const m = new Map<number, number>();
  for (const r of rows) if (r.raw_response_id != null) m.set(r.raw_response_id, (m.get(r.raw_response_id) ?? 0) + 1);
  return m;
}

// ---------- answers by id and pending cells (from bt_final_stances) ----------

export interface AnswerRecord extends AnswerLite {
  id: number;
  model: string;
}

export async function fetchAnswersByIds(db: Db, ids: readonly number[]): Promise<Map<number, AnswerRecord>> {
  const out = new Map<number, AnswerRecord>();
  const uniq = [...new Set(ids)];
  for (let i = 0; i < uniq.length; i += 200) {
    const { data, error } = await db
      .from('bt_stance_answers')
      .select('id, stance, confidence, quote, quote_verified, valid, model')
      .in('id', uniq.slice(i, i + 200));
    if (error) throw new Error(`read bt_stance_answers failed: ${error.message}`);
    for (const r of (data ?? []) as Array<{ id: number; stance: Stance | null; confidence: number | null; quote: string | null; quote_verified: boolean; valid: boolean; model: string }>) {
      out.set(r.id, { id: r.id, valid: r.valid, stance: r.stance, confidence: r.confidence, quote: r.quote, quoteVerified: r.quote_verified, model: r.model });
    }
  }
  return out;
}

export interface PendingCell {
  video_id: string;
  question_id: number;
  first_answer_id: number;
  recheck_answer_id: number | null;
}

export const VIEW_VIDEO_CHUNK = 200;

/**
 * Cells of bt_final_stances in the given status, read per chunk of <= 200 video ids so the
 * video filter is pushed into the view (never an unfiltered scan of the whole view).
 */
export async function fetchPendingCells(
  db: Db,
  status: 'pending_recheck' | 'pending_arbiter',
  videoIds: readonly string[],
): Promise<PendingCell[]> {
  const cols = 'video_id, question_id, first_answer_id, recheck_answer_id';
  const out: PendingCell[] = [];
  for (let i = 0; i < videoIds.length; i += VIEW_VIDEO_CHUNK) {
    const chunk = videoIds.slice(i, i + VIEW_VIDEO_CHUNK) as string[];
    out.push(...(await selectAllKeyset<PendingCell & Record<string, unknown>>(
      db, 'bt_final_stances', cols, 'first_answer_id', (q) => q.eq('status', status).in('video_id', chunk),
    )));
  }
  return out;
}

export async function countCells(db: Db, status: 'pending_recheck' | 'pending_arbiter', videoIds: readonly string[]): Promise<number> {
  return (await fetchPendingCells(db, status, videoIds)).length;
}

/** Video ids that already have first-pass answer rows (one probe row per video). */
export async function videosWithFirstPass(db: Db, probeQuestionId: number): Promise<Set<string>> {
  const rows = await selectAllKeyset<{ id: number; video_id: string }>(
    db, 'bt_stance_answers', 'id, video_id', 'id', (q) => q.eq('pass', 'first').eq('question_id', probeQuestionId),
  );
  return new Set(rows.map((r) => r.video_id));
}

export interface RawSummary {
  id: number;
  custom_id: string;
  model: string | null;
  result_type: 'succeeded' | 'errored' | 'canceled' | 'expired';
  stop_reason: string | null;
  usage: Record<string, any> | null;
}

/** Every raw response of a run (all attempts) with its usage object; no content is read. */
export async function fetchRawSummaries(db: Db, runId: string): Promise<RawSummary[]> {
  return selectAllKeyset<RawSummary & Record<string, unknown>>(
    db, 'bt_raw_responses', 'id, custom_id, model, result_type, stop_reason:response->>stop_reason, usage:response->usage',
    'id', (q) => q.eq('run_id', runId),
  );
}
