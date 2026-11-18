/**
 * Database glue for Job 2. Reads are paged; every write goes through btInsert / btUpdateRun
 * (bt_* tables only). Transcript text never passes through here.
 */
import { btInsert, btUpdateRun, selectAll, type Db } from '../lib/supabase';
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

export async function fetchRunsByGroup(db: Db, group: string): Promise<RunRow[]> {
  const { data, error } = await db.from('bt_runs').select('*').eq('params->>group', group);
  if (error) throw new Error(`read bt_runs failed: ${error.message}`);
  return (data ?? []) as unknown as RunRow[];
}

/** All stance runs (any status), newest last. */
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
}

export async function fetchRawRefs(db: Db, runId: string): Promise<RawRef[]> {
  return selectAll<RawRef>(db, 'bt_raw_responses', 'id, custom_id, result_type, stop_reason:response->>stop_reason, err_type:response->error->error->>type', {
    orderBy: 'id', filter: (q) => q.eq('run_id', runId),
  });
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

/** raw_response_ids of a run that already have at least one stance-answer row. */
export async function answeredRawIds(db: Db, runId: string): Promise<Set<number>> {
  const rows = await selectAll<{ id: number; raw_response_id: number | null }>(db, 'bt_stance_answers', 'id, raw_response_id', {
    orderBy: 'id', filter: (q) => q.eq('run_id', runId),
  });
  return new Set(rows.map((r) => r.raw_response_id).filter((x): x is number => x != null));
}

export async function appendBatchId(db: Db, run: RunRow, batchId: string, status: string): Promise<void> {
  const next = [...(run.batch_ids ?? []), batchId];
  await btUpdateRun(db, run.id, { batch_ids: next, status });
  run.batch_ids = next;
  run.status = status;
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

/** Cells of bt_final_stances in the given status ('pending_recheck' | 'pending_arbiter'). */
export async function fetchPendingCells(
  db: Db,
  status: 'pending_recheck' | 'pending_arbiter',
  videoIds?: readonly string[],
): Promise<PendingCell[]> {
  const cols = 'video_id, question_id, first_answer_id, recheck_answer_id';
  const run = (ids?: readonly string[]) =>
    selectAll<PendingCell>(db, 'bt_final_stances', cols, {
      orderBy: 'first_answer_id',
      filter: (q) => {
        let x = q.eq('status', status);
        if (ids) x = x.in('video_id', ids as string[]);
        return x;
      },
    });
  if (!videoIds) return run();
  const out: PendingCell[] = [];
  for (let i = 0; i < videoIds.length; i += 50) out.push(...(await run(videoIds.slice(i, i + 50))));
  return out;
}

/** Number of cells currently in a status for the video scope (for coverage checks). */
export async function countCells(db: Db, status: string, videoIds?: readonly string[]): Promise<number> {
  const rows = await fetchPendingCells(db, status as 'pending_recheck', videoIds);
  return rows.length;
}

/** Video ids that already have first-pass answer rows (one probe row per video). */
export async function videosWithFirstPass(db: Db, probeQuestionId: number): Promise<Set<string>> {
  const rows = await selectAll<{ id: number; video_id: string }>(db, 'bt_stance_answers', 'id, video_id', {
    orderBy: 'id', filter: (q) => q.eq('pass', 'first').eq('question_id', probeQuestionId),
  });
  return new Set(rows.map((r) => r.video_id));
}

export interface UsageRow { custom_id: string; model: string | null; usage: Record<string, any> | null }

/** Usage objects of succeeded raw responses of a run (no content is read). */
export async function fetchUsages(db: Db, runId: string): Promise<UsageRow[]> {
  return selectAll<UsageRow & { id: number }>(db, 'bt_raw_responses', 'id, custom_id, model, usage:response->usage', {
    orderBy: 'id', filter: (q) => q.eq('run_id', runId).eq('result_type', 'succeeded'),
  });
}
