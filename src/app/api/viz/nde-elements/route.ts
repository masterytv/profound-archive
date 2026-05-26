import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/viz/nde-elements
 * 
 * Returns pre-computed NDE element co-occurrence graph data.
 * Reads from viz_graph_cache table (seeded via SQL, see migration).
 * 
 * The graph data includes:
 * - nodes: 15 NDE core elements with frequency, category, and color
 * - edges: 105 co-occurrence pairs with weight and percentage
 * - metadata: total experiences count and computation timestamp
 */

// Cache for 1 hour at the CDN level
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

    // Read from pre-computed cache (populated by SQL)
    const { data: cached, error } = await sb
      .from('viz_graph_cache')
      .select('graph_json')
      .eq('viz_id', 'nde-elements')
      .single();

    if (error || !cached?.graph_json) {
      console.error('[viz/nde-elements] Cache miss or error:', error?.message);
      return NextResponse.json(
        { error: 'Visualization data not yet computed. Run the cache seed SQL.' },
        { status: 503 },
      );
    }

    return NextResponse.json(cached.graph_json);
  } catch (err) {
    console.error('[viz/nde-elements] Error:', err);
    return NextResponse.json(
      { error: 'Failed to load visualization data' },
      { status: 500 },
    );
  }
}
