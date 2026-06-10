import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runDiscoverTick } from '@/lib/scanner/tick';

/**
 * GET|POST /api/scanner/discover
 *
 * Scans the least-recently-scanned channel for new videos and queues them.
 * Does NOT process any videos — that's handled by /api/scanner/process.
 *
 * Fast: completes in ~5-10s and is safe from Cloudflare's 100s timeout.
 * Secured with CRON_SECRET. Called by the hourly GitHub Actions workflow.
 */
async function handleDiscover(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    // Header-only credential (S-5): never via query string or body.
    if (!hasValidCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    try {
        const result = await runDiscoverTick(supabase);

        return NextResponse.json({
            success: true,
            channel: result.channel,
            discovered: result.discovered,
            queued: result.queued,
            durationMs: result.durationMs,
        });
    } catch (err: any) {
        console.error('Scanner discover error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleDiscover(req);
}

export async function POST(req: NextRequest) {
    return handleDiscover(req);
}
