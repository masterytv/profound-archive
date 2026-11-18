/**
 * Videos left out of the analysis because their channel is listed in codebook/excluded-channels.json
 * (for example, a channel deleted from YouTube, so its videos can no longer be checked or cited).
 * The live tables are never changed; the exclusion is applied by the coding run, the rollup and the
 * gold set. Read-only.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { type Db } from '../lib/supabase';
import { CODEBOOK_DIR } from './codebook';

export interface ExcludedChannel { channel_id: string; name: string; reason: string; excluded_on: string }

export function loadExcludedChannels(dir = CODEBOOK_DIR): ExcludedChannel[] {
  const j = JSON.parse(readFileSync(path.join(dir, 'excluded-channels.json'), 'utf8')) as { channels: ExcludedChannel[] };
  for (const c of j.channels) if (!c.channel_id || !c.reason) throw new Error('excluded-channels.json: every channel needs channel_id and reason');
  return j.channels;
}

/** Video ids (any experience type) of the excluded channels, read from nde_vids. */
export async function readExcludedVideoIds(db: Db, channels: readonly ExcludedChannel[] = loadExcludedChannels()): Promise<Set<string>> {
  const out = new Set<string>();
  for (const c of channels) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('nde_vids').select('videoId').eq('channelId', c.channel_id).order('videoId').range(from, from + 999);
      if (error) throw new Error(`read nde_vids for excluded channel ${c.channel_id} failed: ${error.message}`);
      for (const r of (data ?? []) as Array<{ videoId: string }>) out.add(r.videoId);
      if (!data || data.length < 1000) break;
    }
  }
  return out;
}
