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
 * Includes synthesis status so admin can see if a question has been answered.
 */
export async function GET(_req: NextRequest) {
    const { data, error } = await supabase
        .from('user_questions')
        .select(`
            id,
            slug,
            question,
            is_active,
            created_at,
            question_synthesis ( id, short_answer, answered_at )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: data ?? [] });
}
