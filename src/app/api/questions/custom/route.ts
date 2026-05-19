import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toSlug, generateHyde } from '@/lib/questions/question-utils';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// ── Simple in-memory rate limiter ──────────────────────────────────────────
// Why: This route triggers OpenAI API calls (via generateHyde). Without rate
// limiting, any anonymous user can burn API credits by spamming requests.
// In-memory is sufficient because Cloud Run maxInstances=1 means a single
// process handles all requests.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per IP per minute
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = ipRequestMap.get(ip);

    if (!record || now > record.resetAt) {
        ipRequestMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    record.count++;
    return record.count > RATE_LIMIT_MAX;
}

// Periodic cleanup to prevent memory leak from stale IP entries
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRequestMap) {
        if (now > record.resetAt) ipRequestMap.delete(ip);
    }
}, RATE_LIMIT_WINDOW_MS * 5);


export async function POST(req: NextRequest) {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';

    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again in a minute.' },
            { status: 429, headers: { 'Retry-After': '60' } }
        );
    }

    let question: string;
    try {
        const body = await req.json();
        question = (body.question ?? '').trim();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!question || question.length < 5) {
        return NextResponse.json({ error: 'Question too short' }, { status: 400 });
    }
    if (question.length > 300) {
        return NextResponse.json({ error: 'Question too long (max 300 chars)' }, { status: 400 });
    }

    const slug = toSlug(question);

    // Idempotency: return existing user question if already saved
    const { data: existing } = await supabase
        .from('user_questions')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
    if (existing) return NextResponse.json({ slug: existing.slug });

    // Don't duplicate a curated question — redirect to it instead
    const { data: curated } = await supabase
        .from('nde_questions')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
    if (curated) return NextResponse.json({ slug: curated.slug });

    // Generate a HyDE passage for richer semantic matching.
    // Runs only once per unique question since the result is persisted below.
    const ai_query = await generateHyde(question);

    const { data: inserted, error } = await supabase
        .from('user_questions')
        .insert({ slug, question, ai_query })
        .select('slug')
        .single();

    if (error) {
        // Race condition: another request inserted the same slug simultaneously
        if (error.code === '23505') return NextResponse.json({ slug });
        console.error('[questions/custom] Insert error:', error.message);
        return NextResponse.json({ error: 'Failed to save question' }, { status: 500 });
    }

    return NextResponse.json({ slug: inserted.slug });
}
