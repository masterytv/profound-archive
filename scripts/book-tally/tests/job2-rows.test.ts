import { describe, expect, it } from 'vitest';
import { MODELS } from '../lib/cost';
import { buildAnswerRows, classifyOutcome, invalidAnswerRows, maxTokensFor } from '../job2/rows';
import {
  DEFAULT_EFFORT, buildStanceParams, loadStancePrompts, renderArbiterPrompt, renderQuestionsJson, renderStancePrompt, toPromptQuestions,
} from '../job2/requests';
import { buildDisputes } from '../job2/flags';

describe('classifyOutcome', () => {
  it('parses normal successes', () => expect(classifyOutcome({ resultType: 'succeeded', stopReason: 'end_turn', attempt: 1 })).toEqual({ action: 'answers' }));
  it('retries truncation with more tokens, then records invalid rows after the attempt cap', () => {
    expect(classifyOutcome({ resultType: 'succeeded', stopReason: 'max_tokens', attempt: 1 })).toMatchObject({ action: 'retry', bumpTokens: true });
    expect(classifyOutcome({ resultType: 'succeeded', stopReason: 'max_tokens', attempt: 3 })).toEqual({ action: 'invalid', error: 'truncated_max_tokens' });
  });
  it('retries expired/canceled/transient errors, but not other errors', () => {
    expect(classifyOutcome({ resultType: 'expired', attempt: 1 })).toMatchObject({ action: 'retry', bumpTokens: false });
    expect(classifyOutcome({ resultType: 'canceled', attempt: 2 })).toMatchObject({ action: 'retry' });
    expect(classifyOutcome({ resultType: 'errored', errorType: 'overloaded_error', attempt: 1 })).toMatchObject({ action: 'retry' });
    expect(classifyOutcome({ resultType: 'errored', errorType: 'invalid_request_error', attempt: 1 })).toEqual({ action: 'invalid', error: 'request_error:invalid_request_error' });
    expect(classifyOutcome({ resultType: 'expired', attempt: 3 })).toEqual({ action: 'invalid', error: 'request_expired_after_3_attempts' });
  });
  it('max_tokens doubles per earlier truncation, capped', () => {
    expect(maxTokensFor(16000, 0)).toBe(16000);
    expect(maxTokensFor(16000, 1)).toBe(32000);
    expect(maxTokensFor(16000, 5)).toBe(64000);
  });
});

describe('buildAnswerRows', () => {
  const base = { runId: 'r1', videoId: 'v1', attempt: 1, model: MODELS.haiku, modelVersion: 'claude-haiku-5-5-x', promptHash: 'h'.repeat(64), transcriptSource: 'subtitles', rawId: 5 };
  const rows = [
    { questionId: 1, valid: true, stance: 'yes' as const, confidence: 90, quote: 'a b c d e', quoteVerified: true, quoteNormOffset: 3, startSeconds: 12, error: null },
    ...invalidAnswerRows([2], 'missing_answer'),
  ];
  it('first/pilot rows carry no lineage; invalid rows are null-stance with an error', () => {
    const out = buildAnswerRows({ ...base, kind: 'first', rows });
    expect(out[0]).toMatchObject({ pass: 'first', stance: 'yes', quote_norm_offset: 3, start_seconds: 12, trigger_answer_id: null, recheck_answer_id: null, raw_response_id: 5 });
    expect(out[1]).toMatchObject({ valid: false, stance: null, confidence: null, quote: null, error: 'missing_answer' });
  });
  it('recheck rows point at the triggering first answer; arbiter rows also at the recheck', () => {
    const cells = [[1, 100, null], [2, 101, null]] as const;
    expect(buildAnswerRows({ ...base, kind: 'recheck', rows, cells }).map((r) => [r.trigger_answer_id, r.recheck_answer_id])).toEqual([[100, null], [101, null]]);
    const cells2 = [[1, 100, 200], [2, 101, 201]] as const;
    expect(buildAnswerRows({ ...base, kind: 'arbiter', rows, cells: cells2 }).map((r) => [r.trigger_answer_id, r.recheck_answer_id])).toEqual([[100, 200], [101, 201]]);
  });
  it('refuses to build recheck rows without lineage', () => {
    expect(() => buildAnswerRows({ ...base, kind: 'recheck', rows, cells: [[1, 100, null]] })).toThrow(/no lineage/);
  });
});

describe('request construction', () => {
  const prompts = loadStancePrompts();
  const qs = toPromptQuestions([
    { id: 2, category: 'b', consumer_question: 'Did you see a light?', question: 'curated 2' },
    { id: 1, category: 'a', consumer_question: null, question: 'Curated fallback text' },
  ]);
  it('orders questions by id, prefers consumer_question, falls back to question', () => {
    expect(qs.map((q) => [q.question_id, q.question])).toEqual([[1, 'Curated fallback text'], [2, 'Did you see a light?']]);
    expect(renderQuestionsJson(qs).split('\n')).toHaveLength(4);
  });
  it('renders the stance prompt with the question list and no leftover placeholder', () => {
    const r = renderStancePrompt(prompts, qs);
    expect(r.system).toContain('"question_id":1');
    expect(r.system).not.toContain('{{');
    expect(r.promptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(renderStancePrompt(prompts, qs).promptHash).toBe(r.promptHash);
    expect(renderStancePrompt(prompts, [qs[0]]).promptHash).not.toBe(r.promptHash);
  });
  it('sends structured output + effort, no sampling parameters, transcript in the user message', () => {
    const rendered = renderStancePrompt(prompts, qs);
    const p = buildStanceParams({ family: 'haiku', effort: DEFAULT_EFFORT.haiku, maxTokens: 16000, rendered, transcriptText: 'TRANSCRIPT BODY', cacheSystem: true });
    expect(p.model).toBe('claude-haiku-5-5');
    expect(p).not.toHaveProperty('temperature');
    expect(p.output_config).toMatchObject({ effort: 'medium', format: { type: 'json_schema' } });
    expect((p.messages[0].content as string)).toContain('TRANSCRIPT BODY');
    expect(JSON.stringify(p.system)).toContain('cache_control');
    const uncached = buildStanceParams({ family: 'sonnet', effort: 'medium', maxTokens: 16000, rendered, transcriptText: 'T', cacheSystem: false });
    expect(JSON.stringify(uncached.system)).not.toContain('cache_control');
  });
  it('default efforts follow the SPEC', () => expect(DEFAULT_EFFORT).toEqual({ haiku: 'medium', sonnet: 'medium', opus: 'high' }));
  it('arbiter prompt carries the disputes but hashes only questions + schema', () => {
    const lite = (stance: 'yes' | 'no') => ({ valid: true, stance, confidence: 80, quote: 'one two three four five', quoteVerified: true });
    const d1 = buildDisputes([{ questionId: 1, category: 'a', question: 'Q1', first: lite('no'), recheck: lite('yes') }], true);
    const d2 = buildDisputes([{ questionId: 1, category: 'a', question: 'Q1', first: lite('yes'), recheck: lite('no') }], true);
    const r1 = renderArbiterPrompt(prompts, [qs[0]], d1), r2 = renderArbiterPrompt(prompts, [qs[0]], d2);
    expect(r1.system).toContain('"reader_a"');
    expect(r1.system).not.toContain('{{');
    expect(r1.system).not.toBe(r2.system);
    expect(r1.promptHash).toBe(r2.promptHash);
    expect(JSON.stringify(r1.row.question_list)).not.toContain('one two three');
  });
});
