/** Review-sheet column names and the pure parsing / planning behind import-decisions. */
import { CliError } from './cli';
import { parseCsv } from './csv';

export const PAIR_DECISION_COL = 'decision (merge/keep_separate)';
export const LINK_DECISION_COL = 'decision (accept/reject)';

export const PAIR_HEADERS = [
  'pair_id', 'key_a', 'key_b', 'name_a', 'slug_a', 'profile_id_a', 'name_b', 'slug_b', 'profile_id_b', 'rule',
  'channels_a', 'channels_b', 'haiku_verdict', 'haiku_reason', 'sonnet_verdict', 'sonnet_reason',
  'flag', 'component', 'current_decision', PAIR_DECISION_COL, 'note',
];

/** Marker for a decision cell that cannot be imported (no link row exists). Treated as blank by import. */
export const NOT_APPLICABLE = 'n/a';
export const LINK_HEADERS = [
  'kind', 'link_id', 'video_id', 'video_title', 'youtube_url', 'experiencer_name', 'proposed_profile_id',
  'proposed_profile_slug', 'proposed_profile_name', 'other_profile_ids', 'current_decision', LINK_DECISION_COL, 'note',
];
export const NAME_HEADERS = [
  'extraction_id', 'link_id', 'video_id', 'youtube_url', 'name', 'quote', 'flag', 'person_key', 'current_decision', LINK_DECISION_COL, 'note',
];

export type SheetKind = 'merge' | 'link';
export type DecisionValue = 'merge' | 'keep_separate' | 'accept' | 'reject';

export interface SheetRow {
  /** 1-based line number in the file (header is line 1). */
  line: number;
  id: number;
  decision: DecisionValue;
  note: string;
  /** Cross-check columns present in the sheet (null when the column is absent/blank). */
  keyA: string | null;
  keyB: string | null;
  videoId: string | null;
}

export interface ParsedSheet {
  kind: SheetKind;
  rows: SheetRow[];
  blank: number;
}

const ALLOWED: Record<SheetKind, readonly string[]> = { merge: ['merge', 'keep_separate'], link: ['accept', 'reject'] };

/**
 * Reads a marked review CSV. The sheet type is detected from its decision column. Blank
 * decisions are skipped; any other value that is not exactly one of the allowed words
 * (case-insensitive, trimmed) refuses the WHOLE file, as do a missing or non-numeric id and
 * conflicting duplicate rows. Errors name line numbers only (no cell contents).
 */
export function parseDecisionSheet(text: string): ParsedSheet {
  const { headers, rows } = parseCsv(text);
  const kind: SheetKind | null = headers.includes(PAIR_DECISION_COL) ? 'merge' : headers.includes(LINK_DECISION_COL) ? 'link' : null;
  if (!kind) throw new CliError(`not a review sheet: needs a "${PAIR_DECISION_COL}" or "${LINK_DECISION_COL}" column`);
  if (headers.includes(PAIR_DECISION_COL) && headers.includes(LINK_DECISION_COL)) throw new CliError('sheet has both decision columns');
  const idCol = kind === 'merge' ? 'pair_id' : 'link_id';
  if (!headers.includes(idCol)) throw new CliError(`sheet has no "${idCol}" column`);
  const decCol = kind === 'merge' ? PAIR_DECISION_COL : LINK_DECISION_COL;

  const problems: string[] = [];
  const out: SheetRow[] = [];
  let blank = 0;
  rows.forEach((r, i) => {
    const line = i + 2;
    const raw = (r[decCol] ?? '').trim().toLowerCase();
    if (raw === '' || raw === NOT_APPLICABLE) { blank++; return; }
    if (!ALLOWED[kind].includes(raw)) { problems.push(`line ${line}: decision is not one of ${ALLOWED[kind].join('/')}`); return; }
    const idText = (r[idCol] ?? '').trim();
    if (!/^\d+$/.test(idText)) { problems.push(`line ${line}: ${idCol} missing or not a number`); return; }
    out.push({
      line, id: Number(idText), decision: raw as DecisionValue, note: (r.note ?? '').trim(),
      keyA: r.key_a?.trim() || null, keyB: r.key_b?.trim() || null, videoId: r.video_id?.trim() || null,
    });
  });
  const seen = new Map<number, SheetRow>();
  const deduped: SheetRow[] = [];
  for (const r of out) {
    const prev = seen.get(r.id);
    if (!prev) { seen.set(r.id, r); deduped.push(r); }
    else if (prev.decision !== r.decision) problems.push(`line ${r.line}: ${idCol} ${r.id} already marked differently on line ${prev.line}`);
  }
  if (problems.length) throw new CliError(`refusing to import (${problems.length} problem(s)):\n  ${problems.slice(0, 50).join('\n  ')}`);
  return { kind, rows: deduped, blank };
}

export interface KnownTarget { keyA?: string; keyB?: string; videoId?: string }
export interface LatestDecision { decision: string; decided_by: string }

export interface ImportPlan {
  insert: Array<{ id: number; decision: DecisionValue; note: string | null }>;
  skippedSame: number;
  problems: string[];
}

/**
 * Validates marked rows against the database (ids exist, sheet cross-check columns still agree)
 * and drops rows whose latest decision is already the same human decision (idempotent re-import).
 */
export function planImport(sheet: ParsedSheet, known: Map<number, KnownTarget>, latest: Map<number, LatestDecision>): ImportPlan {
  const problems: string[] = [];
  const insert: ImportPlan['insert'] = [];
  let skippedSame = 0;
  for (const r of sheet.rows) {
    const k = known.get(r.id);
    if (!k) { problems.push(`line ${r.line}: ${sheet.kind === 'merge' ? 'pair_id' : 'link_id'} ${r.id} does not exist`); continue; }
    if (sheet.kind === 'merge' && ((r.keyA && r.keyA !== k.keyA) || (r.keyB && r.keyB !== k.keyB))) {
      problems.push(`line ${r.line}: key_a/key_b do not match pair ${r.id} (stale or edited sheet)`);
      continue;
    }
    if (sheet.kind === 'link' && r.videoId && r.videoId !== k.videoId) {
      problems.push(`line ${r.line}: video_id does not match link ${r.id} (stale or edited sheet)`);
      continue;
    }
    const cur = latest.get(r.id);
    if (cur && cur.decided_by === 'human' && cur.decision === r.decision) { skippedSame++; continue; }
    insert.push({ id: r.id, decision: r.decision, note: r.note === '' ? null : r.note });
  }
  return { insert, skippedSame, problems };
}

export interface LinkLite { id: number; video_id: string }

/**
 * Videos in `scope` that would have NO accepted link after applying `changes` to the current
 * latest decisions (a link counts only when its latest decision is 'accept'; 'revert' and
 * 'reject' do not). Pure: used by import-decisions to refuse a file that would unmap a video.
 */
export function unmappedAfter(
  links: LinkLite[],
  latestDecision: Map<number, string>,
  changes: Array<{ id: number; decision: string }>,
  scope: Set<string>,
): string[] {
  const state = new Map(latestDecision);
  for (const c of changes) state.set(c.id, c.decision);
  const accepted = new Set<string>();
  for (const l of links) if (state.get(l.id) === 'accept') accepted.add(l.video_id);
  return [...scope].filter((v) => !accepted.has(v)).sort();
}
