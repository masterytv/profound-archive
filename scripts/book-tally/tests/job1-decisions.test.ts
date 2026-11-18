import { describe, expect, it } from 'vitest';
import { decideFromVerdicts, type Verdict } from '../job1/logic';
import {
  candidatesForStage, computeAutoDecisions, latestJudgments, type CandidateRow, type JudgmentRow,
} from '../job1/judge-pairs';
import { parseModelJson, validateAgainstSchema } from '../job1/schema';
import { loadPairPrompt } from '../job1/judge-pairs';

describe('decideFromVerdicts (SPEC step 4)', () => {
  const V: Verdict[] = ['same', 'different', 'unsure'];
  it('Haiku same + Sonnet same -> merge auto:haiku+sonnet', () => {
    expect(decideFromVerdicts('same', 'same')).toEqual({ status: 'auto_merge', decision: 'merge', decidedBy: 'auto:haiku+sonnet' });
  });
  it('Haiku different -> keep_separate auto:haiku, whatever Sonnet says (Sonnet never ran)', () => {
    expect(decideFromVerdicts('different', undefined)).toEqual({ status: 'auto_keep_separate', decision: 'keep_separate', decidedBy: 'auto:haiku' });
    expect(decideFromVerdicts('different', 'same').decision).toBe('keep_separate');
  });
  it('Haiku same/unsure with no Sonnet verdict yet waits for Sonnet; nothing yet waits for Haiku', () => {
    expect(decideFromVerdicts('same', undefined).status).toBe('awaiting_sonnet');
    expect(decideFromVerdicts('unsure', null).status).toBe('awaiting_sonnet');
    expect(decideFromVerdicts(undefined, undefined).status).toBe('awaiting_haiku');
  });
  it('every other combination goes to review with NO decision row', () => {
    const review: Array<[Verdict, Verdict]> = [['same', 'different'], ['same', 'unsure'], ['unsure', 'same'], ['unsure', 'different'], ['unsure', 'unsure']];
    for (const [h, s] of review) expect(decideFromVerdicts(h, s)).toEqual({ status: 'review', decision: null, decidedBy: null });
  });
  it('exhaustive: the only merge outcome is same+same; the only keep_separate outcome has Haiku different', () => {
    for (const h of V) for (const s of [undefined, ...V]) {
      const o = decideFromVerdicts(h, s);
      expect(o.decision === 'merge').toBe(h === 'same' && s === 'same');
      expect(o.decision === 'keep_separate').toBe(h === 'different');
    }
  });
});

const cand = (id: number): CandidateRow => ({ id, key_a: `profile:${id}`, key_b: `profile:${id + 100}`, rule: 'swapped', features: { pair_input: { profile_1: {}, profile_2: {} } } });
const j = (id: number, candidate_id: number, judge: 'haiku' | 'sonnet', verdict: Verdict): JudgmentRow => ({ id, candidate_id, judge, verdict, reason: 'r', raw_response_id: id, run_id: 'r' });

describe('stage selection and auto decisions', () => {
  const cands = [1, 2, 3, 4, 5, 6].map(cand);
  const js = [
    j(1, 1, 'haiku', 'same'), j(2, 2, 'haiku', 'different'), j(3, 3, 'haiku', 'unsure'),
    j(4, 4, 'haiku', 'same'), j(5, 4, 'sonnet', 'same'), j(6, 5, 'haiku', 'same'), j(7, 5, 'sonnet', 'different'),
  ];
  const latest = latestJudgments(js);

  it('haiku stage: candidates without a Haiku judgment', () => {
    expect(candidatesForStage('haiku', cands, latest).map((c) => c.id)).toEqual([6]);
  });
  it('sonnet stage: Haiku same/unsure and no Sonnet judgment yet (candidates with Haiku different are skipped)', () => {
    expect(candidatesForStage('sonnet', cands, latest).map((c) => c.id)).toEqual([1, 3]);
    expect(candidatesForStage('sonnet', cands, latest, 1).map((c) => c.id)).toEqual([1]);
  });
  it('a later judgment of the same judge supersedes an earlier one', () => {
    const l2 = latestJudgments([...js, j(8, 1, 'haiku', 'different')]);
    expect(l2.get(1)!.haiku!.verdict).toBe('different');
  });
  it('auto decisions: merge, keep_separate; review/awaiting get none; existing decisions are never overwritten', () => {
    const { rows, counts } = computeAutoDecisions(cands, latest, new Set());
    expect(rows).toEqual([
      { candidate_id: 2, decision: 'keep_separate', decided_by: 'auto:haiku' },
      { candidate_id: 4, decision: 'merge', decided_by: 'auto:haiku+sonnet' },
    ]);
    expect(counts).toMatchObject({ auto_merge: 1, auto_keep_separate: 1, review: 1, awaiting_sonnet: 2, awaiting_haiku: 1 });
    const again = computeAutoDecisions(cands, latest, new Set([2, 4]));
    expect(again.rows).toEqual([]);
    expect(again.counts.already_decided).toBe(2);
  });
});

describe('model output validation against the shipped JSON schemas', () => {
  const { schema } = loadPairPrompt();
  it('accepts a valid pair verdict', () => {
    expect(parseModelJson('{"verdict":"same","reason":"x"}', schema)).toEqual({ ok: true, value: { verdict: 'same', reason: 'x' } });
  });
  it('rejects bad enum, missing field, extra field, non-JSON, wrong type', () => {
    for (const bad of ['{"verdict":"maybe","reason":"x"}', '{"verdict":"same"}', '{"verdict":"same","reason":"x","z":1}', 'same', '{"verdict":1,"reason":"x"}', '[]']) {
      expect(parseModelJson(bad, schema).ok).toBe(false);
    }
  });
  it('supports type unions (name-extract schema) and refuses schema keywords it cannot check', () => {
    const s = { type: 'object', properties: { name: { type: ['string', 'null'] } }, required: ['name'], additionalProperties: false };
    expect(validateAgainstSchema({ name: null }, s)).toEqual([]);
    expect(validateAgainstSchema({ name: 3 }, s)).toHaveLength(1);
    expect(() => validateAgainstSchema({}, { type: 'object', pattern: 'x' })).toThrow(/not supported/);
  });
});
