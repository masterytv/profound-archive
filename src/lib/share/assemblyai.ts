/**
 * AssemblyAI transcription (REST). The audio is fetched by AssemblyAI from a
 * short-lived signed URL; the result comes back to our webhook.
 */
import { logQuota } from '@/lib/ai/usage-tracker';

const API = 'https://api.assemblyai.com/v2';

export function assemblyConfigured(): boolean {
    return Boolean(process.env.ASSEMBLYAI_API_KEY);
}

export async function submitTranscription(args: { audioUrl: string; webhookUrl: string; language?: string }): Promise<string> {
    const key = process.env.ASSEMBLYAI_API_KEY;
    if (!key) throw new Error('ASSEMBLYAI_API_KEY is not set');
    const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
    const res = await fetch(`${API}/transcript`, {
        method: 'POST',
        headers: { authorization: key, 'content-type': 'application/json' },
        body: JSON.stringify({
            audio_url: args.audioUrl,
            webhook_url: args.webhookUrl,
            ...(secret ? { webhook_auth_header_name: 'x-share-webhook-secret', webhook_auth_header_value: secret } : {}),
            speaker_labels: true,
            punctuate: true,
            format_text: true,
            ...(args.language && args.language !== 'auto' ? { language_code: args.language } : { language_detection: true }),
        }),
    });
    const body = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
    if (!res.ok || !body?.id) throw new Error(`AssemblyAI ${res.status}: ${body?.error ?? 'submit failed'}`);
    return body.id;
}

export interface TranscriptResult {
    status: 'completed' | 'error' | 'queued' | 'processing';
    text: string;
    error?: string;
    audioDurationSeconds?: number;
}

export async function fetchTranscript(id: string): Promise<TranscriptResult> {
    const key = process.env.ASSEMBLYAI_API_KEY;
    if (!key) throw new Error('ASSEMBLYAI_API_KEY is not set');
    const res = await fetch(`${API}/transcript/${encodeURIComponent(id)}`, { headers: { authorization: key } });
    const body = (await res.json().catch(() => null)) as {
        status?: TranscriptResult['status'];
        text?: string;
        error?: string;
        audio_duration?: number;
        utterances?: Array<{ speaker: string; text: string }> | null;
    } | null;
    if (!res.ok || !body?.status) throw new Error(`AssemblyAI ${res.status}: fetch failed`);
    if (body.status === 'completed') {
        void logQuota({ provider: 'assemblyai', operation: 'share.transcribe', quantity: Math.round((body.audio_duration ?? 0) / 60) });
    }
    return {
        status: body.status,
        text: formatTranscript(body.text ?? '', body.utterances ?? null),
        error: body.error,
        audioDurationSeconds: body.audio_duration,
    };
}

/** One speaker: plain paragraphs. Several speakers: one paragraph per turn. */
export function formatTranscript(text: string, utterances: Array<{ speaker: string; text: string }> | null): string {
    if (utterances && new Set(utterances.map((u) => u.speaker)).size > 1) {
        return utterances.map((u) => `Speaker ${u.speaker}: ${u.text.trim()}`).join('\n\n');
    }
    if (utterances && utterances.length > 1) return utterances.map((u) => u.text.trim()).join('\n\n');
    return text.trim();
}

/** Delete the transcript and its audio copy on AssemblyAI's side once we have it. */
export async function deleteRemoteTranscript(id: string): Promise<void> {
    const key = process.env.ASSEMBLYAI_API_KEY;
    if (!key) return;
    await fetch(`${API}/transcript/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { authorization: key } }).catch(() => undefined);
}
