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

    const json = data.graph_json as { channels: Array<Record<string, unknown>> };

    // Enrich with actual archived video counts (tier 1 & 2 only)
    // Uses per-channel HEAD count queries — only ~52 parallel requests,
    // each returning just the count (no data), avoiding the 1000-row limit
    if (json.channels) {
      const channelIds = json.channels.map(ch => ch.id as string);

      const results = await Promise.all(
        channelIds.map(async (channelId) => {
          const { count } = await sb
            .from('uap_vids')
            .select('video_id', { count: 'exact', head: true })
            .eq('channel_id', channelId)
            .in('tier', [1, 2]);
          return { channelId, count: count ?? 0 };
        }),
      );

      const archiveCounts = new Map(results.map(r => [r.channelId, r.count]));
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
