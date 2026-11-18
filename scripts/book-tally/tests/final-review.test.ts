import { describe, expect, it } from 'vitest';
import { MODELS, requestCost } from '../lib/cost';
import { classifyResult, isRetryableError } from '../lib/batch';
import { goldIdsFromRuns } from '../job2/plan';
import { classifyOutcome } from '../job2/rows';
import { promptTokensFor, queuedRetriesWorstUsd } from '../job2/estimate';

describe('retry rule is shared: lib/batch isRetryableError == job2 classifyOutcome', () => {
  it('a 5xx without a type is retryable; 4xx without a type is not', () => {
    expect(isRetryableError(undefined, 503)).toBe(true);
    expect(isRetryableError(null, 500)).toBe(true);
    expect(isRetryableError(undefined, 400)).toBe(false);
    expect(isRetryableError(undefined, undefined)).toBe(false);
    expect(isRetryableError('invalid_request_error', 500)).toBe(true); // status wins, as in classifyResult
  });
  it('job2 classifyOutcome retries a typeless 5xx (attempts left) and invalidates after the cap', () => {
    expect(classifyOutcome({ resultType: 'errored', errorType: null, errorStatus: 502, attempt: 1 })).toMatchObject({ action: 'retry', bumpTokens: false });
    expect(classifyOutcome({ resultType: 'errored', errorStatus: 500, attempt: 3 })).toEqual({ action: 'invalid', error: 'request_error:status_500_after_3_attempts' });
    expect(classifyOutcome({ resultType: 'errored', errorType: null, errorStatus: 404, attempt: 1 })).toEqual({ action: 'invalid', error: 'request_error:unknown' });
    expect(classifyOutcome({ resultType: 'errored', errorType: 'invalid_request_error', attempt: 1 })).toEqual({ action: 'invalid', error: 'request_error:invalid_request_error' });
    expect(classifyOutcome({ resultType: 'errored', errorType: 'overloaded_error', attempt: 1 })).toMatchObject({ action: 'retry' });
  });
  it('lib classifyResult and job2 agree on the same bodies', () => {
    const body = { type: 'errored', error: { type: 'error', error: { message: 'x' }, status: 503 } } as never;
    expect(classifyResult({ custom_id: 'a', result: body }).retryable).toBe(true);
    expect(classifyOutcome({ resultType: 'errored', errorStatus: 503, attempt: 1 }).action).toBe('retry');
  });
});

describe('goldIdsFromRuns ignores canceled runs', () => {
  const run = (status: string, ids: string[], over: object = {}) => ({ id: status + ids[0], status, pass: 'first', params: { mode: 'gold', plan: { videoIds: ids } }, ...over }) as never;
  it('uses the latest non-canceled gold run', () => {
    expect(goldIdsFromRuns([run('completed', ['a', 'b']), run('canceled', ['x', 'y'])])).toEqual(['a', 'b']);
    expect(goldIdsFromRuns([run('estimated', ['a']), run('completed', ['b']), run('canceled', ['z'])])).toEqual(['b']);
  });
  it('returns null when every gold run is canceled', () => {
    expect(goldIdsFromRuns([run('canceled', ['x'])])).toBeNull();
    expect(goldIdsFromRuns([])).toBeNull();
  });
});

describe('queued retries are priced per request on counted prompt tokens', () => {
  const pricing = { promptTokensByKey: { small: 50_000, big: 150_000 }, systemTokens: 0, cached: false, meanPromptTokens: 100_000 };
  it('applies the Haiku long-context tier only to the request that crosses 100K', () => {
    const w = queuedRetriesWorstUsd(MODELS.haiku, [{ key: 'small', maxTokens: 1000 }, { key: 'big', maxTokens: 1000 }], pricing);
    const exact = requestCost(MODELS.haiku, { inputTokens: 50_000, outputTokens: 1000 }) + requestCost(MODELS.haiku, { inputTokens: 150_000, outputTokens: 1000 });
    expect(w).toBeCloseTo(exact, 12);
    // pricing both at the mean (100K, standard tier) would understate: that was the old behaviour
    const meanPriced = 2 * requestCost(MODELS.haiku, { inputTokens: 100_000, outputTokens: 1000 });
    expect(w).toBeGreaterThan(meanPriced);
  });
  it('charges the cache-write premium on the cached system prefix, tier decided on total prompt tokens', () => {
    const w = queuedRetriesWorstUsd(MODELS.sonnet, [{ key: 'small', maxTokens: 500 }], { ...pricing, systemTokens: 10_000, cached: true });
    expect(w).toBeCloseTo(requestCost(MODELS.sonnet, { inputTokens: 40_000, cacheWrite5mTokens: 10_000, outputTokens: 500 }), 12);
  });
  it('unknown key -> largest counted request (never a mean); no data at all -> mean, then a clear error', () => {
    expect(promptTokensFor('missing', pricing)).toBe(150_000);
    expect(promptTokensFor('missing', { meanPromptTokens: 77_000 })).toBe(77_000);
    expect(() => promptTokensFor('missing', {})).toThrow(/re-estimate/);
  });
});
