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

    // Fetch cached graph data
    const { data, error } = await sb
      .from('viz_graph_cache')
      .select('graph_json')
      .eq('viz_id', 'channel-constellation')
      .single();

    if (error || !data?.graph_json) {
      return NextResponse.json({ error: 'Not yet computed' }, { status: 503 });
    }

    // Fetch actual archived video counts per channel from uap_vids
    // (these are the videos we've actually processed, not YouTube totals)
    const { data: vids } = await sb
      .from('uap_vids')
      .select('channel_id');

    const json = data.graph_json as { channels: Array<Record<string, unknown>> };

    if (vids && json.channels) {
      const archiveCounts = new Map<string, number>();
      for (const v of vids) {
        archiveCounts.set(v.channel_id, (archiveCounts.get(v.channel_id) || 0) + 1);
      }
      for (const ch of json.channels) {
        ch.videoCount = archiveCounts.get(ch.id as string) ?? 0;
      }
    }

    return NextResponse.json(json);
  } catch (err) {
    console.error('[viz/channel-constellation] Error:', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
