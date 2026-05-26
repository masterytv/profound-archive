/**
 * Rapid Scanner Batch Processor
 *
 * Processes ALL pending videos from uap_scan_queue (and optionally scan_queue
 * for NDE) using the local pipeline — no HTTP calls, no APP_DIRECT_URL needed.
 *
 * Same pattern as uap-playlist-intake-batch.ts but:
 * - Processes ALL priorities (not just playlist priority 1)
 * - Supports UAP, NDE, or both domains
 * - Adds detailed progress reporting with ETA
 * - Logs to a persistent file in logs/
 *
 * Usage (run from host terminal, NOT Antigravity sandbox):
 *   npx tsx scripts/rapid-process.ts                  # UAP (default)
 *   DOMAIN=nde npx tsx scripts/rapid-process.ts       # NDE only
 *   DOMAIN=both npx tsx scripts/rapid-process.ts      # UAP then NDE
 *   CONCURRENCY=1 npx tsx scripts/rapid-process.ts    # Sequential (safer)
 *   CONCURRENCY=5 npx tsx scripts/rapid-process.ts    # Aggressive
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { processUapVideoIntake } from '../src/lib/pipeline/intake-uap';
import { processVideoIntake } from '../src/lib/pipeline/intake';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ─── Configuration ──────────────────────────────────────────────────────────

const DOMAIN = (process.env.DOMAIN || 'uap').toLowerCase(); // uap | nde | both
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);

// ─── State ──────────────────────────────────────────────────────────────────

let isShuttingDown = false;

process.on('SIGINT', () => {
  console.log('\n\n🛑 [SIGINT] Shutting down gracefully... Waiting for in-flight videos to finish.');
  isShuttingDown = true;
});

// ─── Logging ────────────────────────────────────────────────────────────────

const logsDir = path.join(process.cwd(), 'logs');
fs.mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logFile = path.join(logsDir, `rapid-process_${DOMAIN}_${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// ─── Stats Tracker ──────────────────────────────────────────────────────────

interface Stats {
  success: number;
  skipped: number;
  failed: number;
  total: number;
  startTime: number;
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

function printProgress(stats: Stats, pendingCount: number, label: string) {
  const elapsed = Date.now() - stats.startTime;
  const avgMs = stats.total > 0 ? elapsed / stats.total : 0;
  const remaining = pendingCount - stats.total;
  const etaMs = remaining > 0 ? remaining * avgMs : 0;

  log(`📊 ── ${label} Progress Report ──`);
  log(`   Processed: ${stats.total}/${pendingCount} | ✅ ${stats.success} | ⏭️ ${stats.skipped} | ❌ ${stats.failed}`);
  log(`   Elapsed: ${formatDuration(elapsed)} | Avg: ${formatDuration(avgMs)}/video | ETA: ~${formatDuration(etaMs)}`);
}

// ─── Domain Processor ───────────────────────────────────────────────────────

interface DomainConfig {
  label: string;
  queueTable: string;
  intakeFn: (videoUrl: string) => Promise<any>;
}

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  uap: {
    label: 'UAP',
    queueTable: 'uap_scan_queue',
    intakeFn: processUapVideoIntake,
  },
  nde: {
    label: 'NDE',
    queueTable: 'scan_queue',
    intakeFn: processVideoIntake,
  },
};

async function processDomain(supabase: SupabaseClient, config: DomainConfig) {
  const { label, queueTable, intakeFn } = config;

  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log(`🚀 Starting ${label} rapid processing (concurrency: ${CONCURRENCY})`);

  // 1. Reset stuck 'processing' videos from previous killed runs
  log(`🔄 Resetting stuck 'processing' videos...`);
  const { data: stuckData, error: resetError } = await supabase
    .from(queueTable)
    .update({ status: 'pending' })
    .eq('status', 'processing')
    .select('id');

  if (resetError) {
    log(`⚠️ Failed to reset stuck videos: ${resetError.message}`);
  } else {
    const resetCount = stuckData?.length || 0;
    if (resetCount > 0) log(`   Reset ${resetCount} stuck videos to pending`);
  }

  // 2. Get total pending count
  const { count: pendingCount } = await supabase
    .from(queueTable)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const totalPending = pendingCount || 0;
  log(`📊 Found ${totalPending} pending ${label} videos to process`);
  log(`   Log file: ${logFile}`);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (totalPending === 0) {
    log(`✅ No pending ${label} videos. Done!`);
    return;
  }

  const stats: Stats = { success: 0, skipped: 0, failed: 0, total: 0, startTime: Date.now() };
  const executing = new Set<Promise<void>>();

  while (!isShuttingDown) {
    // Fetch next batch from queue (ordered by priority then created_at)
    const { data: items, error: fetchError } = await supabase
      .from(queueTable)
      .select('id, video_url, video_id, channel_id, retry_count')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(CONCURRENCY);

    if (fetchError) {
      log(`❌ Queue fetch error: ${fetchError.message}`);
      break;
    }

    if (!items || items.length === 0) {
      // Wait for any in-flight work to finish
      if (executing.size > 0) {
        await Promise.all(executing);
      }
      log(`✅ ${label} queue empty! All videos processed.`);
      break;
    }

    // Process batch concurrently
    for (const item of items) {
      if (isShuttingDown) break;

      // Mark as processing immediately
      await supabase
        .from(queueTable)
        .update({ status: 'processing' })
        .eq('id', item.id);

      const p = processVideo(supabase, queueTable, intakeFn, item, stats, totalPending, label)
        .finally(() => executing.delete(p));

      executing.add(p);
    }

    // Wait for the wave to finish before fetching the next batch
    await Promise.all(executing);

    // Print progress every 25 videos
    if (stats.total > 0 && stats.total % 25 === 0) {
      printProgress(stats, totalPending, label);
    }
  }

  // Final summary
  const elapsed = Date.now() - stats.startTime;
  log('');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log(`🏁 ${label} Processing Complete`);
  log(`   Total: ${stats.total} | ✅ ${stats.success} | ⏭️ ${stats.skipped} | ❌ ${stats.failed}`);
  log(`   Duration: ${formatDuration(elapsed)}`);
  log(`   Log: ${logFile}`);
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

// ─── Single Video Processor ─────────────────────────────────────────────────

async function processVideo(
  supabase: SupabaseClient,
  queueTable: string,
  intakeFn: (url: string) => Promise<any>,
  item: any,
  stats: Stats,
  totalPending: number,
  label: string,
) {
  const videoStart = Date.now();
  let finalStatus = 'failed';
  let intakeStatus = 'failed';
  let resultError: string | null = null;

  try {
    const result = await intakeFn(item.video_url);
    intakeStatus = result.status;
    const tier = result.tier ?? null;

    const isSkipped = result.status === 'no_captions'
      || result.status === 'already_exists'
      || result.status === 'out_of_scope'
      || result.status === 'is_short'
      || result.status === 'drm_protected'
      || result.status === 'geo_restricted'
      || result.status === 'members_only'
      || result.status === 'live_stream';

    finalStatus = (result.status === 'complete' || result.status === 'already_exists')
      ? 'complete'
      : isSkipped
        ? 'skipped'
        : 'failed';

    resultError = result.error
      || (finalStatus === 'failed' ? `Intake returned status: ${result.status}` : null);

    const duration = formatDuration(Date.now() - videoStart);
    stats.total++;

    if (finalStatus === 'failed') {
      stats.failed++;
      log(`❌ [${label} ${stats.total}/${totalPending}] ${item.video_id} — FAILED: ${resultError} (${duration})`);
    } else if (finalStatus === 'skipped') {
      stats.skipped++;
      log(`⏭️  [${label} ${stats.total}/${totalPending}] ${item.video_id} — ${result.status} (${duration})`);
    } else {
      stats.success++;
      log(`✅ [${label} ${stats.total}/${totalPending}] ${item.video_id} — Tier ${tier} (${duration})`);
    }

    // CRITICAL: Detect quota exhaustion and halt the ENTIRE batch processor
    if (result.status === 'quota_exceeded') {
      log(`⛔ [${label}] SUPADATA QUOTA EXCEEDED — monthly credits exhausted. Halting pipeline immediately.`);
      log(`⛔ [${label}] Remaining ${totalPending - stats.total} videos will stay as 'pending' for when credits refill.`);
      finalStatus = 'failed';
      resultError = 'Supadata quota exceeded — pipeline halted';
      isShuttingDown = true; // Trigger graceful shutdown of the batch loop
    }

    // Auto-retry for transient caption fetch failures with exponential backoff
    if (result.status === 'caption_fetch_failed' && !isShuttingDown) {
      const currentRetries = item.retry_count || 0;
      const maxRetries = 3;
      if (currentRetries < maxRetries) {
        const backoffMs = 30000 * Math.pow(2, currentRetries); // 30s, 60s, 120s
        log(`⚠️  [${label}] Auto-retrying ${item.video_id} — caption fetch failed (attempt ${currentRetries + 1}/${maxRetries}, backoff ${backoffMs / 1000}s)`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        finalStatus = 'pending';
      }
    }
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    stats.total++;
    stats.failed++;
    const duration = formatDuration(Date.now() - videoStart);
    log(`💥 [${label} ${stats.total}/${totalPending}] ${item.video_id} — EXCEPTION: ${errorMsg} (${duration})`);
    finalStatus = 'failed';
    intakeStatus = 'failed';
    resultError = errorMsg;
  }

  // Update queue
  const queueUpdate: Record<string, any> = {
    status: finalStatus,
    processed_at: new Date().toISOString(),
    intake_result: intakeStatus,
    error: resultError,
  };

  if (finalStatus === 'pending') {
    queueUpdate.retry_count = (item.retry_count || 0) + 1;
    queueUpdate.processed_at = null;
  }

  await supabase
    .from(queueTable)
    .update(queueUpdate)
    .eq('id', item.id);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║          🚀 Rapid Scanner Batch Processor                   ║`);
  console.log(`║          Domain: ${DOMAIN.padEnd(6)} | Concurrency: ${String(CONCURRENCY).padEnd(2)}              ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const domains = DOMAIN === 'both' ? ['uap', 'nde'] : [DOMAIN];

  for (const d of domains) {
    const config = DOMAIN_CONFIGS[d];
    if (!config) {
      log(`❌ Unknown domain: ${d}. Use: uap | nde | both`);
      process.exit(1);
    }

    if (isShuttingDown) {
      log(`🛑 Shutdown requested — skipping ${config.label}`);
      break;
    }

    await processDomain(supabase, config);
  }

  log(`👋 Session ended. Full log: ${logFile}`);
  logStream.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
