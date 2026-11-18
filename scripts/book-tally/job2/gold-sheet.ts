/**
 * Builds out/gold_review.csv for the 25 gold videos: every status 'final' non-not_addressed
 * answer plus 3 seeded not_addressed rows per video, with blank reviewer columns.
 * Read-only. The CSV holds model-returned quotes: it goes to out/ (gitignored) only.
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { readActiveQuestions, selectAll } from '../lib/supabase';
import { ensureOutDir, helpText, intOpt, isDirectRun, makeCtx, parseCli, runCli, CliError, type Deps, type OptDef } from './cli';
import { neutralizeFormula, toCsv } from './csv';
import { fetchStanceRuns } from './db';
import { NA_ROWS_PER_VIDEO, selectGoldRows, youtubeLink } from './gold';
import { goldIdsFromRuns } from './plan';
import type { Stance } from './answers';

const OPTIONS: Record<string, OptDef> = {
  seed: { type: 'string', help: 'seed for the not_addressed spot-check rows (default 20261118)' },
  'allow-pending': { type: 'boolean', help: 'write the sheet even if some gold cells are not resolved yet' },
};

export const GOLD_HEADERS = [
  'video_id', 'title', 'question_id', 'category', 'question', 'final_stance', 'confidence', 'quote',
  'youtube_link', 'deciding_model', 'deciding_pass', 'answer_id',
  'correct (Y/N)', 'quote_is_experiencer (Y/N)', 'note',
];

interface FinalRowDb {
  video_id: string;
  question_id: number;
  stance: Stance | null;
  confidence: number | null;
  quote: string | null;
  start_seconds: number | null;
  deciding_model: string | null;
  deciding_pass: string | null;
  final_answer_id: number | null;
  first_answer_id: number;
  status: string;
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const { help, values: v } = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (help) { ctx.log(helpText('gold-sheet.ts', 'write out/gold_review.csv', OPTIONS)); return; }
  const db = ctx.getDb();
  const seed = intOpt(v.seed, 'seed') ?? 20261118;
  const ids = goldIdsFromRuns(await fetchStanceRuns(db));
  if (!ids) throw new CliError('no gold run found');

  const rows: FinalRowDb[] = [];
  for (let i = 0; i < ids.length; i += 25) {
    rows.push(...(await selectAll<FinalRowDb>(
      db, 'bt_final_stances',
      'video_id, question_id, stance, confidence, quote, start_seconds, deciding_model, deciding_pass, final_answer_id, first_answer_id, status',
      { orderBy: 'first_answer_id', filter: (q) => q.in('video_id', ids.slice(i, i + 25)) },
    )));
  }
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  ctx.log(`gold cells by status: ${Object.entries(counts).map(([k, n]) => `${k}=${n}`).join(', ') || 'none'}`);
  const pending = (counts.pending_recheck ?? 0) + (counts.pending_arbiter ?? 0);
  if (pending && v['allow-pending'] !== true) throw new CliError(`${pending} gold cells are not resolved yet; finish the recheck/arbiter passes (or pass --allow-pending)`);

  const cells = rows.filter((r) => r.stance !== null && r.final_answer_id !== null)
    .map((r) => ({ ...r, stance: r.stance as Stance }));
  const chosen = selectGoldRows(cells, seed, NA_ROWS_PER_VIDEO);

  const qs = new Map((await readActiveQuestions(db)).map((q) => [q.id, q]));
  const titles = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 25) {
    const { data, error } = await db.from('nde_vids').select('videoId, title').in('videoId', ids.slice(i, i + 25));
    if (error) throw new Error(`title read failed: ${error.message}`);
    for (const t of (data ?? []) as Array<{ videoId: string; title: string | null }>) titles.set(t.videoId, t.title ?? '');
  }
  const out = chosen.map((r) => {
    const q = qs.get(r.question_id);
    return {
      video_id: r.video_id,
      title: neutralizeFormula(titles.get(r.video_id) ?? ''),
      question_id: r.question_id,
      category: q?.category ?? '',
      question: neutralizeFormula(q?.consumer_question ?? q?.question ?? ''),
      final_stance: r.stance,
      confidence: r.confidence,
      quote: r.quote ? neutralizeFormula(r.quote) : '',
      youtube_link: youtubeLink(r.video_id, r.stance === 'not_addressed' ? null : r.start_seconds),
      deciding_model: r.deciding_model,
      deciding_pass: r.deciding_pass,
      answer_id: r.final_answer_id,
      'correct (Y/N)': '', 'quote_is_experiencer (Y/N)': '', note: '',
    };
  });
  const file = path.join(ensureOutDir(ctx), 'gold_review.csv');
  writeFileSync(file, toCsv(GOLD_HEADERS, out));
  const na = chosen.filter((r) => r.stance === 'not_addressed').length;
  ctx.log(`wrote out/gold_review.csv: ${out.length} rows (${out.length - na} answers, ${na} not_addressed spot checks) over ${ids.length} videos`);
}

if (isDirectRun('gold-sheet')) runCli((argv) => main(argv));
