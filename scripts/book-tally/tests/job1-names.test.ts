import { describe, expect, it } from 'vitest';
import { checkExtraction, createSelfNameLinks } from '../job1/extract-names';
import { nameInQuote, selfIntroducerBefore, SELF_INTRODUCERS, type ProfileRow } from '../job1/logic';
import { makeCtx } from '../job1/cli';
import { fakeDb } from './job1-fakes';

const TRANSCRIPT = `So thank you for having me today. Hi, I'm Pat O'Brien, and this is the story of the night my heart stopped.
My daughter was in the room with me. We lived in Dayton back then, and it was a cold winter.`;

describe('nameInQuote', () => {
  it('requires the name tokens, contiguous, inside the normalized quote', () => {
    expect(nameInQuote('Pat OBrien', "Hi, I'm Pat O'Brien, and this is the story")).toBe(true); // apostrophes are deleted by lib/quote
    expect(nameInQuote('Pat Obrian', "Hi, I'm Pat O'Brien, and this is the story")).toBe(false); // spelled differently
    expect(nameInQuote("Pat O'Brien", "Hi, I'm Pat O'Brien, and this is the story")).toBe(true);
    expect(nameInQuote('Jane Smith', 'my name is Jane Smith and I am from Ohio')).toBe(true);
    expect(nameInQuote('jane smith', 'My name is JANE   SMITH.')).toBe(true);
  });
  it('rejects names not in the quote, split names, and empty names', () => {
    expect(nameInQuote('Jane Smith', 'my name is Jane and I am Smith from Ohio')).toBe(false);
    expect(nameInQuote('Jane Smith', 'my name is Janet Smithson and I live in Ohio')).toBe(false);
    expect(nameInQuote('Dr.', 'my name is Jane Smith')).toBe(false);
    expect(nameInQuote('', 'x')).toBe(false);
  });
  it('honorifics on the name are ignored; accents folded', () => {
    expect(nameInQuote('Dr. Jane Smith', 'my name is Jane Smith and I am from Ohio')).toBe(true);
    expect(nameInQuote('José Núñez', 'hola my name is Jose Nunez and I live in Texas')).toBe(true);
  });
});

describe('selfIntroducerBefore (first-person introducer immediately before the name)', () => {
  it('accepts each introducer; "I\'m" normalizes to "im" (apostrophes deleted)', () => {
    for (const intro of ['My name is', "My name's", "I'm", 'Im', 'I am', 'This is', 'Call me', 'They call me', 'hello and I am', 'well, my name is']) {
      expect(selfIntroducerBefore('Jane Smith', `${intro} Jane Smith and I live in Ohio`), intro).toBe(true);
    }
    expect(SELF_INTRODUCERS).toContain('i m');
  });
  it('skips honorifics between the introducer and the name', () => {
    expect(selfIntroducerBefore('Jane Smith', 'my name is Dr. Jane Smith and I live in Ohio')).toBe(true);
  });
  it('rejects a name that is merely mentioned (host introduction, thanks, other people)', () => {
    for (const q of ['my guest today is Jane Smith and she lives in Ohio', 'thank you so much Jane Smith for coming on today', 'my daughter Jane Smith was in the room', 'her name is Jane Smith and she told me']) {
      expect(selfIntroducerBefore('Jane Smith', q), q).toBe(false);
    }
  });
  it('requires the introducer IMMEDIATELY before; any occurrence of the name may satisfy it', () => {
    expect(selfIntroducerBefore('Jane Smith', 'my name is really Jane Smith and I live in Ohio')).toBe(false);
    expect(selfIntroducerBefore('Jane Smith', 'Jane Smith said hello and then I am Jane Smith myself')).toBe(true);
  });
});

describe('checkExtraction', () => {
  it("quote verifies and contains the name but it is not self-introduced -> quote_verified=false, error 'no_self_introducer'", () => {
    const tr = 'The host said thank you so much Jane Smith for coming on today and then I began my story about the accident.';
    const c = checkExtraction({ name: 'Jane Smith', quote: 'thank you so much Jane Smith for coming on today' }, tr);
    expect(c).toMatchObject({ valid: true, quote_verified: false, name_in_quote: true, error: 'no_self_introducer', name: 'Jane Smith' });
    const ok = checkExtraction({ name: 'Jane Smith', quote: 'Hello my name is Jane Smith and I live in Ohio' }, 'Hello my name is Jane Smith and I live in Ohio near the lake.');
    expect(ok).toMatchObject({ quote_verified: true, error: null });
  });
  it('a bare 4-token self-introduction fails the 5-token minimum (documented limit)', () => {
    const c = checkExtraction({ name: 'Jane Smith', quote: 'I am Jane Smith' }, 'Well I am Jane Smith and this is my story.');
    expect(c.quote_verified).toBe(false);
    expect(c.error).toMatch(/too_short/);
  });
  const ok = "Hi, I'm Pat O'Brien, and this is the story of the night my heart stopped.";
  it('verified quote and name inside the quote', () => {
    const c = checkExtraction({ name: "Pat O'Brien", quote: ok }, TRANSCRIPT);
    expect(c).toMatchObject({ valid: true, quote_verified: true, name_in_quote: true, name: "Pat O'Brien" });
    expect(c.quote_norm_offset).toBeGreaterThanOrEqual(0);
  });
  it('quote not in the transcript -> not verified (never trusted)', () => {
    const c = checkExtraction({ name: 'Pat Brown', quote: 'Hi, I am Pat Brown and this is my story' }, TRANSCRIPT);
    expect(c).toMatchObject({ valid: true, quote_verified: false, name_in_quote: true });
  });
  it('quote verified but name not inside it', () => {
    const c = checkExtraction({ name: 'Mary Jones', quote: ok }, TRANSCRIPT);
    expect(c).toMatchObject({ quote_verified: true, name_in_quote: false });
  });
  it('short quote (<5 tokens) and ellipsis quotes fail verification', () => {
    expect(checkExtraction({ name: 'Pat', quote: "I'm Pat O'Brien" }, TRANSCRIPT).quote_verified).toBe(false);
    expect(checkExtraction({ name: "Pat O'Brien", quote: "Hi, I'm Pat O'Brien ... the night my heart stopped" }, TRANSCRIPT).quote_verified).toBe(false);
  });
  it('null name is valid (nothing stated); name without quote / quote without name are invalid', () => {
    expect(checkExtraction({ name: null, quote: null }, TRANSCRIPT)).toMatchObject({ valid: true, name: null, quote: null });
    expect(checkExtraction({ name: 'Pat', quote: null }, TRANSCRIPT).valid).toBe(false);
    expect(checkExtraction({ name: null, quote: ok }, TRANSCRIPT).valid).toBe(false);
    expect(checkExtraction({ name: '  ', quote: ok }, TRANSCRIPT).valid).toBe(false);
  });
});

describe('createSelfNameLinks (mock database)', () => {
  const profiles: ProfileRow[] = [{ id: 7, slug: 'p7', full_name: 'Pat OBrien', summary: null, video_ids: [], first_shared_year: null }];
  const ext = (id: number, video_id: string, name: string, over: Record<string, unknown> = {}) => ({
    id, run_id: 'r1', video_id, name, quote: 'q q q q q', quote_verified: true, name_in_quote: true, valid: true, prompt_hash: 'h', model: 'm', ...over,
  });
  it('pending links only for verified multi-token names; first-name-only never joins a named: key; idempotent', async () => {
    const fake = fakeDb({
      nde_vids: ['a', 'b', 'c', 'd', 'e'].map((videoId) => ({ videoId })),
      bt_name_extractions: [
        ext(1, 'a', 'Pat OBrien'), // matches profile 7 exactly
        ext(2, 'b', 'Zed Quark'), // new named person
        ext(3, 'c', 'Sarah'), // first name only
        ext(4, 'd', 'Mary Jones', { quote_verified: false }), // not verified
        ext(5, 'e', 'Lee Roy', { name_in_quote: false }), // name not in quote
      ],
      experiencer_profiles: [{ id: 7 }],
    });
    const ctx = makeCtx({ db: fake.db, log: () => undefined });
    const r1 = await createSelfNameLinks(ctx, 'r1', profiles);
    expect(r1).toMatchObject({ inserted: 2, first_name_only: 1 });
    const links = fake.tables.bt_person_links;
    expect(links.map((l) => [l.video_id, l.person_key, l.source, l.match_level]).sort()).toEqual([
      ['a', 'profile:7', 'transcript_self_name', 'self_name'],
      ['b', 'named:zed quark', 'transcript_self_name', 'self_name'],
    ]);
    expect(links.every((l) => l.name_extraction_id != null)).toBe(true);
    expect(fake.tables.bt_link_decisions ?? []).toEqual([]); // pending: no decision rows
    const r2 = await createSelfNameLinks(ctx, 'r1', profiles);
    expect(r2.inserted).toBe(0);
    expect(fake.tables.bt_person_links).toHaveLength(2);
  });
});
