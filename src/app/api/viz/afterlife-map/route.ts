import { NextResponse } from 'next/server';
import mapData from '@/data/afterlife-map.json';

/**
 * Serves the pre-computed afterlife map.
 *
 * The map is a static research artifact — it is produced offline by the pipeline in
 * `scratch/afterlife/` and committed, rather than computed per request. Serving it from a
 * route (instead of `public/`) keeps a ~1MB JSON out of the client bundle and sidesteps the
 * App Hosting static-asset tracing issue documented in docs/LEARNINGS.md.
 */
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(mapData, {
    // max-age=0 so a browser revalidates and picks up a rebuilt map immediately after deploy;
    // the CDN still serves it from cache and refreshes in the background.
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
