/**
 * Characterization tests for the LIVE chat path: POST /api/chat-compassionate.
 * All I/O (OpenAI, Supabase service client, session cookies) is mocked.
 *
 * Captures current behavior, including behaviors flagged in
 * docs/IMPROVEMENT_PLAN.md: no auth/rate limiting (S-1) and internal error
 * details returned to the client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({
    embeddingsCreate: vi.fn(),
    completionsCreate: vi.fn(),
    rpc: vi.fn(),
    configSingle: vi.fn(),
    historyLimit: vi.fn(),
    insert: vi.fn(),
}));

vi.mock('openai', () => ({
    default: class MockOpenAI {
        embeddings = { create: h.embeddingsCreate };
        chat = { completions: { create: h.completionsCreate } };
    },
}));

vi.mock('next/headers', () => ({
    cookies: vi.fn(async () => ({ getAll: () => [] })),
}));

// Anonymous session for the staging-prompt branch (test mode is super_admin-only).
vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => ({
        auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    })),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
            if (table === 'chatbot_configs') {
                return { select: () => ({ eq: () => ({ single: h.configSingle }) }) };
            }
            if (table === 'nde_chat_logs') {
                return {
                    select: () => ({ eq: () => ({ order: () => ({ limit: h.historyLimit }) }) }),
                    insert: h.insert,
                };
            }
            throw new Error(`unexpected table: ${table}`);
        }),
        rpc: h.rpc,
    })),
}));

import { POST } from '@/app/api/chat-compassionate/route';
import { resetRateLimit } from '@/lib/rate-limit';

const post = (body: unknown) =>
    POST(
        new NextRequest('https://example.org/api/chat-compassionate', {
            method: 'POST',
            body: typeof body === 'string' ? body : JSON.stringify(body),
        })
    );

beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Defaults: no DB prompt config (hardcoded fallback), empty history, one RAG hit.
    h.configSingle.mockResolvedValue({ data: null });
    h.historyLimit.mockResolvedValue({ data: [] });
    h.insert.mockResolvedValue({ error: null });
    h.rpc.mockResolvedValue({ data: [{ content: 'A first-person account about light.' }], error: null });
    h.embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    h.completionsCreate.mockResolvedValue({ choices: [{ message: { content: 'A compassionate reply.' } }] });
});

describe('POST /api/chat-compassionate (current behavior)', () => {
    it('rejects requests missing sessionId or chatInput with 400', async () => {
        const res = await post({ chatInput: 'hello' });
        expect(res.status).toBe(400);
        expect((await res.json()).message).toBe('Missing sessionId or chatInput');
        expect(h.embeddingsCreate).not.toHaveBeenCalled();
    });

    it('happy path: embeds input, retrieves context via nde_chatbot_match, calls gpt-5.6-luna, returns { output }', async () => {
        const res = await post({ sessionId: 's-1', chatInput: 'I saw a light' });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ output: 'A compassionate reply.' });

        expect(h.embeddingsCreate).toHaveBeenCalledWith({
            model: 'text-embedding-3-small',
            input: 'I saw a light',
        });
        expect(h.rpc).toHaveBeenCalledWith('nde_chatbot_match', {
            query_embedding: [0.1, 0.2, 0.3],
            match_count: 10,
            filter: {},
        });

        const completionArgs = h.completionsCreate.mock.calls[0][0];
        expect(completionArgs.model).toBe('gpt-5.6-luna');
        // Retrieved context is interpolated into the system prompt as <video_N> blocks.
        expect(completionArgs.messages[0].role).toBe('system');
        expect(completionArgs.messages[0].content).toContain('<video_1>A first-person account about light.</video_1>');
        // User + bot turns are both logged to nde_chat_logs.
        expect(h.insert).toHaveBeenCalledTimes(2);
    });

    it('prefers the live_prompt from chatbot_configs over the hardcoded fallback', async () => {
        h.configSingle.mockResolvedValue({ data: { live_prompt: 'DB PROMPT MARKER' } });
        await post({ sessionId: 's-1', chatInput: 'hello' });
        expect(h.completionsCreate.mock.calls[0][0].messages[0].content).toContain('DB PROMPT MARKER');
    });

    it('threads prior conversation history into the messages array', async () => {
        h.historyLimit.mockResolvedValue({
            data: [
                { message: 'earlier bot reply', sender: 'bot' },
                { message: 'earlier user message', sender: 'user' },
            ],
        });
        await post({ sessionId: 's-1', chatInput: 'follow-up' });
        const messages = h.completionsCreate.mock.calls[0][0].messages;
        // History arrives newest-first from the query and is reversed to chronological.
        expect(messages[1]).toEqual({ role: 'user', content: 'earlier user message' });
        expect(messages[2]).toEqual({ role: 'assistant', content: 'earlier bot reply' });
    });

    it('requires NO auth — a single anonymous request reaches the paid OpenAI calls (rate-limited, not auth-gated; S-1)', async () => {
        const res = await post({ sessionId: 'anon', chatInput: 'anything' });
        expect(res.status).toBe(200);
        expect(h.embeddingsCreate).toHaveBeenCalled();
        expect(h.completionsCreate).toHaveBeenCalled();
    });

    it('S-1 regression guard: requests beyond the per-IP limit return 429 and never reach the model client', async () => {
        const LIMIT = 10; // matches RATE_LIMIT.max in the route
        for (let i = 0; i < LIMIT; i++) {
            const res = await post({ sessionId: 's-1', chatInput: `msg ${i}` });
            expect(res.status).toBe(200);
        }
        expect(h.completionsCreate).toHaveBeenCalledTimes(LIMIT);

        const blocked = await post({ sessionId: 's-1', chatInput: 'one too many' });
        expect(blocked.status).toBe(429);
        expect(blocked.headers.get('Retry-After')).toBe('60');
        // Generic body — no internal detail.
        expect(await blocked.json()).toEqual({ error: 'Too many requests. Please try again later.' });
        // The blocked request must not incur OpenAI spend.
        expect(h.embeddingsCreate).toHaveBeenCalledTimes(LIMIT);
        expect(h.completionsCreate).toHaveBeenCalledTimes(LIMIT);
    });

    it('S-1: the limit is per-IP — a request from a different IP is not blocked by another IP\'s exhausted bucket', async () => {
        for (let i = 0; i < 11; i++) await post({ sessionId: 's-1', chatInput: `msg ${i}` });

        const res = await POST(
            new NextRequest('https://example.org/api/chat-compassionate', {
                method: 'POST',
                headers: { 'x-forwarded-for': '203.0.113.7' },
                body: JSON.stringify({ sessionId: 'other', chatInput: 'hello' }),
            })
        );
        expect(res.status).toBe(200);
    });

    it('falls back to gpt-4o-mini when the primary model call fails, instead of surfacing an error', async () => {
        h.completionsCreate.mockRejectedValueOnce(
            Object.assign(new Error('The model `gpt-5.6-luna` does not exist'), {
                status: 404,
                code: 'model_not_found',
            })
        );

        const res = await post({ sessionId: 's-1', chatInput: 'hello' });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ output: 'A compassionate reply.' });

        expect(h.completionsCreate).toHaveBeenCalledTimes(2);
        expect(h.completionsCreate.mock.calls[0][0].model).toBe('gpt-5.6-luna');
        expect(h.completionsCreate.mock.calls[1][0].model).toBe('gpt-4o-mini');
        // The retry answers from the identical prompt, context and history.
        expect(h.completionsCreate.mock.calls[1][0].messages).toEqual(
            h.completionsCreate.mock.calls[0][0].messages
        );
        // Both turns are still logged once the fallback succeeds.
        expect(h.insert).toHaveBeenCalledTimes(2);
    });

    it('returns 500 with the OpenAI error code when the primary AND fallback models both fail', async () => {
        h.completionsCreate.mockRejectedValue(
            Object.assign(new Error('You exceeded your current quota'), {
                status: 429,
                code: 'insufficient_quota',
            })
        );

        const res = await post({ sessionId: 's-1', chatInput: 'hello' });
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('You exceeded your current quota');
        expect(body.code).toBe('insufficient_quota');
        expect(h.completionsCreate).toHaveBeenCalledTimes(2);
    });

    it('does not throw when the model returns no choices — it degrades to the canned reply', async () => {
        h.completionsCreate.mockResolvedValue({ choices: [] });
        const res = await post({ sessionId: 's-1', chatInput: 'hello' });
        expect(res.status).toBe(200);
        expect((await res.json()).output).toBe("I apologize, but I couldn't generate a response.");
    });

    it('documents current behavior: upstream errors return 500 with the internal error message in the body', async () => {
        h.embeddingsCreate.mockRejectedValue(new Error('OpenAI quota exceeded'));
        const res = await post({ sessionId: 's-1', chatInput: 'hello' });
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.message).toBe('Internal Server Error');
        // Internal detail leaks to the client today; tighten later.
        expect(body.error).toBe('OpenAI quota exceeded');
    });

    it('S-12 regression guard: malformed JSON body returns 400 before any side effect', async () => {
        const res = await post('not-json{');
        expect(res.status).toBe(400);
        expect(h.embeddingsCreate).not.toHaveBeenCalled();
        expect(h.insert).not.toHaveBeenCalled();
    });

    it('S-12 regression guard: an oversized chatInput returns 400 before any model call', async () => {
        const res = await post({ sessionId: 's-1', chatInput: 'x'.repeat(4001) });
        expect(res.status).toBe(400);
        expect(h.embeddingsCreate).not.toHaveBeenCalled();
    });

    it('S-12: wrong field types return 400', async () => {
        const res = await post({ sessionId: 's-1', chatInput: ['not', 'a', 'string'] });
        expect(res.status).toBe(400);
        expect(h.embeddingsCreate).not.toHaveBeenCalled();
    });
});
