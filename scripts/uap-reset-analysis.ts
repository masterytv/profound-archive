/**
 * Reset script to wipe legacy UAP analysis data and requeue videos.
 * 
 * Execution:
 * npx ts-node --compilerOptions '{"module":"commonjs"}' scripts/uap-reset-analysis.ts --trial
 * npx ts-node --compilerOptions '{"module":"commonjs"}' scripts/uap-reset-analysis.ts --execute
 */

import { createClient } from '@supabase/supabase-js';
import { parseIsoDuration } from '../src/lib/scanner/discover';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const EXCLUDED_VIDEOS = [
    '9p99lTsC7wQ', 
    't85t8QpTsD4', 
    'FsZbQEt8780', 
    '8xD8HpLOqEA', 
    'BWNBxWjkxdY'
];

async function main() {
    const args = process.argv.slice(2);
    const isTrial = args.includes('--trial');
    const isExecute = args.includes('--execute');

    if (!isTrial && !isExecute) {
        console.error('Please specify --trial or --execute');
        process.exit(1);
    }

    console.log(`\n🛸 Starting UAP Database Reset`);
    console.log(`Mode: ${isTrial ? 'TRIAL (No changes)' : 'EXECUTE (Destructive)'}`);
    console.log(`Excluded benchmark videos: ${EXCLUDED_VIDEOS.length}\n`);

    // 1. Fetch videos to reset
    const { data: vidsToReset, error: fetchError } = await supabase
        .from('uap_vids')
        .select('video_id, title, channel_id, duration')
        .in('tier', [1, 2]);

    if (fetchError) {
        console.error('Error fetching videos:', fetchError);
        return;
    }

    const filteredVids = vidsToReset?.filter(v => !EXCLUDED_VIDEOS.includes(v.video_id)) || [];
    console.log(`Found ${filteredVids.length} Tier 1/2 videos to reset and requeue.\n`);

    if (isTrial) {
        console.log('--- TRIAL MODE: The following actions WOULD be taken: ---');
        console.log(`1. DELETE FROM uap_analysis WHERE video_id NOT IN (...)`);
        console.log(`2. DELETE FROM uap_phenomenology WHERE video_id NOT IN (...)`);
        console.log(`3. DELETE FROM uap_encounter_context WHERE video_id NOT IN (...)`);
        console.log(`4. DELETE FROM uap_knowledge_panel WHERE video_id NOT IN (...)`);
        console.log(`5. UPDATE uap_vids SET intake_status='punctuated', tier=null, track=null, content_type=null, classified_at=null, analysis_uap_summary=null FOR ${filteredVids.length} videos`);
        console.log(`6. UPSERT ${filteredVids.length} videos into uap_scan_queue with status='pending'`);
        return;
    }

    console.log('1. Wiping legacy analysis tables...');

    // We can't easily do "NOT IN" without querying the IDs first, but we can do it via a subquery or loop.
    // However, Supabase JS client `not.in` works perfectly:
    const excludeFilter = `(${EXCLUDED_VIDEOS.join(',')})`;

    await supabase.from('uap_analysis').delete().not('video_id', 'in', excludeFilter);
    await supabase.from('uap_phenomenology').delete().not('video_id', 'in', excludeFilter);
    await supabase.from('uap_encounter_context').delete().not('video_id', 'in', excludeFilter);
    await supabase.from('uap_knowledge_panel').delete().not('video_id', 'in', excludeFilter);
    
    console.log('✅ Analysis tables wiped.');

    console.log(`2. Resetting ${filteredVids.length} video records and pushing to queue...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < filteredVids.length; i++) {
        const vid = filteredVids[i];
        try {
            // Reset uap_vids
            const { error: updateError } = await supabase
                .from('uap_vids')
                .update({
                    tier: null,
                    track: null,
                    content_type: null,
                    classified_at: null,
                    analysis_uap_summary: null,
                    intake_status: 'punctuated' // Keeps chunks and embeddings intact
                })
                .eq('video_id', vid.video_id);

            if (updateError) throw updateError;

            // Push to queue
            const queueItem = {
                video_url: `https://www.youtube.com/watch?v=${vid.video_id}`,
                video_id: vid.video_id,
                channel_id: vid.channel_id,
                title: vid.title,
                duration_seconds: vid.duration ? parseIsoDuration(vid.duration) : null,
                status: 'pending'
            };

            const { error: queueError } = await supabase
                .from('uap_scan_queue')
                .upsert(queueItem, { onConflict: 'video_url' });

            if (queueError) throw queueError;

            successCount++;
            if (successCount % 100 === 0) {
                console.log(`   Progress: ${successCount} / ${filteredVids.length}`);
            }

        } catch (e: any) {
            failCount++;
            console.error(`❌ Failed to reset ${vid.video_id}:`, e.message);
        }
    }

    console.log(`\n✅ Done! Successfully reset and requeued ${successCount} videos. Failed: ${failCount}.`);
}

main().catch(console.error);
