import { hasValidCronSecret } from '@/lib/auth/cron-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runUapDiscoverTick } from '@/lib/scanner/uap-tick';
import { pauseGate } from '@/lib/ops/gate';

/**
 * GET|POST /api/uap/scanner/discover
 *
 * Scans the least-recently-scanned UAP channel for new videos and queues them.
 * Does NOT process any videos — that's handled by /api/uap/scanner/process.
 *
 * Copy-Modify from /api/scanner/discover (NDE).
 * Secured with CRON_SECRET. Called by GitHub Actions cron (hourly).
 */
async function handleDiscover(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    // Header-only credential (S-5): never via query string or body.
    if (!hasValidCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gated = await pauseGate('video_ingestion');
    if (gated) return gated;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    try {
        const result = await runUapDiscoverTick(supabase);

        return NextResponse.json({
            success: true,
            channel: result.channel,
            discovered: result.discovered,
            queued: result.queued,
            durationMs: result.durationMs,
        });
    } catch (err: any) {
        console.error('UAP Scanner discover error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handleDiscover(req);
}

export async function POST(req: NextRequest) {
    return handleDiscover(req);
}
