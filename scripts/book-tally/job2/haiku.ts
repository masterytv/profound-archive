/**
 * Haiku-only resolution (budget decision: only the Haiku first pass runs on all NDE videos).
 *
 * Computed in TypeScript straight from bt_stance_answers (pass 'first', latest row = max id per
 * (video, question)); bt_final_stances is NOT used in this mode, because that view leaves every
 * no / mixed / confidence < 70 / failed-quote cell pending_recheck, so a tally built on it would
 * contain only yes and not_addressed (a severe bias).
 *
 * An answer is COUNTED iff it is valid AND (stance is 'not_addressed' OR its quote was verified
 * against the transcript). Everything else is excluded and reported: 'invalid' (schema or
 * coverage failure) and 'unverified_quote' (valid claim whose quote is not in the transcript).
 * Counted answers that the full pipeline WOULD have sent for a re-check (no, mixed, confidence
 * < 70) carry `flagged: true`; nothing re-checked them. Pure functions plus one reader.
 * The answers are NOT independently checked by a second model: see the gold-set precision.
 */
import { selectAllKeyset, type Db } from '../lib/supabase';
import { VIEW_VIDEO_CHUNK } from './db';
import { isFlagged, type AnswerLite } from './flags';
import type { Stance } from './answers';
import type { FinalRow } from './tally';

export type Resolution = 'full' | 'haiku-first-pass';
export const RESOLUTIONS: readonly Resolution[] = ['full', 'haiku-first-pass'];
/** Value of the `resolution` column in every row of the haiku-only CSVs. */
export const HAIKU_RESOLUTION_LABEL = 'haiku_first_pass_unchecked';
/** Suffix of every haiku-mode output file (so the two modes never overwrite each other). */
export const HAIKU_SUFFIX = '_haiku_only';

export function parseResolution(raw: string | undefined, name = 'resolution'): Resolution {
  if (raw === undefined) return 'full';
  if (!(RESOLUTIONS as readonly string[]).includes(raw)) throw new Error(`--${name} must be one of ${RESOLUTIONS.join(', ')}`);
  return raw as Resolution;
}

export interface FirstPassAnswer {
  id: number;
  video_id: string;
  question_id: number;
  stance: Stance | null;
  confidence: number | null;
  quote_verified: boolean;
  valid: boolean;
}

export type HaikuCategory = 'counted' | 'invalid' | 'unverified_quote';

export function toLite(a: FirstPassAnswer): AnswerLite {
  return { id: a.id, valid: a.valid, stance: a.stance, confidence: a.confidence, quote: null, quoteVerified: a.quote_verified };
}

export function categoryOf(a: FirstPassAnswer): HaikuCategory {
  if (!a.valid || a.stance === null) return 'invalid';
  if (a.stance === 'not_addressed' || a.quote_verified) return 'counted';
  return 'unverified_quote';
}

/** Would the full pipeline have sent this (counted) answer for a re-check: no, mixed, or confidence < 70. */
export function wouldBeFlagged(a: FirstPassAnswer): boolean {
  return isFlagged(toLite(a));
}

/** Latest first-pass row (max id) per (video, question). */
export function latestPerCell<T extends { id: number; video_id: string; question_id: number }>(rows: readonly T[]): T[] {
  const m = new Map<string, T>();
  for (const r of rows) {
    const k = `${r.video_id}\u0000${r.question_id}`;
    const prev = m.get(k);
    if (!prev || r.id > prev.id) m.set(k, r);
  }
  return [...m.values()];
}

export interface HaikuCell extends FirstPassAnswer {
  category: HaikuCategory;
  flagged: boolean;
}

/** Latest-per-cell, restricted to the given active questions, classified. */
export function haikuCells(rows: readonly FirstPassAnswer[], questionIds: Iterable<number>): HaikuCell[] {
  const active = new Set(questionIds);
  return latestPerCell(rows.filter((r) => active.has(r.question_id))).map((a) => ({
    ...a, category: categoryOf(a), flagged: categoryOf(a) === 'counted' && wouldBeFlagged(a),
  }));
}

/** Cells in the shape the shared person tally consumes. Statuses: final | unverified | invalid. */
export function toFinalRows(cells: readonly HaikuCell[]): FinalRow[] {
  return cells.map((c) => ({
    video_id: c.video_id, question_id: c.question_id,
    stance: c.category === 'counted' ? c.stance : null,
    status: c.category === 'counted' ? 'final' : c.category === 'invalid' ? 'invalid' : 'unverified',
    flagged: c.flagged,
  }));
}

/** Videos with a first-pass row for EVERY one of the active questions. */
export function completeVideos(rows: ReadonlyArray<{ video_id: string; question_id: number }>, questionIds: Iterable<number>): Set<string> {
  const need = new Set(questionIds);
  const have = new Map<string, Set<number>>();
  for (const r of rows) if (need.has(r.question_id)) (have.get(r.video_id) ?? have.set(r.video_id, new Set()).get(r.video_id)!).add(r.question_id);
  return new Set([...have].filter(([, qs]) => qs.size === need.size).map(([v]) => v));
}

export interface CategoryCounts { counted: number; invalid: number; unverified_quote: number; counted_flagged: number }

export function countCategories(cells: readonly HaikuCell[]): CategoryCounts {
  const c: CategoryCounts = { counted: 0, invalid: 0, unverified_quote: 0, counted_flagged: 0 };
  for (const x of cells) {
    c[x.category]++;
    if (x.flagged) c.counted_flagged++;
  }
  return c;
}

const FIRST_PASS_COLS = 'id, video_id, question_id, stance, confidence, quote_verified, valid';

/**
 * Reads every first-pass answer row of the given videos (no quote text), per chunk of videos so
 * the filter stays small. Includes superseded rows; use haikuCells / latestPerCell.
 */
export async function fetchFirstPassAnswers(db: Db, videoIds: readonly string[], chunk = VIEW_VIDEO_CHUNK): Promise<FirstPassAnswer[]> {
  const out: FirstPassAnswer[] = [];
  for (let i = 0; i < videoIds.length; i += chunk) {
    const ids = videoIds.slice(i, i + chunk) as string[];
    out.push(...(await selectAllKeyset<FirstPassAnswer & Record<string, unknown>>(
      db, 'bt_stance_answers', FIRST_PASS_COLS, 'id', (q) => q.eq('pass', 'first').in('video_id', ids),
    )));
  }
  return out;
}
