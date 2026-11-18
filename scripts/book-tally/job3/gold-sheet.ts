/**
 * Job 3 gold sheet: the review sheet the owner marks to measure the codebook coding (no API calls,
 * no spend, no database writes; writes only files in out/).
 *
 * Selection (deterministic; the report rebuilds exactly the same sheet from the same flags):
 *   - eligible videos: coded in a completed codebook run with the CURRENT prompt, with at least one
 *     valid latest row. A video whose whole response was rejected (every row invalid) is left out.
 *   - videos: seededShuffle(eligible sorted, seed, 'codebook-gold').slice(0, n).
 *   - rows per video, from the latest row per item (job3/tally.latestRows):
 *       every item whose outcome is 'counted' (job3/validate.rowOutcome), facts and questions;
 *       plus up to --na-per-video 'not_addressed' items (seeded shuffle, salt codebook-gold-na:<video>).
 *     Unverified and invalid rows are not sampled: they never reach a tally.
 *   - a multiple-choice row lists only the answers whose own quote verified (job3/validate.countedChoices).
 * Every quote carries a youtube link at the aligned timestamp (no &t when the quote cannot be aligned).
 *
 * Outputs: out/coded_gold_sheet.json ({ header, rows }) and out/coded_gold_sheet.csv (flat; mc answers
 * joined with " | "; mark columns left blank for the owner). The files hold model-returned quotes: out/
 * is gitignored. Logs print counts only, never quote text.
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { selectAll, selectAllKeyset, type Db } from '../lib/supabase';
import { fetchTranscript } from '../lib/transcript';
import { alignTimestamp } from '../lib/quote';
import { CliError, helpText, intOpt, isDirectRun, makeCtx, parseCli, runCli, type Deps, type OptDef } from '../job1/cli';
import { youtubeUrl } from '../job1/data';
import { neutralizeFormula, toCsv } from '../job2/csv';
import { seededShuffle } from '../job2/sampling';
import { allItems, loadCodebookPrompt, OTHER, type Codebook, type CodeItem } from './codebook';
import { RUN_KIND } from './run-codebook';
import { latestRows, type TallyInputRow } from './tally';
import { countedChoices, rowOutcome, type CheckedChoice } from './validate';

export const DEFAULT_N = 25;
export const DEFAULT_SEED = 20261118;
export const DEFAULT_NA_PER_VIDEO = 3;
export const VIDEO_SALT = 'codebook-gold';
export const naSalt = (video: string) => `codebook-gold-na:${video}`;

export const SHEET_JSON = 'coded_gold_sheet.json';
export const SHEET_CSV = 'coded_gold_sheet.csv';

export const GOLD_OPTIONS: Record<string, OptDef> = {
  n: { type: 'string', help: `number of videos (default ${DEFAULT_N})` },
  seed: { type: 'string', help: `sampling seed (default ${DEFAULT_SEED})` },
  'na-per-video': { type: 'string', help: `not-addressed spot-check rows per video (default ${DEFAULT_NA_PER_VIDEO})` },
};

export interface GoldParams { n: number; seed: number; naPerVideo: number }

/** Reads --n, --seed, --na-per-video (shared by the sheet and the report, which must agree). */
export function goldParams(v: Record<string, string | boolean | undefined>): GoldParams {
  const n = intOpt(v.n, 'n') ?? DEFAULT_N;
  if (n < 1) throw new CliError('--n must be at least 1');
  return { n, seed: intOpt(v.seed, 'seed') ?? DEFAULT_SEED, naPerVideo: intOpt(v['na-per-video'], 'na-per-video') ?? DEFAULT_NA_PER_VIDEO };
}

/** A latest row with the columns the sheet shows. */
export interface GoldCodedRow extends TallyInputRow {
  question_id: number | null;
  quote: string | null;
  confidence: number | null;
}

export type GoldOutcome = 'counted' | 'not_addressed';

export interface SelectedRow { item: CodeItem; row: GoldCodedRow; outcome: GoldOutcome }

/** Videos with at least one valid latest row, sorted. A fully rejected response has none. */
export function eligibleVideos(rows: readonly TallyInputRow[]): string[] {
  const ok = new Set<string>();
  for (const r of latestRows(rows).values()) if (r.valid) ok.add(r.video_id);
  return [...ok].sort();
}

export function chooseVideos(eligible: readonly string[], p: GoldParams): string[] {
  return seededShuffle(eligible, p.seed, VIDEO_SALT).slice(0, p.n).sort();
}

/**
 * The sheet rows of one video from its latest rows (by item key): every counted item, then up to
 * naPerVideo seeded not_addressed items; in codebook order.
 */
export function chooseRows(cb: Codebook, video: string, latest: ReadonlyMap<string, GoldCodedRow>, p: GoldParams): SelectedRow[] {
  const items = allItems(cb);
  const counted: SelectedRow[] = [];
  const na = new Map<string, SelectedRow>();
  for (const item of items) {
    const row = latest.get(item.key);
    if (!row) continue;
    const o = rowOutcome(row);
    if (o === 'counted') counted.push({ item, row, outcome: 'counted' });
    else if (o === 'not_addressed') na.set(item.key, { item, row, outcome: 'not_addressed' });
  }
  const pick = new Set(seededShuffle([...na.keys()], p.seed, naSalt(video)).slice(0, p.naPerVideo));
  const chosen = [...counted, ...[...na.entries()].filter(([k]) => pick.has(k)).map(([, r]) => r)];
  const order = new Map(items.map((it, i) => [it.key, i]));
  return chosen.sort((a, b) => order.get(a.item.key)! - order.get(b.item.key)!);
}

export interface GoldSelection {
  params: GoldParams;
  promptHash: string;
  codebookVersion: string;
  runIds: string[];
  eligible: number;
  videoIds: string[];
  rows: SelectedRow[];
}

/** Completed codebook runs coded with the current prompt (same rule as job3/rollup). */
export async function currentCodebookRuns(db: Db, promptHash: string): Promise<string[]> {
  const runs = (await selectAll<{ id: string; status: string; params: Record<string, unknown> }>(db, 'bt_runs', 'id, status, params', {
    orderBy: 'id', filter: (q) => q.eq('job', 'other'),
  })).filter((r) => r.params?.kind === RUN_KIND && r.params?.prompt_hash === promptHash && r.status === 'completed');
  if (runs.length === 0) throw new CliError('no completed codebook run with the current prompt');
  return runs.map((r) => r.id);
}

const LIGHT_COLUMNS = 'id, video_id, item_key, kind, attempt, addressed, stance, quote_verified, choices, valid';
const FULL_COLUMNS = 'id, video_id, item_key, question_id, kind, attempt, addressed, stance, quote, quote_verified, choices, confidence, valid';
const CHUNK = 25;

/** Reads (read-only) and applies the selection rules. */
export async function selectGold(db: Db, cp: { codebook: Codebook; promptHash: string }, p: GoldParams): Promise<GoldSelection> {
  const runIds = await currentCodebookRuns(db, cp.promptHash);
  const all: TallyInputRow[] = [];
  for (const id of runIds) {
    // a loop, not push(...rows): one run has ~535k rows, more than a spread call can take
    for (const r of await selectAllKeyset<TallyInputRow & Record<string, unknown>>(db, 'bt_coded_answers', LIGHT_COLUMNS, 'id', (q) => q.eq('run_id', id))) all.push(r);
  }
  const eligible = eligibleVideos(all);
  const videoIds = chooseVideos(eligible, p);
  const rows: SelectedRow[] = [];
  for (let i = 0; i < videoIds.length; i += CHUNK) {
    const chunk = videoIds.slice(i, i + CHUNK);
    const full = await selectAllKeyset<GoldCodedRow & Record<string, unknown>>(
      db, 'bt_coded_answers', FULL_COLUMNS, 'id', (q) => q.in('run_id', runIds).in('video_id', chunk),
    );
    const latest = latestRows(full) as Map<string, GoldCodedRow>;
    for (const v of chunk) {
      const mine = new Map([...latest.values()].filter((r) => r.video_id === v).map((r) => [r.item_key, r]));
      rows.push(...chooseRows(cp.codebook, v, mine, p));
    }
  }
  return { params: p, promptHash: cp.promptHash, codebookVersion: cp.codebook.version, runIds, eligible: eligible.length, videoIds, rows };
}

// ---- sheet rows -------------------------------------------------------------------------------

export interface SheetAnswer { code: string; label: string; other_text: string | null; quote: string; youtube_link: string }

export interface SheetRow {
  coded_answer_id: number;
  video_id: string;
  title: string;
  item_key: string;
  question_id: number | null;
  ask: string;
  /** The question as asked on the site (questions only). */
  question: string | null;
  type: 'yes_no' | 'multiple_choice';
  outcome: GoldOutcome;
  stance: 'yes' | 'no' | 'mixed' | null;
  stance_label: string | null;
  quote: string | null;
  /** yes/no: the quote's link. not_addressed: the video (no timestamp). multiple choice: null (each answer has its own). */
  youtube_link: string | null;
  /** multiple choice: the counted answers only. */
  answers: SheetAnswer[];
  confidence: number | null;
}

export function stanceLabel(item: CodeItem, stance: 'yes' | 'no' | 'mixed'): string {
  const means = stance === 'yes' ? item.yes_means : stance === 'no' ? item.no_means : item.mixed_means;
  return means ? `${stance}: ${means}` : stance;
}

/** `link(quote)` returns the youtube link for a quote (timestamp when it can be aligned). */
export function buildSheetRow(sel: SelectedRow, title: string, link: (quote: string | null) => string): SheetRow {
  const { item, row, outcome } = sel;
  const base = {
    coded_answer_id: row.id, video_id: row.video_id, title, item_key: item.key, question_id: item.question_id ?? null,
    ask: item.ask, question: item.question ?? null, type: item.type === 'yn' ? 'yes_no' as const : 'multiple_choice' as const,
    outcome, confidence: row.confidence,
  };
  if (outcome === 'not_addressed') {
    return { ...base, stance: null, stance_label: null, quote: null, youtube_link: link(null), answers: [] };
  }
  if (item.type === 'yn') {
    return { ...base, stance: row.stance, stance_label: stanceLabel(item, row.stance!), quote: row.quote, youtube_link: link(row.quote), answers: [] };
  }
  const labels = new Map((item.choices ?? []).map((c) => [c.code, c.label]));
  const answers = (row.choices ?? []).filter((c: CheckedChoice) => c.quote_verified).map((c) => ({
    code: c.code, label: c.code === OTHER ? 'Other' : labels.get(c.code) ?? c.code, other_text: c.other_text, quote: c.quote, youtube_link: link(c.quote),
  }));
  return { ...base, stance: null, stance_label: null, quote: null, youtube_link: null, answers };
}

export const MARK_COLUMNS = ['addressed_correct', 'answer_correct', 'wrong_choices', 'missing_answer', 'quote_is_experiencer', 'note'] as const;

export const SHEET_HEADERS = [
  'coded_answer_id', 'video_id', 'title', 'item_key', 'question_id', 'ask', 'question', 'type', 'outcome',
  'answer', 'answer_codes', 'quote', 'youtube_link', 'confidence', ...MARK_COLUMNS,
] as const;

/** Flat CSV record: yes/no shows "stance: meaning"; multiple choice "code (label)" per counted answer, joined with " | ". */
export function csvRecord(r: SheetRow): Record<string, unknown> {
  const mc = r.type === 'multiple_choice';
  const answer = mc
    ? r.answers.map((a) => `${a.code} (${a.code === OTHER && a.other_text ? `Other: ${a.other_text}` : a.label})`).join(' | ')
    : r.stance_label ?? '';
  const quote = mc ? r.answers.map((a) => a.quote).join(' | ') : r.quote ?? '';
  const link = mc ? r.answers.map((a) => a.youtube_link).join(' | ') : r.youtube_link ?? '';
  return {
    coded_answer_id: r.coded_answer_id, video_id: r.video_id, title: neutralizeFormula(r.title), item_key: r.item_key, question_id: r.question_id ?? '',
    ask: neutralizeFormula(r.ask), question: neutralizeFormula(r.question ?? ''), type: r.type, outcome: r.outcome,
    answer: neutralizeFormula(answer), answer_codes: mc ? r.answers.map((a) => a.code).join(' ') : '', quote: neutralizeFormula(quote), youtube_link: link,
    confidence: r.confidence ?? '', addressed_correct: '', answer_correct: '', wrong_choices: '', missing_answer: '', quote_is_experiencer: '', note: '',
  };
}

export interface SheetHeader {
  n: number;
  seed: number;
  na_per_video: number;
  prompt_hash: string;
  codebook_version: string;
  run_ids: string[];
  video_ids: string[];
}

export function sheetHeader(sel: GoldSelection): SheetHeader {
  return {
    n: sel.params.n, seed: sel.params.seed, na_per_video: sel.params.naPerVideo, prompt_hash: sel.promptHash,
    codebook_version: sel.codebookVersion, run_ids: sel.runIds, video_ids: sel.videoIds,
  };
}

async function readTitles(db: Db, ids: readonly string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 25) {
    const { data, error } = await db.from('nde_vids').select('videoId, title').in('videoId', ids.slice(i, i + 25));
    if (error) throw new Error(`title read failed: ${error.message}`);
    for (const t of (data ?? []) as Array<{ videoId: string; title: string | null }>) titles.set(t.videoId, t.title ?? '');
  }
  return titles;
}

/** Titles and timestamp links for a selection (reads nde_vids; the transcript never leaves this function). */
export async function buildSheet(db: Db, sel: GoldSelection): Promise<SheetRow[]> {
  const titles = await readTitles(db, sel.videoIds);
  const out: SheetRow[] = [];
  for (const v of sel.videoIds) {
    const segments = (await fetchTranscript(db, v, true))?.timestamped ?? null;
    const link = (quote: string | null) => youtubeUrl(v, quote ? alignTimestamp(quote, segments) : null);
    for (const s of sel.rows.filter((x) => x.row.video_id === v)) out.push(buildSheetRow(s, titles.get(v) ?? '', link));
  }
  return out;
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, GOLD_OPTIONS);
  const ctx = makeCtx(deps);
  if (help) return ctx.log(helpText('job3/gold-sheet.ts', 'write out/coded_gold_sheet.json and .csv for the owner to mark (files only, no spend)', GOLD_OPTIONS));
  const p = goldParams(v);
  const sel = await selectGold(ctx.db, loadCodebookPrompt(), p);
  if (sel.videoIds.length === 0) throw new CliError('no eligible video (needs a completed codebook run with the current prompt and at least one valid row)');
  if (sel.videoIds.length < p.n) ctx.log(`WARNING: only ${sel.videoIds.length} eligible videos (asked for ${p.n})`);
  const rows = await buildSheet(ctx.db, sel);
  mkdirSync(ctx.outDir, { recursive: true });
  writeFileSync(path.join(ctx.outDir, SHEET_JSON), JSON.stringify({ header: sheetHeader(sel), rows }, null, 2) + '\n');
  writeFileSync(path.join(ctx.outDir, SHEET_CSV), toCsv(SHEET_HEADERS, rows.map(csvRecord)));
  const counted = rows.filter((r) => r.outcome === 'counted').length;
  const answers = rows.reduce((s, r) => s + r.answers.length, 0);
  ctx.log(`eligible videos: ${sel.eligible}; selected: ${sel.videoIds.length}; rows: ${rows.length} (${counted} counted, ${rows.length - counted} not addressed; ${answers} multiple-choice answers listed)`);
  ctx.log(`wrote ${SHEET_JSON} and ${SHEET_CSV}; mark the CSV, then run import-gold.ts --file <csv>`);
}

if (isDirectRun('gold-sheet')) runCli((argv) => main(argv));
