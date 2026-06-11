/**
 * API usage tracking (admin cost dashboard + budget guardrail).
 *
 * Design rules:
 * - Logging MUST NEVER break a pipeline. Every write is fire-and-forget and
 *   swallows its own errors (including "table does not exist" before the
 *   migration is run — the feature degrades to a silent no-op).
 * - `trackedChat` / `trackedEmbedding` wrap a provider call, capture token
 *   usage from the response, estimate cost, and record one row — returning the
 *   response unchanged so call sites only change the function they call.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { estimateCost, type TokenUsage } from './pricing';

export type Provider = 'openrouter' | 'openai' | 'tavily' | 'fal' | 'resend';

export interface UsageContext {
    provider: Provider;
    /** Feature attribution, e.g. 'blog-story.draft', 'questions-autogen'. */
    operation: string;
    metadata?: Record<string, unknown>;
}

let cached: SupabaseClient | null = null;
function serviceClient(): SupabaseClient | null {
    if (cached) return cached;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    cached = createClient(url, key);
    return cached;
}

interface LogRow {
    provider: Provider;
    model?: string;
    operation: string;
    usage?: TokenUsage;
    status?: 'success' | 'error';
    metadata?: Record<string, unknown>;
}

/** Record one usage row. Never throws. */
export async function logUsage(row: LogRow): Promise<void> {
    try {
        const supabase = serviceClient();
        if (!supabase) return;
        const est = estimateCost(row.model, row.usage);
        const { error } = await supabase.from('api_usage_log').insert({
            provider: row.provider,
            model: row.model ?? null,
            operation: row.operation,
            prompt_tokens: est.promptTokens,
            completion_tokens: est.completionTokens,
            total_tokens: est.totalTokens,
            cost_usd: est.costUsd,
            cost_is_estimate: est.isEstimate,
            status: row.status ?? 'success',
            metadata: row.metadata ?? null,
        });
        // Table-missing (pre-migration) or any write error: degrade quietly.
        if (error && process.env.NODE_ENV !== 'production') {
            console.warn('[usage-tracker] log skipped:', error.message);
        }
    } catch {
        /* never break the caller */
    }
}

// Minimal structural types so we don't depend on the OpenAI SDK's shapes.
interface ChatLike {
    chat: { completions: { create: (params: unknown, opts?: unknown) => Promise<ChatResponse> } };
}
interface ChatResponse {
    model?: string;
    usage?: TokenUsage;
    [k: string]: unknown;
}
interface EmbedLike {
    embeddings: { create: (params: unknown) => Promise<EmbedResponse> };
}
interface EmbedResponse {
    model?: string;
    usage?: TokenUsage;
    [k: string]: unknown;
}

/**
 * Wrap a chat completion: run it, log usage (success or error), return the
 * response unchanged. `requestedModel` is logged when the response omits it.
 */
export async function trackedChat<T extends ChatResponse>(
    client: ChatLike,
    params: { model?: string } & Record<string, unknown>,
    ctx: UsageContext,
    opts?: unknown,
): Promise<T> {
    try {
        const res = (await client.chat.completions.create(params, opts)) as T;
        void logUsage({
            provider: ctx.provider,
            model: res.model ?? params.model,
            operation: ctx.operation,
            usage: res.usage,
            status: 'success',
            metadata: ctx.metadata,
        });
        return res;
    } catch (err) {
        void logUsage({
            provider: ctx.provider,
            model: params.model,
            operation: ctx.operation,
            status: 'error',
            metadata: { ...ctx.metadata, error: err instanceof Error ? err.message : String(err) },
        });
        throw err;
    }
}

/**
 * Wrap an OpenAI-shaped client so every `.chat.completions.create` and
 * `.embeddings.create` is tracked under one operation label, with no call-site
 * changes. Other properties pass through untouched. This captures 100% of a
 * file's spend at the cost of per-file (not per-call) operation granularity.
 */
export function wrapAiClient<C extends object>(client: C, ctx: UsageContext): C {
    return new Proxy(client, {
        get(target, prop, receiver) {
            if (prop === 'chat') {
                return {
                    completions: {
                        create: (params: { model?: string } & Record<string, unknown>, opts?: unknown) =>
                            trackedChat(target as unknown as ChatLike, params, ctx, opts),
                    },
                };
            }
            if (prop === 'embeddings') {
                return {
                    create: (params: { model?: string } & Record<string, unknown>) =>
                        trackedEmbedding(target as unknown as EmbedLike, params, ctx),
                };
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}

/** Wrap an embeddings call (same contract as trackedChat). */
export async function trackedEmbedding<T extends EmbedResponse>(
    client: EmbedLike,
    params: { model?: string } & Record<string, unknown>,
    ctx: UsageContext,
): Promise<T> {
    try {
        const res = (await client.embeddings.create(params)) as T;
        void logUsage({
            provider: ctx.provider,
            model: res.model ?? params.model,
            operation: ctx.operation,
            usage: res.usage,
            status: 'success',
            metadata: ctx.metadata,
        });
        return res;
    } catch (err) {
        void logUsage({
            provider: ctx.provider,
            model: params.model,
            operation: ctx.operation,
            status: 'error',
            metadata: { ...ctx.metadata, error: err instanceof Error ? err.message : String(err) },
        });
        throw err;
    }
}
