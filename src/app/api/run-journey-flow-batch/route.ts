
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeJourneyFlow } from '@/lib/ai/journey-flow';

// Initialize Supabase client with service key for server-side operations
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

        // Security Check — allow IS_DEBUG_MODE to bypass for local dev
        const authHeader = request.headers.get('authorization');
        const expectedSecret = process.env.CRON_SECRET;
        const isDebug = !!process.env.IS_DEBUG_MODE;

        if (!isDebug) {
            if (!expectedSecret) {
                console.error('CRON_SECRET is not set on the server!');
                return NextResponse.json({ error: 'Unauthorized: Server configuration error (Secret missing)' }, { status: 500 });
            }
            if (authHeader !== `Bearer ${expectedSecret}`) {
                console.warn('Auth token mismatch.');
                return NextResponse.json({ error: 'Unauthorized: Token mismatch' }, { status: 401 });
            }
        }

        console.log(`Starting Journey Flow Analysis Batch... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);

        // Verify mode: fetch existing analysis for a specific video
        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase
                .from('nde_analysis')
                .select('video_id, journey_valid, journey_nde_type, journey_sequence, journey_notes')
                .eq('video_id', targetVideoId)
                .single();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ message: 'Verification Fetch', analysis });
        }

        // Fetch videos to process
        let videosToProcess: { videoId: string; title: string; subtitles_punctuated: string }[] = [];

        if (targetVideoId) {
            // Single video mode
            const { data: video, error } = await supabase
                .from('nde_vids')
                .select('videoId, title, subtitles_punctuated')
                .eq('videoId', targetVideoId)
                .single();

            if (error || !video) {
                return NextResponse.json({ error: error?.message || 'Video not found' }, { status: 404 });
            }
            if (!video.subtitles_punctuated) {
                return NextResponse.json({ error: 'Video has no transcript' }, { status: 400 });
            }
            videosToProcess = [video];
        } else {
            // Batch mode — use RPC to get unanalyzed videos efficiently
            const { data: videos, error } = await supabase
                .rpc('get_unanalyzed_journey_flow_videos', { batch_limit: limit });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            videosToProcess = videos || [];
        }

        if (videosToProcess.length === 0) {
            return NextResponse.json({
                message: `Batch complete. No new videos to process.`,
                processedCount: 0,
                results: []
            });
        }

        // Process in Parallel (see LEARNINGS.md - avoids timeouts)
        console.log(`Processing ${videosToProcess.length} videos in parallel...`);

        const processPromises = videosToProcess.map(async (video) => {
            try {
                console.log(`Analyzing journey flow: ${video.title} (${video.videoId})...`);
                const analysisResult = await analyzeJourneyFlow(video.subtitles_punctuated);

                // Determine values to save
                let journeyValid: boolean;
                let journeyNdeType: string;
                let journeySequence: any;
                let journeyNotes: string | null;

                if (analysisResult) {
                    journeyValid = analysisResult.valid;
                    journeyNdeType = analysisResult.nde_type;
                    journeySequence = analysisResult.sequence;
                    journeyNotes = analysisResult.notes || analysisResult.reason || null;
                } else {
                    // Save sentinel values so the RPC skips this video on future batches
                    console.warn(`Analysis returned null for ${video.videoId} — saving sentinel.`);
                    journeyValid = false;
                    journeyNdeType = 'analysis_failed';
                    journeySequence = [];
                    journeyNotes = 'AI analysis returned null';
                }

                // Upsert: check if row exists, then update or insert
                const { data: checkRow } = await supabase
                    .from('nde_analysis')
                    .select('video_id')
                    .eq('video_id', video.videoId)
                    .single();

                const payload = {
                    journey_valid: journeyValid,
                    journey_nde_type: journeyNdeType,
                    journey_sequence: journeySequence,
                    journey_notes: journeyNotes,
                };

                let dbOp;
                if (checkRow) {
                    dbOp = await supabase
                        .from('nde_analysis')
                        .update(payload)
                        .eq('video_id', video.videoId);
                } else {
                    dbOp = await supabase
                        .from('nde_analysis')
                        .insert({ video_id: video.videoId, ...payload });
                }

                if (dbOp.error) {
                    console.error(`Error saving ${video.videoId}:`, dbOp.error);
                    return { videoId: video.videoId, status: 'error', error: dbOp.error.message };
                } else if (journeyNdeType === 'analysis_failed') {
                    console.log(`Marked ${video.videoId} as failed_analysis (sentinel saved).`);
                    return { videoId: video.videoId, status: 'failed_analysis' };
                } else {
                    const elementCount = journeySequence?.length || 0;
                    console.log(`Saved journey flow for ${video.videoId}: ${journeyNdeType} (${elementCount} elements)`);
                    return { videoId: video.videoId, status: 'success', journeyNdeType, elementCount };
                }
            } catch (err: any) {
                console.error(`Exception analyzing ${video.videoId}:`, err);
                return { videoId: video.videoId, status: 'error', error: err.message };
            }
        });

        const results = await Promise.all(processPromises);
        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed_analysis').length;

        return NextResponse.json({
            message: `Batch complete. Processed ${successCount} videos (${failedCount} failed).`,
            processedCount: successCount,
            attemptedCount: results.length,
            failedCount,
            results
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
