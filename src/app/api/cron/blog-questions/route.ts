/**
 * Cron endpoint: generate one Big Question blog article per invocation.
 * Triggered daily by GitHub Actions at noon ET.
 *
 * Auth: requires CRON_SECRET header.
 *
 * Query params:
 *   count — number of articles (default 1, max 3)
 *
 * ARCHITECTURE NOTE:
 * The pipeline takes 2-5 minutes (Claude draft + Perplexity research + fal.ai images).
 * Cloudflare's proxy timeout is ~100s, which causes a 524 if we wait synchronously.
 * We use Next.js `after()` to return HTTP 200 immediately and run the pipeline
 * in the background. Results are logged server-side and written to the database.
 */

import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { generateBlogArticle } from '@/lib/pipeline/blog-article';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300; // 5 min timeout for serverless

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

    // Parse params before responding
    const url = new URL(req.url);
    const count = Math.min(parseInt(url.searchParams.get('count') ?? '1', 10), 3);

    // Kick off pipeline AFTER response is sent (avoids Cloudflare 524 timeout)
    after(async () => {
        console.log(`[cron/blog-questions] Starting generation of ${count} article(s)...`);

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
            .limit(count + generatedSlugs.size + 10);

        const todo = (questions ?? [])
            .map((q) => q.slug)
            .filter((s) => !generatedSlugs.has(s))
            .slice(0, count);

        if (todo.length === 0) {
            console.log('[cron/blog-questions] All questions already generated — nothing to do');
            return;
        }

        // Process sequentially — respect API rate limits
        for (const slug of todo) {
            try {
                const result = await generateBlogArticle(slug);
                console.log(`[cron/blog-questions] ${slug}: ${result.status}${result.articleSlug ? ` → /blog/${result.articleSlug}` : ''}${result.error ? ` — ${result.error}` : ''}`);
            } catch (err) {
                console.error(`[cron/blog-questions] ${slug}: FAILED — ${err}`);
            }
        }

        console.log(`[cron/blog-questions] Done. Processed ${todo.length} question(s).`);
    });

    // Respond immediately — pipeline runs in background via after()
    return NextResponse.json({
        acknowledged: true,
        message: `Queued ${count} article(s) for generation. Check server logs for results.`,
    });
}
