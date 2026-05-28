#!/usr/bin/env npx tsx
/**
 * Standalone channel discovery script — runs on Oracle via crontab.
 * Replaces GHA scanner-discover.yml and uap-scanner-discover.yml.
 *
 * Usage:
 *   npx tsx scripts/scanner-discover.ts                  # Both domains
 *   npx tsx scripts/scanner-discover.ts --domain nde     # NDE only
 *   npx tsx scripts/scanner-discover.ts --domain uap     # UAP only
 *
 * Oracle Crontab:
 *   0  * * * * cd ~/profound-archive && npx tsx scripts/scanner-discover.ts --domain nde >> logs/discover-nde.log 2>&1
 *   30 * * * * cd ~/profound-archive && npx tsx scripts/scanner-discover.ts --domain uap >> logs/discover-uap.log 2>&1
 */

import { createClient } from '@supabase/supabase-js';
import { runDiscoverTick } from '../src/lib/scanner/tick';
import { runUapDiscoverTick } from '../src/lib/scanner/uap-tick';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

function parseArgs(): string {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--domain' && args[i + 1]) return args[i + 1].toLowerCase();
    }
    return 'both';
}

async function main() {
    const domain = parseArgs();
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [scanner-discover] ${timestamp} | domain=${domain}`);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );

    const domains = domain === 'both' ? ['nde', 'uap'] : [domain];

    for (const d of domains) {
        const start = Date.now();
        try {
            const result = d === 'uap'
                ? await runUapDiscoverTick(supabase)
                : await runDiscoverTick(supabase);

            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(
                `  ✅ ${d.toUpperCase()} discover: channel=${result.channel || 'none'} ` +
                `discovered=${result.discovered} queued=${result.queued} (${elapsed}s)`
            );
        } catch (err) {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.error(`  ❌ ${d.toUpperCase()} discover: FAILED (${elapsed}s) — ${err}`);
        }
    }

    console.log(`✅ [scanner-discover] Complete`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
