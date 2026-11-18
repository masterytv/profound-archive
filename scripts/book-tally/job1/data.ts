/** Read-side loaders for Job 1 (existing tables are only SELECTed) and small write helpers. */
import { readNdeVideoIds, selectAll, btInsert, type Db } from '../lib/supabase';
import { promptRow, type PromptFile } from '../lib/prompts';
import type { ProfileRow, VideoMeta } from './logic';

export async function loadProfiles(db: Db): Promise<ProfileRow[]> {
  const rows = await selectAll<ProfileRow>(db, 'experiencer_profiles', 'id, slug, full_name, summary, video_ids, first_shared_year', { orderBy: 'id' });
  return rows.filter((r) => typeof r.full_name === 'string' && r.full_name.trim() !== '');
}

export const loadNdeIds = readNdeVideoIds;

/** nde_vids metadata only (never transcript columns). Missing ids are simply absent from the map. */
export async function loadVideoMeta(db: Db, ids: Iterable<string>, chunk = 100): Promise<Map<string, VideoMeta>> {
  const want = [...new Set(ids)].sort();
  const out = new Map<string, VideoMeta>();
  for (let i = 0; i < want.length; i += chunk) {
    const part = want.slice(i, i + chunk);
    const { data, error } = await db.from('nde_vids').select('videoId, title, channelName, channelId, experiencerFullName').in('videoId', part);
    if (error) throw new Error(`nde_vids metadata read failed: ${error.message}`);
    for (const r of (data ?? []) as unknown as VideoMeta[]) out.set(r.videoId, r);
  }
  return out;
}

/** Everything the planners need: profiles, NDE set, metadata for NDE + profile videos. */
export async function loadWorld(db: Db) {
  const [profiles, ndeVideoIds] = await Promise.all([loadProfiles(db), loadNdeIds(db)]);
  const ids = new Set(ndeVideoIds);
  for (const p of profiles) for (const v of p.video_ids ?? []) ids.add(v);
  const videos = await loadVideoMeta(db, ids);
  return { profiles, ndeVideoIds, videos };
}

/** Inserts the bt_prompts row if this exact prompt_hash is not there yet. */
export async function ensurePrompt(db: Db, p: PromptFile, outputSchema: unknown): Promise<string> {
  const row = promptRow(p, { outputSchema });
  const { data, error } = await db.from('bt_prompts').select('prompt_hash').eq('prompt_hash', row.prompt_hash);
  if (error) throw new Error(`read bt_prompts failed: ${error.message}`);
  if (!data || data.length === 0) await btInsert(db, 'bt_prompts', row, { validateRefs: false });
  return row.prompt_hash;
}

export function youtubeUrl(videoId: string, startSeconds?: number | null): string {
  const t = startSeconds != null && Number.isFinite(startSeconds) ? `&t=${Math.max(0, Math.floor(startSeconds))}s` : '';
  return `https://www.youtube.com/watch?v=${videoId}${t}`;
}
