import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/viz/uap-phenomenology
 * 
 * Returns pre-computed UAP phenomenology co-occurrence graph data.
 * Reads from viz_graph_cache table (populated by scripts/viz-compute-uap-phenomenology.ts).
 * 
 * The graph data includes:
 * - nodes: ~35 UAP phenomenon tags across 4 categories with frequency, category, and color
 * - edges: co-occurrence pairs with weight and percentage
 * - metadata: total encounters count and computation timestamp
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

    const { data: cached, error } = await sb
      .from('viz_graph_cache')
      .select('graph_json')
      .eq('viz_id', 'uap-phenomenology')
      .single();

    if (error || !cached?.graph_json) {
      console.error('[viz/uap-phenomenology] Cache miss or error:', error?.message);
      return NextResponse.json(
        { error: 'Visualization data not yet computed. Run scripts/viz-compute-uap-phenomenology.ts' },
        { status: 503 },
      );
    }

    return NextResponse.json(cached.graph_json);
  } catch (err) {
    console.error('[viz/uap-phenomenology] Error:', err);
    return NextResponse.json(
      { error: 'Failed to load visualization data' },
      { status: 500 },
    );
  }
}
