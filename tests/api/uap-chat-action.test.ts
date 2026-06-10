/**
 * Regression tests for the S-1 addendum: the getUapChatResponse server action
 * (used by the /uap/chat page) is a publicly invokable endpoint that bills
 * OpenAI, so it must share the per-IP 'uap-chat' rate-limit bucket with
 * /api/uap/chat. All I/O (OpenAI, Supabase, request headers) is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
    embeddingsCreate: vi.fn(),
    completionsCreate: vi.fn(),
    rpc: vi.fn(),
    videosIn: vi.fn(),
    clientIp: '198.51.100.1' as string | null,
}));

vi.mock('openai', () => ({
    default: class MockOpenAI {
        embeddings = { create: h.embeddingsCreate };
        chat = { completions: { create: h.completionsCreate } };
    },
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(async () => ({
        get: (name: string) => (name === 'x-forwarded-for' ? h.clientIp : null),
    })),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        rpc: h.rpc,
        from: vi.fn((table: string) => {
            if (table === 'uap_vids') {
                return { select: () => ({ in: h.videosIn }) };
            }
            throw new Error(`unexpected table: ${table}`);
        }),
    })),
}));

import { getUapChatResponse } from '@/app/uap/actions';
import { resetRateLimit } from '@/lib/rate-limit';

beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    h.clientIp = '198.51.100.1';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    h.rpc.mockResolvedValue({
        data: [{ content: 'A testimony about lights.', video_id: 'vid-1', metadata: {} }],
        error: null,
    });
    h.videosIn.mockResolvedValue({
        data: [{ video_id: 'vid-1', title: 'Sighting', channel_name: 'Chan' }],
    });
    h.completionsCreate.mockResolvedValue({ choices: [{ message: { content: 'An answer. [1]' } }] });
});

describe('getUapChatResponse server action (S-1 addendum)', () => {
    it('a single request succeeds and returns an answer with citations', async () => {
        const res = await getUapChatResponse('What do experiencers report?');
        expect(res.success).toBe(true);
        expect(res.data?.answer).toBe('An answer. [1]');
        expect(res.data?.citations).toHaveLength(1);
    });

    it('requests beyond the shared per-IP limit return the slow-down error and never reach OpenAI', async () => {
        const LIMIT = 10; // matches RATE_LIMIT.max shared with /api/uap/chat
        for (let i = 0; i < LIMIT; i++) {
            const res = await getUapChatResponse(`question ${i}`);
            expect(res.success).toBe(true);
        }
        expect(h.embeddingsCreate).toHaveBeenCalledTimes(LIMIT);

        const blocked = await getUapChatResponse('one too many');
        expect(blocked.success).toBe(false);
        expect(blocked.error).toBe(
            "You've sent quite a few messages in a short time. Please wait a minute, then try again."
        );
        // The blocked request must not incur OpenAI spend.
        expect(h.embeddingsCreate).toHaveBeenCalledTimes(LIMIT);
        expect(h.completionsCreate).toHaveBeenCalledTimes(LIMIT);
    });

    it('the limit is per-IP — a different IP is not blocked by another IP\'s exhausted bucket', async () => {
        for (let i = 0; i < 11; i++) await getUapChatResponse(`question ${i}`);

        h.clientIp = '203.0.113.9';
        const res = await getUapChatResponse('hello from elsewhere');
        expect(res.success).toBe(true);
    });
});
