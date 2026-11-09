/**
 * Share Your Experience: job and webhook routes refuse unauthenticated calls
 * before touching the database.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const buildQueue = vi.fn();
const applyResult = vi.fn();
const runMaintenance = vi.fn();
const completeTranscription = vi.fn();
vi.mock('@/lib/share/jobs', () => ({ buildQueue, applyResult, applyRemovalResult: vi.fn(), runMaintenance }));
vi.mock('@/lib/share/stories', () => ({ completeTranscription }));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => fn() }));

beforeEach(() => {
    vi.clearAllMocks();
    process.env.ASSEMBLYAI_WEBHOOK_SECRET = 'aai-secret';
    buildQueue.mockResolvedValue({ items: [], removals: [] });
});

describe('share job routes', () => {
    it('queue: 401 without the cron secret, 200 with it', async () => {
        const { GET } = await import('@/app/api/share/jobs/queue/route');
        expect((await GET(new Request('https://x/api/share/jobs/queue'))).status).toBe(401);
        expect(buildQueue).not.toHaveBeenCalled();
        const ok = await GET(new Request('https://x/api/share/jobs/queue', { headers: { 'x-cron-secret': 'test-cron-secret' } }));
        expect(ok.status).toBe(200);
    });

    it('result: 401 without secret; 400 on a bad payload', async () => {
        const { POST } = await import('@/app/api/share/jobs/result/route');
        expect((await POST(new Request('https://x', { method: 'POST', body: '{}' }))).status).toBe(401);
        const bad = await POST(new Request('https://x', { method: 'POST', headers: { 'x-cron-secret': 'test-cron-secret' }, body: JSON.stringify({ storyId: 'nope' }) }));
        expect(bad.status).toBe(400);
        expect(applyResult).not.toHaveBeenCalled();
    });

    it('maintenance: 401 without secret', async () => {
        const { POST } = await import('@/app/api/cron/share-maintenance/route');
        expect((await POST(new Request('https://x', { method: 'POST' }))).status).toBe(401);
        expect(runMaintenance).not.toHaveBeenCalled();
    });
});

describe('AssemblyAI webhook', () => {
    it('rejects a missing or wrong secret', async () => {
        const { POST } = await import('@/app/api/share/webhooks/assemblyai/route');
        const body = JSON.stringify({ transcript_id: 'abc123def', status: 'completed' });
        expect((await POST(new Request('https://x', { method: 'POST', body }))).status).toBe(401);
        expect((await POST(new Request('https://x', { method: 'POST', body, headers: { 'x-share-webhook-secret': 'wrong-secret' } }))).status).toBe(401);
        expect(completeTranscription).not.toHaveBeenCalled();
    });

    it('accepts the right secret and processes the transcript', async () => {
        const { POST } = await import('@/app/api/share/webhooks/assemblyai/route');
        const res = await POST(new Request('https://x', { method: 'POST', body: JSON.stringify({ transcript_id: 'abc123def' }), headers: { 'x-share-webhook-secret': 'aai-secret' } }));
        expect(res.status).toBe(200);
        expect(completeTranscription).toHaveBeenCalledWith('abc123def');
    });
});
