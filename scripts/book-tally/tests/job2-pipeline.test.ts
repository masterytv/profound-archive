/**
 * End-to-end pipeline tests with an in-memory database and a fake Anthropic client:
 * estimate -> spend gate -> batch -> validation -> storage -> recheck -> arbiter -> gold -> rollup.
 * No network, no real database, no real API.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { main as runStance } from '../job2/run-stance';
import { main as goldSheet } from '../job2/gold-sheet';
import { main as importGold } from '../job2/import-gold';
import { main as goldReport } from '../job2/gold-report';
import { main as rollup } from '../job2/rollup';
import { loadPilot } from '../job2/pilot-data';
import { renderPilotMarkdown } from '../job2/pilot-report';
import { projectFullCost } from '../job2/estimate';
import { parseCsv } from '../job2/csv';
import { FakeAnthropic, FakeDb, message, type Responder } from './job2-fakes';

const GOOD = 'I saw a bright light at the end of the tunnel';
const BAD = 'this sentence is definitely not in the transcript';

function world(n = 12) {
  const vids = Array.from({ length: n }, (_, i) => `vidA${String(i + 1).padStart(2, '0')}`);
  return new FakeDb({
    nde_questions: [1, 2, 3, 4, 5].map((id) => ({ id, category: 'cat', consumer_question: `Question ${id}?`, question: `q${id}`, is_active: true }))
      .concat([{ id: 6, category: 'cat', consumer_question: 'Inactive?', question: 'q6', is_active: false }]),
    nde_analysis: [...vids.map((v) => ({ video_id: v, experience_type: 'nde' })), { video_id: 'other1', experience_type: 'other' }],
    nde_vids: [...vids, 'other1'].map((v) => ({
      videoId: v, title: `Title ${v}`, subtitles_punctuated: `Number ${v} here. ${GOOD} and I felt total peace in that room. Then the nurse came in and spoke to me.`,
      subtitles_cleaned: null, subtitles: null, raw_timestamped_subtitles: null,
    })),
    bt_runs: [], bt_prompts: [], bt_raw_responses: [], bt_stance_answers: [], bt_gold_marks: [],
    bt_unmapped_nde_videos: [],
    bt_effective_person_map: vids.map((v, i) => ({ video_id: v, person_key: `profile:${Math.floor(i / 2)}` })),
  });
}

const idsIn = (params: any): number[] => [...new Set([...String(params.system[0].text).matchAll(/"question_id":(\d+)/g)].map((m) => Number(m[1])))];

/** Haiku: q1 yes (verified), q2 no (unverified quote, flagged), rest not_addressed. Sonnet: q2 mixed. Opus: yes. */
const standard: Responder = (_cid, params) => {
  const model = params.model as string;
  const answers = idsIn(params).map((q) => {
    if (model.includes('opus')) return { question_id: q, stance: 'yes', confidence: 85, quote: GOOD };
    if (q === 1) return { question_id: q, stance: 'yes', confidence: 90, quote: GOOD };
    if (q === 2) return model.includes('haiku')
      ? { question_id: q, stance: 'no', confidence: 80, quote: BAD }
      : { question_id: q, stance: 'mixed', confidence: 80, quote: GOOD };
    return { question_id: q, stance: 'not_addressed', confidence: 90, quote: null };
  });
  return { type: 'succeeded', message: message(`${model}-20261001`, answers) };
};

function harness(responder: Responder = standard, n = 12) {
  const db = world(n);
  const client = new FakeAnthropic(responder);
  const logs: string[] = [];
  const makeClient = vi.fn(() => client as unknown as Anthropic);
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'bt-job2-'));
  const deps = { db: db.asDb(), makeClient, log: (l: string) => logs.push(l), sleep: async () => {}, outDir, now: () => new Date() };
  const run = (args: string[]) => runStance(args, deps);
  const groupOf = () => {
    const l = [...logs].reverse().find((x) => x.startsWith('To submit'));
    return l!.split('--confirm-spend ')[1].trim();
  };
  return { db, client, logs, makeClient, deps, run, groupOf, outDir };
}

describe('pilot: estimate, gate, execution', () => {
  it('dry run builds the exact requests offline: no API client, no writes', async () => {
    const h = harness();
    await h.run(['--pilot', '--pilot-n', '4', '--dry-run']);
    expect(h.makeClient).not.toHaveBeenCalled();
    expect(h.db.writes).toEqual([]);
    expect(h.logs.join('\n')).toMatch(/ESTIMATE group=pilot-[0-9a-f]{8} mode=pilot pass=pilot/);
    expect(h.logs.join('\n')).toMatch(/claude-haiku-5-5 effort=medium: 4 requests/);
    expect(h.logs.join('\n')).toMatch(/claude-sonnet-5-5 effort=medium: 4 requests/);
  });

  it('--estimate counts tokens, records one estimated bt_runs row per model, is idempotent, and spends nothing', async () => {
    const h = harness();
    await h.run(['--pilot', '--pilot-n', '4', '--estimate']);
    const runs = h.db.rows('bt_runs');
    expect(runs.map((r) => r.status)).toEqual(['estimated', 'estimated']);
    expect(runs.map((r) => r.model).sort()).toEqual(['claude-haiku-5-5', 'claude-sonnet-5-5']);
    expect(runs[0].estimate).toMatchObject({ requests: 4, method: 'exact', cache_note: 'no cache reads assumed' });
    expect(runs[0].estimate.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(runs[0].params).toMatchObject({ mode: 'pilot', seed: 20261118, maxTokens: 16000 });
    expect(runs[0].params.plan.videoIds).toHaveLength(4);
    expect(h.client.countCalls).toBeGreaterThan(0);
    expect(h.client.created).toHaveLength(0);
    await h.run(['--pilot', '--pilot-n', '4', '--estimate']);
    expect(h.db.rows('bt_runs')).toHaveLength(2);
  });

  it('refuses to submit without or with a wrong confirmation, and when the requests changed', async () => {
    const h = harness();
    await expect(h.run(['--pilot', '--pilot-n', '4'])).rejects.toThrow(/refusing to spend/);
    await h.run(['--pilot', '--pilot-n', '4', '--estimate']);
    const g = h.groupOf();
    await expect(h.run(['--pilot', '--confirm-spend', 'pilot-00000000'])).rejects.toThrow(/no estimate rows/);
    await expect(h.run(['--gold', '--confirm-spend', g])).rejects.toThrow(/does not match the flags/);
    const tampered = h.db.rows('nde_vids').find((r) => r.videoId === h.db.rows('bt_runs')[0].params.plan.videoIds[0])!;
    const original = tampered.subtitles_punctuated;
    tampered.subtitles_punctuated += ' An extra sentence appears.';
    await expect(h.run(['--pilot', '--confirm-spend', g])).rejects.toThrow(/requests changed since the estimate/);
    expect(h.client.created).toHaveLength(0);
    tampered.subtitles_punctuated = original;
    await h.run(['--pilot', '--confirm-spend', g]);
    expect(h.client.created).toHaveLength(2);
  });

  it('runs both models independently, stores validated rows, and is a no-op when repeated', async () => {
    const h = harness();
    await h.run(['--pilot', '--pilot-n', '4', '--estimate']);
    const g = h.groupOf();
    await h.run(['--pilot', '--confirm-spend', g]);
    expect(h.client.created).toHaveLength(2);
    // requests: structured output, effort, no sampling params, shared system prompt cached
    const p = h.client.created[0].requests[0].params;
    expect(p).not.toHaveProperty('temperature');
    expect(p.output_config.format.type).toBe('json_schema');
    expect(JSON.stringify(p.system)).toContain('cache_control');
    expect(h.db.rows('bt_raw_responses')).toHaveLength(8);
    const rows = h.db.rows('bt_stance_answers');
    expect(rows).toHaveLength(4 * 5 * 2);
    expect(rows.every((r) => r.pass === 'pilot' && r.attempt === 1 && r.trigger_answer_id === null)).toBe(true);
    expect(new Set(rows.map((r) => r.model))).toEqual(new Set(['claude-haiku-5-5', 'claude-sonnet-5-5']));
    expect(rows.find((r) => r.model.includes('haiku') && r.question_id === 2)).toMatchObject({ stance: 'no', quote_verified: false, error: 'quote_not_found' });
    expect(rows.find((r) => r.question_id === 1)).toMatchObject({ stance: 'yes', quote_verified: true, quote: GOOD, transcript_source: 'subtitles_punctuated' });
    expect(rows[0].model_version).toMatch(/-20261001$/);
    expect(h.db.rows('bt_prompts')).toHaveLength(1);
    expect(h.db.rows('bt_runs').map((r) => r.status)).toEqual(['completed', 'completed']);
    expect(h.db.rows('bt_runs')[0].actual_usage.requests).toBe(4);
    await h.run(['--pilot', '--confirm-spend', g]);
    expect(h.client.created).toHaveLength(2);
    expect(h.db.rows('bt_stance_answers')).toHaveLength(40);

    const pilot = (await loadPilot(h.db.asDb()))!;
    expect(pilot.stats.pairedCells).toBe(20);
    expect(pilot.stats.overall.agreement).toBeCloseTo(0.8, 12); // q2 differs on every video (no vs mixed)
    expect(pilot.stats.haiku.quoteFailureRate).toBe(0.5); // 8 claims (q1, q2 per video), 4 with an unverified quote (q2)
    expect(pilot.stats.sonnet.quoteFailureRate).toBe(0);
  });
});

describe('truncation and transient failures are retried; exhausted retries become invalid rows', () => {
  it('truncated (max_tokens) and expired results resubmit with attempt+1 and a larger max_tokens', async () => {
    let seenFirstHaiku = false;
    const responder: Responder = (cid, params) => {
      const attempt = Number(cid.split('_').pop());
      if (params.model.includes('haiku') && attempt === 1 && !seenFirstHaiku) {
        seenFirstHaiku = true;
        return { type: 'succeeded', message: { ...message(params.model, []), stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"answers":[' }] } };
      }
      if (params.model.includes('sonnet') && attempt === 1) return { type: 'expired' };
      return standard(cid, params);
    };
    const h = harness(responder);
    await h.run(['--pilot', '--pilot-n', '2', '--estimate']);
    await h.run(['--pilot', '--confirm-spend', h.groupOf()]);
    expect(h.client.created.length).toBeGreaterThanOrEqual(3);
    const retryReqs = h.client.created.slice(2).flatMap((b) => b.requests);
    expect(retryReqs.map((r) => r.custom_id.endsWith('_2'))).toEqual([true, true, true]);
    expect(retryReqs.some((r) => r.params.max_tokens === 32000)).toBe(true); // truncated one
    expect(retryReqs.filter((r) => r.params.max_tokens === 16000)).toHaveLength(2); // expired ones
    const rows = h.db.rows('bt_stance_answers');
    expect(rows).toHaveLength(2 * 5 * 2);
    expect(rows.filter((r) => r.attempt === 2)).toHaveLength(rows.length - rows.filter((r) => r.attempt === 1).length);
    expect(rows.every((r) => r.valid)).toBe(true); // nothing invalid was stored for the truncated attempt
    expect(h.db.rows('bt_runs').every((r) => r.status === 'completed')).toBe(true);
  });

  it('after 3 failed attempts the cells are stored invalid (so the recheck sees them as disagreements)', async () => {
    const responder: Responder = (cid, params) => (params.model.includes('sonnet') ? { type: 'expired' } : standard(cid, params));
    const h = harness(responder);
    await h.run(['--pilot', '--pilot-n', '2', '--estimate']);
    await h.run(['--pilot', '--confirm-spend', h.groupOf()]);
    const bad = h.db.rows('bt_stance_answers').filter((r) => r.model.includes('sonnet'));
    expect(bad).toHaveLength(2 * 5);
    expect(bad.every((r) => !r.valid && r.stance === null && r.error === 'request_expired_after_3_attempts' && r.attempt === 3)).toBe(true);
    expect(h.db.rows('bt_raw_responses').filter((r) => r.model.includes('sonnet'))).toHaveLength(6);
  });

  it('a response that fails validation stores invalid rows without failing the batch insert', async () => {
    const responder: Responder = (cid, params) => (params.model.includes('sonnet')
      ? { type: 'succeeded', message: message(params.model, [{ question_id: 1, stance: 'yes', confidence: 250, quote: GOOD }, { question_id: 1, stance: 'no', confidence: 5, quote: GOOD }, { question_id: 3, stance: 'yes', confidence: 90, quote: null }]) }
      : standard(cid, params));
    const h = harness(responder);
    await h.run(['--pilot', '--pilot-n', '2', '--estimate']);
    await h.run(['--pilot', '--confirm-spend', h.groupOf()]);
    const s = h.db.rows('bt_stance_answers').filter((r) => r.model.includes('sonnet') && r.video_id === h.db.rows('bt_runs')[0].params.plan.videoIds[0]);
    expect(s.map((r) => [r.question_id, r.valid])).toEqual([[1, false], [2, false], [3, false], [4, false], [5, false]]);
    expect(s[0].error).toMatch(/duplicate/);
    expect(s[1].error).toMatch(/missing/);
    expect(s[2].error).toMatch(/quote/);
  });
});

describe('gold pipeline, review sheet, marks, rollup', () => {
  it('first -> recheck -> arbiter, disjoint from the pilot, with lineage and blinded arbiter prompts', async () => {
    const h = harness();
    const args = ['--pilot-n', '4', '--gold-n', '3'];
    await h.run(['--pilot', '--pilot-n', '4', '--estimate']);
    await h.run(['--pilot', '--confirm-spend', h.groupOf()]);
    const pilotIds: string[] = h.db.rows('bt_runs')[0].params.plan.videoIds;

    // gold first
    await h.run(['--gold', ...args, '--estimate']);
    const goldFirst = h.db.rows('bt_runs').find((r) => r.params.mode === 'gold')!;
    const goldIds: string[] = goldFirst.params.plan.videoIds;
    expect(goldIds).toHaveLength(3);
    expect(goldIds.filter((v) => pilotIds.includes(v))).toEqual([]);
    expect(goldFirst.pass).toBe('first');
    await h.run(['--gold', '--confirm-spend', h.groupOf()]);
    let final = h.db.rows('bt_final_stances').filter((r) => goldIds.includes(r.video_id));
    expect(final).toHaveLength(15);
    expect(final.filter((r) => r.status === 'pending_recheck').map((r) => r.question_id)).toEqual([2, 2, 2]);
    expect(final.filter((r) => r.status === 'final')).toHaveLength(12);

    // gold recheck (blind Sonnet on flagged questions only; per-video system prompt is not cached)
    const before = h.client.created.length;
    await h.run(['--gold', '--pass', 'recheck', '--estimate']);
    await h.run(['--gold', '--pass', 'recheck', '--confirm-spend', h.groupOf()]);
    const rcReqs = h.client.created.slice(before).flatMap((b) => b.requests);
    expect(rcReqs).toHaveLength(3);
    expect(rcReqs[0].params.model).toBe('claude-sonnet-5-5');
    expect(idsIn(rcReqs[0].params)).toEqual([2]);
    expect(JSON.stringify(rcReqs[0].params.system)).not.toContain('cache_control');
    expect(JSON.stringify(rcReqs[0].params)).not.toMatch(/BAD|definitely not in the transcript/); // blind: no Haiku answer leaks
    const rechecks = h.db.rows('bt_stance_answers').filter((r) => r.pass === 'recheck');
    const firstQ2 = h.db.rows('bt_stance_answers').filter((r) => r.pass === 'first' && r.question_id === 2 && goldIds.includes(r.video_id));
    expect(rechecks.map((r) => r.trigger_answer_id).sort()).toEqual(firstQ2.map((r) => r.id).sort());
    expect(rechecks.every((r) => r.recheck_answer_id === null && r.stance === 'mixed')).toBe(true);
    final = h.db.rows('bt_final_stances').filter((r) => goldIds.includes(r.video_id));
    expect(final.filter((r) => r.status === 'pending_arbiter')).toHaveLength(3);

    // arbiter refuses while cells still await a recheck? (none do) and runs Opus with A/B blinding
    const before2 = h.client.created.length;
    await h.run(['--gold', '--pass', 'arbiter', '--estimate']);
    await h.run(['--gold', '--pass', 'arbiter', '--confirm-spend', h.groupOf()]);
    const arReqs = h.client.created.slice(before2).flatMap((b) => b.requests);
    expect(arReqs).toHaveLength(3);
    expect(arReqs[0].params.model).toBe('claude-opus-5-5');
    expect(arReqs[0].params.output_config.effort).toBe('high');
    const rawArb = h.db.rows('bt_raw_responses').filter((r) => r.custom_id.includes('_arbiter_'));
    expect(rawArb).toHaveLength(3);
    const seenA = new Set<string>();
    for (const rr of rawArb) {
      const meta = rr.response._bt_meta;
      expect(meta.reader_mapping.reader_a).not.toBe(meta.reader_mapping.reader_b);
      seenA.add(meta.reader_mapping.reader_a);
      const req = arReqs.find((q) => q.custom_id === rr.custom_id)!;
      const sys = String(req.params.system[0].text);
      const readerA = /"reader_a":\{"stance":"(\w+)"/.exec(sys)![1];
      expect(readerA).toBe(meta.reader_mapping.first_is_reader_a ? 'no' : 'mixed'); // Haiku said no, Sonnet said mixed
      expect(sys).not.toMatch(/haiku|sonnet|claude/i);
    }
    const arbiters = h.db.rows('bt_stance_answers').filter((r) => r.pass === 'arbiter');
    expect(arbiters).toHaveLength(3);
    for (const a of arbiters) {
      const rc = rechecks.find((r) => r.video_id === a.video_id)!;
      expect(a).toMatchObject({ trigger_answer_id: rc.trigger_answer_id, recheck_answer_id: rc.id, stance: 'yes', quote_verified: true });
    }
    final = h.db.rows('bt_final_stances').filter((r) => goldIds.includes(r.video_id));
    expect(final.every((r) => r.status === 'final')).toBe(true);
    expect(final.find((r) => r.question_id === 2)).toMatchObject({ deciding_pass: 'arbiter', stance: 'yes' });

    // review sheet
    await goldSheet([], h.deps);
    const sheet = parseCsv(readFileSync(path.join(h.outDir, 'gold_review.csv'), 'utf8'));
    expect(sheet).toHaveLength(3 * (2 + 3)); // q1 + q2 answers, plus 3 not_addressed spot checks per video
    expect(Object.keys(sheet[0])).toEqual(['video_id', 'title', 'question_id', 'category', 'question', 'final_stance', 'confidence', 'quote', 'youtube_link', 'deciding_model', 'deciding_pass', 'answer_id', 'correct (Y/N)', 'quote_is_experiencer (Y/N)', 'note']);
    expect(sheet.every((r) => r['correct (Y/N)'] === '' && r['quote_is_experiencer (Y/N)'] === '' && r.note === '')).toBe(true);
    expect(sheet.filter((r) => r.final_stance === 'not_addressed').every((r) => r.quote === '' && !r.youtube_link.includes('&t='))).toBe(true);

    // human marks -> bt_gold_marks (idempotent), then the report
    const marked = sheet.map((r, i) => ({ ...r, 'correct (Y/N)': i % 5 === 0 && r.final_stance !== 'not_addressed' ? 'N' : 'Y', 'quote_is_experiencer (Y/N)': r.final_stance === 'not_addressed' ? '' : 'Y' }));
    const head = Object.keys(marked[0]);
    const csv = [head.join(','), ...marked.map((r) => head.map((k) => `"${String((r as Record<string, string>)[k]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const file = path.join(h.outDir, 'marked.csv');
    writeFileSync(file, csv);
    await importGold(['--file', file, '--dry-run'], h.deps);
    expect(h.db.rows('bt_gold_marks')).toHaveLength(0);
    await importGold(['--file', file], h.deps);
    expect(h.db.rows('bt_gold_marks')).toHaveLength(15);
    await importGold(['--file', file], h.deps);
    expect(h.db.rows('bt_gold_marks')).toHaveLength(15);
    await goldReport([], h.deps);
    const report = readFileSync(path.join(h.outDir, 'gold_report.md'), 'utf8');
    expect(report).toMatch(/Precision per stance/);
    expect(report).toMatch(/Wilson 95% CI/);

    // a sheet whose stance disagrees with the database is rejected
    const wrong = csv.replace(/"yes","/, '"no","');
    writeFileSync(file, wrong);
    await expect(importGold(['--file', file], h.deps)).rejects.toThrow(/does not match the database/);

    // rollup: refuses partial coverage unless allowed; person rollup counts each person once
    await expect(rollup([], h.deps)).rejects.toThrow(/no stance rows yet/);
    await rollup(['--allow-partial'], h.deps);
    const tally = parseCsv(readFileSync(path.join(h.outDir, 'tally_by_question.csv'), 'utf8'));
    expect(tally).toHaveLength(5);
    const persons = new Set(goldIds.map((v) => h.db.rows('bt_effective_person_map').find((m) => m.video_id === v)!.person_key));
    expect(Number(tally[0].n_persons)).toBe(persons.size);
    expect(tally[0]).toMatchObject({ question_id: '1', n_yes: String(persons.size), n_not_addressed: '0' });
    const perVideo = parseCsv(readFileSync(path.join(h.outDir, 'tally_by_question_sensitivity_per_video.csv'), 'utf8'));
    expect(perVideo[0].n_persons).toBe('3');

    // an unmapped NDE video makes the rollup fail loudly
    h.db.rows('bt_unmapped_nde_videos').push({ video_id: 'vidA09' });
    await expect(rollup(['--allow-partial'], h.deps)).rejects.toThrow(/no accepted person link/);
  });

  it('full first pass skips videos that already have first-pass rows (gold) and never re-spends on them', async () => {
    const h = harness();
    await h.run(['--gold', '--pilot-n', '4', '--gold-n', '3', '--estimate']);
    await h.run(['--gold', '--confirm-spend', h.groupOf()]);
    const goldIds: string[] = h.db.rows('bt_runs').find((r) => r.params.mode === 'gold')!.params.plan.videoIds;
    await h.run(['--full', '--estimate']);
    const full = h.db.rows('bt_runs').find((r) => r.params.mode === 'full')!;
    expect(full.params.plan.videoIds).toHaveLength(9);
    expect(full.params.plan.videoIds.filter((v: string) => goldIds.includes(v))).toEqual([]);
    expect(full.estimate.requests).toBe(9);
    expect(h.logs.join('\n')).toMatch(/PROJECTION: no completed pilot/);
    // the recheck for the full run is refused until the first pass is complete
    await expect(h.run(['--full', '--pass', 'recheck', '--estimate'])).rejects.toThrow(/first pass incomplete/);
  });
});

describe('pilot report rendering', () => {
  it('renders agreement, confusion matrix, usage and projection', async () => {
    const h = harness();
    await h.run(['--pilot', '--pilot-n', '4', '--estimate']);
    await h.run(['--pilot', '--confirm-spend', h.groupOf()]);
    const pilot = (await loadPilot(h.db.asDb()))!;
    const proj = projectFullCost({ nVideos: 6054, haiku: pilot.usage.haiku.rates, sonnet: pilot.usage.sonnet.rates, shares: pilot.stats.shares });
    const md = renderPilotMarkdown(pilot, proj, 6054);
    for (const s of ['Agreement (Haiku vs Sonnet)', 'Confusion matrix', 'Cohen', 'quote failure rate', 'Projected full run (6054 videos)', 'arbiter (Opus)']) expect(md).toContain(s);
    expect(proj.totalUsd).toBeGreaterThan(0);
  });
});
