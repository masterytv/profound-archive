/**
 * Direct Anthropic chat for the blog pipeline.
 *
 * The pipeline used to reach Claude through OpenRouter using the OpenAI SDK's
 * chat-completions shape. That key is retired, so these calls now go to the
 * Anthropic API directly — same model, same prompts, identical token prices,
 * minus OpenRouter's ~15% top-up fee.
 *
 * Anthropic's Messages API differs from chat-completions in three ways that
 * every call site would otherwise have to handle itself:
 *   - the system prompt is a top-level `system` field, not a message
 *   - the reply is a content-block array, not `choices[0].message.content`
 *   - truncation is `stop_reason: 'max_tokens'`, not `finish_reason: 'length'`
 *
 * This helper absorbs all three and returns the two things the blog pipeline
 * actually uses: the text, and whether it was cut off. Truncation is fatal
 * everywhere it's checked — a truncated article is a broken article.
 *
 * Requests are streamed. Not for incremental output — nothing here consumes
 * tokens as they arrive — but because the SDK refuses a non-streaming call
 * whose max_tokens implies a run over 10 minutes (its estimate is
 * 60min × max_tokens / 128000). The article and story drafts ask for 24000,
 * which estimates to 11.25 minutes, so they threw before sending a byte.
 * That ceiling does not apply to streamed requests. `finalMessage()` resolves
 * to the same Message a non-streaming call returns, usage and stop_reason
 * included.
 */
import Anthropic from '@anthropic-ai/sdk';
import { logUsage } from './usage-tracker';

/**
 * Model for every claudeChat() call (blog articles, story drafts, fact
 * corrections, questions-autogen). Set CLAUDE_MODEL to change it without a
 * code change; never type a model id anywhere else.
 *
 * Sonnet 4.5 retires on the API on 2026-11-30, so the default is Sonnet 5.5.
 * Sonnet 4.6+ rejects an assistant prefill and non-default sampling
 * parameters (temperature) with a 400, so claudeChat() only sends those to
 * the legacy models that still take them (see LEGACY_PARAMS_MODEL below).
 */
export const BLOG_CLAUDE_MODEL = process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-5-5';

/** Models that still accept an assistant prefill and `temperature`. */
const LEGACY_PARAMS_MODEL = /^(anthropic\/)?claude-(3|(sonnet|haiku|opus)-4-5)/;

/** Sonnet 5.5 is the only model that accepts `thinking: {type: 'between_tools'}`. */
const BETWEEN_TOOLS_MODEL = /^claude-sonnet-5-5/;

/**
 * On models without prefill support, a JSON-only instruction in the system
 * prompt stands in for the '{' prefill.
 */
const JSON_ONLY_INSTRUCTION =
    'Respond with only the JSON object, starting with "{". No prose before or after it, and no code fences.';

let client: Anthropic | null = null;

function getClient(): Anthropic {
    if (client) return client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY environment variable');
    client = new Anthropic({ apiKey });
    return client;
}

export interface ClaudeChatArgs {
    system: string;
    user: string;
    /** Feature attribution for api_usage_log, e.g. 'blog-article.draft'. */
    operation: string;
    maxTokens: number;
    temperature?: number;
    /**
     * Assistant prefill, e.g. '{' to force a bare JSON object. Legacy models
     * continue from it; newer ones reject a prefill, so they get a JSON-only
     * instruction instead. Either way the returned text starts with it.
     */
    prefill?: string;
    model?: string;
    /**
     * Per-request timeout. The SDK's own timer is independent of any caller
     * AbortSignal, so a route handler aborting (e.g. Turbopack HMR in dev)
     * can't kill the call. Defaults to the SDK's 10 minutes.
     */
    timeoutMs?: number;
}

export interface ClaudeChatResult {
    text: string;
    /** stop_reason === 'max_tokens'. Callers treat this as fatal. */
    truncated: boolean;
}

export async function claudeChat(args: ClaudeChatArgs): Promise<ClaudeChatResult> {
    const model = args.model ?? BLOG_CLAUDE_MODEL;

    const legacy = LEGACY_PARAMS_MODEL.test(model);
    const usePrefill = Boolean(args.prefill) && legacy;

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: args.user }];
    if (usePrefill) messages.push({ role: 'assistant', content: args.prefill! });

    const system =
        args.prefill && !legacy ? `${args.system}\n\n${JSON_ONLY_INSTRUCTION}` : args.system;

    try {
        const message = await getClient()
            .messages.stream(
                {
                    model,
                    max_tokens: args.maxTokens,
                    // Cached: batch runs send the same system prompt for every article, so
                    // after the first it is read back at a tenth of the input price.
                    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
                    messages,
                    ...(legacy && args.temperature !== undefined ? { temperature: args.temperature } : {}),
                    // Sonnet 5.5 thinks by default, and thinking tokens count against
                    // max_tokens (truncation is fatal here). between_tools turns extended
                    // thinking off, matching how Sonnet 4.5 ran these prompts. The SDK's
                    // types predate the value, hence the cast.
                    ...(BETWEEN_TOOLS_MODEL.test(model)
                        ? { thinking: { type: 'between_tools' } as unknown as Anthropic.ThinkingConfigParam }
                        : {}),
                },
                args.timeoutMs !== undefined ? { timeout: args.timeoutMs } : undefined,
            )
            .finalMessage();

        // Anthropic reports input_tokens/output_tokens; the log table and the
        // price table both speak the OpenAI shape.
        void logUsage({
            provider: 'anthropic',
            model: message.model ?? model,
            operation: args.operation,
            usage: {
                prompt_tokens:
                    message.usage.input_tokens +
                    (message.usage.cache_creation_input_tokens ?? 0) +
                    (message.usage.cache_read_input_tokens ?? 0),
                completion_tokens: message.usage.output_tokens,
                cache_write_tokens: message.usage.cache_creation_input_tokens ?? 0,
                cache_read_tokens: message.usage.cache_read_input_tokens ?? 0,
            },
            status: 'success',
        });

        if (message.stop_reason === 'refusal') {
            throw new Error(`Claude declined the request (${args.operation})`);
        }

        const raw = message.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('');
        return {
            text: usePrefill ? args.prefill + raw : withPrefix(raw, args.prefill),
            truncated: message.stop_reason === 'max_tokens',
        };
    } catch (err) {
        void logUsage({
            provider: 'anthropic',
            model,
            operation: args.operation,
            status: 'error',
            metadata: { error: err instanceof Error ? err.message : String(err) },
        });
        throw err;
    }
}

/**
 * Without a real prefill the model writes the whole value itself, sometimes
 * inside a code fence. Strip a leading fence and make sure the text starts
 * with the prefix callers expect, so they still get the complete value.
 */
function withPrefix(text: string, prefix: string | undefined): string {
    if (!prefix) return text;
    const t = text.trimStart().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    return t.startsWith(prefix) ? t : prefix + t;
}
