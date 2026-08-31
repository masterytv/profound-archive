/**
 * Presentation Stats CLI — computes the citable archive stat sheet and
 * prints/saves it as markdown. Logic lives in
 * src/lib/pipeline/presentation-stats.ts (shared with the weekly Oracle
 * refresh in scripts/weekly-maintenance.ts and the /research/stats page).
 *
 * Usage:
 *   npx tsx scripts/presentation-stats.ts             # print + save markdown
 *   npx tsx scripts/presentation-stats.ts --publish   # also upsert the site cache
 *
 * Output: stdout + logs/presentation-stats-YYYY-MM-DD.md
 * Env:    .env.local with NEXT_PUBLIC_SUPABASE_URL and
 *         SUPABASE_SERVICE_ROLE_KEY (falls back to SUPABASE_SERVICE_KEY,
 *         then the anon key — service key recommended: no statement timeout).
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';
import {
    computePresentationStats,
    PRESENTATION_STATS_VIZ_ID,
    renderMarkdown,
} from '../src/lib/pipeline/presentation-stats';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL / a Supabase key in .env.local');
        process.exit(1);
    }
    const sb = createClient(url, key);
    const publish = process.argv.includes('--publish');

    const stats = await computePresentationStats(sb);
    const report = renderMarkdown(stats);
    console.log(report);

    const outDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `presentation-stats-${stats.generated_at.slice(0, 10)}.md`);
    fs.writeFileSync(outPath, report);
    console.log(`\n[saved] ${outPath}`);

    if (publish) {
        // Upsert the stats we just computed (no second corpus scan) into the
        // same cache row the weekly refresh and /research/stats use.
        const { error } = await sb.from('viz_graph_cache').upsert({
            viz_id: PRESENTATION_STATS_VIZ_ID,
            graph_json: stats,
            updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(`publish failed: ${error.message}`);
        console.log('[published] viz_graph_cache row "presentation-stats" updated — /research/stats will serve these numbers.');
    }
}

main().catch((err) => {
    console.error('presentation-stats failed:', err);
    process.exit(1);
});
