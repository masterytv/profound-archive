/**
 * Job 3 gold report: how reliable is the codebook coding, from the owner's marks (no API calls, no
 * spend, reads the database, writes only a file in out/).
 *
 * Rebuilds the exact sheet gold-sheet made (same --n, --seed, --na-per-video, same current-prompt runs)
 * and uses the LATEST mark (highest id) per coded_answer_id. Refuses unless every sheet row has a mark;
 * with --allow-unmarked it writes out/coded_gold_report_PARTIAL.md titled NOT FOR PUBLICATION instead.
 * Every figure is a proportion with k/n and a Wilson 95% interval (lib/stats.wilson):
 *   - addressed precision: among COUNTED rows, the share marked addressed_correct = Y (overall; yes/no
 *     vs multiple choice; facts vs questions; by confidence band <70, 70-89, >=90);
 *   - yes/no stance precision per stance: among counted yes/no rows marked addressed, the share with
 *     answer_correct = Y (rows with a blank answer_correct are left out of that figure and counted);
 *   - multiple-choice answer precision: over every listed counted answer of counted multiple-choice rows
 *     marked addressed, the share not in wrong_choices; plus the share of those rows with a missing_answer;
 *   - not-addressed spot check: the share of not_addressed rows marked addressed_correct = Y (truly not
 *     addressed); the miss rate is the rest;
 *   - quote_is_experiencer: the share Y among counted rows that have it marked.
 * Marks found for these videos that are not on the sheet are listed by id and not used.
 * The report holds counts and ids only, no quote text.
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { selectAll, type Db } from '../lib/supabase';
import { wilson, type Proportion } from '../lib/stats';
import { CliError, helpText, isDirectRun, makeCtx, parseCli, runCli, type Deps, type OptDef } from '../job1/cli';
import { loadCodebookPrompt } from './codebook';
import { GOLD_OPTIONS, goldParams, selectGold, selectionOrder, type GoldSelection } from './gold-sheet';
import { BLOCK_SIZE, REVIEW_MIX, STRATA, stratumOf, type Stratum } from './review-order';
import { intOpt } from '../job1/cli';
import { latestMarkByAnswer, MARK_SELECT, readMarksByAnswer, type DbMark } from './import-gold';
import { countedChoices } from './validate';

const OPTIONS: Record<string, OptDef> = {
  first: { type: 'string', help: 'report on the first N cards of the seeded review order only (whole blocks of 20 are best); all of them must be marked' },
  ...GOLD_OPTIONS,
  'allow-unmarked': { type: 'boolean', help: 'write out/coded_gold_report_PARTIAL.md (NOT FOR PUBLICATION) although some sheet rows have no mark' },
};

export const REPORT_FILE = 'coded_gold_report.md';
export const PARTIAL_FILE = 'coded_gold_report_PARTIAL.md';

export type Band = '<70' | '70-89' | '>=90';
export const BANDS: readonly Band[] = ['<70', '70-89', '>=90'];
export const confidenceBand = (c: number): Band => (c < 70 ? '<70' : c < 90 ? '70-89' : '>=90');

/** What the statistics need to know about one sheet row. */
export interface ReportRow {
  coded_answer_id: number;
  kind: 'yn' | 'mc';
  isFact: boolean;
  outcome: 'counted' | 'not_addressed';
  stance: 'yes' | 'no' | 'mixed' | null;
  /** The answers listed on the sheet (counted choices of a multiple-choice row). */
  codes: string[];
  confidence: number | null;
}

export function reportRows(sel: GoldSelection): ReportRow[] {
  return sel.rows.map(({ item, row, outcome }) => ({
    coded_answer_id: row.id, kind: item.type, isFact: item.key.startsWith('f'), outcome, stance: row.stance,
    codes: item.type === 'mc' && outcome === 'counted' ? countedChoices(row) : [], confidence: row.confidence,
  }));
}

export interface GoldStats {
  rows: number;
  marked: number;
  unmarkedIds: number[];
  /** Latest marks for these videos whose coded answer is not a sheet row. */
  extraMarkIds: number[];
  addressed: { overall: Proportion; yn: Proportion; mc: Proportion; facts: Proportion; questions: Proportion };
  byBand: Record<Band, Proportion>;
  stance: Record<'yes' | 'no' | 'mixed', Proportion>;
  /** Addressed counted yes/no rows whose answer_correct is blank (left out of the stance figures). */
  stanceUnmarked: number;
  mcAnswers: Proportion;
  mcMissing: Proportion;
  notAddressed: Proportion;
  notAddressedMiss: Proportion;
  quoteExperiencer: Proportion;
  /** Counted rows with no quote_is_experiencer mark. */
  quoteUnmarked: number;
}

const share = (rows: readonly unknown[], pred: (r: any) => boolean): Proportion => wilson(rows.filter(pred).length, rows.length);

/** Pure. `marks` are the latest marks by coded_answer_id; `extraMarkIds` the ones not on the sheet. */
export function goldStats(rows: readonly ReportRow[], marks: ReadonlyMap<number, DbMark>, extraMarkIds: readonly number[] = []): GoldStats {
  const marked = rows.filter((r) => marks.has(r.coded_answer_id));
  const m = (r: ReportRow) => marks.get(r.coded_answer_id)!;
  const counted = marked.filter((r) => r.outcome === 'counted');
  const addressedOk = (r: ReportRow) => m(r).addressed_correct;
  const prec = (rs: readonly ReportRow[]) => share(rs, addressedOk);
  const hit = counted.filter(addressedOk);

  const stanceRows = hit.filter((r) => r.kind === 'yn');
  const stanceMarked = stanceRows.filter((r) => m(r).answer_correct !== null);
  const mcHit = hit.filter((r) => r.kind === 'mc');
  const listed = mcHit.flatMap((r) => {
    const wrong = new Set(m(r).wrong_choices ?? []);
    return r.codes.map((c) => !wrong.has(c));
  });
  const na = marked.filter((r) => r.outcome === 'not_addressed');
  const naRight = na.filter(addressedOk).length;
  const quoteMarked = counted.filter((r) => m(r).quote_is_experiencer !== null);

  return {
    rows: rows.length,
    marked: marked.length,
    unmarkedIds: rows.filter((r) => !marks.has(r.coded_answer_id)).map((r) => r.coded_answer_id),
    extraMarkIds: [...extraMarkIds],
    addressed: {
      overall: prec(counted), yn: prec(counted.filter((r) => r.kind === 'yn')), mc: prec(counted.filter((r) => r.kind === 'mc')),
      facts: prec(counted.filter((r) => r.isFact)), questions: prec(counted.filter((r) => !r.isFact)),
    },
    byBand: Object.fromEntries(BANDS.map((b) => [b, prec(counted.filter((r) => r.confidence !== null && confidenceBand(r.confidence) === b))])) as Record<Band, Proportion>,
    stance: Object.fromEntries((['yes', 'no', 'mixed'] as const).map((s) => [s, share(stanceMarked.filter((r) => r.stance === s), (r) => m(r).answer_correct === true)])) as Record<'yes' | 'no' | 'mixed', Proportion>,
    stanceUnmarked: stanceRows.length - stanceMarked.length,
    mcAnswers: wilson(listed.filter(Boolean).length, listed.length),
    mcMissing: share(mcHit, (r) => m(r).missing_answer !== null),
    notAddressed: wilson(naRight, na.length),
    notAddressedMiss: wilson(na.length - naRight, na.length),
    quoteExperiencer: share(quoteMarked, (r) => m(r).quote_is_experiencer === true),
    quoteUnmarked: counted.length - quoteMarked.length,
  };
}

export function fmt(p: Proportion): string {
  if (p.p === null || p.lo === null || p.hi === null) return 'n/a (n=0)';
  const f = (x: number) => (100 * x).toFixed(1);
  return `${f(p.p)}% (${p.k}/${p.n}; Wilson 95% CI ${f(p.lo)}-${f(p.hi)}%)`;
}

export interface SampleInfo { first: number; sheetRows: number; byStratum: Record<Stratum, GoldStats> }

/** Per review stratum: the figures that are unbiased under the stratified review sample. */
export function stratumSection(sample: SampleInfo): string[] {
  const row = (k: Stratum, label: string, what: string, p: Proportion) => `| ${label} | ${what} | ${fmt(p)} |`;
  const b = sample.byStratum;
  return [
    '## By review group (the reliable figures for a review sample)', '',
    `Cards 1 to ${sample.first} of the seeded review order over the ${sample.sheetRows}-row sheet. Each block of ${BLOCK_SIZE} holds ` +
    `${REVIEW_MIX.yes_no} yes/no, ${REVIEW_MIX.multiple_choice} multiple-choice, ${REVIEW_MIX.fact} fact and ${REVIEW_MIX.not_addressed} not-addressed cards, ` +
    'each drawn at random within its group. The groups are sampled at different rates, so read these per-group figures, not the combined ones above.', '',
    '| group | measure | result (k/n) |', '|---|---|---|',
    row('yes_no', 'yes/no questions', 'rightly addressed', b.yes_no.addressed.overall),
    row('yes_no', 'yes/no questions', 'stance correct (of rightly addressed)', mergeStance(b.yes_no)),
    row('multiple_choice', 'multiple-choice questions', 'rightly addressed', b.multiple_choice.addressed.overall),
    row('multiple_choice', 'multiple-choice questions', 'listed answers right', b.multiple_choice.mcAnswers),
    row('fact', 'facts', 'rightly addressed', b.fact.addressed.overall),
    row('not_addressed', 'not addressed (spot check)', 'truly not addressed', b.not_addressed.notAddressed),
    `| all counted cards | quote is the experiencer's own words | ${fmt(wilson(STRATA.filter((k) => k !== 'not_addressed').reduce((n, k) => n + b[k].quoteExperiencer.k, 0), STRATA.filter((k) => k !== 'not_addressed').reduce((n, k) => n + b[k].quoteExperiencer.n, 0)))} |`,
    '',
  ];
}

function mergeStance(s: GoldStats): Proportion {
  const k = s.stance.yes.k + s.stance.no.k + s.stance.mixed.k;
  const n = s.stance.yes.n + s.stance.no.n + s.stance.mixed.n;
  return wilson(k, n);
}

export function renderReport(s: GoldStats, h: { codebookVersion: string; promptHash: string; videos: number; params: { n: number; seed: number; naPerVideo: number } }, partial: boolean, sample?: SampleInfo): string {
  const ids = (xs: readonly number[]) => (xs.length ? xs.slice(0, 50).join(', ') + (xs.length > 50 ? `, ... (${xs.length} in all)` : '') : 'none');
  return [
    partial ? '# Codebook gold-set report: PARTIAL, NOT FOR PUBLICATION' : '# Codebook gold-set report', '',
    ...(sample ? [`**Review sample:** the first ${sample.first} cards of the seeded review order (of ${sample.sheetRows} on the sheet).`, '', ...stratumSection(sample)] : []),
    ...(partial ? [`**NOT FOR PUBLICATION.** ${s.unmarkedIds.length} of ${s.rows} sheet rows have no mark. The figures below rest on the rows the owner chose to mark, which may not be representative.`, ''] : []),
    `Codebook ${h.codebookVersion}, prompt ${h.promptHash.slice(0, 12)}. ${h.videos} videos; sheet built with n=${h.params.n}, seed=${h.params.seed}, na-per-video=${h.params.naPerVideo}. ` +
    'The owner judged each sampled answer against the video; the latest mark per coded answer is used. Every figure is a proportion with k/n and a Wilson 95% interval.', '',
    '## Coverage', '',
    `- Sheet rows marked: ${s.marked} of ${s.rows}.`,
    `- Sheet rows without a mark (coded_answer_id): ${ids(s.unmarkedIds)}.`,
    `- Marks on these videos that are not on the sheet (listed, not used): ${ids(s.extraMarkIds)}.`, '',
    '## Addressed precision', '',
    'Among counted rows (the answers a tally would use), the share the owner marked as rightly addressed.', '',
    '| group | precision (k/n) |', '|---|---|',
    `| all counted rows | ${fmt(s.addressed.overall)} |`,
    `| yes/no items | ${fmt(s.addressed.yn)} |`,
    `| multiple-choice items | ${fmt(s.addressed.mc)} |`,
    `| facts (f0-f6) | ${fmt(s.addressed.facts)} |`,
    `| questions (q1-q81) | ${fmt(s.addressed.questions)} |`, '',
    '### By confidence band', '', '| confidence | precision (k/n) |', '|---|---|',
    ...BANDS.map((b) => `| ${b} | ${fmt(s.byBand[b])} |`), '',
    '## Yes/no stance precision', '',
    'Among counted yes/no rows marked as rightly addressed, the share whose stance the owner marked correct.', '',
    '| stance | precision (k/n) |', '|---|---|',
    `| yes | ${fmt(s.stance.yes)} |`, `| no | ${fmt(s.stance.no)} |`, `| mixed | ${fmt(s.stance.mixed)} |`, '',
    `Rows marked addressed with no answer_correct mark (left out of these figures): ${s.stanceUnmarked}.`, '',
    '## Multiple-choice answer precision', '',
    'Over every listed answer (verified quote) of counted multiple-choice rows marked as rightly addressed: the share not marked wrong.', '',
    `- Listed answers not marked wrong: ${fmt(s.mcAnswers)}.`,
    `- Rows with a missing answer (an answer the coding missed): ${fmt(s.mcMissing)}.`, '',
    '## Not-addressed spot check', '',
    `- Truly not addressed (share of sampled not_addressed rows the owner agreed with): ${fmt(s.notAddressed)}.`,
    `- Miss rate (the person did address it; 1 minus the above): ${fmt(s.notAddressedMiss)}.`, '',
    '## Quote attribution', '',
    `Quotes that are the experiencer's own words, among counted rows with a mark: ${fmt(s.quoteExperiencer)}. Counted rows without a quote_is_experiencer mark: ${s.quoteUnmarked}.`, '',
    '## Reading this report', '',
    'Small n gives wide intervals; do not publish a figure whose interval is too wide for the claim made. The gold set measures the coding of one model (Claude Haiku) reading full transcripts.', '',
  ].join('\n');
}

/** Latest mark per coded answer for the sheet's videos: the ones on the sheet and the ones that are not. */
export async function readSheetMarks(db: Db, sel: GoldSelection, rows: readonly ReportRow[]): Promise<{ marks: Map<number, DbMark>; extraMarkIds: number[] }> {
  const onSheet = new Set(rows.map((r) => r.coded_answer_id));
  const all: DbMark[] = await readMarksByAnswer(db, [...onSheet]);
  for (let i = 0; i < sel.videoIds.length; i += 25) {
    const chunk = sel.videoIds.slice(i, i + 25);
    all.push(...(await selectAll<DbMark>(db, 'bt_coded_gold_marks', MARK_SELECT, { orderBy: 'id', filter: (q) => q.in('video_id', chunk) })));
  }
  const latest = latestMarkByAnswer([...new Map(all.map((x) => [x.id, x])).values()]);
  return {
    marks: new Map([...latest].filter(([id]) => onSheet.has(id))),
    extraMarkIds: [...latest.keys()].filter((id) => !onSheet.has(id)).sort((a, b) => a - b),
  };
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) return ctx.log(helpText('job3/gold-report.ts', 'write out/coded_gold_report.md from the owner\'s marks (no spend)', OPTIONS));
  const p = goldParams(v);
  const sel = await selectGold(ctx.db, loadCodebookPrompt(), p);
  if (sel.rows.length === 0) throw new CliError('the gold sheet is empty (no eligible videos)');
  const allRows = reportRows(sel);
  const first = intOpt(v.first, 'first');
  const order = selectionOrder(sel);
  const rows = first === undefined ? allRows : allRows.filter((r) => order.get(r.coded_answer_id)! < first);
  if (first !== undefined && (first < 1 || rows.length === 0)) throw new CliError('--first must be at least 1');
  const { marks, extraMarkIds } = await readSheetMarks(ctx.db, sel, allRows);
  const stats = goldStats(rows, marks, extraMarkIds);
  const sample: SampleInfo | undefined = first === undefined ? undefined : {
    first: rows.length, sheetRows: allRows.length,
    byStratum: Object.fromEntries(STRATA.map((k) => [k, goldStats(rows.filter((r) => stratumOf(r) === k), marks)])) as Record<Stratum, GoldStats>,
  };
  const partial = stats.unmarkedIds.length > 0;
  if (partial && v['allow-unmarked'] !== true) {
    throw new CliError(`${stats.unmarkedIds.length} of ${stats.rows} sheet rows have no mark (first ids: ${stats.unmarkedIds.slice(0, 10).join(', ')}). Mark and import them (import-gold.ts skips blank rows), check --n/--seed/--na-per-video match the sheet, or pass --allow-unmarked for a clearly marked partial report. No report written.`);
  }
  mkdirSync(ctx.outDir, { recursive: true });
  const file = partial ? PARTIAL_FILE : REPORT_FILE;
  writeFileSync(path.join(ctx.outDir, file), renderReport(stats, { codebookVersion: sel.codebookVersion, promptHash: sel.promptHash, videos: sel.videoIds.length, params: p }, partial, sample));
  ctx.log(`wrote ${file}: ${stats.marked} of ${stats.rows} sheet rows marked; ${stats.extraMarkIds.length} marks not on the sheet; addressed precision ${fmt(stats.addressed.overall)}`);
}

if (isDirectRun('gold-report')) runCli((argv) => main(argv));
