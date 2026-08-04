/**
 * Tests for the API usage tracking foundation: cost estimation, the tracked
 * wrappers (success + error logging, fail-safe), and the budget guard
 * (threshold logic + fail-open).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
    insert: vi.fn(),
    selectGte: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            insert: h.insert,
            select: vi.fn(() => ({ gte: h.selectGte })),
        })),
    })),
}));

import { estimateCost, MODEL_PRICES, normalizeModelKey } from '@/lib/ai/pricing';
import { logUsage, trackedChat } from '@/lib/ai/usage-tracker';
import { getBudgetStatus } from '@/lib/ai/budget';

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    h.insert.mockResolvedValue({ error: null });
    h.selectGte.mockResolvedValue({ data: [], error: null });
});

describe('estimateCost', () => {
    it('computes cost from the price table', () => {
        const est = estimateCost('anthropic/claude-sonnet-4-5', {
            prompt_tokens: 1_000_000,
            completion_tokens: 1_000_000,
        });
        // $3 input + $15 output per Mtok
        expect(est.costUsd).toBe(18);
        expect(est.isEstimate).toBe(true);
    });

    it('returns 0 for an unknown model but preserves token counts', () => {
        const est = estimateCost('some/unknown-model', { prompt_tokens: 500, completion_tokens: 200, total_tokens: 700 });
        expect(est.costUsd).toBe(0);
        expect(est.totalTokens).toBe(700);
    });

    it('handles missing usage gracefully', () => {
        const est = estimateCost('gpt-4o-mini', undefined);
        expect(est.costUsd).toBe(0);
        expect(est.promptTokens).toBe(0);
    });

    it('embedding models have zero output price', () => {
        expect(MODEL_PRICES['text-embedding-3-small'].outputPerM).toBe(0);
    });

    // Regression: unpriced Claude calls are what let a runaway pipeline burn a
    // monthly limit without appearing on the usage dashboard.
    it('prices a dated Anthropic snapshot id', () => {
        // The API answers a claude-sonnet-4-5 request with this string.
        const est = estimateCost('claude-sonnet-4-5-20250929', {
            prompt_tokens: 1_000_000,
            completion_tokens: 1_000_000,
        });
        expect(est.costUsd).toBe(18);
    });

    it('prices an OpenRouter dotted alias', () => {
        const est = estimateCost('anthropic/claude-sonnet-4.5', {
            prompt_tokens: 1_000_000,
            completion_tokens: 0,
        });
        expect(est.costUsd).toBe(3);
    });

    it('prices the batch-era models', () => {
        expect(estimateCost('claude-haiku-4-5', { prompt_tokens: 1_000_000, completion_tokens: 0 }).costUsd).toBe(1);
        expect(estimateCost('claude-sonnet-5', { prompt_tokens: 0, completion_tokens: 1_000_000 }).costUsd).toBe(15);
    });

    it('still returns 0 for a genuinely unknown model', () => {
        expect(estimateCost('acme/mystery-model-20260101', { prompt_tokens: 1_000_000, completion_tokens: 0 }).costUsd).toBe(0);
    });
});

describe('normalizeModelKey', () => {
    it.each([
        ['claude-sonnet-4-5-20250929', 'claude-sonnet-4-5'],
        ['anthropic/claude-sonnet-4.5', 'claude-sonnet-4-5'],
        ['openai/gpt-4o-mini', 'gpt-4o-mini'],
        ['gpt-4o', 'gpt-4o'],
        ['text-embedding-3-small', 'text-embedding-3-small'],
    ])('%s -> %s', (input, expected) => {
        expect(normalizeModelKey(input)).toBe(expected);
    });
});

describe('logUsage', () => {
    it('inserts a row with estimated cost', async () => {
        await logUsage({
            provider: 'openrouter',
            model: 'anthropic/claude-sonnet-4-5',
            operation: 'blog-story.draft',
            usage: { prompt_tokens: 10_000, completion_tokens: 2_000 },
        });
        expect(h.insert).toHaveBeenCalledTimes(1);
        const row = h.insert.mock.calls[0][0];
        expect(row.operation).toBe('blog-story.draft');
        expect(row.cost_usd).toBeCloseTo((10_000 / 1e6) * 3 + (2_000 / 1e6) * 15, 6);
    });

    it('never throws when the insert fails (table missing, etc.)', async () => {
        h.insert.mockResolvedValue({ error: { message: 'relation "api_usage_log" does not exist' } });
        await expect(logUsage({ provider: 'openrouter', operation: 'x' })).resolves.toBeUndefined();
    });
});

describe('trackedChat', () => {
    it('returns the response unchanged and logs a success row', async () => {
        const client = {
            chat: { completions: { create: vi.fn(async () => ({ model: 'anthropic/claude-sonnet-4-5', usage: { prompt_tokens: 100, completion_tokens: 50 }, choices: [{ message: { content: 'hi' } }] })) } },
        };
        const res = await trackedChat(client, { model: 'anthropic/claude-sonnet-4-5', messages: [] }, { provider: 'openrouter', operation: 'questions-autogen' });
        expect(res.choices[0].message.content).toBe('hi');
        expect(h.insert).toHaveBeenCalledTimes(1);
        expect(h.insert.mock.calls[0][0].status).toBe('success');
    });

    it('logs an error row and rethrows when the call fails', async () => {
        const client = { chat: { completions: { create: vi.fn(async () => { throw new Error('429 rate limited'); }) } } };
        await expect(
            trackedChat(client, { model: 'm' }, { provider: 'openrouter', operation: 'blog-article.draft' })
        ).rejects.toThrow('429 rate limited');
        expect(h.insert.mock.calls[0][0].status).toBe('error');
    });
});

describe('getBudgetStatus', () => {
    it('allows when under both caps', async () => {
        h.selectGte.mockResolvedValue({ data: [{ cost_usd: 1.5 }, { cost_usd: 2.0 }], error: null });
        const s = await getBudgetStatus();
        expect(s.allowed).toBe(true);
        expect(s.daySpend).toBeCloseTo(3.5);
    });

    it('blocks when monthly spend reaches the cap', async () => {
        // Default monthly cap is 50.
        h.selectGte.mockResolvedValue({ data: [{ cost_usd: 51 }], error: null });
        const s = await getBudgetStatus();
        expect(s.allowed).toBe(false);
        expect(s.reason).toMatch(/Monthly/);
    });

    it('FAILS OPEN when the table cannot be read', async () => {
        h.selectGte.mockResolvedValue({ data: null, error: { message: 'does not exist' } });
        const s = await getBudgetStatus();
        expect(s.allowed).toBe(true);
    });
});
