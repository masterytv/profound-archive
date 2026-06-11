/**
 * Cron endpoint: generate one UAP Big Question blog article per invocation.
 * Triggered daily by GitHub Actions (offset from NDE to avoid rate-limit overlap).
 *
 * Auth: requires CRON_SECRET header.
 *
 * Query params:
 *   count — number of articles (default 1, max 3)
 *
 * Copy-Modify from /api/cron/blog-questions (NDE version).
 * Uses generateUapBlogArticle + uap_questions table.
 */

import { NextResponse } from 'next/server';
import { generateUapBlogArticle } from '@/lib/pipeline/uap-blog-article';
import { createClient } from '@supabase/supabase-js';
import { getBudgetStatus } from '@/lib/ai/budget';

export const maxDuration = 540; // 9 min — matches curl --max-time in GHA workflow

export async function POST(req: Request) {
    // Auth: verify cron secret
    const authHeader = req.headers.get('authorization') ?? '';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budget = await getBudgetStatus();
    if (!budget.allowed) {
        return NextResponse.json({ error: `AI budget reached — ${budget.reason}` }, { status: 503 });
    }

    // Parse params
    const url = new URL(req.url);
    const count = Math.min(parseInt(url.searchParams.get('count') ?? '1', 10), 3);

    console.log(`[cron/uap-blog-questions] Starting generation of ${count} article(s)...`);

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find UAP questions that don't have a blog article yet
    const { data: generated } = await supabase
        .from('blog_posts')
        .select('source_question_slug')
        .eq('domain', 'uap')
        .not('source_question_slug', 'is', null);

    const generatedSlugs = new Set((generated ?? []).map((r) => r.source_question_slug));

    const { data: questions } = await supabase
        .from('uap_questions')
        .select('slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .limit(count + generatedSlugs.size + 10);

    const todo = (questions ?? [])
        .map((q) => q.slug)
        .filter((s) => !generatedSlugs.has(s))
        .slice(0, count);

    if (todo.length === 0) {
        console.log('[cron/uap-blog-questions] All UAP questions already generated — nothing to do');
        return NextResponse.json({ results: [], message: 'All UAP questions already generated' });
    }

    // Process sequentially — respect API rate limits
    const results = [];
    for (const slug of todo) {
        try {
            const result = await generateUapBlogArticle(slug);
            results.push({ slug, ...result });
            console.log(`[cron/uap-blog-questions] ${slug}: ${result.status}${result.articleSlug ? ` → /blog/${result.articleSlug}` : ''}${result.error ? ` — ${result.error}` : ''}`);
        } catch (err) {
            results.push({ slug, status: 'failed', error: String(err) });
            console.error(`[cron/uap-blog-questions] ${slug}: FAILED — ${err}`);
        }
    }

    console.log(`[cron/uap-blog-questions] Done. Processed ${todo.length} question(s).`);

    const anyFailed = results.some(r => r.status === 'failed');
    const statusCode = anyFailed ? 500 : 200;

    return NextResponse.json({ results }, { status: statusCode });
}
