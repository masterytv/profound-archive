/**
 * Job 1, step 6a: review material for the human, written ONLY under out/ (gitignored).
 *
 *   out/dedup_review_pairs.csv       candidate pairs needing a human (disagreement / Sonnet unsure)
 *   out/dedup_auto_merges.csv        auto merges, for spot-checking (mark keep_separate to undo)
 *   out/link_proposals_review.csv    core-name proposals, ambiguous name matches, multi-profile videos
 *   out/name_extractions_review.csv  verified self-stated names (video, YouTube link at t=, name, quote)
 *
 * stdout shows counts only. Marked files are read back by import-decisions.ts.
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { alignTimestamp } from '../lib/quote';
import { selectAll } from '../lib/supabase';
import { fetchTranscripts } from '../lib/transcript';
import { finishRun, helpText, isDirectRun, makeCtx, newRunId, parseCli, readOrEmpty, runCli, startRun, type Ctx, type Deps, type OptDef } from './cli';
import { toCsv } from './csv';
import { loadWorld, youtubeUrl } from './data';
import { latestJudgments, type CandidateRow, type DecisionRow, type JudgmentRow } from './judge-pairs';
import { classifySelfName, decideFromVerdicts, indexProfiles, orientCandidate, planLinks } from './logic';
import { LINK_DECISION_COL, LINK_HEADERS, NAME_HEADERS, PAIR_DECISION_COL, PAIR_HEADERS } from './sheets';

const SCRIPT = 'job1/export-review.ts';
const OPTIONS: Record<string, OptDef> = {
  'out-dir': { type: 'string', help: 'output directory (default scripts/book-tally/out)' },
  'dry-run': { type: 'boolean', help: 'print counts only; write no files and no bt_runs row' },
};

type Row = Record<string, unknown>;

export function latestById<T extends { id: number }>(rows: T[], key: (r: T) => number): Map<number, T> {
  const m = new Map<number, T>();
  for (const r of [...rows].sort((a, b) => a.id - b.id)) m.set(key(r), r);
  return m;
}

/** Effective decision: the latest row, with 'revert' meaning undecided. */
export function effectiveDecision(latest: { decision: string } | undefined): string | null {
  return latest && latest.decision !== 'revert' ? latest.decision : null;
}

export function pairSheets(cands: CandidateRow[], judgments: JudgmentRow[], decisions: DecisionRow[]) {
  const lj = latestJudgments(judgments);
  const ld = latestById(decisions, (d) => d.candidate_id);
  const review: Row[] = [];
  const autoMerges: Row[] = [];
  const counts = { review: 0, auto_merges: 0, awaiting: 0, decided_other: 0 };
  for (const c of cands) {
    const j = lj.get(c.id) ?? {};
    const cur = ld.get(c.id);
    const eff = effectiveDecision(cur);
    const [a, b] = orientCandidate(c);
    const row: Row = {
      pair_id: c.id, key_a: c.key_a, key_b: c.key_b, name_a: a.name, slug_a: a.slug, profile_id_a: a.profile_id,
      name_b: b.name, slug_b: b.slug, profile_id_b: b.profile_id, rule: c.rule,
      channels_a: a.channels.join(' | '), channels_b: b.channels.join(' | '),
      haiku_verdict: j.haiku?.verdict ?? '', haiku_reason: j.haiku?.reason ?? '',
      sonnet_verdict: j.sonnet?.verdict ?? '', sonnet_reason: j.sonnet?.reason ?? '',
      current_decision: cur ? `${eff ?? 'revert'} (${cur.decided_by})` : '', [PAIR_DECISION_COL]: '', note: '',
    };
    if (eff === 'merge' && cur?.decided_by === 'auto:haiku+sonnet') { autoMerges.push(row); counts.auto_merges++; continue; }
    if (eff !== null) { counts.decided_other++; continue; }
    const o = decideFromVerdicts(j.haiku?.verdict, j.sonnet?.verdict);
    if (o.status === 'review') { review.push(row); counts.review++; }
    else counts.awaiting++;
  }
  return { review, autoMerges, counts };
}

async function readAll<T>(ctx: Ctx, table: string, cols: string): Promise<T[]> {
  return readOrEmpty(() => selectAll<T>(ctx.db, table, cols, { orderBy: 'id' }), () => ctx.log(`note: ${table} not found; treating as empty`));
}

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const parsed = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (parsed.help) return ctx.log(helpText(SCRIPT, 'Writes the Job 1 review CSVs under out/.', OPTIONS));
  const dry = parsed.values['dry-run'] === true;
  const outDir = typeof parsed.values['out-dir'] === 'string' ? (parsed.values['out-dir'] as string) : ctx.outDir;
  const { log, db } = ctx;

  const cands = await readAll<CandidateRow>(ctx, 'bt_merge_candidates', 'id, key_a, key_b, rule, features');
  const judgments = await readAll<JudgmentRow>(ctx, 'bt_merge_judgments', 'id, candidate_id, judge, verdict, reason, raw_response_id, run_id');
  const decisions = await readAll<DecisionRow>(ctx, 'bt_merge_decisions', 'id, candidate_id, decision, decided_by');
  const pairs = pairSheets(cands, judgments, decisions);

  const world = await loadWorld(db);
  const plan = planLinks(world);
  const idx = indexProfiles(world.profiles);
  const links = await readAll<{ id: number; video_id: string; person_key: string; profile_id: number | null; source: string; match_level: string; name_extraction_id: number | null }>(
    ctx, 'bt_person_links', 'id, video_id, person_key, profile_id, source, match_level, name_extraction_id');
  const linkDecisions = await readAll<{ id: number; link_id: number; decision: string; decided_by: string }>(ctx, 'bt_link_decisions', 'id, link_id, decision, decided_by');
  const ldec = latestById(linkDecisions, (d) => d.link_id);
  const curLink = (id: number | undefined | null) => {
    const d = id == null ? undefined : ldec.get(id);
    return d ? `${d.decision} (${d.decided_by})` : '';
  };
  const profile = (id: number | null | undefined) => (id == null ? undefined : idx.profiles.get(id));
  const title = (v: string) => world.videos.get(v)?.title ?? '';
  const nameOf = (v: string) => world.videos.get(v)?.experiencerFullName ?? '';

  const linkRows: Row[] = [];
  const base = (kind: string, vid: string, linkId: number | null, profileId: number | null, others: number[]): Row => ({
    kind, link_id: linkId, video_id: vid, video_title: title(vid), youtube_url: youtubeUrl(vid), experiencer_name: nameOf(vid),
    proposed_profile_id: profileId, proposed_profile_slug: profile(profileId)?.slug ?? '', proposed_profile_name: profile(profileId)?.full_name ?? '',
    other_profile_ids: others.join(' | '), current_decision: curLink(linkId), [LINK_DECISION_COL]: '', note: '',
  });
  for (const l of links) {
    if (l.source !== 'exact_name_match' || l.match_level !== 'core') continue;
    const cur = ldec.get(l.id);
    if (cur && cur.decision !== 'revert') continue; // already decided
    linkRows.push(base('core', l.video_id, l.id, l.profile_id, []));
  }
  for (const a of plan.ambiguous) linkRows.push(base(`ambiguous_${a.via}`, a.video_id, null, null, a.profile_ids));
  const profLink = new Map(links.filter((l) => l.source === 'profile_video_ids').map((l) => [`${l.video_id}\u0000${l.profile_id}`, l.id]));
  for (const m of plan.multiProfile) {
    for (const pid of m.profile_ids) {
      linkRows.push(base('multi_profile', m.video_id, profLink.get(`${m.video_id}\u0000${pid}`) ?? null, pid, m.profile_ids.filter((x) => x !== pid)));
    }
  }

  // name extractions
  const exts = await readAll<{ id: number; video_id: string; name: string | null; quote: string | null; quote_verified: boolean; name_in_quote: boolean; valid: boolean }>(
    ctx, 'bt_name_extractions', 'id, video_id, name, quote, quote_verified, name_in_quote, valid');
  const latestExt = new Map<string, (typeof exts)[number]>();
  for (const e of exts) if (e.valid && e.name && e.quote_verified && e.name_in_quote) latestExt.set(e.video_id, e);
  const selfLink = new Map(links.filter((l) => l.source === 'transcript_self_name').map((l) => [l.name_extraction_id ?? -1, l]));
  const starts = new Map<string, number | null>();
  for await (const page of fetchTranscripts(db, [...latestExt.keys()], { pageSize: 20, withTimestamps: true })) {
    for (const t of page.transcripts) starts.set(t.videoId, alignTimestamp(latestExt.get(t.videoId)!.quote!, t.timestamped));
  }
  const nameRows: Row[] = [];
  const flagCounts: Record<string, number> = {};
  for (const e of latestExt.values()) {
    const cls = classifySelfName(e.name!, idx);
    const flag = cls.kind === 'profile' ? `profile_${cls.level}` : cls.kind === 'named' ? 'new_named' : cls.kind;
    flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;
    const l = selfLink.get(e.id);
    nameRows.push({
      extraction_id: e.id, link_id: l?.id ?? null, video_id: e.video_id, youtube_url: youtubeUrl(e.video_id, starts.get(e.video_id)),
      name: e.name, quote: e.quote, flag, person_key: l?.person_key ?? '', current_decision: curLink(l?.id), [LINK_DECISION_COL]: '', note: '',
    });
  }

  const kinds: Record<string, number> = {};
  for (const r of linkRows) kinds[String(r.kind)] = (kinds[String(r.kind)] ?? 0) + 1;
  log(`pairs: ${JSON.stringify(pairs.counts)}`);
  log(`link sheet rows: ${linkRows.length} ${JSON.stringify(kinds)}`);
  log(`name extraction rows: ${nameRows.length} ${JSON.stringify(flagCounts)} (unverified or null extractions are not listed)`);
  if (dry) return log('dry-run: no files written');

  mkdirSync(outDir, { recursive: true });
  const write = (name: string, headers: string[], rows: Row[]) => writeFileSync(path.join(outDir, name), toCsv(headers, rows));
  write('dedup_review_pairs.csv', PAIR_HEADERS, pairs.review);
  write('dedup_auto_merges.csv', PAIR_HEADERS, pairs.autoMerges);
  write('link_proposals_review.csv', LINK_HEADERS, linkRows);
  write('name_extractions_review.csv', NAME_HEADERS, nameRows);
  const runId = newRunId('j1x', ctx.now());
  await startRun(db, { id: runId, job: 'other', params: { script: 'export-review', pairs: pairs.counts, link_rows: linkRows.length, name_rows: nameRows.length }, script: SCRIPT });
  await finishRun(db, runId, 'completed', undefined, ctx.now());
  log(`wrote 4 files to ${outDir}; run ${runId}`);
}

if (isDirectRun('export-review')) runCli(main);
