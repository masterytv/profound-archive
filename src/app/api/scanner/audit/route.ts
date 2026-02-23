import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { discoverNewVideos, getExistingVideoIds } from '@/lib/scanner/discover';

/**
 * GET|POST /api/scanner/audit
 * 
 * Scans ALL scanner_enabled channels to count how many new videos are available.
 * This is a read-only operation — no videos are processed, no AI costs incurred.
 * Secured with CRON_SECRET.
 * 
 * Returns a per-channel breakdown and grand totals for budgeting.
 */
async function handleAudit(req: NextRequest) {
    // Auth check
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const secret = searchParams.get('secret') || body.secret;

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    try {
        // 1. Fetch all scanner-enabled channels
        const { data: channels, error: channelError } = await supabase
            .from('channels')
            .select('channel_id, name, uploads_playlist_id, subscriber_count')
            .eq('scanner_enabled', true)
            .order('name');

        if (channelError) throw new Error(`Channel fetch error: ${channelError.message}`);
        if (!channels || channels.length === 0) {
            return NextResponse.json({
                message: 'No channels enabled for scanning',
                channels: [],
                totals: { channels: 0, totalFetched: 0, alreadyInDb: 0, newToImport: 0 },
            });
        }

        // 2. Get all existing video IDs (paginated to avoid 1000-row cap)
        const channelIds = channels.map((c: any) => c.channel_id);
        const existingVideoIds = await getExistingVideoIds(supabase, channelIds);

        // 3. Discover new videos for each channel
        const results: Array<{
            channelId: string;
            channelName: string;
            subscriberCount: number;
            totalFetched: number;
            alreadyInDb: number;
            newToImport: number;
        }> = [];

        for (const channel of channels) {
            if (!channel.uploads_playlist_id) {
                console.warn(`Channel ${channel.name} has no uploads_playlist_id, skipping`);
                continue;
            }

            try {
                const discovery = await discoverNewVideos(
                    channel.channel_id,
                    channel.uploads_playlist_id,
                    channel.name,
                    existingVideoIds,
                    50,  // max results per page
                    10,  // max pages (500 videos per channel)
                );

                results.push({
                    channelId: discovery.channelId,
                    channelName: discovery.channelName,
                    subscriberCount: channel.subscriber_count || 0,
                    totalFetched: discovery.totalFetched,
                    alreadyInDb: discovery.alreadyInDb,
                    newToImport: discovery.newVideos.length,
                });

                // Log audit run
                await supabase.from('scan_runs').insert({
                    channel_id: channel.channel_id,
                    run_type: 'audit',
                    completed_at: new Date().toISOString(),
                    videos_discovered: discovery.newVideos.length,
                });

            } catch (err: any) {
                console.error(`Audit error for ${channel.name}:`, err.message);
                results.push({
                    channelId: channel.channel_id,
                    channelName: channel.name,
                    subscriberCount: channel.subscriber_count || 0,
                    totalFetched: 0,
                    alreadyInDb: 0,
                    newToImport: -1, // indicates error
                });
            }
        }

        // 4. Calculate totals
        const totals = results.reduce(
            (acc, r) => ({
                channels: acc.channels + 1,
                totalFetched: acc.totalFetched + r.totalFetched,
                alreadyInDb: acc.alreadyInDb + r.alreadyInDb,
                newToImport: acc.newToImport + Math.max(0, r.newToImport),
            }),
            { channels: 0, totalFetched: 0, alreadyInDb: 0, newToImport: 0 },
        );

        // 5. Cost estimate
        const blendedCostPerVideo = 0.017;
        const estimatedCost = totals.newToImport * blendedCostPerVideo;
        const daysToComplete = Math.ceil(totals.newToImport / 60);

        return NextResponse.json({
            results: results.sort((a, b) => b.newToImport - a.newToImport),
            totals,
            estimate: {
                costPerVideo: blendedCostPerVideo,
                totalEstimatedCost: `$${estimatedCost.toFixed(2)}`,
                daysToComplete,
                dailyBudget: '$1.00',
                videosPerDay: 60,
            },
        });

    } catch (err: any) {
        console.error('Audit error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleAudit(req);
}

export async function POST(req: NextRequest) {
    return handleAudit(req);
}
