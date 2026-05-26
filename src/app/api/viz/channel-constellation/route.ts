import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { data, error } = await sb
      .from('viz_graph_cache')
      .select('graph_json')
      .eq('viz_id', 'channel-constellation')
      .single();

    if (error || !data?.graph_json) {
      return NextResponse.json({ error: 'Not yet computed' }, { status: 503 });
    }

    return NextResponse.json(data.graph_json);
  } catch (err) {
    console.error('[viz/channel-constellation] Error:', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
