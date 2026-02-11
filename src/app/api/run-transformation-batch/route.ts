
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeTransformationScore, classifyTransformationScore } from '@/lib/ai/transformation';

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

        console.log(`Starting Transformation Analysis Batch... (Limit: ${limit}, Target: ${targetVideoId || 'None'})`);

        // Verify mode: fetch existing analysis for a specific video
        if (verifyMode && targetVideoId) {
            const { data: analysis, error } = await supabase
                .from('nde_analysis')
                .select('video_id, transformation_score, transformation_classification, transformation_breakdown')
                .eq('video_id', targetVideoId)
                .single();

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ message: 'Verification Fetch', analysis });
        }

        // Fetch videos to process
        let videosToProcess: { videoId: string; title: string; subtitles_punctuated: string }[] = [];

        if (targetVideoId) {
            // Single video mode - fetch directly
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
            // Batch mode - use RPC to get unanalyzed videos efficiently
            // This bypasses Supabase's default 1000-row limit (see LEARNINGS.md)
            const { data: videos, error } = await supabase
                .rpc('get_unanalyzed_transformation_videos', { batch_limit: limit });

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
                console.log(`Analyzing transformation: ${video.title} (${video.videoId})...`);
                const analysisResult = await analyzeTransformationScore(video.subtitles_punctuated);

                if (analysisResult) {
                    const score = analysisResult.quantitative_metrics.overall_transformation_score;
                    const classification = classifyTransformationScore(score);

                    // Check if a row already exists for this video
                    const { data: checkRow } = await supabase
                        .from('nde_analysis')
                        .select('video_id')
                        .eq('video_id', video.videoId)
                        .single();

                    let dbOp;
                    if (checkRow) {
                        // Update existing row
                        dbOp = await supabase
                            .from('nde_analysis')
                            .update({
                                transformation_score: score,
                                transformation_classification: classification,
                                transformation_breakdown: analysisResult as any
                            })
                            .eq('video_id', video.videoId);
                    } else {
                        // Insert new row
                        dbOp = await supabase
                            .from('nde_analysis')
                            .insert({
                                video_id: video.videoId,
                                transformation_score: score,
                                transformation_classification: classification,
                                transformation_breakdown: analysisResult as any
                            });
                    }

                    if (dbOp.error) {
                        console.error(`Error saving ${video.videoId}:`, dbOp.error);
                        return { videoId: video.videoId, status: 'error', error: dbOp.error.message };
                    } else {
                        console.log(`Saved transformation analysis for ${video.videoId}: Score ${score} (${classification})`);
                        return { videoId: video.videoId, status: 'success', score, classification };
                    }
                } else {
                    console.error(`Failed to analyze ${video.videoId}`);
                    return { videoId: video.videoId, status: 'failed_analysis' };
                }
            } catch (err: any) {
                console.error(`Exception analyzing ${video.videoId}:`, err);
                return { videoId: video.videoId, status: 'error', error: err.message };
            }
        });

        const results = await Promise.all(processPromises);
        const processedCount = results.filter(r => r.status === 'success').length;

        return NextResponse.json({
            message: `Batch complete. Processed ${processedCount} videos.`,
            processedCount,
            results
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
