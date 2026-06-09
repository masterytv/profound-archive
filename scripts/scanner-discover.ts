#!/usr/bin/env npx tsx
/**
 * Standalone channel discovery script — runs on Oracle via crontab.
 * Replaces GHA scanner-discover.yml and uap-scanner-discover.yml.
 *
 * Usage:
 *   npx tsx scripts/scanner-discover.ts --domain nde          # NDE: single channel (legacy)
 *   npx tsx scripts/scanner-discover.ts --domain nde --all    # NDE: ALL channels at once (daily)
 *   npx tsx scripts/scanner-discover.ts --domain uap          # UAP: single channel (hourly)
 *
 * Oracle Crontab:
 *   0  7 * * * cd ~/profound-archive && npx tsx scripts/scanner-discover.ts --domain nde --all >> logs/discover-nde.log 2>&1
 *   30 * * * * cd ~/profound-archive && npx tsx scripts/scanner-discover.ts --domain uap >> logs/discover-uap.log 2>&1
 */

import { createClient } from '@supabase/supabase-js';
import { runDiscoverTick, runDiscoverAllChannels } from '../src/lib/scanner/tick';
import { runUapDiscoverTick } from '../src/lib/scanner/uap-tick';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

function parseArgs(): { domain: string; all: boolean } {
    const args = process.argv.slice(2);
    let domain = 'both';
    let all = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--domain' && args[i + 1]) domain = args[i + 1].toLowerCase();
        if (args[i] === '--all') all = true;
    }
    return { domain, all };
}

async function main() {
    const { domain, all } = parseArgs();
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [scanner-discover] ${timestamp} | domain=${domain} all=${all}`);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );

    const domains = domain === 'both' ? ['nde', 'uap'] : [domain];

    for (const d of domains) {
        const start = Date.now();
        try {
            if (d === 'uap') {
                // UAP always uses single-channel tick (hourly rotation)
                const result = await runUapDiscoverTick(supabase);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                console.log(
                    `  ✅ UAP discover: channel=${result.channel || 'none'} ` +
                    `discovered=${result.discovered} queued=${result.queued} (${elapsed}s)`
                );
            } else if (all) {
                // NDE --all: scan every channel in one pass (daily 3am ET)
                const result = await runDiscoverAllChannels(supabase);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                console.log(
                    `  ✅ NDE discover-all: ${result.channelsScanned} channels scanned, ` +
                    `${result.channelsWithNewVideos} with new videos, ` +
                    `${result.totalDiscovered} discovered, ${result.totalQueued} queued (${elapsed}s)`
                );
                if (result.perChannel.filter(c => c.discovered > 0).length > 0) {
                    for (const ch of result.perChannel.filter(c => c.discovered > 0)) {
                        console.log(`     📺 ${ch.name}: ${ch.discovered} new, ${ch.queued} queued`);
                    }
                }
            } else {
                // NDE single-channel tick (kept for manual/legacy use)
                const result = await runDiscoverTick(supabase);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                console.log(
                    `  ✅ NDE discover: channel=${result.channel || 'none'} ` +
                    `discovered=${result.discovered} queued=${result.queued} (${elapsed}s)`
                );
            }
        } catch (err) {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.error(`  ❌ ${d.toUpperCase()} discover${all ? '-all' : ''}: FAILED (${elapsed}s) — ${err}`);
        }
    }

    console.log(`✅ [scanner-discover] Complete`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
