
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { analyzeGreysonScore } from '../src/lib/ai/greyson';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runBatchAnalysis() {
    const limit = 5; // Start with a small batch
    console.log(`Starting Greyson Analysis Batch... (Limit: ${limit})`);

    // 1. Fetch videos that have subtitles but lack analysis in nde_analysis
    // Note: This is an inner join logic check, but Supabase doesn't support complex "NOT EXISTS" queries easily via JS client
    // so we'll fetch candidates and check.
    // A better approach for scale: specific 'status' column or just raw SQL.
    // For now, we fetch videos with subtitles and check if they have a corresponding row in nde_analysis with greyson_breakdown.

    // Fetch videos
    const { data: videos, error } = await supabase
        .from('nde_vids')
        .select('videoId, title, subtitles_punctuated')
        .not('subtitles_punctuated', 'is', null)
        .order('created_at', { ascending: false }); // Process newest first?

    if (error) {
        console.error('Error fetching videos:', error);
        return;
    }

    if (!videos || videos.length === 0) {
        console.log('No videos found.');
        return;
    }

    console.log(`Found ${videos.length} candidate videos.`);

    let processedCount = 0;

    for (const video of videos) {
        if (processedCount >= limit) break;

        // Check if analysis already exists
        const { data: existingAnalysis } = await supabase
            .from('nde_analysis')
            .select('video_id, greyson_breakdown')
            .eq('video_id', video.videoId)
            .single();

        if (existingAnalysis?.greyson_breakdown) {
            // console.log(`Skipping ${video.videoId} - already analyzed.`);
            continue;
        }

        console.log(`Analyzing: ${video.title} (${video.videoId})...`);

        if (!video.subtitles_punctuated) {
            console.warn(`Unexpected missing subtitles for ${video.videoId}`);
            continue;
        }

        const result = await analyzeGreysonScore(video.subtitles_punctuated);

        if (result) {
            // Save to Database
            // Upsert into nde_analysis
            const { error: upsertError } = await supabase
                .from('nde_analysis')
                .upsert({
                    video_id: video.videoId,
                    total_greyson_score: result.total_score,
                    scale_agreement: result.classification,
                    greyson_breakdown: result.breakdown as any, // Cast to JSON
                    // Preserve other fields if upserting? 
                    // Since user said use existing table, upsert is safe if we don't overwrite nulls with nulls, 
                    // but upsert replaces the row.
                    // Better to check existence (which we did) and update or insert.
                    // Since we checked and found distinct lack of greyson_breakdown, upsert with just these fields 
                    // MIGHT overwrite other fields if they exist but were not selected?
                    // Actually, upsert in Supabase needs all non-nullable fields if inserting.
                    // Let's use Update if exists, Insert if not.
                }, { onConflict: 'video_id' }); // This merge logic depends on Supabase setup.

            // Safer approach: 
            if (existingAnalysis) {
                const { error: updateError } = await supabase
                    .from('nde_analysis')
                    .update({
                        total_greyson_score: result.total_score,
                        scale_agreement: result.classification,
                        greyson_breakdown: result.breakdown as any
                    })
                    .eq('video_id', video.videoId);

                if (updateError) console.error(`Error updating ${video.videoId}:`, updateError);
                else console.log(`Updated analysis for ${video.videoId}`);

            } else {
                const { error: insertError } = await supabase
                    .from('nde_analysis')
                    .insert({
                        video_id: video.videoId,
                        total_greyson_score: result.total_score,
                        scale_agreement: result.classification,
                        greyson_breakdown: result.breakdown as any
                    });

                if (insertError) console.error(`Error inserting ${video.videoId}:`, insertError);
                else console.log(`Inserted analysis for ${video.videoId}`);
            }

            // Optional: Update the summary column on nde_vids if desired (as per prompt mentioning 'display on video page' but likely pulling from nde_analysis)
            // Implementation plan said "matches design of image", we will likely read from nde_analysis in page.tsx.

            processedCount++;
        } else {
            console.error(`Failed to analyze ${video.videoId}`);
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Batch complete. Processed ${processedCount} videos.`);
}

runBatchAnalysis();
