import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-guard';

/**
 * POST /api/admin/uap/questions/toggle
 * Body: { slug: string, restore?: boolean }
 *
 * Sets uap_questions.is_active = false (or true if restore=true).
 */
export async function POST(req: NextRequest) {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let slug: string;
    let restore = false;
    try {
        const body = await req.json();
        slug = (body.slug ?? '').trim();
        restore = Boolean(body.restore);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!slug) {
        return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Look up the UAP question
    const { data: q, error: fetchErr } = await supabase
        .from('uap_questions')
        .select('id, consumer_question, is_active')
        .eq('slug', slug)
        .maybeSingle();

    if (fetchErr || !q) {
        return NextResponse.json({ error: 'UAP question not found' }, { status: 404 });
    }

    // Toggle the is_active flag
    const { error: updateErr } = await supabase
        .from('uap_questions')
        .update({ is_active: restore })
        .eq('slug', slug);

    if (updateErr) {
        console.error('[uap-questions-toggle] Update error:', updateErr.message);
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }

    const action = restore ? 'restored' : 'hidden';
    console.log(`[Admin] UAP question "${q.consumer_question}" (slug=${slug}) ${action}`);

    return NextResponse.json({
        ok: true,
        message: `Question ${action} successfully.`,
        slug,
        is_active: restore,
    });
}
