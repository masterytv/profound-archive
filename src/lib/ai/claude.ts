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
 * Sonnet 4.5 — unchanged from what the pipeline ran on OpenRouter, so the
 * prompts keep their tuned behaviour. It is legacy but active, and one of the
 * last models that still accepts an assistant prefill; Sonnet 4.6+ returns 400.
 * Moving off the prefill is a prerequisite for upgrading past it.
 */
export const BLOG_CLAUDE_MODEL = 'claude-sonnet-4-5';

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
     * Assistant prefill, e.g. '{' to force a bare JSON object. The model
     * continues from it, so it is prepended to the returned text and callers
     * get the complete value.
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

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: args.user }];
    if (args.prefill) messages.push({ role: 'assistant', content: args.prefill });

    try {
        const message = await getClient()
            .messages.stream(
                {
                    model,
                    max_tokens: args.maxTokens,
                    system: args.system,
                    messages,
                    ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
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
                prompt_tokens: message.usage.input_tokens,
                completion_tokens: message.usage.output_tokens,
            },
            status: 'success',
        });

        const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
        return {
            text: (args.prefill ?? '') + (block?.text ?? ''),
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
