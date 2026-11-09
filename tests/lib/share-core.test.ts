import { describe, expect, it } from 'vitest';
import { splitSections, assembleText, storySlug, publicDisplayName, slugify, restoreParagraphs } from '@/lib/share/text';
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

    it('shows the full name, the chosen name, or Anonymous #N', () => {
        expect(publicDisplayName({ display_mode: 'named', display_name: 'Maria Lopez', anon_number: 7 })).toBe('Maria Lopez');
        expect(publicDisplayName({ display_mode: 'anonymous', display_name: 'Maria', anon_number: 7 })).toBe('Maria');
        expect(publicDisplayName({ display_mode: 'anonymous', display_name: null, anon_number: 7 })).toBe('Anonymous #7');
        expect(publicDisplayName({ display_mode: 'anonymous', display_name: '  ', anon_number: 7 })).toBe('Anonymous #7');
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

    it('not sharing the full name does not change the formats (Tom, 2026-11-09)', () => {
        const audio = libraryFormats({ ...base, display_mode: 'anonymous', media_kind: 'audio' });
        expect(audio.tabs).toEqual(['listen', 'read']);
        expect(audio.listenIsSynthetic).toBe(false);
        const video = libraryFormats({ ...base, display_mode: 'anonymous', media_kind: 'video' });
        expect(video.tabs).toEqual(['watch', 'listen', 'read']);
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
        expect(needsNarration({ ...base, display_mode: 'anonymous', media_kind: 'audio' })).toBe(false);
        expect(needsNarration({ ...base, display_mode: 'anonymous', media_kind: 'text' })).toBe(true);
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

describe('model text clean-up', () => {
    it('turns double-escaped line breaks from Gemini into real ones', async () => {
        const { unescapeModelText } = await import('@/lib/share/suggestions');
        expect(unescapeModelText('This is a long story.\\n\\nI want to start')).toBe('This is a long story.\n\nI want to start');
        expect(unescapeModelText('a\\r\\nb\\n\\n\\n\\nc')).toBe('a\nb\n\nc');
        expect(unescapeModelText('already\n\nfine')).toBe('already\n\nfine');
    });
});

describe('restoreParagraphs (Gemini merged the paragraphs)', () => {
    const original = [
        'this is a long story.',
        "I want to start off by saying I didn't believe this could happen to me.",
        'I took too mch asprin and it gave me a headache. Then i passed out and hit my head. Then i saw my body from above. Then I entered a long tunnel of light.',
        'Eventually i met these beings of light. They were amazig and loving. They told me I had to go back.',
        "I didn't want to go back but they said I had agreed to it in order to learn.",
        'When I got back I was in my body in complete pain.',
        "But since that encounter I've been ore  loving to everyon in my lufe",
    ].join('\n\n');
    const merged =
        "This is a long story. I want to start off by saying I didn't believe this could happen to me. I took too much aspirin and it gave me a headache. Then I passed out and hit my head. Then I saw my body from above. Then I entered a long tunnel of light. Eventually I met these beings of light. They were amazing and loving. They told me I had to go back. I didn't want to go back but they said I had agreed to it in order to learn. When I got back I was in my body in complete pain. But since that encounter I've been more loving to everyone in my life.";

    it("puts Tom's seven paragraphs back", () => {
        const fixed = restoreParagraphs(original, merged).split('\n\n');
        expect(fixed).toHaveLength(7);
        expect(fixed[0]).toBe('This is a long story.');
        expect(fixed[2]).toBe('I took too much aspirin and it gave me a headache. Then I passed out and hit my head. Then I saw my body from above. Then I entered a long tunnel of light.');
        expect(fixed[6]).toBe("But since that encounter I've been more loving to everyone in my life.");
    });
    it('leaves the suggestion alone when it already has the paragraphs, or sentences do not line up', () => {
        expect(restoreParagraphs('A.\n\nB.', 'A!\n\nB!')).toBe('A!\n\nB!');
        expect(restoreParagraphs('One. Two.\n\nThree.', 'One two three.')).toBe('One two three.');
        expect(restoreParagraphs('Just one paragraph.', 'Just one paragraph, edited.')).toBe('Just one paragraph, edited.');
    });
});
