import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { analyzeUapProgramIntel } from '../src/lib/ai/uap-program-intel';
import { generateUapSummary } from '../src/lib/ai/uap-summary';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const TRIAL_IDS = [
  '9p99lTsC7wQ', // UAP Gerb (Dense person/program/secrecy)
  't85t8QpTsD4', // Bush/Cheney connections (Timeline-heavy)
  'FsZbQEt8780', // Richard Dolan hearing (Legislative)
  '8xD8HpLOqEA', // Area52 Stargate (Psi/Consciousness)
  'BWNBxWjkxdY'  // Eyes On Cinema (International)
];

async function main() {
  const isTrial = process.argv.includes('--trial');
  const concurrency = isTrial ? 1 : 5;

  console.log(`\n🛸 Starting UAP Program Intel Backfill (Tier 2)`);
  console.log(`Mode: ${isTrial ? 'TRIAL (5 specific videos)' : `FULL BATCH (Concurrency: ${concurrency})`}\n`);

  // Query videos to process
  let query = supabase
    .from('uap_vids')
    .select(`
      video_id,
      title,
      subtitles_punctuated
    `)
    .eq('tier', 2)
    .not('subtitles_punctuated', 'is', null);

  if (isTrial) {
    query = query.in('video_id', TRIAL_IDS);
  } else {
    // Only get videos without program_intel_breakdown
    const { data: analyzed } = await supabase
      .from('uap_analysis')
      .select('video_id')
      .not('program_intel_breakdown', 'is', null);
      
    const analyzedIds = analyzed?.map(a => a.video_id) || [];
    if (analyzedIds.length > 0) {
        query = query.not('video_id', 'in', `(${analyzedIds.join(',')})`);
    }
  }

  const { data: videos, error } = await query;

  if (error || !videos) {
    console.error("Error fetching videos:", error);
    process.exit(1);
  }

  console.log(`Found ${videos.length} videos to process.\n`);

  if (videos.length === 0) {
    console.log("No videos need processing.");
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;
  let summaryCount = 0;

  for (let i = 0; i < videos.length; i += concurrency) {
    const batch = videos.slice(i, i + concurrency);
    
    await Promise.all(batch.map(async (video) => {
      console.log(`Processing: [${video.video_id}] ${video.title.slice(0, 50)}...`);
      const start = Date.now();

      try {
        const [programIntelResult, summaryResult] = await Promise.all([
          analyzeUapProgramIntel(video.subtitles_punctuated).catch(e => {
            console.error(`  [${video.video_id}] Intel Error:`, e.message);
            return null;
          }),
          generateUapSummary(video.subtitles_punctuated).catch(e => {
            console.error(`  [${video.video_id}] Summary Error:`, e.message);
            return null;
          })
        ]);

        if (programIntelResult) {
          const { error: upsertError } = await supabase.from('uap_analysis').upsert({
            video_id: video.video_id,
            program_intel_breakdown: programIntelResult,
            analysis_model: 'gpt-4o-mini',
            analyzed_at: new Date().toISOString()
          }, { onConflict: 'video_id' });

          if (upsertError) throw new Error(`DB Save Error: ${upsertError.message}`);
          successCount++;
        } else {
          failCount++;
        }

        if (summaryResult?.uap_summary) {
          await supabase.from('uap_vids')
            .update({ analysis_uap_summary: summaryResult.uap_summary })
            .eq('video_id', video.video_id);
          summaryCount++;
        }

        const time = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`  ✓ Done [${video.video_id}] in ${time}s (Intel: ${programIntelResult ? 'YES' : 'NO'}, Summary: ${summaryResult ? 'YES' : 'NO'})`);
      } catch (err: any) {
        console.error(`  ✗ Failed [${video.video_id}]:`, err.message);
        failCount++;
      }
    }));
  }

  console.log(`\n🎉 Backfill Complete!`);
  console.log(`Intel Success: ${successCount}`);
  console.log(`Summary Success: ${summaryCount}`);
  console.log(`Failed: ${failCount}`);
}

main().catch(console.error);
