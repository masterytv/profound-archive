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

const post = (body: unknown) =>
    POST(
        new NextRequest('https://example.org/api/chat-compassionate', {
            method: 'POST',
            body: typeof body === 'string' ? body : JSON.stringify(body),
        })
    );

beforeEach(() => {
    vi.clearAllMocks();
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

    it('happy path: embeds input, retrieves context via nde_chatbot_match, calls gpt-5-chat-latest, returns { output }', async () => {
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
        expect(completionArgs.model).toBe('gpt-5-chat-latest');
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

    it('documents current behavior: requires NO auth — an anonymous request reaches the paid OpenAI calls (IMPROVEMENT_PLAN S-1)', async () => {
        const res = await post({ sessionId: 'anon', chatInput: 'anything' });
        expect(res.status).toBe(200);
        expect(h.embeddingsCreate).toHaveBeenCalled();
        expect(h.completionsCreate).toHaveBeenCalled();
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

    it('documents current behavior: malformed JSON body returns 500 (not 400)', async () => {
        const res = await post('not-json{');
        expect(res.status).toBe(500);
    });
});
