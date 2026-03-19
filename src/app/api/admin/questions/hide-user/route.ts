import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-guard';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * POST /api/admin/questions/hide-user
 * Body: { slug: string, restore?: boolean }
 *
 * Sets user_questions.is_active = false (or true if restore=true).
 * Also deletes the cached synthesis so a fresh one is generated if restored.
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

    // Look up the user question
    const { data: uq, error: fetchErr } = await supabase
        .from('user_questions')
        .select('id, question, is_active')
        .eq('slug', slug)
        .maybeSingle();

    if (fetchErr || !uq) {
        return NextResponse.json({ error: 'User question not found' }, { status: 404 });
    }

    // Toggle the is_active flag
    const { error: updateErr } = await supabase
        .from('user_questions')
        .update({ is_active: restore ? true : false })
        .eq('slug', slug);

    if (updateErr) {
        console.error('[hide-user] Update error:', updateErr.message);
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }

    // If hiding: also delete the cached synthesis so it won't be served
    if (!restore) {
        await supabase
            .from('question_synthesis')
            .delete()
            .eq('user_question_id', uq.id);
    }

    const action = restore ? 'restored' : 'hidden';
    console.log(`[Admin] User question "${uq.question}" (slug=${slug}) ${action}`);

    return NextResponse.json({
        ok: true,
        message: `Question ${action} successfully.`,
        slug,
        is_active: restore,
    });
}
