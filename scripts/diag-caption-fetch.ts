#!/usr/bin/env npx tsx
/**
 * Caption-provider diagnostic — runs the REAL fetchCaptions() router
 * (Bright Data primary → Supadata fallback) against one video and reports
 * which provider answered, segment count, timing, and a transcript preview.
 *
 * Usage:
 *   npx tsx scripts/diag-caption-fetch.ts <videoId>
 *   npx tsx scripts/diag-caption-fetch.ts 3SGeGOIW-0Y
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { fetchCaptions } from '../src/lib/youtube/subtitles';

const videoId = process.argv[2];
if (!videoId) {
    console.error('Usage: npx tsx scripts/diag-caption-fetch.ts <videoId>');
    process.exit(1);
}

async function main() {
    console.log(`Providers configured: brightdata=${!!process.env.BRIGHTDATA_API_KEY} supadata=${!!process.env.SUPADATA_API_KEY}`);
    const t0 = Date.now();
    const result = await fetchCaptions(videoId);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);

    if (!result.success) {
        console.error(`❌ FAILED in ${secs}s — reason=${result.failureReason} retryable=${result.retryable}`);
        console.error(`   ${result.message}`);
        process.exit(1);
    }

    const segs = result.data!.segments;
    console.log(`✅ SUCCESS in ${secs}s — ${segs.length} segments (lang: ${result.data!.language})`);
    console.log('First 3 segments:');
    for (const s of segs.slice(0, 3)) {
        console.log(`  [${s.start.toFixed(1)}s +${s.duration.toFixed(1)}s] ${s.text.slice(0, 70)}`);
    }
    const last = segs[segs.length - 1];
    console.log(`Last segment: [${last.start.toFixed(1)}s] ${last.text.slice(0, 70)}`);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
