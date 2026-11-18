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
import { readActiveQuestions, readNdeVideoIds } from '../lib/supabase';
import { STANCES } from './answers';
import { ensureOutDir, helpText, intOpt, isDirectRun, makeCtx, parseCli, runCli, str, type Deps, type OptDef } from './cli';
import { toCsv } from './csv';
import { projectFullCost, type Projection } from './estimate';
import { loadPilot, type PilotData } from './pilot-data';
import type { AgreementStats, ModelUsage, PilotStats } from './pilot-stats';

const OPTIONS: Record<string, OptDef> = {
  group: { type: 'string', help: 'pilot group id (default: latest completed)' },
  'n-videos': { type: 'string', help: 'videos in the projected full run (default: NDE set size)' },
};

const pc = (x: number | null, d = 1) => (x === null ? 'n/a' : `${(100 * x).toFixed(d)}%`);

function usageTable(u: ModelUsage): string {
  const t = u.totals;
  return `| ${u.model} | ${t.requests} | ${t.inputTokens} | ${t.cacheReadTokens} | ${t.cacheWriteTokens} | ${t.outputTokens} | ${formatUsd(t.costUsd)} | ${formatUsd(u.costNoCacheUsd)} |`;
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
  L.push('', '## Actual usage and cost (batch prices, from response usage)', '', '| model | requests | input | cache read | cache write | output | actual cost | cost with no cache |', '|---|---|---|---|---|---|---|---|');
  L.push(usageTable(pilot.usage.haiku), usageTable(pilot.usage.sonnet), '');
  L.push(`## Projected full run (${nVideosProjected} videos)`, '');
  L.push(`Observed in the pilot: ${pc(s.shares.flaggedCellShare)} of Haiku cells flagged for recheck; ${pc(s.shares.shareVideosWithFlag)} of videos have at least one flagged cell (mean ${s.shares.meanFlaggedPerFlaggedVideo.toFixed(1)} flagged cells); ${pc(s.shares.disputeShareOfFlagged)} of flagged cells would reach the arbiter; ${pc(s.shares.shareVideosWithDispute)} of videos have at least one such cell (mean ${s.shares.meanDisputedPerDisputedVideo.toFixed(1)}).`, '');
  L.push('| pass | requests | projected cost |', '|---|---|---|');
  L.push(`| first (Haiku) | ${nVideosProjected} | ${formatUsd(projection.firstUsd)} |`);
  L.push(`| recheck (Sonnet) | ${Math.round(projection.recheckRequests)} | ${formatUsd(projection.recheckUsd)} |`);
  L.push(`| arbiter (Opus) | ${Math.round(projection.arbiterRequests)} | ${formatUsd(projection.arbiterUsd)} |`);
  L.push(`| **total** | | **${formatUsd(projection.totalUsd)}** |`, '');
  for (const n of projection.notes) L.push(`- ${n}`);
  L.push('- The pilot sample is 100 videos: shares carry sampling error; the real per-pass estimates (exact counts) replace this projection.');
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

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('pilot-report.ts', 'pilot agreement/cost report', OPTIONS)); return; }
  const db = ctx.getDb();
  const pilot = await loadPilot(db, str(v.group));
  if (!pilot) throw new Error('no completed pilot (both models) found');
  const nVideos = intOpt(v['n-videos'], 'n-videos') ?? (await readNdeVideoIds(db)).length;
  const projection = projectFullCost({ nVideos, haiku: pilot.usage.haiku.rates, sonnet: pilot.usage.sonnet.rates, shares: pilot.stats.shares });
  const qs = await readActiveQuestions(db);
  const meta = new Map(qs.map((q) => [q.id, { category: q.category, question: q.consumer_question ?? q.question }]));
  const dir = ensureOutDir(ctx);
  writeFileSync(path.join(dir, 'pilot_report.md'), renderPilotMarkdown(pilot, projection, nVideos));
  writeFileSync(path.join(dir, 'pilot_per_question.csv'), toCsv(PER_QUESTION_HEADERS, perQuestionRows(pilot.stats.perQuestion, meta)));
  ctx.log(`wrote out/pilot_report.md and out/pilot_per_question.csv (${pilot.stats.pairedCells} paired cells, projected total ${formatUsd(projection.totalUsd)})`);
}

if (isDirectRun('pilot-report')) runCli((argv) => main(argv));
