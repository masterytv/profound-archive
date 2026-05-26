import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/viz/uap-intelligence
 * 
 * Returns pre-computed UAP intelligence network graph data.
 * Nodes are persons, organizations, and programs connected by shared video evidence.
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
      .eq('viz_id', 'uap-intelligence')
      .single();

    if (error || !cached?.graph_json) {
      console.error('[viz/uap-intelligence] Cache miss or error:', error?.message);
      return NextResponse.json(
        { error: 'Visualization data not yet computed' },
        { status: 503 },
      );
    }

    return NextResponse.json(cached.graph_json);
  } catch (err) {
    console.error('[viz/uap-intelligence] Error:', err);
    return NextResponse.json(
      { error: 'Failed to load visualization data' },
      { status: 500 },
    );
  }
}
