import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

/** Paginate through all channel_id values from uap_vids (tier 1 & 2) */
async function fetchArchiveCounts(sb: ReturnType<typeof serviceClient>): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const PAGE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await sb
      .from('uap_vids')
      .select('channel_id')
      .in('tier', [1, 2])
      .range(offset, offset + PAGE - 1);

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    for (const v of data) {
      counts.set(v.channel_id, (counts.get(v.channel_id) || 0) + 1);
    }

    if (data.length < PAGE) {
      hasMore = false;
    }
    offset += PAGE;
  }

  return counts;
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

    // Enrich cached channels with actual archived video count (tier 1 & 2)
    if (json.channels) {
      const archiveCounts = await fetchArchiveCounts(sb);
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
