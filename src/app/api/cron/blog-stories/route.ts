/**
 * Cron endpoint: generate one Story blog article per invocation.
 * Triggered daily by GitHub Actions at 2pm ET.
 *
 * Auth: requires CRON_SECRET header.
 *
 * Query params:
 *   count — number of articles (default 1, max 3)
 *   slug  — specific experiencer slug to target (optional)
 *
 * ARCHITECTURE NOTE:
 * The pipeline takes 2-5 minutes (Claude draft + voice pass + fal.ai images).
 * Runs synchronously — Firebase App Hosting (Cloud Run) throttles CPU after
 * the response is sent, so after() callbacks are silently killed.
 * The GitHub Actions curl has --max-time 300 which matches our maxDuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStoryArticle } from '@/lib/pipeline/blog-story';

export const maxDuration = 300; // 5 min timeout for serverless

export async function GET(request: NextRequest) {
    // Auth check
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const count = Math.min(parseInt(searchParams.get('count') ?? '1', 10), 3);
    const specificSlug = searchParams.get('slug') ?? undefined;

    console.log(`[cron/blog-stories] Starting generation of ${count} story(ies)${specificSlug ? ` for ${specificSlug}` : ''}...`);

    const results = [];
    for (let i = 0; i < count; i++) {
        console.log(`[cron/blog-stories] Generating story ${i + 1}/${count}...`);
        const result = await generateStoryArticle(specificSlug);
        results.push(result);

        console.log(`[cron/blog-stories] Story ${i + 1}: ${result.status}${result.articleSlug ? ` → /blog/${result.articleSlug}` : ''}${result.error ? ` — ${result.error}` : ''}`);

        // Stop if we ran out of experiencers
        if (result.status === 'no_experiencers') {
            console.log('[cron/blog-stories] No more eligible experiencers — stopping');
            break;
        }
    }

    console.log(`[cron/blog-stories] Done.`);

    const anyFailed = results.some(r => r.status === 'failed');
    const statusCode = anyFailed ? 500 : 200;

    return NextResponse.json({ results }, { status: statusCode });
}
