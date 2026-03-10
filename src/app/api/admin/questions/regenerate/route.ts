import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/questions/regenerate
 * Body: { slug: string }
 *
 * Deletes the question_synthesis row for the given question slug,
 * forcing a fresh Claude synthesis on the next page load.
 * Requires admin or super_admin role.
 */
export async function POST(request: Request) {
    // ── Auth check ──────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let slug: string;
    try {
        const body = await request.json() as { slug?: string };
        if (!body.slug) throw new Error('missing slug');
        slug = body.slug;
    } catch {
        return NextResponse.json({ error: 'Body must be { slug: string }' }, { status: 400 });
    }

    // ── Resolve question_id from slug ────────────────────────────────────────
    // Use service client for DB writes (bypasses RLS for admin operation)
    const service = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: question, error: qErr } = await service
        .from('nde_questions')
        .select('id, consumer_question')
        .eq('slug', slug)
        .maybeSingle();

    if (qErr || !question) {
        return NextResponse.json({ error: `Question not found: ${slug}` }, { status: 404 });
    }

    // ── Delete the cached synthesis ──────────────────────────────────────────
    const { error: delErr } = await service
        .from('question_synthesis')
        .delete()
        .eq('question_id', question.id);

    if (delErr) {
        console.error('[Admin] Failed to delete question_synthesis:', delErr.message);
        return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    console.log(`[Admin] Cleared synthesis cache for slug="${slug}" (question_id=${question.id})`);

    return NextResponse.json({
        ok: true,
        message: `Synthesis cleared for "${question.consumer_question}". Next page load will re-synthesise via Claude.`,
        slug,
        question_id: question.id,
    });
}
