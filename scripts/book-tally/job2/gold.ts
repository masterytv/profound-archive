/** Gold-set review sheet selection, mark parsing and precision statistics. Pure. */
import { wilson, type Proportion } from '../lib/stats';
import { seededShuffle } from './sampling';
import type { Stance } from './answers';

export const NA_ROWS_PER_VIDEO = 3;

export interface FinalCell {
  video_id: string;
  question_id: number;
  stance: Stance;
  status: string;
}

/**
 * Rows for the review sheet: every status 'final' non-not_addressed answer, plus
 * `naPerVideo` seeded not_addressed rows per video (all of them if fewer exist).
 */
export function selectGoldRows<T extends FinalCell>(cells: readonly T[], seed: number, naPerVideo = NA_ROWS_PER_VIDEO): T[] {
  const final = cells.filter((c) => c.status === 'final');
  const out: T[] = final.filter((c) => c.stance !== 'not_addressed');
  const naByVideo = new Map<string, T[]>();
  for (const c of final) if (c.stance === 'not_addressed') (naByVideo.get(c.video_id) ?? naByVideo.set(c.video_id, []).get(c.video_id)!).push(c);
  for (const [video, list] of naByVideo) {
    const byQ = new Map(list.map((c) => [c.question_id, c]));
    const order = seededShuffle(list.map((c) => c.question_id), seed, `goldna:${video}`);
    for (const q of order.slice(0, naPerVideo)) out.push(byQ.get(q)!);
  }
  return out.sort((a, b) => (a.video_id < b.video_id ? -1 : a.video_id > b.video_id ? 1 : a.question_id - b.question_id));
}

/** Y/N cell -> boolean; blank -> null; anything else throws. */
export function parseYN(raw: string | undefined, column: string): boolean | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === '') return null;
  if (['y', 'yes', 'true', '1'].includes(s)) return true;
  if (['n', 'no', 'false', '0'].includes(s)) return false;
  throw new Error(`column "${column}": expected Y or N, got "${raw}"`);
}

export interface GoldMark {
  id?: number;
  video_id: string;
  question_id: number;
  final_stance: Stance;
  correct: boolean;
  quote_is_experiencer: boolean | null;
}

/** Latest mark (highest id; later array position when ids are absent) per (video, question). */
export function latestMarks<T extends GoldMark>(marks: readonly T[]): T[] {
  const m = new Map<string, T>();
  marks.forEach((x, i) => {
    const k = `${x.video_id}\u0000${x.question_id}`;
    const prev = m.get(k);
    if (!prev || (x.id ?? i) >= (prev.id ?? -1)) m.set(k, x);
  });
  return [...m.values()];
}

export interface GoldStats {
  nMarked: number;
  perStance: Record<'yes' | 'no' | 'mixed', Proportion>;
  /** Precision over all non-not_addressed marks. */
  allClaims: Proportion;
  /** Share of not_addressed spot-checks where "not_addressed" was right. */
  notAddressed: Proportion;
  /** Share of non-not_addressed answers whose quote is by the experiencer (blank marks excluded). */
  quoteIsExperiencer: Proportion;
  quoteUnmarked: number;
}

export function goldStats(marks: readonly GoldMark[]): GoldStats {
  const latest = latestMarks(marks);
  const prec = (pred: (m: GoldMark) => boolean) => {
    const sel = latest.filter(pred);
    return wilson(sel.filter((m) => m.correct).length, sel.length);
  };
  const claims = latest.filter((m) => m.final_stance !== 'not_addressed');
  const q = claims.filter((m) => m.quote_is_experiencer !== null);
  return {
    nMarked: latest.length,
    perStance: {
      yes: prec((m) => m.final_stance === 'yes'),
      no: prec((m) => m.final_stance === 'no'),
      mixed: prec((m) => m.final_stance === 'mixed'),
    },
    allClaims: prec((m) => m.final_stance !== 'not_addressed'),
    notAddressed: prec((m) => m.final_stance === 'not_addressed'),
    quoteIsExperiencer: wilson(q.filter((m) => m.quote_is_experiencer === true).length, q.length),
    quoteUnmarked: claims.length - q.length,
  };
}

export function fmtProportion(p: Proportion): string {
  if (p.p === null) return `n/a (n=0)`;
  const f = (x: number) => (100 * x).toFixed(1);
  return `${f(p.p)}% (${p.k}/${p.n}; Wilson 95% CI ${f(p.lo!)}-${f(p.hi!)}%)`;
}

/** YouTube link for the review sheet. */
export function youtubeLink(videoId: string, startSeconds: number | null | undefined): string {
  const base = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  return startSeconds !== null && startSeconds !== undefined && Number.isFinite(Number(startSeconds))
    ? `${base}&t=${Math.max(0, Math.floor(Number(startSeconds)))}s`
    : base;
}
