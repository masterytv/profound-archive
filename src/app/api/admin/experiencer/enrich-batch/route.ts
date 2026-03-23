/**
 * POST /api/admin/experiencer/enrich-batch
 * 
 * Batched enrichment for new profiles that are missing highlight data.
 * Processes in chunks and streams progress. Designed for long-running
 * execution with maxDuration=300 on Cloud Run.
 * 
 * Query params:
 *   ?limit=50   - Number of profiles to process per request (default 50)
 *   ?offset=0   - Start offset for pagination across multiple calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin-guard';
import { 
  generateExperiencerProfile, 
  createExperiencerPipelineClient 
} from '@/lib/pipeline/experiencer-profile';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const supabase = createExperiencerPipelineClient();

    // Fetch profiles missing enrichment data
    const { data: profiles, error: fetchError } = await supabase
      .from('experiencer_profiles')
      .select('id, full_name, slug')
      .not('published_at', 'is', null)
      .is('highlight_quote', null)
      .order('total_views', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (fetchError || !profiles) {
      return NextResponse.json({ error: fetchError?.message || 'No profiles found' }, { status: 500 });
    }

    // Get total remaining count
    const { count: remaining } = await supabase
      .from('experiencer_profiles')
      .select('id', { count: 'exact', head: true })
      .not('published_at', 'is', null)
      .is('highlight_quote', null);

    const results: { name: string; status: string; message: string }[] = [];

    for (const profile of profiles) {
      try {
        const result = await generateExperiencerProfile(supabase, profile.id);
        results.push({
          name: profile.full_name,
          status: result.status,
          message: result.message || 'done',
        });
      } catch (err: any) {
        results.push({
          name: profile.full_name,
          status: 'error',
          message: err.message,
        });
      }
      // 200ms pause between profiles
      await new Promise(r => setTimeout(r, 200));
    }

    const successCount = results.filter(r => r.status === 'success').length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      enriched: successCount,
      remaining: (remaining ?? 0) - results.length,
      nextOffset: offset + limit,
      results,
    });
  } catch (error: any) {
    console.error('[ExperiencerEnrichBatch] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
