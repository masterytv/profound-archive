import { describe, expect, it } from 'vitest';
import { splitSections, assembleText, storySlug, publicDisplayName, slugify } from '@/lib/share/text';
import { libraryFormats, needsNarration } from '@/lib/share/library';
import { storyNeedsCrisisHold } from '@/lib/share/crisis';
import { hashToken, newToken, sameHash } from '@/lib/share/tokens';
import { formatTranscript } from '@/lib/share/assemblyai';
import { normalizeExtracted } from '@/lib/share/extract';

describe('share text helpers', () => {
    it('splits paragraphs into sections and reassembles accepted edits only', () => {
        const text = 'First paragraph.\n\nSecond paragraph.';
        const sections = splitSections(text, 10);
        expect(sections).toEqual(['First paragraph.', 'Second paragraph.']);
        const out = assembleText(sections, [
            { section_index: 0, suggested: 'First, edited.', status: 'accepted' },
            { section_index: 1, suggested: 'Second, edited.', status: 'rejected' },
        ]);
        expect(out).toBe('First, edited.\n\nSecond paragraph.');
    });

    it('treats pending suggestions as not accepted', () => {
        expect(assembleText(['A.'], [{ section_index: 0, suggested: 'B.', status: 'pending' }])).toBe('A.');
    });

    it('splits a wall of text without blank lines on sentences', () => {
        const wall = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
        const sections = splitSections(wall, 300);
        expect(sections.length).toBeGreaterThan(3);
        expect(sections.join(' ').replace(/\s+/g, ' ')).toBe(wall);
    });

    it('makes unguessable slugs with a readable stem', () => {
        const a = storySlug('The Light at the End!');
        const b = storySlug('The Light at the End!');
        expect(a).toMatch(/^the-light-at-the-end-[a-z0-9]{8}$/);
        expect(a).not.toBe(b);
        expect(slugify('Ça va — très bien')).toBe('ca-va-tres-bien');
    });

    it('shows a name only for named stories', () => {
        expect(publicDisplayName({ display_mode: 'named', display_name: 'Maria L.', anon_number: 7 })).toBe('Maria L.');
        expect(publicDisplayName({ display_mode: 'anonymous', display_name: 'Maria L.', anon_number: 7 })).toBe('Anonymous #7');
    });
});

describe('library tabs (Watch / Listen / Read)', () => {
    const base = { body_text: 'Some text', narration_path: null as string | null, media_path: 'u/s/orig.webm' };

    it('named video appears in all three, with the original media', () => {
        const f = libraryFormats({ ...base, display_mode: 'named', media_kind: 'video' });
        expect(f.tabs).toEqual(['watch', 'listen', 'read']);
        expect(f.watch).toBe('u/s/orig.webm');
        expect(f.listenIsSynthetic).toBe(false);
    });

    it('named audio appears in Listen (original) and Read', () => {
        const f = libraryFormats({ ...base, display_mode: 'named', media_kind: 'audio' });
        expect(f.tabs).toEqual(['listen', 'read']);
        expect(f.listen).toBe('u/s/orig.webm');
    });

    it('anonymous audio NEVER publishes the original voice', () => {
        const before = libraryFormats({ ...base, display_mode: 'anonymous', media_kind: 'audio' });
        expect(before.listen).toBeNull();
        expect(before.tabs).toEqual(['read']);
        const after = libraryFormats({ ...base, narration_path: 'u/s/narration-1.mp3', display_mode: 'anonymous', media_kind: 'audio' });
        expect(after.listen).toBe('u/s/narration-1.mp3');
        expect(after.listenIsSynthetic).toBe(true);
        expect(after.watch).toBeNull();
    });

    it('text stories are Read, plus a labelled synthetic Listen once narrated', () => {
        expect(libraryFormats({ ...base, media_path: null, display_mode: 'named', media_kind: 'text' }).tabs).toEqual(['read']);
        const f = libraryFormats({ ...base, media_path: null, narration_path: 'n.mp3', display_mode: 'named', media_kind: 'text' });
        expect(f.tabs).toEqual(['listen', 'read']);
        expect(f.listenIsSynthetic).toBe(true);
    });

    it('knows which stories need narration', () => {
        expect(needsNarration({ ...base, display_mode: 'named', media_kind: 'video' })).toBe(false);
        expect(needsNarration({ ...base, display_mode: 'named', media_kind: 'audio' })).toBe(false);
        expect(needsNarration({ ...base, display_mode: 'anonymous', media_kind: 'audio' })).toBe(true);
        expect(needsNarration({ ...base, display_mode: 'named', media_kind: 'text' })).toBe(true);
        expect(needsNarration({ ...base, narration_path: 'x', display_mode: 'named', media_kind: 'text' })).toBe(false);
    });
});

describe('crisis hold', () => {
    it('triggers on crisis wording anywhere in a long story', () => {
        const story = `It was a normal day.\n\n${'Lots of detail. '.repeat(200)}\n\nThat night I tried to end my life.`;
        expect(storyNeedsCrisisHold(story)).toBe(true);
    });
    it('does not trigger on ordinary stories', () => {
        expect(storyNeedsCrisisHold('My heart stopped during surgery and I saw a light.')).toBe(false);
        expect(storyNeedsCrisisHold(null)).toBe(false);
    });
});

describe('tokens', () => {
    it('stores only a hash and compares in constant time', () => {
        const t = newToken();
        expect(t.length).toBeGreaterThanOrEqual(43);
        expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
        expect(sameHash(hashToken(t), hashToken(t))).toBe(true);
        expect(sameHash(hashToken(t), hashToken(newToken()))).toBe(false);
    });
});

describe('transcripts and extracted text', () => {
    it('labels speakers only when there are several', () => {
        expect(formatTranscript('a b', [{ speaker: 'A', text: 'Hello.' }, { speaker: 'B', text: 'Hi.' }])).toBe('Speaker A: Hello.\n\nSpeaker B: Hi.');
        expect(formatTranscript('Hello there.', [{ speaker: 'A', text: 'Hello there.' }])).toBe('Hello there.');
    });
    it('normalizes extracted text', () => {
        expect(normalizeExtracted('a\r\n\r\n\r\n\r\nb  \n\u0000c')).toBe('a\n\nb\nc');
    });
});
