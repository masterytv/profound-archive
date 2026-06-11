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

// As of 2026-06. Update when providers change pricing.
export const MODEL_PRICES: Record<string, ModelPrice> = {
    // OpenRouter (Anthropic)
    'anthropic/claude-sonnet-4-5': { inputPerM: 3, outputPerM: 15 },
    // OpenRouter (OpenAI passthrough)
    'openai/gpt-4o': { inputPerM: 2.5, outputPerM: 10 },
    'openai/gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
    // Direct OpenAI
    'gpt-4o': { inputPerM: 2.5, outputPerM: 10 },
    'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
    'gpt-5-chat-latest': { inputPerM: 5, outputPerM: 15 },
    'text-embedding-3-small': { inputPerM: 0.02, outputPerM: 0 },
    'text-embedding-3-large': { inputPerM: 0.13, outputPerM: 0 },
};

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

    const price = model ? MODEL_PRICES[model] : undefined;
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
