/**
 * Pins which videos syncExperiencerProfile links to an existing profile. Older
 * videos with the same full name used to stay unlinked, leaving profile pages
 * short (Evan Mecham showed 1 of his 4 videos, Nov 2026).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
    generateExperiencerProfile: vi.fn(),
}));

vi.mock('@/lib/pipeline/experiencer-profile', () => ({
    generateExperiencerProfile: h.generateExperiencerProfile,
}));
vi.mock('../../src/lib/pipeline/experiencer-profile', () => ({
    generateExperiencerProfile: h.generateExperiencerProfile,
}));

import { syncExperiencerProfile } from '@/lib/pipeline/experiencer-sync';

function fakeSupabase(profile: { id: number; slug: string; full_name: string; video_ids: string[] }, sameName: string[]) {
    const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
    const videoQuery = vi.fn();
    const from = vi.fn((table: string) => {
        if (table === 'experiencer_profiles') {
            return {
                select: () => ({
                    ilike: () => ({ limit: () => ({ maybeSingle: async () => ({ data: profile }) }) }),
                }),
                update,
            };
        }
        videoQuery();
        return {
            select: () => ({
                ilike: () => ({ in: async () => ({ data: sameName.map((videoId) => ({ videoId })) }) }),
            }),
        };
    });
    return { client: { from } as any, update, videoQuery };
}

beforeEach(() => {
    vi.clearAllMocks();
    h.generateExperiencerProfile.mockResolvedValue({ status: 'success', message: 'ok' });
});

describe('syncExperiencerProfile — existing profile', () => {
    it('links the new video and older videos with the same full name', async () => {
        const { client, update } = fakeSupabase(
            { id: 1, slug: 'evan-mecham', full_name: 'Evan Mecham', video_ids: ['a'] },
            ['a', 'b', 'c', 'new'],
        );

        const result = await syncExperiencerProfile(client, 'Evan Mecham', 'new');

        expect(update).toHaveBeenCalledWith(expect.objectContaining({ video_ids: ['a', 'new', 'b', 'c'] }));
        expect(result).toMatchObject({ updated: true, videoCount: 4 });
        expect(h.generateExperiencerProfile).toHaveBeenCalledWith(client, 1);
    });

    it('picks up missed same-name videos even when this video is already linked', async () => {
        const { client, update } = fakeSupabase(
            { id: 1, slug: 'evan-mecham', full_name: 'Evan Mecham', video_ids: ['a'] },
            ['a', 'b'],
        );

        await syncExperiencerProfile(client, 'Evan Mecham', 'a');

        expect(update).toHaveBeenCalledWith(expect.objectContaining({ video_ids: ['a', 'b'] }));
    });

    it('does not rewrite video_ids when nothing is missing', async () => {
        const { client, update } = fakeSupabase(
            { id: 1, slug: 'evan-mecham', full_name: 'Evan Mecham', video_ids: ['a', 'b'] },
            ['a', 'b'],
        );

        const result = await syncExperiencerProfile(client, 'Evan Mecham', 'b');

        expect(update).not.toHaveBeenCalled();
        expect(result).toMatchObject({ updated: false, videoCount: 2 });
    });

    it('links only the new video for a single-word name', async () => {
        const { client, update, videoQuery } = fakeSupabase(
            { id: 2, slug: 'dave', full_name: 'Dave', video_ids: ['a'] },
            ['a', 'someone-elses-video'],
        );

        await syncExperiencerProfile(client, 'Dave', 'new');

        expect(videoQuery).not.toHaveBeenCalled();
        expect(update).toHaveBeenCalledWith(expect.objectContaining({ video_ids: ['a', 'new'] }));
    });
});
