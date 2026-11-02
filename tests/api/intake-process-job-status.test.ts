/**
 * Pins how POST /api/intake/process ends a job. jobs_status_check rejects any
 * pipeline status other than 'complete' and 'failed', and a job left at
 * 'processing' makes the admin intake page poll forever (Nov 2026).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
    processVideoIntake: vi.fn(),
    update: vi.fn(),
}));

vi.mock('@/lib/pipeline/intake', () => ({
    processVideoIntake: h.processVideoIntake,
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            update: vi.fn((payload: Record<string, unknown>) => ({
                eq: vi.fn(() => h.update(payload)),
            })),
        })),
    })),
}));

import { POST } from '@/app/api/intake/process/route';

const post = () =>
    POST(new Request('https://example.org/api/intake/process', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
        body: JSON.stringify({ jobId: 'job-1', url: 'https://youtu.be/vid-1' }),
    }));

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-key');
    h.update.mockResolvedValue({ error: null });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('POST /api/intake/process — job end state', () => {
    it.each(['already_exists', 'not_profound', 'no_captions', 'caption_fetch_failed', 'is_short', 'complete'])(
        'saves pipeline status %s as complete and keeps the outcome in result',
        async (status) => {
            const result = { status, videoId: 'vid-1', steps: [] };
            h.processVideoIntake.mockResolvedValue(result);

            const res = await post();

            expect(res.status).toBe(200);
            expect(h.update).toHaveBeenCalledTimes(1);
            expect(h.update.mock.calls[0][0]).toMatchObject({ status: 'complete', result });
        },
    );

    it('saves a failed pipeline as failed', async () => {
        h.processVideoIntake.mockResolvedValue({ status: 'failed', videoId: 'vid-1', steps: [], error: 'boom' });

        await post();

        expect(h.update.mock.calls[0][0]).toMatchObject({ status: 'failed', error_message: 'boom' });
    });

    it('marks the job failed and returns 500 when saving the result fails', async () => {
        h.processVideoIntake.mockResolvedValue({ status: 'complete', videoId: 'vid-1', steps: [] });
        h.update.mockResolvedValueOnce({ error: { message: 'violates check constraint' } });

        const res = await post();

        expect(res.status).toBe(500);
        expect(h.update).toHaveBeenCalledTimes(2);
        expect(h.update.mock.calls[1][0]).toMatchObject({
            status: 'failed',
            error_message: 'Failed to save job result: violates check constraint',
        });
    });
});
