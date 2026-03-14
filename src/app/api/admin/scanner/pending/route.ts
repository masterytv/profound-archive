import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-guard';

/**
 * GET /api/admin/scanner/pending?page=1&per_page=50&channel_id=...&max_duration=180
 *
 * Returns a paginated list of pending scan_queue items with title and
 * duration_seconds so the admin can spot-check for Shorts that slipped through.
 *
 * Query params:
 *   page        - 1-indexed page number (default: 1)
 *   per_page    - rows per page (default: 50, max: 100)
 *   channel_id  - optional channel filter
 *   max_duration - optional: only return videos with duration ≤ this value (seconds)
 *                  Use max_duration=180 to show Only potential Shorts
 */

function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );
}

export async function GET(req: NextRequest) {
    // Security: require authenticated admin session
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '50', 10)));
    const channelId = searchParams.get('channel_id') || null;
    const maxDuration = searchParams.get('max_duration') ? parseInt(searchParams.get('max_duration')!, 10) : null;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // Total count (server-side, accurate regardless of row count)
    let countQuery = supabase
        .from('scan_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
    if (channelId) countQuery = countQuery.eq('channel_id', channelId);
    if (maxDuration !== null) countQuery = countQuery.lte('duration_seconds', maxDuration);
    const { count: totalCount } = await countQuery;

    // Page of results
    let dataQuery = supabase
        .from('scan_queue')
        .select('id, video_id, video_url, channel_id, title, duration_seconds, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(from, to);
    if (channelId) dataQuery = dataQuery.eq('channel_id', channelId);
    if (maxDuration !== null) dataQuery = dataQuery.lte('duration_seconds', maxDuration);

    const { data: items, error } = await dataQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch channel names for the items we got (deduplicated)
    const channelIds = [...new Set((items || []).map((i: any) => i.channel_id).filter(Boolean))];
    let channelMap: Record<string, string> = {};
    if (channelIds.length > 0) {
        const { data: channels } = await supabase
            .from('channels')
            .select('channel_id, name')
            .in('channel_id', channelIds);
        if (channels) {
            channelMap = Object.fromEntries(channels.map((c: any) => [c.channel_id, c.name]));
        }
    }

    const enriched = (items || []).map((item: any) => ({
        ...item,
        channel_name: channelMap[item.channel_id] || item.channel_id || '—',
    }));

    return NextResponse.json({
        items: enriched,
        pagination: {
            page,
            per_page: perPage,
            total: totalCount ?? 0,
            total_pages: Math.ceil((totalCount ?? 0) / perPage),
        },
    });
}
