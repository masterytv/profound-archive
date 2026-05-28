#!/usr/bin/env npx tsx
/**
 * Weekly maintenance pipeline — runs on Oracle via crontab.
 * Replaces GHA weekly-maintenance.yml.
 *
 * Chains three tasks sequentially:
 *   1. Normalize entities (fuzzy dedup)
 *   2. Recompute channel scores
 *   3. Rebuild visualization caches
 *
 * Usage:
 *   npx tsx scripts/weekly-maintenance.ts                 # Run all 3 steps
 *   npx tsx scripts/weekly-maintenance.ts --step normalize # Run only normalize
 *   npx tsx scripts/weekly-maintenance.ts --step scores    # Run only scores
 *   npx tsx scripts/weekly-maintenance.ts --step viz       # Run only viz caches
 *
 * Oracle Crontab:
 *   0 5 * * 0 cd ~/profound-archive && npx tsx scripts/weekly-maintenance.ts >> logs/weekly-maintenance.log 2>&1
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeEntities } from '../src/lib/pipeline/normalize-entities';
import { recomputeAllChannelScores } from '../src/lib/pipeline/compute-channel-scores';
import { rebuildAllVizCaches } from '../src/lib/pipeline/rebuild-viz-caches';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

function parseArgs(): string {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--step' && args[i + 1]) return args[i + 1].toLowerCase();
    }
    return 'all';
}

async function runStep(
    name: string,
    fn: (supabase: SupabaseClient) => Promise<any>,
    supabase: SupabaseClient,
) {
    const start = Date.now();
    console.log(`\n  ▶ Step: ${name}...`);
    try {
        const result = await fn(supabase);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`  ✅ ${name} complete (${elapsed}s)`);
        if (result) console.log(`     ${JSON.stringify(result).slice(0, 200)}`);
        return true;
    } catch (err) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.error(`  ❌ ${name} FAILED (${elapsed}s) — ${err}`);
        return false;
    }
}

async function main() {
    const step = parseArgs();
    const timestamp = new Date().toISOString();
    console.log(`\n🔧 [weekly-maintenance] ${timestamp} | step=${step}`);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );

    const steps = [
        { name: 'Normalize Entities', key: 'normalize', fn: (sb: SupabaseClient) => normalizeEntities(sb, false) },
        { name: 'Recompute Channel Scores', key: 'scores', fn: recomputeAllChannelScores },
        { name: 'Rebuild Viz Caches', key: 'viz', fn: rebuildAllVizCaches },
    ];

    const toRun = step === 'all' ? steps : steps.filter(s => s.key === step);

    if (toRun.length === 0) {
        console.error(`❌ Unknown step: "${step}". Use: normalize, scores, viz, all`);
        process.exit(1);
    }

    let allOk = true;
    for (const s of toRun) {
        const ok = await runStep(s.name, s.fn, supabase);
        if (!ok) allOk = false;
    }

    console.log(`\n${allOk ? '✅' : '⚠️'} [weekly-maintenance] ${allOk ? 'All steps complete' : 'Some steps failed'}`);
    if (!allOk) process.exit(1);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
