#!/usr/bin/env npx tsx
/**
 * NDE video queue processor — runs on Oracle via crontab every 10 minutes.
 * Replaces the pg_cron nde-video-processor job (which called Firebase /api/scanner/process).
 *
 * Processes one NDE video per invocation from scan_queue. If the queue is empty, exits quietly.
 * UAP video processing is handled by pm2 rapid-process.ts (overnight batch, 80/day cap).
 *
 * Oracle Crontab:
 *   1,11,21,31,41,51 * * * * cd ~/profound-archive && npx tsx scripts/scanner-process.ts >> logs/process-nde.log 2>&1
 */

import { createClient } from '@supabase/supabase-js';
import { runProcessTick } from '../src/lib/scanner/tick';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
    const timestamp = new Date().toISOString();
    console.log(`\n⚙️  [scanner-process] ${timestamp}`);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );

    const start = Date.now();
    try {
        const result = await runProcessTick(supabase, 1);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        if (result.processed.length === 0) {
            console.log(`  — queue empty (${elapsed}s)`);
        } else {
            for (const v of result.processed) {
                const statusIcon = v.status === 'complete' ? '✅' : v.status === 'skipped' ? '⏭️' : '❌';
                console.log(`  ${statusIcon} ${v.videoId} — ${v.status}${v.error ? ` (${v.error})` : ''} (${elapsed}s)`);
            }
        }
    } catch (err) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.error(`  ❌ FAILED (${elapsed}s) — ${err}`);
        process.exit(1);
    }

    console.log(`✅ [scanner-process] Complete`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
