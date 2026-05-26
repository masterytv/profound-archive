import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/viz/uap-globe
 * 
 * Returns pre-computed globe data for the UAP encounter map.
 * Points are aggregated by location (US state or country).
 */

export const revalidate = 3600;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

export async function GET() {
  try {
    const sb = serviceClient();

    const { data: cached, error } = await sb
      .from('viz_graph_cache')
      .select('graph_json')
      .eq('viz_id', 'uap-globe')
      .single();

    if (error || !cached?.graph_json) {
      console.error('[viz/uap-globe] Cache miss or error:', error?.message);
      return NextResponse.json(
        { error: 'Visualization data not yet computed' },
        { status: 503 },
      );
    }

    return NextResponse.json(cached.graph_json);
  } catch (err) {
    console.error('[viz/uap-globe] Error:', err);
    return NextResponse.json(
      { error: 'Failed to load visualization data' },
      { status: 500 },
    );
  }
}
