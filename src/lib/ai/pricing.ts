/**
 * Model price table for estimating API cost (admin usage dashboard).
 *
 * Prices are USD per 1,000,000 tokens. KEEP CURRENT — these drift; treat the
 * resulting cost as an estimate (cost_is_estimate = true). OpenRouter can also
 * return the actual cost per generation; when we capture that, prefer it.
 *
 * Keys match the exact `model` string passed to the API so lookups are direct.
 */
export interface ModelPrice {
    inputPerM: number;
    outputPerM: number;
}

// Shared by the dotted and dash-normalized spellings of each GPT-5.x id below.
const GPT_56_SOL: ModelPrice = { inputPerM: 5, outputPerM: 30 };
const GPT_56_TERRA: ModelPrice = { inputPerM: 2, outputPerM: 12 };
const GPT_56_LUNA: ModelPrice = { inputPerM: 0.2, outputPerM: 1.2 };
const GPT_55: ModelPrice = { inputPerM: 5, outputPerM: 30 };

// As of 2026-09. Update when providers change pricing.
export const MODEL_PRICES: Record<string, ModelPrice> = {
    // OpenRouter (Anthropic)
    'anthropic/claude-sonnet-4-5': { inputPerM: 3, outputPerM: 15 },
    // Direct Anthropic. Batch API calls bill at 50% of these — halve at the call site.
    // claude-sonnet-5 has intro pricing of $2/$10 through 2026-08-31; list price below.
    'claude-haiku-4-5': { inputPerM: 1, outputPerM: 5 },
    'claude-sonnet-5': { inputPerM: 3, outputPerM: 15 },
    'claude-sonnet-4-5': { inputPerM: 3, outputPerM: 15 }, // blog pipeline
    // OpenRouter (OpenAI passthrough)
    'openai/gpt-4o': { inputPerM: 2.5, outputPerM: 10 },
    'openai/gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
    // Direct OpenAI
    'gpt-4o': { inputPerM: 2.5, outputPerM: 10 },
    'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
    // GPT-5.6 family (GA 2026-07-09). Sol/Terra/Luna are durable capability
    // tiers, not dated snapshots. Prices below are post-2026-07-30 cut: Luna
    // -80% ($1/$6 -> $0.20/$1.20), Terra -20% ($2.50/$15 -> $2/$12), Sol flat.
    // Cached input reads bill at 10% of the input rate on all three.
    //
    // Each is listed twice on purpose. normalizeModelKey() rewrites '.' to '-'
    // (for claude-sonnet-4.5), so a dated snapshot echoed back by the API as
    // gpt-5.6-luna-20260709 normalizes to gpt-5-6-luna. Without the dashed key
    // that lookup misses and the call logs $0 — a silent undercount, which is
    // the one thing this table exists to prevent.
    'gpt-5.6-sol': GPT_56_SOL,
    'gpt-5-6-sol': GPT_56_SOL,
    'gpt-5.6-terra': GPT_56_TERRA,
    'gpt-5-6-terra': GPT_56_TERRA,
    'gpt-5.6-luna': GPT_56_LUNA,
    'gpt-5-6-luna': GPT_56_LUNA,
    'gpt-5.5': GPT_55,
    'gpt-5-5': GPT_55,
    'gpt-5-mini': { inputPerM: 0.25, outputPerM: 2 },
    'gpt-5-nano': { inputPerM: 0.05, outputPerM: 0.4 },
    // RETIRED alias, kept so historical api_usage_log rows still price. OpenAI
    // has been removing the `*-chat-latest` aliases (gpt-5.2/5.3 on 2026-08-10).
    // This rate predates that and was never re-verified — treat rows priced
    // against it as approximate.
    'gpt-5-chat-latest': { inputPerM: 5, outputPerM: 15 },
    'text-embedding-3-small': { inputPerM: 0.02, outputPerM: 0 },
    'text-embedding-3-large': { inputPerM: 0.13, outputPerM: 0 },
};

/**
 * Per-unit USD cost for quota / credit / flat services that aren't metered by
 * tokens. Keyed by provider. KEEP CURRENT — these drift. Used by logQuota() to
 * turn a quantity (units, credits, images, emails) into an estimated cost_usd.
 *
 * Notes:
 * - youtube: the Data API is free up to the daily quota; marginal $ cost is 0.
 *   We still log quantity (units) so the dashboard can show "32 / 10,000 today".
 * - resend: first 100/day are free; the blended estimate (~$0.0003/email) is a
 *   ceiling so spend is never undercounted once past the free tier.
 */
export const UNIT_PRICES: Record<string, { perUnitUsd: number; unit: string }> = {
    youtube:  { perUnitUsd: 0,       unit: 'units' },   // free within quota
    supadata: { perUnitUsd: 0.01,    unit: 'credits' }, // $10 / 1,000 credits past free 100/mo
    tavily:   { perUnitUsd: 0.008,   unit: 'credits' }, // ~$8 / 1,000 queries on paid tier
    fal:      { perUnitUsd: 0.025,   unit: 'images' },  // FLUX.1 [dev] ~$0.025 / 1024x576 image
    resend:   { perUnitUsd: 0.0003,  unit: 'emails' },  // $0.30 / 1,000 past free tier
};

/** Estimate cost for a non-token quota call. Unknown providers cost 0. */
export function estimateQuotaCost(provider: string, quantity: number): { costUsd: number; unit: string } {
    const p = UNIT_PRICES[provider];
    if (!p) return { costUsd: 0, unit: 'units' };
    return { costUsd: Math.round(quantity * p.perUnitUsd * 1e6) / 1e6, unit: p.unit };
}

/**
 * Reduce a provider's model string to a price-table key.
 *
 * Providers don't echo back the string you sent. The Anthropic API answers a
 * request for `claude-sonnet-4-5` with `claude-sonnet-4-5-20250929`, and
 * OpenRouter used to answer with `anthropic/claude-sonnet-4.5` (dot, not dash).
 * Every one of those missed the table and logged $0.00 — which is precisely why
 * a runaway pipeline could burn a monthly limit without showing up on the
 * usage dashboard. Lookups try the exact string first, then this.
 */
export function normalizeModelKey(model: string): string {
    return model
        .replace(/^[a-z0-9-]+\//, '') // provider prefix: anthropic/, openai/
        .replace(/-\d{8}$/, '')       // dated snapshot: -20250929
        .replace(/\./g, '-');         // claude-sonnet-4.5 -> claude-sonnet-4-5
}

export interface TokenUsage {
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    total_tokens?: number | null;
}

export interface CostEstimate {
    costUsd: number;
    isEstimate: boolean;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

/**
 * Estimate cost from token usage + the model price table. Unknown models yield
 * a 0 cost flagged as an estimate, so spend is never silently double-counted
 * but the call still gets logged (token counts are preserved).
 */
export function estimateCost(model: string | undefined, usage: TokenUsage | undefined): CostEstimate {
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;

    // Exact match first so historical OpenRouter-keyed rows keep their prices.
    const price = model ? (MODEL_PRICES[model] ?? MODEL_PRICES[normalizeModelKey(model)]) : undefined;
    if (!price) {
        return { costUsd: 0, isEstimate: true, promptTokens, completionTokens, totalTokens };
    }

    const costUsd =
        (promptTokens / 1_000_000) * price.inputPerM +
        (completionTokens / 1_000_000) * price.outputPerM;

    // Round to 6 dp to match the column scale.
    return {
        costUsd: Math.round(costUsd * 1e6) / 1e6,
        isEstimate: true,
        promptTokens,
        completionTokens,
        totalTokens,
    };
}
