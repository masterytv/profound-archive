/**
 * Submit / collect driver shared by judge-pairs and extract-names.
 *
 * - The batch id is recorded in bt_runs.batch_ids BEFORE polling (lib/batch.createBatch contract).
 * - Every result is stored in bt_raw_responses (UNIQUE run_id+custom_id, so resuming never
 *   duplicates), then handed to the caller's handler with its raw_response id.
 * - errored/expired/canceled requests are re-submitted in a new batch of the same run with
 *   attempt+1 (up to maxAttempts). Invalid-but-billed output is NOT retried automatically.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { collectBatch, makeCustomId, parseCustomId, runBatch, type BatchRequest, type ClassifiedResult, type CollectedBatch, type RequestParams } from '../lib/batch';
import { addUsage, emptyTotals, type UsageTotals } from '../lib/cost';
import { btInsert, btUpdateRun, selectAll } from '../lib/supabase';
import type { Ctx } from './cli';

export interface CollectedRow {
  customId: string;
  key: string;
  attempt: number;
  kind: string;
  message?: Anthropic.Messages.Message;
  rawId: number;
}

export interface DriverBase {
  ctx: Ctx;
  client: Anthropic;
  runId: string;
  model: string;
  pass: string;
  /** Called once per collected batch with rows not yet seen by this process. */
  onCollected: (rows: CollectedRow[]) => Promise<void>;
}

export interface RunOutcome {
  usage: UsageTotals;
  /** keys with no succeeded result after all attempts */
  unresolved: string[];
  batchIds: string[];
}

async function processCollected(d: DriverBase, collected: CollectedBatch, usage: UsageTotals): Promise<void> {
  const { db } = d.ctx;
  const existing = new Map(
    (await selectAll<{ id: number; custom_id: string }>(db, 'bt_raw_responses', 'id, custom_id', {
      orderBy: 'id',
      filter: (q) => q.eq('run_id', d.runId),
    })).map((r) => [r.custom_id, r.id]),
  );
  const fresh: Array<ClassifiedResult> = [];
  for (const r of collected.results.values()) {
    if (r.kind === 'succeeded' && r.message) addUsage(usage, d.model, r.message.usage as never);
    if (!existing.has(r.customId)) fresh.push(r);
  }
  if (fresh.length) {
    const inserted = await btInsert(
      db,
      'bt_raw_responses',
      fresh.map((r) => ({
        run_id: d.runId,
        custom_id: r.customId,
        batch_id: collected.batch.id,
        model: d.model,
        model_version: r.message?.model ?? null,
        result_type: r.kind,
        response: r.kind === 'succeeded' ? r.message : r.kind === 'errored' ? { error: r.error ?? null } : {},
      })),
      { select: 'id, custom_id', validateRefs: false, chunkSize: 100 },
    );
    for (const row of inserted) existing.set(row.custom_id as string, row.id as number);
  }
  const rows: CollectedRow[] = [];
  for (const r of collected.results.values()) {
    const parts = parseCustomId(r.customId, d.runId);
    rows.push({ customId: r.customId, key: parts.key, attempt: parts.attempt, kind: r.kind, message: r.message, rawId: existing.get(r.customId)! });
  }
  await d.onCollected(rows);
}

export async function submitRun(d: DriverBase & { items: Array<{ key: string; params: RequestParams }>; maxAttempts: number }): Promise<RunOutcome> {
  const usage = emptyTotals();
  const batchIds: string[] = [];
  let pending = d.items;
  for (let attempt = 1; attempt <= d.maxAttempts && pending.length > 0; attempt++) {
    const requests: BatchRequest[] = pending.map((it) => ({
      custom_id: makeCustomId({ run: d.runId, key: it.key, pass: d.pass, attempt }),
      params: it.params,
    }));
    d.ctx.log(`submitting batch: ${requests.length} requests (attempt ${attempt})`);
    const collected = await runBatch(d.client, requests, {
      sleep: d.ctx.sleep,
      onCreated: async (id) => {
        batchIds.push(id);
        await btUpdateRun(d.ctx.db, d.runId, { batch_ids: [...batchIds], status: 'submitted' });
        d.ctx.log(`batch ${id} recorded in bt_runs.batch_ids; polling`);
      },
      onTick: (b) => d.ctx.log(`  batch ${b.id}: ${b.processing_status} ${JSON.stringify(b.request_counts)}`),
    });
    await processCollected(d, collected, usage);
    const retry = new Set(collected.retryable.map((c) => parseCustomId(c, d.runId).key));
    pending = d.items.filter((it) => retry.has(it.key));
  }
  return { usage, unresolved: pending.map((p) => p.key), batchIds };
}

export async function resumeRun(d: DriverBase & { batchIds: string[] }): Promise<RunOutcome> {
  const usage = emptyTotals();
  const failed = new Set<string>();
  for (const id of d.batchIds) {
    d.ctx.log(`collecting batch ${id}`);
    const collected = await collectBatch(d.client, id, { sleep: d.ctx.sleep, onTick: (b) => d.ctx.log(`  batch ${b.id}: ${b.processing_status}`) });
    await processCollected(d, collected, usage);
    for (const c of collected.retryable) failed.add(parseCustomId(c, d.runId).key);
  }
  return { usage, unresolved: [...failed], batchIds: d.batchIds };
}

export function usageSummary(u: UsageTotals): Record<string, number> {
  return {
    requests: u.requests, input_tokens: u.inputTokens, output_tokens: u.outputTokens,
    cache_read_tokens: u.cacheReadTokens, cache_write_tokens: u.cacheWriteTokens, cost_usd: Math.round(u.costUsd * 1e6) / 1e6,
  };
}
