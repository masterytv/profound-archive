/**
 * UAP Batch Re-Analysis Script
 * 
 * Triggers re-analysis of all previously analyzed videos via the local API endpoint.
 * Bypasses tsx EPERM issue by using fetch() against the running Next.js dev server.
 * 
 * Usage:
 *   node scripts/uap-reanalyze-batch.mjs                    # Re-analyze all
 *   node scripts/uap-reanalyze-batch.mjs --video tzvGLiDvZ_U  # Single video test
 *   node scripts/uap-reanalyze-batch.mjs --dry-run           # Preview only
 * 
 * Requires: Next.js dev server running on port 3000
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_VIDEO = args.includes('--video') ? args[args.indexOf('--video') + 1] : null;
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const DELAY_BETWEEN = 5000; // 5s between videos

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  UAP Batch Re-Analysis — via Local API              ║
╠══════════════════════════════════════════════════════╣
║  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}  |  API: ${API_BASE}${' '.repeat(Math.max(0, 20 - API_BASE.length))}║
╚══════════════════════════════════════════════════════╝
`);

  // Find videos to re-analyze
  let query = supabase
    .from('uap_vids')
    .select('video_id, title, tier, content_type')
    .in('intake_status', ['complete']);

  if (SINGLE_VIDEO) {
    query = query.eq('video_id', SINGLE_VIDEO);
  }

  const { data: videos, error } = await query.order('tier').order('title');
  if (error || !videos) {
    console.error('❌ Failed to fetch videos:', error?.message);
    process.exit(1);
  }

  // Filter to only videos with existing analysis (unless single video specified)
  let targetVideos = videos;
  if (!SINGLE_VIDEO) {
    const { data: analyzedIds } = await supabase
      .from('uap_analysis')
      .select('video_id');
    const analyzedSet = new Set((analyzedIds || []).map(r => r.video_id));
    targetVideos = videos.filter(v => analyzedSet.has(v.video_id));
  }

  console.log(`📋 Found ${targetVideos.length} videos to re-analyze\n`);

  for (const v of targetVideos) {
    console.log(`  [Tier ${v.tier}] ${v.video_id} — ${v.title?.slice(0, 60)}`);
  }

  if (DRY_RUN) {
    console.log('\n🏁 DRY RUN complete — no API calls made.\n');
    return;
  }

  console.log('');

  // Process each video
  const results = [];
  let processed = 0;

  for (const video of targetVideos) {
    processed++;
    console.log(`━━━ [${processed}/${targetVideos.length}] Tier ${video.tier}: ${video.title?.slice(0, 50)} ━━━`);

    try {
      const res = await fetch(`${API_BASE}/api/uap/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.video_id, mode: 'full' }),
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Server returned non-JSON (e.g. "Internal Server Error")
        console.log(`  ❌ ${res.status}: ${rawText.slice(0, 500)}`);
        results.push({ videoId: video.video_id, status: 'failed', error: rawText.slice(0, 200) });
        continue;
      }
      
      if (res.ok) {
        console.log(`  ✅ ${data.status} in ${(data.duration_ms / 1000).toFixed(1)}s — tone=${data.video_tone || 'n/a'}, persons=${data.persons_count || 0}`);
        results.push({ ...data, status: 'success' });
      } else {
        console.log(`  ❌ ${res.status}: ${data.error}`);
        results.push({ videoId: video.video_id, status: 'failed', error: data.error });
      }
    } catch (err) {
      console.log(`  ❌ Network error: ${err.message}`);
      results.push({ videoId: video.video_id, status: 'failed', error: err.message });
    }

    if (processed < targetVideos.length) {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN / 1000}s...\n`);
      await sleep(DELAY_BETWEEN);
    }
  }

  // Summary
  const success = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  console.log(`
╔══════════════════════════════════════════════════════╗
║                 RE-ANALYSIS COMPLETE                  ║
║  ✅ ${success} success  |  ❌ ${failed} failed                      ║
╚══════════════════════════════════════════════════════╝
`);

  if (failed > 0) {
    console.log('Failed videos:');
    for (const r of results.filter(r => r.status === 'failed')) {
      console.log(`  ${r.videoId}: ${r.error}`);
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
