import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/admin/revalidate
 *
 * On-demand ISR cache bust. Allows admin to force-refresh specific
 * pages after pipeline runs without waiting for the 24h revalidation timer.
 *
 * Body: { secret: string, paths: string[] }
 *
 * Example:
 *   curl -X POST https://projectprofound.org/api/admin/revalidate \
 *     -H 'Content-Type: application/json' \
 *     -d '{"secret": "...", "paths": ["/uap/channels", "/uap/intelligence", "/visualize"]}'
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, paths } = body;

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: 'paths must be a non-empty array of URL paths' },
        { status: 400 },
      );
    }

    // Cap at 50 paths per request to prevent abuse
    const pathsToRevalidate = paths.slice(0, 50);
    const results: { path: string; status: 'ok' | 'error'; error?: string }[] = [];

    for (const path of pathsToRevalidate) {
      try {
        // A route pattern ("/experiencer/[slug]") needs the 'page' type and
        // busts every page under it. A concrete URL ("/experiencer/some-slug")
        // must be passed WITHOUT a type: with 'page' Next tags it as
        // "<url>/page", which never matches a dynamic route's cache entry, so
        // the call reports success but the page stays stale (seen 2026-09-09).
        if (path.includes('[')) {
          revalidatePath(path, 'page');
        } else {
          revalidatePath(path);
        }
        results.push({ path, status: 'ok' });
      } catch (err) {
        results.push({
          path,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'ok').length;
    console.log(`[revalidate] Busted ISR cache for ${successCount}/${pathsToRevalidate.length} paths`);

    return NextResponse.json({
      message: `Revalidated ${successCount} of ${pathsToRevalidate.length} paths`,
      results,
    });
  } catch (err) {
    console.error('[revalidate] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
