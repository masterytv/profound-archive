/**
 * Minimal Gemini client (Google AI REST API, no SDK).
 *
 * Used by Share Your Experience for light editor suggestions and crisis
 * softening. Model defaults to the `gemini-pro-latest` alias (the same one
 * Short Maker uses) and can be overridden with GEMINI_MODEL.
 * Paid-tier Gemini API data is not used to train Google's models.
 */
import { logUsage } from './usage-tracker';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-pro-latest';
}

export interface GeminiJsonResult<T> {
    data: T;
    model: string;
}

/**
 * Ask Gemini for JSON matching `responseSchema` (OpenAPI subset). Throws on
 * HTTP errors, empty answers or unparseable JSON.
 */
export async function geminiJson<T>(args: {
    system: string;
    prompt: string;
    responseSchema: Record<string, unknown>;
    operation: string;
    temperature?: number;
    timeoutMs?: number;
}): Promise<GeminiJsonResult<T>> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    const model = geminiModel();

    const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.timeout(args.timeoutMs ?? 120_000),
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: args.system }] },
            contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
            generationConfig: {
                temperature: args.temperature ?? 0.2,
                responseMimeType: 'application/json',
                responseSchema: args.responseSchema,
            },
        }),
    });

    const body = (await res.json().catch(() => null)) as GeminiResponse | null;
    const usage = body?.usageMetadata;
    const servedModel = body?.modelVersion || model;
    void logUsage({
        provider: 'google',
        model: servedModel,
        operation: args.operation,
        usage: usage
            ? {
                  prompt_tokens: usage.promptTokenCount ?? 0,
                  completion_tokens: usage.candidatesTokenCount ?? 0,
                  total_tokens: usage.totalTokenCount ?? 0,
              }
            : undefined,
        status: res.ok ? 'success' : 'error',
    });

    if (!res.ok) {
        throw new Error(`Gemini ${res.status}: ${body?.error?.message ?? 'request failed'}`);
    }
    const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text.trim()) throw new Error('Gemini returned an empty answer');
    try {
        return { data: JSON.parse(text) as T, model: servedModel };
    } catch {
        throw new Error('Gemini returned invalid JSON');
    }
}

interface GeminiResponse {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    modelVersion?: string;
    error?: { message?: string };
}
