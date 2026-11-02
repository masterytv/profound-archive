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

type VideoRow = { videoId: string; title: string; description: string; channelName: string };

function fakeSupabase(profile: { id: number; slug: string; full_name: string; video_ids: string[] }, sameName: (string | VideoRow)[]) {
    const rows = sameName.map((v) =>
        typeof v === 'string' ? { videoId: v, title: `Talk with ${profile.full_name}`, description: '', channelName: 'IANDS' } : v);
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
                ilike: () => ({ in: async () => ({ data: rows }) }),
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

    it('leaves out same-name videos that do not name the person, like interviews they host', async () => {
        const channel = 'Pegi Robinson - NDE TV';
        const { client, update } = fakeSupabase(
            { id: 3, slug: 'pegi-robinson', full_name: 'Pegi Robinson', video_ids: ['a'] },
            [
                { videoId: 'guest-interview', title: 'NDE TV presents Trapper Jack', description: 'Hosted by Pegi Robinson', channelName: channel },
                { videoId: 'own-story', title: 'NDE TV Host Pegi Robinson sharing her NDE', description: '', channelName: channel },
                { videoId: 'named-in-description', title: 'She drowned at five', description: 'Pegi Robinson shares her story', channelName: 'IANDS' },
                { videoId: 'not-named', title: 'She drowned at five', description: '', channelName: 'IANDS' },
            ],
        );

        await syncExperiencerProfile(client, 'Pegi Robinson', 'new');

        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            video_ids: ['a', 'new', 'own-story', 'named-in-description'],
        }));
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
