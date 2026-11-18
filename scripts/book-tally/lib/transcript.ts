/**
 * Transcript selection (SPEC "Transcript selection").
 *
 * coalesce(nullif(trim(subtitles_punctuated),''), nullif(trim(subtitles_cleaned),''),
 *          nullif(trim(subtitles),'')) from nde_vids keyed by "videoId".
 * The returned text is the ORIGINAL column value (untrimmed, never truncated).
 * Transcript text must only flow DB -> API; never print it or put it in logs.
 */
import type { Db } from './supabase';

export type TranscriptSource = 'subtitles_punctuated' | 'subtitles_cleaned' | 'subtitles';

/** Priority order: first non-blank wins. */
export const TRANSCRIPT_COLUMNS: readonly TranscriptSource[] = [
  'subtitles_punctuated',
  'subtitles_cleaned',
  'subtitles',
];

export interface TimestampedSegment {
  start: number;
  duration: number;
  text: string;
}

export interface Transcript {
  videoId: string;
  text: string;
  source: TranscriptSource;
  timestamped?: TimestampedSegment[] | null;
}

/** Pure selection over already-fetched column values. Returns null when all are blank. */
export function pickTranscript(
  videoId: string,
  row: Partial<Record<TranscriptSource, string | null | undefined>>,
): Transcript | null {
  for (const source of TRANSCRIPT_COLUMNS) {
    const v = row[source];
    if (typeof v === 'string' && v.trim() !== '') return { videoId, text: v, source };
  }
  return null;
}

export interface FetchOptions {
  /** Videos per request (transcripts are large). Default 20. */
  pageSize?: number;
  /** Also fetch raw_timestamped_subtitles (for review-sheet timestamps only). */
  withTimestamps?: boolean;
}

/**
 * Fetches transcripts for the given ids, one column tier at a time so that the
 * lower-priority (large) columns are only read for videos that need them.
 * Videos with no usable transcript are returned in `missing`.
 */
export async function* fetchTranscripts(
  db: Db,
  videoIds: string[],
  opts: FetchOptions = {},
): AsyncGenerator<{ transcripts: Transcript[]; missing: string[] }> {
  const pageSize = opts.pageSize ?? 20;
  for (let i = 0; i < videoIds.length; i += pageSize) {
    const ids = videoIds.slice(i, i + pageSize);
    const found = new Map<string, Transcript>();
    let remaining = ids;
    for (const col of TRANSCRIPT_COLUMNS) {
      if (remaining.length === 0) break;
      const { data, error } = await db.from('nde_vids').select(`videoId, ${col}`).in('videoId', remaining);
      if (error) throw new Error(`transcript fetch (${col}) failed: ${error.message}`);
      for (const row of (data ?? []) as unknown as Array<Record<string, string | null>>) {
        const t = pickTranscript(row.videoId as string, { [col]: row[col] });
        if (t) found.set(t.videoId, t);
      }
      remaining = remaining.filter((id) => !found.has(id));
    }
    if (opts.withTimestamps && found.size > 0) {
      const { data, error } = await db
        .from('nde_vids')
        .select('videoId, raw_timestamped_subtitles')
        .in('videoId', [...found.keys()]);
      if (error) throw new Error(`timestamp fetch failed: ${error.message}`);
      for (const row of (data ?? []) as unknown as Array<{ videoId: string; raw_timestamped_subtitles: unknown }>) {
        const t = found.get(row.videoId);
        if (t) t.timestamped = Array.isArray(row.raw_timestamped_subtitles)
          ? (row.raw_timestamped_subtitles as TimestampedSegment[])
          : null;
      }
    }
    yield { transcripts: ids.filter((id) => found.has(id)).map((id) => found.get(id)!), missing: remaining };
  }
}

export async function fetchTranscript(db: Db, videoId: string, withTimestamps = false): Promise<Transcript | null> {
  for await (const { transcripts } of fetchTranscripts(db, [videoId], { withTimestamps })) {
    return transcripts[0] ?? null;
  }
  return null;
}
