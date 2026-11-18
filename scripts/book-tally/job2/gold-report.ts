/**
 * Gold-set report from bt_gold_marks (latest mark per cell): precision per stance with
 * Wilson 95% CI and n, quote_is_experiencer rate, not_addressed spot-check accuracy.
 * Writes out/gold_report.md. Read-only; no API calls.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { selectAll } from '../lib/supabase';
import { ensureOutDir, helpText, isDirectRun, makeCtx, parseCli, runCli, CliError, type Deps, type OptDef } from './cli';
import { fetchStanceRuns } from './db';
import { fmtProportion, goldStats, type GoldMark, type GoldStats } from './gold';
import { goldIdsFromRuns } from './plan';

const OPTIONS: Record<string, OptDef> = {};

export function renderGoldMarkdown(s: GoldStats, nVideos: number): string {
  const L = [
    '# Gold-set report', '',
    `${s.nMarked} reviewed cells over ${nVideos} gold videos (latest mark per cell). Intervals are Wilson 95%.`, '',
    '## Precision per stance', '', '| stance | precision (correct / n) |', '|---|---|',
    `| yes | ${fmtProportion(s.perStance.yes)} |`,
    `| no | ${fmtProportion(s.perStance.no)} |`,
    `| mixed | ${fmtProportion(s.perStance.mixed)} |`,
    `| all non-not_addressed answers | ${fmtProportion(s.allClaims)} |`, '',
    '## Quote attribution', '',
    `Quote spoken by the experiencer (not the interviewer): ${fmtProportion(s.quoteIsExperiencer)}. Answers without a quote_is_experiencer mark: ${s.quoteUnmarked}.`, '',
    '## not_addressed spot check', '',
    `Share of sampled not_addressed answers where "not_addressed" was right: ${fmtProportion(s.notAddressed)}. A low value means the pipeline misses answers (recall problem).`, '',
    '## Reading this report', '',
    'Precision is measured on the answers the pipeline would tally (status final, verified quote). Small n gives wide intervals: do not publish a per-stance figure whose interval is too wide for the claim made.', '',
  ];
  return L.join('\n');
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('gold-report.ts', 'write out/gold_report.md', OPTIONS)); return; }
  const db = ctx.getDb();
  const ids = goldIdsFromRuns(await fetchStanceRuns(db));
  if (!ids) throw new CliError('no gold run found');
  const marks: Array<GoldMark & { id: number }> = [];
  for (let i = 0; i < ids.length; i += 25) {
    marks.push(...(await selectAll<GoldMark & { id: number }>(
      db, 'bt_gold_marks', 'id, video_id, question_id, final_stance, correct, quote_is_experiencer',
      { orderBy: 'id', filter: (q) => q.in('video_id', ids.slice(i, i + 25)) },
    )));
  }
  if (marks.length === 0) throw new CliError('no gold marks imported yet');
  const stats = goldStats(marks);
  writeFileSync(path.join(ensureOutDir(ctx), 'gold_report.md'), renderGoldMarkdown(stats, ids.length));
  ctx.log(`wrote out/gold_report.md (${stats.nMarked} cells; all-claims precision ${fmtProportion(stats.allClaims)})`);
}

if (isDirectRun('gold-report')) runCli((argv) => main(argv));
