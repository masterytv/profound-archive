
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeGreysonScore } from '@/lib/ai/greyson';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetVideoId = searchParams.get('videoId');
        const verifyMode = searchParams.get('verify') === 'true';
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr) : (targetVideoId ? 1 : 3);

        // Security Check
        const authHeader = request.headers.get('authorization');
        const expectedSecret = process.env.CRON_SECRET;

        // DEBUG LOGGING
        console.log('--- DEBUG AUTH ---');
        console.log(`Has Auth Header: ${!!authHeader}`);
        console.log(`Auth Header Length: ${authHeader?.length}`);
        console.log(`Has Server Secret: ${!!expectedSecret}`);
        console.log(`Server Secret Length: ${expectedSecret?.length}`);

        if (!expectedSecret) {
            console.error('CRON_SECRET is not set on the server!');
            return NextResponse.json({ error: 'Unauthorized: Server configuration error (Secret missing)' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${expectedSecret}` && !process.env.IS_DEBUG_MODE) {
            console.warn('Auth token mismatch.');
            return NextResponse.json({ error: `Unauthorized: Token mismatch (Received ${authHeader?.length || 0} chars, Expected ${expectedSecret.length + 7} chars)` }, { status: 401 });
        }

        console.log(`Starting Greyson Analysis Batch via API... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);

        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase
                .from('nde_analysis')
                .select('*')
                .eq('video_id', targetVideoId)
                .single();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ message: 'Verification Fetch', analysis });
        }

        // Build Query
        let query = supabase
            .from('nde_vids')
            .select('videoId, title, subtitles_punctuated')
            .not('subtitles_punctuated', 'is', null)
            .order('created_at', { ascending: false });

        if (targetVideoId) {
            query = query.eq('videoId', targetVideoId);
        }

        const { data: videos, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!videos || videos.length === 0) {
            return NextResponse.json({ message: 'No videos found.' }, { status: 404 });
        }

        const results = [];
        let processedCount = 0;

        for (const video of videos) {
            if (processedCount >= limit) break;

            // Check if analysis already exists
            const { data: existingAnalysis } = await supabase
                .from('nde_analysis')
                .select('video_id, greyson_breakdown')
                .eq('video_id', video.videoId)
                .single();

            // Skip if exists AND NOT targeting specific video (if targeting, we overwrite/update)
            if (!targetVideoId && existingAnalysis?.greyson_breakdown) {
                // console.log(`Skipping ${video.videoId} - already analyzed.`);
                continue;
            }

            console.log(`Analyzing: ${video.title} (${video.videoId})...`);

            if (!video.subtitles_punctuated) continue;

            const analysisResult = await analyzeGreysonScore(video.subtitles_punctuated);

            if (analysisResult) {
                // Save to Database
                const { data: checkRow } = await supabase
                    .from('nde_analysis')
                    .select('video_id')
                    .eq('video_id', video.videoId)
                    .single();

                let dbOp;
                if (checkRow) {
                    dbOp = await supabase
                        .from('nde_analysis')
                        .update({
                            total_greyson_score: analysisResult.total_score,
                            scale_agreement: analysisResult.classification,
                            greyson_breakdown: analysisResult.breakdown as any
                        })
                        .eq('video_id', video.videoId);
                } else {
                    dbOp = await supabase
                        .from('nde_analysis')
                        .insert({
                            video_id: video.videoId,
                            total_greyson_score: analysisResult.total_score,
                            scale_agreement: analysisResult.classification,
                            greyson_breakdown: analysisResult.breakdown as any
                        });
                }

                if (dbOp.error) {
                    console.error(`Error saving ${video.videoId}:`, dbOp.error);
                    results.push({ videoId: video.videoId, status: 'error', error: dbOp.error.message });
                } else {
                    console.log(`Saved analysis for ${video.videoId}`);
                    results.push({ videoId: video.videoId, status: 'success', score: analysisResult.total_score });
                    processedCount++;
                }

            } else {
                console.error(`Failed to analyze ${video.videoId}`);
                results.push({ videoId: video.videoId, status: 'failed_analysis' });
            }
        }

        return NextResponse.json({
            message: `Batch complete. Processed ${processedCount} videos.`,
            processedCount,
            results
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
