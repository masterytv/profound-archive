/**
 * The one fal.ai FLUX.1 [dev] call.
 *
 * This submit-and-poll block used to exist three times — blog-image.ts,
 * blog-story.ts and experience-image.ts — with byte-identical request bodies and
 * three slightly different error messages. Only the first copy ever logged its
 * spend, so roughly 93% of fal usage was invisible on the cost dashboard: 18
 * logged calls totalling $0.45, against ~166 images actually generated for story
 * articles alone. experience-image.ts's own header said it "reuses the same
 * fal.ai pattern as blog-image.ts and blog-story.ts" — the copy is exactly how
 * the tracking got lost, so the fix is to have one copy.
 *
 * `operation` is the only thing that varies per caller; it becomes the
 * api_usage_log attribution label.
 */
import { logQuota } from '../ai/usage-tracker';

export interface FalImage {
    url: string;
    width: number;
    height: number;
}

interface FalResponse {
    images?: FalImage[];
    error?: string;
}

const FAL_ENDPOINT = 'https://queue.fal.run/fal-ai/flux/dev';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 36; // 3 minutes

/**
 * Generate one 1024x576 oil-painting-style image.
 *
 * @param prompt  the full prompt, style preamble already applied by the caller
 * @param operation  api_usage_log label, e.g. 'blog-story.fal'
 */
export async function generateFalImage(prompt: string, operation: string): Promise<FalImage> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error('Missing FAL_API_KEY environment variable');

    const submitRes = await fetch(FAL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            image_size: 'landscape_16_9',  // 1024x576
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            enable_safety_checker: true,
        }),
    });

    // Logged on submit, not on completion: fal bills the accepted request, so a
    // job that is charged but later fails or times out must still show up.
    void logQuota({
        provider: 'fal',
        operation,
        quantity: 1,
        status: submitRes.ok ? 'success' : 'error',
    });

    if (!submitRes.ok) {
        throw new Error(`fal.ai submit error ${submitRes.status}: ${await submitRes.text()}`);
    }

    const { request_id, status_url } = await submitRes.json() as {
        request_id: string;
        status_url: string;
    };

    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

        const pollRes = await fetch(status_url ?? `${FAL_ENDPOINT}/requests/${request_id}`, {
            headers: { 'Authorization': `Key ${apiKey}` },
        });
        if (!pollRes.ok) continue;

        const pollData = await pollRes.json() as { status: string; response_url?: string };

        if (pollData.status === 'COMPLETED' && pollData.response_url) {
            const resultRes = await fetch(pollData.response_url, {
                headers: { 'Authorization': `Key ${apiKey}` },
            });
            const result = await resultRes.json() as FalResponse;
            const img = result.images?.[0];
            if (!img) throw new Error('fal.ai returned no images');
            return img;
        }

        if (pollData.status === 'FAILED') throw new Error('fal.ai generation failed');
    }

    throw new Error('fal.ai timed out after 3 minutes');
}
