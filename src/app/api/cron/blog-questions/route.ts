import { NextResponse } from 'next/server';
import { generateBlogArticle } from '@/lib/pipeline/blog-article';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;

/**
 * POST /api/cron/blog-questions
 *
 * Called by GitHub Actions "blog-generate-questions.yml" workflow.
 * Protected by BLOG_CRON_SECRET bearer token.
 *
 * Picks the next N unpublished nde_questions (ordered by view_count DESC)
 * that don't already have a corresponding blog_posts row, and generates articles.
 *
 * Default batch size: 1 article per run (1/day cron = 1/day throughput).
 * Override: ?count=2 (max 3 to stay within SEO limits).
 */
export async function POST(req: Request) {
    // Auth: verify cron secret (reuses the same CRON_SECRET as scanner/tick)
    const authHeader = req.headers.get('authorization') ?? '';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Batch size (max 3 — SEO rate limit)
    const url = new URL(req.url);
    const count = Math.min(parseInt(url.searchParams.get('count') ?? '1', 10), 3);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find questions that don't have a blog article yet
    const { data: generated } = await supabase
        .from('blog_posts')
        .select('source_question_slug')
        .not('source_question_slug', 'is', null);

    const generatedSlugs = new Set((generated ?? []).map((r) => r.source_question_slug));

    const { data: questions } = await supabase
        .from('nde_questions')
        .select('slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .limit(count + generatedSlugs.size + 10); // over-fetch to account for already-done ones

    const todo = (questions ?? [])
        .map((q) => q.slug)
        .filter((s) => !generatedSlugs.has(s))
        .slice(0, count);

    if (todo.length === 0) {
        return NextResponse.json({ message: 'All questions already generated', processed: 0 });
    }

    // Process sequentially — respect Perplexity rate limits
    const results = [];
    for (const slug of todo) {
        try {
            const result = await generateBlogArticle(slug);
            results.push({ slug, status: result.status, articleSlug: result.articleSlug });
        } catch (err) {
            results.push({ slug, status: 'failed', error: String(err) });
        }
    }

    return NextResponse.json({
        processed: results.length,
        results,
        remaining: (questions?.length ?? 0) - generatedSlugs.size - results.length,
    });
}
