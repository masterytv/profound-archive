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
 * Cloudflare's proxy timeout is ~100s, which causes a 524 if we wait synchronously.
 * We use Next.js `after()` to return HTTP 200 immediately and run the pipeline
 * in the background. Results are logged server-side and written to the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
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

    // Kick off pipeline AFTER response is sent (avoids Cloudflare 524 timeout)
    after(async () => {
        console.log(`[cron/blog-stories] Starting generation of ${count} story(ies)${specificSlug ? ` for ${specificSlug}` : ''}...`);

        for (let i = 0; i < count; i++) {
            console.log(`[cron/blog-stories] Generating story ${i + 1}/${count}...`);
            const result = await generateStoryArticle(specificSlug);

            console.log(`[cron/blog-stories] Story ${i + 1}: ${result.status}${result.articleSlug ? ` → /blog/${result.articleSlug}` : ''}${result.error ? ` — ${result.error}` : ''}`);

            // Stop if we ran out of experiencers
            if (result.status === 'no_experiencers') {
                console.log('[cron/blog-stories] No more eligible experiencers — stopping');
                break;
            }
        }

        console.log(`[cron/blog-stories] Done.`);
    });

    // Respond immediately — pipeline runs in background via after()
    return NextResponse.json({
        acknowledged: true,
        message: `Queued ${count} story(ies) for generation${specificSlug ? ` (targeting ${specificSlug})` : ''}. Check server logs for results.`,
    });
}
