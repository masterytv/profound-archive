/**
 * Privacy guarantees for Share Your Experience: public pages, the channel
 * directory and emails must never carry contact details or account ids, and
 * an anonymous person's own voice is never exposed.
 */
import { describe, expect, it } from 'vitest';
import { PUBLIC_COLUMNS, toPublicStory, type StoryRow } from '@/lib/share/public';
import { toDirectoryEntry } from '@/lib/share/channels';
import { draftSchema } from '@/lib/share/stories';
import { escapeHtml, introRequestEmail, channelInviteEmail } from '@/lib/share/emails';
import { imagePrompt, youtubeMeta } from '@/lib/share/jobs';
import { verifySvix } from '@/lib/share/svix';
import { createHmac } from 'crypto';

const row: StoryRow = {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'my-story-abcd1234',
    status: 'published',
    display_mode: 'anonymous',
    // A story that doesn't share the full name only ever stores the name chosen
    // to show instead (or null); the full name is never written to it.
    display_name: null,
    anon_number: 104,
    experience_type: 'nde',
    title: 'A light',
    year_approx: 1998,
    country: 'Ireland',
    region: 'Western Europe',
    language: 'en',
    media_kind: 'audio',
    media_path: 'user-uuid/story/original-voice.webm',
    body_text: 'Text',
    summary: 'Summary',
    narration_path: null,
    image_url: null,
    experiencer_profile_id: 9,
    published_at: '2026-11-09T00:00:00Z',
    updated_at: '2026-11-09T00:00:00Z',
    youtube_video_id: null,
    youtube_status: 'pending',
    is_test: false,
};

describe('public story whitelist', () => {
    it('never selects account, contact or raw-text columns', () => {
        const cols = PUBLIC_COLUMNS.split(',').map((c) => c.trim());
        for (const forbidden of ['user_id', 'email', 'phone', 'original_text', 'transcript_id', 'media_mime', 'processing_error', '*']) {
            expect(cols).not.toContain(forbidden);
        }
    });

    it('stories without the full name expose no country and no profile link', () => {
        const s = toPublicStory(row);
        const json = JSON.stringify(s);
        expect(s.displayName).toBe('Anonymous #104');
        expect(json).not.toContain('Ireland');
        expect(s.place).toBe('Western Europe');
        expect(s.experiencerProfileId).toBeNull();
        // Their own recording is published (only the name is withheld).
        expect(s.listenPath).toBe(row.media_path);
        expect(toPublicStory({ ...row, display_name: 'Maria' }).displayName).toBe('Maria');
    });

    it('named stories show the name and country', () => {
        const s = toPublicStory({ ...row, display_mode: 'named', display_name: 'Maria L.' });
        expect(s.displayName).toBe('Maria L.');
        expect(s.place).toBe('Ireland');
        expect(s.listenPath).toBe(row.media_path);
        expect(s.experiencerProfileId).toBe(9);
    });
});

describe('channel directory entry', () => {
    it('contains only directory fields', () => {
        const e = toDirectoryEntry(
            { ...row, appearance_pref: 'camera', intro_mode: 'all' } as Parameters<typeof toDirectoryEntry>[0],
            [{ channel_id: 'UC1', channel_name: 'Chan' }],
        );
        expect(Object.keys(e).sort()).toEqual(
            ['appearancePref', 'displayName', 'eligibleChannels', 'experienceType', 'language', 'place', 'publishedAt', 'slug', 'storyId', 'summary', 'title'].sort(),
        );
        expect(e.displayName).toBe('Anonymous #104');
        expect(JSON.stringify(e)).not.toContain('Ireland');
    });
});

describe('draft validation', () => {
    const ok = { display_mode: 'named', display_name: 'Maria', experience_type: 'nde', media_kind: 'audio' } as const;
    it('accepts a valid named audio draft', () => {
        expect(draftSchema.safeParse(ok).success).toBe(true);
    });
    it('allows video without the full name, with or without a shown name', () => {
        expect(draftSchema.safeParse({ ...ok, display_mode: 'anonymous', display_name: null, media_kind: 'video' }).success).toBe(true);
        expect(draftSchema.safeParse({ ...ok, display_mode: 'anonymous', display_name: 'Maria', media_kind: 'video' }).success).toBe(true);
    });
    it('requires a name for named stories', () => {
        expect(draftSchema.safeParse({ ...ok, display_name: '' }).success).toBe(false);
    });
    it('requires text for typed stories, and channels for "selected"', () => {
        expect(draftSchema.safeParse({ ...ok, media_kind: 'text', text: 'short' }).success).toBe(false);
        expect(draftSchema.safeParse({ ...ok, intro_mode: 'selected', intro_channel_ids: [] }).success).toBe(false);
    });
});

describe('emails', () => {
    it('escapes channel-supplied text', () => {
        expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
        const mail = introRequestEmail({ to: 'person@example.com', token: 'tok', channelName: '<b>Evil</b>', note: '<img src=x>' });
        expect(mail.html).not.toContain('<img src=x>');
        expect(mail.html).not.toContain('<b>Evil</b>');
    });
    it('intro request goes only to the experiencer and contains no member address', () => {
        const mail = introRequestEmail({ to: 'person@example.com', token: 'tok', channelName: 'Chan', note: 'Hello there, we would love to talk.' });
        expect(mail.to).toEqual(['person@example.com']);
        expect(mail.html).toContain('/share/intro/tok?choice=accept');
    });
    it('invite link carries the token', () => {
        expect(channelInviteEmail('a@b.co', 'T0K', ['Chan']).text).toContain('/channels/join?token=T0K');
    });
});

describe('daily job content', () => {
    it('image prompts never include the story', () => {
        expect(imagePrompt('nde')).not.toMatch(/Secret|Ireland/);
        expect(imagePrompt('unknown')).toContain('Subject:');
    });
    it('YouTube descriptions disclose synthetic voices and never name anonymous people', () => {
        const meta = youtubeMeta({ ...row, summary: 'S', title: 'T' }, true);
        expect(meta.title).toBe('T | Anonymous #104');
        expect(meta.description).toContain('synthetic');
        expect(meta.description).toContain('by Anonymous #104');
        expect(meta.title.length).toBeLessThanOrEqual(100);
    });
});

describe('Resend (Svix) webhook signature', () => {
    const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
    const sign = (id: string, ts: number, body: string) =>
        'v1,' + createHmac('sha256', Buffer.from('test-secret-key')).update(`${id}.${ts}.${body}`).digest('base64');

    it('accepts a valid, fresh signature and rejects tampering or replay', () => {
        const ts = 1_800_000_000;
        const body = '{"type":"email.opened"}';
        const headers = (sig: string, t = ts) => new Headers({ 'svix-id': 'msg_1', 'svix-timestamp': String(t), 'svix-signature': sig });
        expect(verifySvix(secret, headers(sign('msg_1', ts, body)), body, ts)).toBe(true);
        expect(verifySvix(secret, headers(sign('msg_1', ts, body)), body + ' ', ts)).toBe(false);
        expect(verifySvix(secret, headers(sign('msg_1', ts, body)), body, ts + 3600)).toBe(false);
        expect(verifySvix(secret, headers('v1,AAAA'), body, ts)).toBe(false);
    });
});

describe('introduction preferences (after publishing)', () => {
    it('requires at least one channel when choosing specific channels', async () => {
        const { introPrefsSchema } = await import('@/lib/share/stories');
        expect(introPrefsSchema.safeParse({ intro_mode: 'selected', channel_ids: [] }).success).toBe(false);
        expect(introPrefsSchema.safeParse({ intro_mode: 'selected', channel_ids: ['UC1'] }).success).toBe(true);
        expect(introPrefsSchema.safeParse({ intro_mode: 'all', phone: '555 0100' }).success).toBe(true);
        expect(introPrefsSchema.safeParse({ intro_mode: 'none' }).success).toBe(true);
        expect(introPrefsSchema.safeParse({ intro_mode: 'all', phone: 'x'.repeat(41) }).success).toBe(false);
    });
});

describe('channel references typed by an admin', () => {
    it('accepts YouTube links, @handles and channel IDs', async () => {
        const { normalizeChannelRef } = await import('@/lib/share/channels');
        expect(normalizeChannelRef('https://www.youtube.com/@projectprofound')).toBe('@projectprofound');
        expect(normalizeChannelRef('@ProjectProfound')).toBe('@projectprofound');
        expect(normalizeChannelRef('https://www.youtube.com/channel/UCbtV5L8TVB0zQ9khThGApLw')).toBe('UCbtV5L8TVB0zQ9khThGApLw');
        expect(normalizeChannelRef('not a url with spaces')).toBeNull();
    });
});
