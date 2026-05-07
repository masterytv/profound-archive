import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/uap/questions
 * Returns all uap_questions (active + hidden) for the admin list page.
 */
export async function GET() {
    if (!(await isAdminUser())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: questions, error } = await supabase
        .from('uap_questions')
        .select('id, slug, consumer_question, category, ai_query, is_active, sort_order, created_at')
        .order('sort_order', { ascending: true, nullsFirst: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check which questions already have a blog article generated
    const slugs = (questions ?? []).map(q => q.slug);
    const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('source_question_slug')
        .eq('domain', 'uap')
        .in('source_question_slug', slugs);

    const generatedSlugs = new Set((blogPosts ?? []).map(p => p.source_question_slug));

    const merged = (questions ?? []).map(q => ({
        ...q,
        has_article: generatedSlugs.has(q.slug),
    }));

    return NextResponse.json({ questions: merged });
}
