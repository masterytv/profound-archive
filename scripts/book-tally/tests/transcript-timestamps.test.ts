import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { main as exportReview } from '../job1/export-review';
import { parseCsv } from '../job1/csv';
import { alignTimestamp } from '../lib/quote';
import { fetchTranscripts, parseTimestampedSegments } from '../lib/transcript';
import { fakeDb, type Row } from './job1-fakes';

// Synthetic captions only.
const SEGS = [
  { start: 0, duration: 2, text: 'so I was in the hospital' },
  { start: 12.5, duration: 3, text: 'and my name is Zed Quark' },
  { start: 15.5, duration: 3, text: 'and I felt myself rise up' },
];
const QUOTE = 'my name is Zed Quark and I felt';

const shapes: Record<string, unknown> = {
  'A {data:[...]}': { data: SEGS },
  'B bare array': SEGS,
  'C string of A': JSON.stringify({ data: SEGS }),
  'C string of B': JSON.stringify(SEGS),
  'C double-encoded A': JSON.stringify(JSON.stringify({ data: SEGS })),
};

describe('parseTimestampedSegments (port of the app parser)', () => {
  for (const [name, raw] of Object.entries(shapes)) {
    it(`handles shape ${name}, also through alignTimestamp`, () => {
      const segs = parseTimestampedSegments(raw);
      expect(segs).toEqual(SEGS);
      expect(alignTimestamp(QUOTE, segs)).toBe(12.5);
    });
  }
  it('returns null for null, empty, garbage strings, scalars and objects without a data array', () => {
    for (const raw of [null, undefined, '', 'not json', '"just a string"', 42, true, {}, { data: 'x' }, { rows: [] }]) {
      expect(parseTimestampedSegments(raw)).toBeNull();
    }
  });
  it('skips malformed elements, coerces numeric strings, keeps the good ones', () => {
    const raw = { data: [null, 7, 'x', [], { start: 1 }, { start: 'abc', text: 'bad start' }, { start: NaN, text: 'nan' }, { start: '4.5', duration: '2', text: 'good one' }, { start: 9, text: 'no duration' }] };
    expect(parseTimestampedSegments(raw)).toEqual([
      { start: 4.5, duration: 2, text: 'good one' },
      { start: 9, duration: 0, text: 'no duration' },
    ]);
  });
  it('an empty array is an empty segment list (not null); alignTimestamp then finds nothing', () => {
    expect(parseTimestampedSegments([])).toEqual([]);
    expect(alignTimestamp(QUOTE, parseTimestampedSegments({ data: [] }))).toBeNull();
  });
});

describe('fetchTranscripts attaches parsed segments for every stored shape', () => {
  it('works through the mock DB', async () => {
    const rows: Row[] = Object.entries(shapes).map(([, raw], i) => ({ videoId: `v${i}`, subtitles_punctuated: 'text '.repeat(10), raw_timestamped_subtitles: raw }));
    rows.push({ videoId: 'vNull', subtitles_punctuated: 'text '.repeat(10), raw_timestamped_subtitles: null });
    const fake = fakeDb({ nde_vids: rows });
    const got = new Map<string, unknown>();
    for await (const page of fetchTranscripts(fake.db, rows.map((r) => r.videoId as string), { withTimestamps: true })) {
      for (const t of page.transcripts) got.set(t.videoId, t.timestamped);
    }
    for (let i = 0; i < Object.keys(shapes).length; i++) expect(got.get(`v${i}`)).toEqual(SEGS);
    expect(got.get('vNull')).toBeNull();
  });
});

describe('Job 1 review sheet timestamps (export-review name extractions) for every stored shape', () => {
  for (const [name, raw] of Object.entries(shapes)) {
    it(`youtube link carries &t=12s for shape ${name}`, async () => {
      const fake = fakeDb({
        experiencer_profiles: [],
        nde_analysis: [{ video_id: 'u1', experience_type: 'nde' }],
        nde_vids: [{ videoId: 'u1', title: 't', channelName: 'c', channelId: 'c', experiencerFullName: null, subtitles_punctuated: 'text '.repeat(10), raw_timestamped_subtitles: raw }],
        bt_name_extractions: [{ id: 1, run_id: 'r', video_id: 'u1', name: 'Zed Quark', quote: QUOTE, quote_verified: true, name_in_quote: true, valid: true, error: null }],
      });
      const dir = mkdtempSync(path.join(tmpdir(), 'ts-'));
      await exportReview([], { db: fake.db, log: () => undefined, outDir: dir, now: () => new Date('2026-11-18T10:00:00Z') });
      const rows = parseCsv(readFileSync(path.join(dir, 'name_extractions_review.csv'), 'utf8')).rows;
      expect(rows).toHaveLength(1);
      expect(rows[0].youtube_url).toBe('https://www.youtube.com/watch?v=u1&t=12s');
    });
  }
});
