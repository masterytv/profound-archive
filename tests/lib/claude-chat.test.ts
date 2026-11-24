import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Request shape of claudeChat() per model. Sonnet 5.5 returns a 400 for an
 * assistant prefill, a non-default temperature and `thinking: {type: 'disabled'}`,
 * so these tests pin what each model is actually sent. No network: the SDK is mocked.
 */

const h = vi.hoisted(() => ({
    stream: vi.fn(),
    logUsage: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
    default: class {
        messages = { stream: h.stream };
    },
}));

vi.mock('@/lib/ai/usage-tracker', () => ({ logUsage: h.logUsage }));

function reply(text: string, stop_reason = 'end_turn', model = 'claude-sonnet-5-5') {
    h.stream.mockReturnValue({
        finalMessage: async () => ({
            model,
            stop_reason,
            content: text ? [{ type: 'text', text }] : [],
            usage: { input_tokens: 10, output_tokens: 5 },
        }),
    });
}

const base = { system: 'SYS', user: 'USER', operation: 'test.op', maxTokens: 1000 };

async function load() {
    vi.resetModules();
    return import('@/lib/ai/claude');
}

beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.CLAUDE_MODEL;
});

afterEach(() => {
    delete process.env.CLAUDE_MODEL;
});

describe('BLOG_CLAUDE_MODEL', () => {
    it('defaults to claude-sonnet-5-5', async () => {
        const { BLOG_CLAUDE_MODEL } = await load();
        expect(BLOG_CLAUDE_MODEL).toBe('claude-sonnet-5-5');
    });

    it('reads CLAUDE_MODEL', async () => {
        process.env.CLAUDE_MODEL = ' claude-sonnet-4-5 ';
        const { BLOG_CLAUDE_MODEL } = await load();
        expect(BLOG_CLAUDE_MODEL).toBe('claude-sonnet-4-5');
    });
});

describe('claudeChat on Sonnet 5.5', () => {
    it('sends no prefill, no temperature, and between_tools thinking', async () => {
        const { claudeChat } = await load();
        reply('{"a":1}');
        await claudeChat({ ...base, prefill: '{', temperature: 0.7 });

        const body = h.stream.mock.calls[0][0];
        expect(body.model).toBe('claude-sonnet-5-5');
        expect(body.messages).toEqual([{ role: 'user', content: 'USER' }]);
        expect(body).not.toHaveProperty('temperature');
        expect(body.thinking).toEqual({ type: 'between_tools' });
        expect(body.system[0].text).toMatch(/^SYS\n\nRespond with only the JSON object/);
    });

    it('leaves the system prompt alone when no prefill is asked for', async () => {
        const { claudeChat } = await load();
        reply('plain text');
        const res = await claudeChat({ ...base, temperature: 0.3 });
        expect(h.stream.mock.calls[0][0].system[0].text).toBe('SYS');
        expect(res.text).toBe('plain text');
    });

    it('returns text starting with the prefix, code fence stripped', async () => {
        const { claudeChat } = await load();
        reply('```json\n{"title":"x"}\n```');
        const res = await claudeChat({ ...base, prefill: '{' });
        expect(res.text).toBe('{"title":"x"}');
        expect(JSON.parse(res.text)).toEqual({ title: 'x' });
    });

    it('adds the prefix when the model left it off', async () => {
        const { claudeChat } = await load();
        reply('"title":"x"}');
        const res = await claudeChat({ ...base, prefill: '{' });
        expect(res.text).toBe('{"title":"x"}');
    });

    it('joins multiple text blocks and ignores thinking blocks', async () => {
        const { claudeChat } = await load();
        h.stream.mockReturnValue({
            finalMessage: async () => ({
                model: 'claude-sonnet-5-5',
                stop_reason: 'end_turn',
                content: [
                    { type: 'thinking', thinking: '', signature: 's' },
                    { type: 'text', text: '{"a":' },
                    { type: 'text', text: '1}' },
                ],
                usage: { input_tokens: 1, output_tokens: 1 },
            }),
        });
        const res = await claudeChat({ ...base, prefill: '{' });
        expect(res.text).toBe('{"a":1}');
    });

    it('flags truncation', async () => {
        const { claudeChat } = await load();
        reply('{"a":', 'max_tokens');
        const res = await claudeChat({ ...base, prefill: '{' });
        expect(res.truncated).toBe(true);
    });

    it('throws on a refusal instead of returning empty text', async () => {
        const { claudeChat } = await load();
        reply('', 'refusal');
        await expect(claudeChat({ ...base, prefill: '{' })).rejects.toThrow(/declined/);
    });
});

describe('claudeChat on a legacy model (CLAUDE_MODEL=claude-sonnet-4-5)', () => {
    it('keeps the prefill and temperature, and sends no thinking field', async () => {
        process.env.CLAUDE_MODEL = 'claude-sonnet-4-5';
        const { claudeChat } = await load();
        reply('"a":1}', 'end_turn', 'claude-sonnet-4-5-20250929');
        const res = await claudeChat({ ...base, prefill: '{', temperature: 0.7 });

        const body = h.stream.mock.calls[0][0];
        expect(body.messages).toEqual([
            { role: 'user', content: 'USER' },
            { role: 'assistant', content: '{' },
        ]);
        expect(body.temperature).toBe(0.7);
        expect(body).not.toHaveProperty('thinking');
        expect(body.system[0].text).toBe('SYS');
        expect(res.text).toBe('{"a":1}');
    });
});

describe('claudeChat on another current model (claude-sonnet-5)', () => {
    it('sends neither prefill, temperature nor between_tools', async () => {
        const { claudeChat } = await load();
        reply('{"a":1}', 'end_turn', 'claude-sonnet-5');
        await claudeChat({ ...base, model: 'claude-sonnet-5', prefill: '{', temperature: 0.7 });

        const body = h.stream.mock.calls[0][0];
        expect(body.messages).toHaveLength(1);
        expect(body).not.toHaveProperty('temperature');
        expect(body).not.toHaveProperty('thinking');
    });
});
