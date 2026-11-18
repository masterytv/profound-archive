/**
 * Pilot report from the pilot rows: agreement and Cohen's kappa (4-category and
 * addressed-vs-not), confusion matrix, quote failure and invalid rates, actual tokens and
 * cost per model, and the projected full-run cost. Writes out/pilot_report.md and
 * out/pilot_per_question.csv. Read-only; no API calls.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { formatUsd } from '../lib/cost';
import { formatKappa } from '../lib/stats';
import { fmtProportion } from './gold';
import { readActiveQuestions, readNdeVideoIds } from '../lib/supabase';
import { STANCES } from './answers';
import { ensureOutDir, helpText, intOpt, isDirectRun, makeCtx, parseCli, runCli, str, type Deps, type OptDef } from './cli';
import { toCsv } from './csv';
import { projectFullCost, type OutputAssumption, type Projection } from './estimate';
import { assumptionFrom, loadPilot, type PilotData } from './pilot-data';
import type { AgreementStats, ModelUsage, PilotStats } from './pilot-stats';

const OPTIONS: Record<string, OptDef> = {
  group: { type: 'string', help: 'pilot group id (default: latest completed)' },
  'n-videos': { type: 'string', help: 'videos in the projected full run (default: NDE set size)' },
};

const pc = (x: number | null, d = 1) => (x === null ? 'n/a' : `${(100 * x).toFixed(d)}%`);

function usageTable(u: ModelUsage): string {
  const t = u.totals;
  return `| ${u.model} | ${u.rates.videos} | ${t.requests} | ${t.inputTokens} | ${t.cacheReadTokens} | ${t.cacheWriteTokens} | ${t.outputTokens} | ${formatUsd(t.costUsd)} | ${formatUsd(u.costNoCacheUsd)} |`;
}

function retryLine(name: string, u: ModelUsage): string {
  const r = u.retries;
  return `| ${name} | ${r.rawResponses} | ${r.retriedAttempts} | ${r.videosWithRetry} | ${r.truncated} | ${r.errored} | ${r.expired} | ${r.canceled} |`;
}

export function renderPilotMarkdown(pilot: Pick<PilotData, 'group' | 'stats' | 'usage'>, projection: Projection, nVideosProjected: number): string {
  const s: PilotStats = pilot.stats;
  const L: string[] = [];
  L.push(`# Stance pilot report`, '', `Pilot group \`${pilot.group}\`: ${s.videos} videos x ${s.questions} questions, Haiku and Sonnet read independently.`, '');
  L.push('## Agreement (Haiku vs Sonnet)', '');
  L.push(`Cells compared: ${s.pairedCells} (both answers valid); excluded because either answer was invalid or missing: ${s.excludedInvalidCells}.`, '');
  L.push('| measure | value | n |', '|---|---|---|');
  L.push(`| % agreement (4 categories) | ${pc(s.overall.agreement)} | ${s.overall.n} |`);
  L.push(`| Cohen's kappa (4 categories) | ${formatKappa(s.overall.kappa4)} | ${s.overall.n} |`);
  L.push(`| Cohen's kappa (addressed vs not addressed) | ${formatKappa(s.overall.kappaAddressed)} | ${s.overall.n} |`, '');
  L.push('### Confusion matrix (rows Haiku, columns Sonnet)', '');
  L.push(`| Haiku \\ Sonnet | ${STANCES.join(' | ')} |`, `|---|${STANCES.map(() => '---').join('|')}|`);
  s.confusion.counts.forEach((row, i) => L.push(`| ${s.confusion.labels[i]} | ${row.join(' | ')} |`));
  L.push('', 'Per-question agreement and kappa: `out/pilot_per_question.csv` (kappa is n/a when both models are constant and identical on a question).', '');
  L.push('## Answer quality per model', '', '| model | cells | invalid | invalid rate | claims (yes/no/mixed) | quote unverified | quote failure rate |', '|---|---|---|---|---|---|---|');
  for (const [name, m] of [['claude-haiku-5-5', s.haiku], ['claude-sonnet-5-5', s.sonnet]] as const) {
    L.push(`| ${name} | ${m.cells} | ${m.invalid} | ${pc(m.invalidRate)} | ${m.claims} | ${m.unverified} | ${pc(m.quoteFailureRate)} |`);
  }
  for (const [name, m] of [['Haiku', s.haiku], ['Sonnet', s.sonnet]] as const) {
    const errs = Object.entries(m.errors).sort((a, b) => b[1] - a[1]);
    if (errs.length) L.push('', `${name} error/notes by type: ${errs.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  L.push('', '## Sonnet disagreement on Haiku cells that were NOT flagged', '');
  L.push('These cells would never be rechecked, so this is the blind spot of the flagging rule.', '', '| Haiku stance | Sonnet disagrees (k/n, Wilson 95% CI) |', '|---|---|');
  L.push(`| all unflagged | ${fmtProportion(s.unflagged.overall)} |`);
  for (const st of STANCES) L.push(`| ${st} | ${fmtProportion(s.unflagged.byHaikuStance[st])} |`);
  L.push('', `Unflagged cells where Sonnet's answer was invalid (excluded above): ${s.unflagged.sonnetInvalid}.`, '');
  L.push('## Actual usage and cost (batch prices, from response usage; all attempts)', '', '| model | videos | responses | input | cache read | cache write | output (incl. thinking) | actual cost | cost with no cache |', '|---|---|---|---|---|---|---|---|---|');
  L.push(usageTable(pilot.usage.haiku), usageTable(pilot.usage.sonnet), '');
  L.push('Means below are per VIDEO, summing all attempts.', '', '| model | mean prompt tokens | mean output tokens | mean thinking tokens | mean visible per question |', '|---|---|---|---|---|');
  for (const u of [pilot.usage.haiku, pilot.usage.sonnet]) {
    const r = u.rates;
    L.push(`| ${u.model} | ${r.meanPromptTokens.toFixed(0)} | ${r.meanOutputTokens.toFixed(0)} | ${r.meanThinkingTokens === null ? 'not reported' : r.meanThinkingTokens.toFixed(0)} | ${r.meanVisiblePerQuestion === null ? 'n/a' : r.meanVisiblePerQuestion.toFixed(1)} |`);
  }
  L.push('', '### Retries and truncation', '', '| model | raw responses | attempts > 1 | videos retried | truncated (max_tokens) | errored | expired | canceled |', '|---|---|---|---|---|---|---|---|');
  L.push(retryLine('claude-haiku-5-5', pilot.usage.haiku), retryLine('claude-sonnet-5-5', pilot.usage.sonnet), '');
  L.push(`## Projected full run (${nVideosProjected} videos)`, '');
  const sh = s.shares;
  L.push(`Observed in the pilot: ${sh.flaggedCells} of ${sh.totalCells} Haiku cells flagged for recheck (${pc(sh.flaggedCellShare)}); ${sh.videosWithFlag} of ${sh.videos} videos have at least one flagged cell; ${sh.disputedCells} of ${sh.flaggedCells} flagged cells would reach the arbiter (${pc(sh.disputeShareOfFlagged)}); ${sh.videosWithDispute} of ${sh.videos} videos have at least one such cell.`, '');
  L.push('| pass | requests | projected cost |', '|---|---|---|');
  L.push(`| first (Haiku; ${pc(projection.firstLongContextShare)} of pilot videos at the long-context tier) | ${nVideosProjected} | ${formatUsd(projection.firstUsd)} |`);
  L.push(`| recheck (Sonnet) | ${Math.round(projection.recheckRequests)} | ${formatUsd(projection.recheckUsd)} |`);
  L.push(`| arbiter (Opus) | ${Math.round(projection.arbiterRequests)} | ${formatUsd(projection.arbiterUsd)} |`);
  L.push(`| **total** | | **${formatUsd(projection.totalUsd)}** |`, '');
  for (const n of projection.notes) L.push(`- ${n}`);
  L.push(`- The pilot sample is ${s.videos} videos: shares carry sampling error; the real per-pass estimates (exact counts) replace this projection.`);
  return L.join('\n') + '\n';
}

export function perQuestionRows(
  perQuestion: ReadonlyArray<AgreementStats & { question_id: number }>,
  meta: ReadonlyMap<number, { category: string | null; question: string }>,
): Array<Record<string, unknown>> {
  return perQuestion.map((p) => ({
    question_id: p.question_id,
    category: meta.get(p.question_id)?.category ?? '',
    question: meta.get(p.question_id)?.question ?? '',
    n_pairs: p.n,
    pct_agreement: p.agreement === null ? '' : (100 * p.agreement).toFixed(1),
    kappa_4cat: p.kappa4.kappa === null ? 'n/a' : p.kappa4.kappa.toFixed(3),
    kappa_addressed: p.kappaAddressed.kappa === null ? 'n/a' : p.kappaAddressed.kappa.toFixed(3),
    p_observed: p.kappa4.observed === null ? '' : p.kappa4.observed.toFixed(4),
    p_expected: p.kappa4.expected === null ? '' : p.kappa4.expected.toFixed(4),
  }));
}

export const PER_QUESTION_HEADERS = ['question_id', 'category', 'question', 'n_pairs', 'pct_agreement', 'kappa_4cat', 'kappa_addressed', 'p_observed', 'p_expected'];

export function projectPilot(pilot: PilotData, nVideos: number, assumption?: OutputAssumption): Projection {
  return projectFullCost({
    nVideos,
    haikuPerVideo: [...pilot.usage.haiku.perVideo.values()],
    sonnetPerVideo: pilot.usage.sonnet.perVideo,
    flaggedByVideo: pilot.stats.flaggedByVideo,
    disputedByVideo: pilot.stats.disputedByVideo,
    pilotVideos: pilot.stats.videos,
    assumption: assumption ?? assumptionFrom(pilot, 'first'),
  });
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('pilot-report.ts', 'pilot agreement/cost report', OPTIONS)); return; }
  const db = ctx.getDb();
  const pilot = await loadPilot(db, str(v.group));
  if (!pilot) throw new Error('no completed pilot (both models) found');
  const nVideos = intOpt(v['n-videos'], 'n-videos') ?? (await readNdeVideoIds(db)).length;
  const projection = projectPilot(pilot, nVideos);
  const qs = await readActiveQuestions(db);
  const meta = new Map(qs.map((q) => [q.id, { category: q.category, question: q.consumer_question }]));
  const dir = ensureOutDir(ctx);
  writeFileSync(path.join(dir, 'pilot_report.md'), renderPilotMarkdown(pilot, projection, nVideos));
  writeFileSync(path.join(dir, 'pilot_per_question.csv'), toCsv(PER_QUESTION_HEADERS, perQuestionRows(pilot.stats.perQuestion, meta)));
  ctx.log(`wrote out/pilot_report.md and out/pilot_per_question.csv (${pilot.stats.pairedCells} paired cells, projected total ${formatUsd(projection.totalUsd)})`);
}

if (isDirectRun('pilot-report')) runCli((argv) => main(argv));
