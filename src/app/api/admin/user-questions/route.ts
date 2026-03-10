import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/admin/user-questions
 * Returns all user_questions (active + hidden) for the admin list page.
 * Uses explicit join on user_question_id (not nested select) because question_synthesis
 * has two FKs (question_id + user_question_id) and Supabase auto-join is ambiguous.
 */
export async function GET(_req: NextRequest) {
    // Fetch all user questions
    const { data: questions, error } = await supabase
        .from('user_questions')
        .select('id, slug, question, is_active, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!questions?.length) {
        return NextResponse.json({ questions: [] });
    }

    // Fetch synthesis cache status for all user question IDs in one query
    const ids = questions.map(q => q.id);
    const { data: syntheses } = await supabase
        .from('question_synthesis')
        .select('user_question_id, short_answer, answered_at')
        .in('user_question_id', ids);

    // Build a lookup map: user_question_id → synthesis
    const synthMap = new Map(
        (syntheses ?? []).map(s => [s.user_question_id, s])
    );

    // Merge synthesis onto each question
    const merged = questions.map(q => ({
        ...q,
        synthesis: synthMap.get(q.id) ?? null,
    }));

    return NextResponse.json({ questions: merged });
}
