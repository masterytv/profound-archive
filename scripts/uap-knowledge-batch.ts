/**
 * UAP Knowledge Extraction Batch Script
 *
 * ⛔ ON HOLD since 2026-08-04 — too expensive at current model prices.
 *    Measured: $238 (Haiku 4.5) / $866 (Sonnet 5) per 10,000 videos.
 *    Reintroduce below $50 per 10,000. Full criteria and the steps to bring
 *    it back are in UAP_KNOWLEDGE_HOLD_NOTE in src/lib/pipeline/uap-knowledge.ts.
 *    The code below is migrated, typechecked and tested — it is switched off
 *    on price alone, not because anything is broken.
 *
 * Pushes Tier 2 videos that have transcripts but no extracted knowledge
 * (people_mentioned IS NULL) through the Anthropic Message Batches API —
 * one batch per run, 50% off standard token prices.
 *
 * Usage:
 *   npx tsx scripts/uap-knowledge-batch.ts
 *   npx tsx scripts/uap-knowledge-batch.ts --limit 20 --model claude-sonnet-5
 *   npx tsx scripts/uap-knowledge-batch.ts --dry-run             # no API call, cost estimate only
 *   npx tsx scripts/uap-knowledge-batch.ts --no-save --out r.json # spend, report, don't touch the DB
 *   npx tsx scripts/uap-knowledge-batch.ts --resume msgbatch_123  # collect an earlier batch
 *
 * Design notes:
 * - Results come back in arbitrary order, so everything is keyed by custom_id
 *   (= video_id), never by position.
 * - A video whose extraction fails in a way a retry can't fix is marked with a
 *   sentinel row rather than left NULL, so it stops being re-bought every run.
 *   Transport-level failures (errored/expired/canceled) stay NULL and retry.
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import {
  buildKnowledgeParams,
  parseKnowledgeMessage,
  knowledgeRowUpdate,
  failedExtractionRowUpdate,
  getAnthropic,
  UAP_KNOWLEDGE_MODEL_DEFAULT,
  UAP_TRANSCRIPT_CHAR_LIMIT,
  UAP_KNOWLEDGE_ON_HOLD,
  UAP_KNOWLEDGE_HOLD_NOTE,
} from '../src/lib/pipeline/uap-knowledge';
import { MODEL_PRICES, estimateCost } from '../src/lib/ai/pricing';
import { isPaused } from '../src/lib/ops/switches';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArgValue(name: string, defaultVal: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return parseInt(eq.split('=')[1], 10);
  return defaultVal;
}

function getArgString(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  return defaultVal;
}

const LIMIT = getArgValue('limit', 500);
const OFFSET = getArgValue('offset', 0);
const MODEL = getArgString('model', UAP_KNOWLEDGE_MODEL_DEFAULT);
const MAX_WAIT_MIN = getArgValue('max-wait-minutes', 120);
const POLL_SECONDS = getArgValue('poll-seconds', 30);
const RESUME_BATCH = getArgString('resume', '');
const OUT_FILE = getArgString('out', '');
const DRY_RUN = args.includes('--dry-run');
const NO_SAVE = args.includes('--no-save');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Cost ────────────────────────────────────────────────────────────────────

/** Batch API is 50% off both input and output tokens. */
const BATCH_DISCOUNT = 0.5;

function batchCost(model: string, inputTokens: number, outputTokens: number): number {
  const { costUsd } = estimateCost(model, {
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
  });
  return costUsd * BATCH_DISCOUNT;
}

const usd = (n: number) => `$${n.toFixed(4)}`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingVideo {
  videoId: string;
  title: string;
  transcript: string;
}

interface VideoResult {
  video_id: string;
  title: string;
  ok: boolean;
  reason?: string;
  people?: number;
  claims?: number;
  events?: number;
  programs?: number;
  technology?: number;
  consciousness?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (UAP_KNOWLEDGE_ON_HOLD) {
    console.error(`\n⛔ ${UAP_KNOWLEDGE_HOLD_NOTE}\n`);
    process.exit(1);
  }

  // The admin pause switch, honored here rather than at an HTTP route: this
  // script is launched by the Oracle crontab and by GitHub Actions, neither of
  // which passes through a route handler. Exit 0 — a pause is a deliberate,
  // healthy state, and a non-zero exit would read as a failed cron job.
  if (await isPaused('uap_tier2_intake')) {
    console.log('\n⏸  uap_tier2_intake is paused via admin cost control — skipping.\n');
    return;
  }

  console.log(`\n🔬 UAP Knowledge Extraction Batch`);
  console.log(`   Model:   ${MODEL}`);
  console.log(`   Limit:   ${LIMIT}`);
  console.log(`   Offset:  ${OFFSET}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log(`   Save:    ${NO_SAVE ? 'NO (results printed only)' : 'yes'}`);
  if (!MODEL_PRICES[MODEL]) {
    console.warn(`   ⚠️  No price entry for "${MODEL}" — costs will report as $0.`);
  }

  if (!DRY_RUN && !process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ Missing ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  // Resuming skips selection entirely — the batch already exists upstream.
  if (RESUME_BATCH) {
    console.log(`\n♻️  Resuming batch ${RESUME_BATCH}\n`);
    const client = getAnthropic();
    const batch = await waitForBatch(client, RESUME_BATCH);
    if (!batch) process.exit(1);
    await collectResults(client, RESUME_BATCH, new Map());
    return;
  }

  // ─── Status ──────────────────────────────────────────────────────────────
  const { count: totalAnalysis } = await supabase
    .from('uap_analysis')
    .select('*', { count: 'exact', head: true });

  const { count: alreadyExtracted } = await supabase
    .from('uap_analysis')
    .select('*', { count: 'exact', head: true })
    .not('people_mentioned', 'is', null);

  console.log(`\n📊 Analysis Status:`);
  console.log(`   Total analysis rows: ${totalAnalysis}`);
  console.log(`   Already extracted:   ${alreadyExtracted}`);
  console.log(`   Pending:             ${(totalAnalysis || 0) - (alreadyExtracted || 0)}\n`);

  // ─── Select ──────────────────────────────────────────────────────────────
  const { data: pending, error: fetchError } = await supabase
    .from('uap_analysis')
    .select(`
      video_id,
      uap_vids!inner(title, subtitles_punctuated, tier)
    `)
    .is('people_mentioned', null)
    .order('video_id')
    .range(OFFSET, OFFSET + LIMIT - 1);

  if (fetchError) {
    console.error('❌ Error fetching pending videos:', fetchError.message);
    process.exit(1);
  }

  if (!pending || pending.length === 0) {
    console.log('✅ No pending videos need knowledge extraction.');
    return;
  }

  const eligible: PendingVideo[] = [];
  for (const row of pending as any[]) {
    const vid = row.uap_vids;
    if (vid?.subtitles_punctuated && vid.subtitles_punctuated.length > 100) {
      eligible.push({
        videoId: row.video_id,
        title: vid.title || '',
        transcript: vid.subtitles_punctuated,
      });
    }
  }

  const skipped = pending.length - eligible.length;
  console.log(
    `🚀 ${eligible.length} eligible (${pending.length} fetched, ${skipped} skipped for missing transcripts)`,
  );

  if (eligible.length === 0) {
    console.log('✅ Nothing to submit.');
    return;
  }

  // ─── Cost estimate up front ──────────────────────────────────────────────
  // ~4 chars/token, plus ~2k system-prompt tokens; output assumed ~2.5k/video.
  const estInput = eligible.reduce(
    (sum, v) => sum + Math.min(v.transcript.length, UAP_TRANSCRIPT_CHAR_LIMIT) / 4 + 2000,
    0,
  );
  const estOutput = eligible.length * 2500;
  const estCost = batchCost(MODEL, estInput, estOutput);
  console.log(
    `\n💰 Estimated cost: ~${usd(estCost)} ` +
      `(~${Math.round(estInput / 1000)}k in / ~${Math.round(estOutput / 1000)}k out, batch pricing)`,
  );
  console.log(`   Rough estimate — actual cost is reported from returned usage.\n`);

  if (DRY_RUN) {
    for (const v of eligible.slice(0, 10)) {
      console.log(`  🔍 Would extract: "${v.title}" (${v.videoId}) — ${v.transcript.length} chars`);
    }
    if (eligible.length > 10) console.log(`  … and ${eligible.length - 10} more`);
    console.log('\n✅ Dry run complete — no API call made.');
    return;
  }

  // ─── Submit ──────────────────────────────────────────────────────────────
  const client = getAnthropic();
  const byId = new Map(eligible.map((v) => [v.videoId, v]));

  let batchId: string;
  try {
    const batch = await client.messages.batches.create({
      requests: eligible.map((v) => ({
        custom_id: v.videoId,
        params: buildKnowledgeParams(v.transcript, v.title, MODEL),
      })),
    });
    batchId = batch.id;
    console.log(`📤 Submitted batch ${batchId} (${eligible.length} requests)`);
  } catch (error) {
    reportFatal(error, 'submitting the batch');
    process.exit(1);
  }

  const finished = await waitForBatch(client, batchId);
  if (!finished) {
    console.error(
      `\n⏳ Batch did not finish within ${MAX_WAIT_MIN} minutes. It is still running and already paid for.\n` +
        `   Collect it later with:\n` +
        `     npx tsx scripts/uap-knowledge-batch.ts --resume ${batchId}\n`,
    );
    process.exit(1);
  }

  await collectResults(client, batchId, byId);
}

/**
 * Polls until the batch ends. Returns false on timeout — the caller reports the
 * batch id so the run can be collected later instead of the spend being lost.
 */
async function waitForBatch(client: Anthropic, batchId: string): Promise<boolean> {
  const deadline = Date.now() + MAX_WAIT_MIN * 60_000;

  while (Date.now() < deadline) {
    let batch;
    try {
      batch = await client.messages.batches.retrieve(batchId);
    } catch (error) {
      reportFatal(error, 'polling the batch');
      process.exit(1);
    }

    if (batch.processing_status === 'ended') {
      const c = batch.request_counts;
      console.log(
        `\n✅ Batch ended — succeeded ${c.succeeded}, errored ${c.errored}, ` +
          `canceled ${c.canceled}, expired ${c.expired}`,
      );
      return true;
    }

    const c = batch.request_counts;
    console.log(
      `   ⏳ ${batch.processing_status}: ${c.processing} processing, ${c.succeeded} done, ${c.errored} errored`,
    );
    await sleep(POLL_SECONDS * 1000);
  }

  return false;
}

/** Streams batch results, writes rows, and prints the run summary. */
async function collectResults(
  client: Anthropic,
  batchId: string,
  byId: Map<string, PendingVideo>,
) {
  const results: VideoResult[] = [];
  let saved = 0;
  let markedFailed = 0;
  let retryable = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  console.log('');

  for await (const entry of await client.messages.batches.results(batchId)) {
    const videoId = entry.custom_id;
    const title = byId.get(videoId)?.title ?? '';

    // Transport-level failures: leave people_mentioned NULL so the video is
    // retried on a later run. These are not the treadmill — bad model output is.
    if (entry.result.type !== 'succeeded') {
      const detail =
        entry.result.type === 'errored'
          ? `${entry.result.error.type}`
          : entry.result.type;
      retryable++;
      results.push({ video_id: videoId, title, ok: false, reason: `retryable: ${detail}` });
      console.error(`  ↩️  ${videoId}: ${detail} — left pending for retry`);
      continue;
    }

    const message = entry.result.message;
    inputTokens += message.usage.input_tokens;
    outputTokens += message.usage.output_tokens;
    const cost = batchCost(message.model, message.usage.input_tokens, message.usage.output_tokens);

    const outcome = parseKnowledgeMessage(message);

    if (!outcome.ok) {
      markedFailed++;
      results.push({
        video_id: videoId,
        title,
        ok: false,
        reason: outcome.reason,
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        cost_usd: cost,
      });
      console.error(`  ⚠️  ${videoId}: ${outcome.reason} — marking failed`);

      if (!NO_SAVE) {
        const { error } = await supabase
          .from('uap_analysis')
          .update(failedExtractionRowUpdate(outcome.reason, message.model))
          .eq('video_id', videoId);
        if (error) console.error(`      ❌ sentinel write failed: ${error.message}`);
      }
      continue;
    }

    const k = outcome.data;
    results.push({
      video_id: videoId,
      title,
      ok: true,
      people: k.people_mentioned.length,
      claims: k.claims.length,
      events: k.timeline_events.length,
      programs: k.programs_mentioned.length,
      technology: k.technology_described.length,
      consciousness: k.consciousness_connections.length,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cost_usd: cost,
    });

    if (!NO_SAVE) {
      const { error } = await supabase
        .from('uap_analysis')
        .update(knowledgeRowUpdate(k))
        .eq('video_id', videoId);
      if (error) {
        console.error(`  ❌ ${videoId}: DB update failed: ${error.message}`);
        continue;
      }
    }

    saved++;
    console.log(
      `  ✅ ${videoId}: ${k.people_mentioned.length} people, ${k.claims.length} claims, ` +
        `${k.timeline_events.length} events, ${k.programs_mentioned.length} programs`,
    );
  }

  const total = results.length;
  const actualCost = batchCost(MODEL, inputTokens, outputTokens);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Batch:            ${batchId}`);
  console.log(`Model:            ${MODEL}`);
  console.log(`Results:          ${total}`);
  console.log(`Extracted:        ${saved}${NO_SAVE ? ' (not written — --no-save)' : ''}`);
  console.log(`Marked failed:    ${markedFailed}  (won't be re-bought)`);
  console.log(`Retryable:        ${retryable}  (still pending)`);
  console.log(`Tokens:           ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out`);
  console.log(`Actual cost:      ${usd(actualCost)}  (batch pricing)`);
  if (total > 0) {
    console.log(`Per video:        ${usd(actualCost / total)}`);
    console.log(`Success rate:     ${((saved / total) * 100).toFixed(1)}%`);
  }
  console.log(`${'─'.repeat(60)}\n`);

  if (OUT_FILE) {
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify(
        {
          batch_id: batchId,
          model: MODEL,
          total,
          saved,
          marked_failed: markedFailed,
          retryable,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: actualCost,
          results,
        },
        null,
        2,
      ),
    );
    console.log(`📝 Wrote ${OUT_FILE}\n`);
  }
}

/** Auth and spend failures are terminal — say so plainly instead of grinding. */
function reportFatal(error: unknown, whileDoing: string) {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error(`\n❌ Authentication failed while ${whileDoing}. Check ANTHROPIC_API_KEY.`);
  } else if (error instanceof Anthropic.PermissionDeniedError) {
    console.error(
      `\n❌ Permission denied while ${whileDoing} — usually the workspace spend limit. Aborting.`,
    );
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error(`\n❌ Rate limited while ${whileDoing}. Try again later.`);
  } else {
    console.error(`\n❌ Failed while ${whileDoing}:`, error);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
