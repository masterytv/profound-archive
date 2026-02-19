/**
 * Video Intake API Route
 * 
 * POST /api/intake — Submit a YouTube URL for processing
 * 
 * Auth: Admin role via Supabase session OR CRON_SECRET bearer token
 * Returns: IntakeResult with step-by-step processing details
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { processVideoIntake } from '@/lib/pipeline/intake';

export const maxDuration = 300; // 5 minutes — matches existing batch routes
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // ── Parse request body ──────────────────────────────────────
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'Missing required field: url' },
                { status: 400 }
            );
        }

        // ── Auth check: admin session OR CRON_SECRET ────────────────
        const isAuthorized = await checkAuth(request);
        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access or CRON_SECRET required.' },
                { status: 401 }
            );
        }

        // ── Run the pipeline ────────────────────────────────────────
        console.log(`[Intake API] Processing URL: ${url}`);
        const result = await processVideoIntake(url);

        // Map status to appropriate HTTP code
        const statusCode = result.status === 'failed' ? 500
            : result.status === 'already_exists' ? 200
                : 200;

        return NextResponse.json(result, { status: statusCode });

    } catch (error: any) {
        console.error('[Intake API] Unhandled error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ── Auth Helper ─────────────────────────────────────────────────────────────

async function checkAuth(request: Request): Promise<boolean> {
    // Method 1: CRON_SECRET bearer token (for scheduler/CLI)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        return true;
    }

    // Method 2: Debug mode bypass (local dev only)
    if (process.env.IS_DEBUG_MODE) {
        return true;
    }

    // Method 3: Supabase session with admin role
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Check admin role
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return profile?.role === 'admin' || profile?.role === 'super_admin';
    } catch {
        return false;
    }
}
