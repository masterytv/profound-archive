/**
 * Run planning: which videos / cells a (mode, pass) covers. The plan is frozen in
 * bt_runs.params at --estimate time, so a later resume or --confirm-spend processes exactly
 * what was estimated even though "not yet completed" sets shrink as results arrive.
 */
import { MODELS, type ModelFamily } from '../lib/cost';
import { readActiveQuestions, readNdeVideoIds, type Db } from '../lib/supabase';
import { fetchTranscripts } from '../lib/transcript';
import { CliError } from './cli';
import {
  NON_TERMINAL, countCells, fetchPendingCells, fetchStanceRuns, videosWithFirstPass, type PendingCell, type RunRow,
} from './db';
import { goldOrder, pilotOrder } from './sampling';
import { toPromptQuestions, type PassKind, type PromptQuestion } from './requests';

export type Mode = 'pilot' | 'gold' | 'full';
export type PassOpt = 'first' | 'recheck' | 'arbiter';

export interface Plan {
  videoIds: string[];
  /** recheck / arbiter: video -> [question_id, first_answer_id, recheck_answer_id | null][] */
  cells?: Record<string, Array<[number, number, number | null]>>;
  questionIds: number[];
  skippedNoTranscript: string[];
  /** video -> sha256 of the exact transcript text the requests were built from (set at estimate time). */
  transcriptSha?: Record<string, string>;
}

export interface PlanRequest {
  mode: Mode;
  pass: PassOpt;
  seed: number;
  pilotN: number;
  goldN: number;
}

export function kindOf(mode: Mode, pass: PassOpt): PassKind {
  return mode === 'pilot' ? 'pilot' : pass;
}

export function familiesOf(kind: PassKind): ModelFamily[] {
  return kind === 'pilot' ? ['haiku', 'sonnet'] : kind === 'first' ? ['haiku'] : kind === 'recheck' ? ['sonnet'] : ['opus'];
}

export const modelOf = (f: ModelFamily): string => MODELS[f];

export async function loadQuestions(db: Db): Promise<PromptQuestion[]> {
  const rows = await readActiveQuestions(db);
  if (rows.length === 0) throw new CliError('no active questions in nde_questions');
  return toPromptQuestions(rows);
}

/** Walks `order`, fetching transcripts only to test availability; stops after k found. */
export async function pickAvailable(db: Db, order: readonly string[], k: number): Promise<{ chosen: string[]; skipped: string[] }> {
  const have = new Set<string>();
  let pos = 0;
  const chosen: string[] = [];
  const skipped: string[] = [];
  while (chosen.length < k && pos < order.length) {
    const page = order.slice(pos, pos + Math.max(10, k - chosen.length));
    pos += page.length;
    for await (const { transcripts } of fetchTranscripts(db, page, { pageSize: 25 })) transcripts.forEach((t) => have.add(t.videoId));
    for (const id of page) {
      if (chosen.length >= k) break;
      (have.has(id) ? chosen : skipped).push(id);
    }
  }
  return { chosen, skipped };
}

export function goldIdsFromRuns(runs: readonly RunRow[]): string[] | null {
  const gold = runs.filter((r) => r.status !== 'canceled' && r.params?.mode === 'gold' && r.pass === 'first' && Array.isArray(r.params?.plan?.videoIds));
  return gold.length ? (gold[gold.length - 1].params.plan.videoIds as string[]) : null;
}

export function pilotIdsFromRuns(runs: readonly RunRow[]): string[] {
  return runs.filter((r) => r.params?.mode === 'pilot').flatMap((r) => (r.params?.plan?.videoIds as string[] | undefined) ?? []);
}

/** Videos covered by non-terminal runs of the same pass kind (optionally ignoring one group). */
export function coveredKeys(runs: readonly RunRow[], kind: string, exceptGroup?: string): Map<string, RunRow> {
  const m = new Map<string, RunRow>();
  for (const r of runs) {
    if (r.params?.kind !== kind || r.params?.group === exceptGroup) continue;
    if (!(NON_TERMINAL as readonly string[]).includes(r.status)) continue;
    for (const v of (r.params?.plan?.videoIds as string[] | undefined) ?? []) if (!m.has(v)) m.set(v, r);
  }
  return m;
}

/** S4: the first non-terminal run of the same pass that already covers any of these videos. */
export function findOverlap(
  runs: readonly RunRow[], kind: string, group: string, videoIds: readonly string[],
): { runId: string; group: string; status: string; videos: number } | null {
  const covered = coveredKeys(runs, kind, group);
  let first: RunRow | null = null;
  let n = 0;
  for (const v of videoIds) {
    const r = covered.get(v);
    if (r) { n++; first ??= r; }
  }
  return first ? { runId: first.id, group: String(first.params.group), status: first.status, videos: n } : null;
}

function groupCells(cells: readonly PendingCell[]): Plan['cells'] {
  const out: NonNullable<Plan['cells']> = {};
  for (const c of [...cells].sort((a, b) => (a.video_id < b.video_id ? -1 : a.video_id > b.video_id ? 1 : a.question_id - b.question_id))) {
    (out[c.video_id] ??= []).push([c.question_id, c.first_answer_id, c.recheck_answer_id]);
  }
  return out;
}

export interface MadePlan { kind: PassKind; plan: Plan; notes: string[] }

export async function makePlan(db: Db, req: PlanRequest, log: (s: string) => void): Promise<MadePlan> {
  const kind = kindOf(req.mode, req.pass);
  const questions = await loadQuestions(db);
  const questionIds = questions.map((q) => q.question_id);
  const notes: string[] = [`active questions: ${questions.length}`];
  const runs = await fetchStanceRuns(db);

  if (req.mode === 'pilot' || (req.mode === 'gold' && req.pass === 'first') || (req.mode === 'full' && req.pass === 'first')) {
    const nde = await readNdeVideoIds(db);
    notes.push(`NDE videos: ${nde.length}`);
    if (req.mode === 'pilot') {
      const { chosen, skipped } = await pickAvailable(db, pilotOrder(nde, req.seed), req.pilotN);
      if (chosen.length < req.pilotN) throw new CliError(`only ${chosen.length} NDE videos with transcripts for the pilot`);
      return { kind, plan: { videoIds: chosen, questionIds, skippedNoTranscript: skipped }, notes };
    }
    if (req.mode === 'gold') {
      // Disjoint from the pilot: recompute the pilot sample AND honour any stored pilot run.
      const pilot = await pickAvailable(db, pilotOrder(nde, req.seed), req.pilotN);
      const exclude = new Set([...pilot.chosen, ...pilot.skipped, ...pilotIdsFromRuns(runs)]);
      const { chosen, skipped } = await pickAvailable(db, goldOrder(nde, req.seed, exclude), req.goldN);
      if (chosen.length < req.goldN) throw new CliError(`only ${chosen.length} NDE videos with transcripts for the gold set`);
      const done = await videosWithFirstPass(db, questionIds[0]);
      const already = chosen.filter((v) => done.has(v));
      if (already.length) throw new CliError(`gold first pass already has rows for ${already.length} of ${chosen.length} videos; nothing to estimate`);
      notes.push(`pilot ids excluded: ${exclude.size}`);
      return { kind, plan: { videoIds: chosen, questionIds, skippedNoTranscript: skipped }, notes };
    }
    // full first: every NDE video without first-pass rows (gold videos are skipped: same pass)
    const done = await videosWithFirstPass(db, questionIds[0]);
    const covered = coveredKeys(runs, 'first');
    const todo = nde.filter((v) => !done.has(v) && !covered.has(v)).sort();
    notes.push(`already have first-pass rows (gold/earlier full): ${nde.length - todo.length - nde.filter((v) => !done.has(v) && covered.has(v)).length}`);
    const inFlight = nde.filter((v) => !done.has(v) && covered.has(v)).length;
    if (inFlight) notes.push(`excluded: ${inFlight} videos covered by a non-terminal first-pass run`);
    if (todo.length === 0) throw new CliError('every NDE video already has first-pass rows; nothing to do');
    return { kind, plan: { videoIds: todo, questionIds, skippedNoTranscript: [] }, notes };
  }

  // recheck / arbiter
  let scope: string[];
  if (req.mode === 'gold') {
    scope = goldIdsFromRuns(runs) ?? [];
    if (scope.length === 0) throw new CliError('no gold first-pass run found; run --gold --pass first first');
  } else {
    const nde = await readNdeVideoIds(db);
    scope = nde;
    const done = await videosWithFirstPass(db, questionIds[0]);
    const skipped = new Set(
      runs.filter((r) => r.params?.mode === 'full' && r.pass === 'first').flatMap((r) => (r.params?.plan?.skippedNoTranscript as string[] | undefined) ?? []),
    );
    const missing = nde.filter((v) => !done.has(v) && !skipped.has(v));
    if (missing.length) throw new CliError(`first pass incomplete: ${missing.length} NDE videos have no first-pass rows`);
  }
  if (req.pass === 'arbiter') {
    const open = await countCells(db, 'pending_recheck', scope);
    if (open) throw new CliError(`${open} cells still await the recheck; finish the recheck pass before the arbiter`);
  }
  const status = req.pass === 'recheck' ? 'pending_recheck' : 'pending_arbiter';
  const cells = await fetchPendingCells(db, status, scope);
  if (cells.length === 0) throw new CliError(`no cells with status ${status}; nothing to do`);
  const grouped = groupCells(cells)!;
  notes.push(`cells ${status}: ${cells.length} in ${Object.keys(grouped).length} videos`);
  return { kind, plan: { videoIds: Object.keys(grouped).sort(), cells: grouped, questionIds, skippedNoTranscript: [] }, notes };
}

/** Request keys (video ids) of a plan. */
export const planKeys = (p: Plan): string[] => p.videoIds;
