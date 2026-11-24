/**
 * The weekly "NDE of the Week" newsletter's pure parts (src/lib/email/weekly.ts), the newsletter lists and the
 * sites allowed to sign people up (src/lib/email/audience.ts, cors.ts), and the shared Story of the Day pick.
 */
import { describe, it, expect } from 'vitest';
import {
  bestOfWeek, bestShortOfWeek, firstParagraph, nextSend, parseChannelFeed, ppWeekly, sendTime, sentences, tagged, weekName,
} from '@/lib/email/weekly';
import { emailForms, isNewsletterList, newsletterSegmentId } from '@/lib/email/audience';
import { seededShuffle, storyOfTheDay } from '@/lib/story-of-the-day';

const entry = (id: string, title: string, published: string, views: number, kind = 'shorts') => `
 <entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/${kind}/${id}"/>
  <published>${published}</published>
  <media:group>
   <media:title>${title}</media:title>
   <media:description>First line about &amp; the story.

Pam Reynolds's full story: https://projectprofound.org/x

#nde</media:description>
   <media:community><media:statistics views="${views}"/></media:community>
  </media:group>
 </entry>`;

const channel = `<feed>${entry('a1', 'Old one', '2026-11-01T17:00:00+00:00', 9000)}${entry('b2', 'She Saw &quot;Light&quot;', '2026-11-16T14:00:00+00:00', 700)}${entry('c3', 'Quiet one', '2026-11-18T14:00:00+00:00', 50)}${entry('d4', 'A long video', '2026-11-17T14:00:00+00:00', 5000, 'watch?v=')}</feed>`;

describe('weekly newsletter content', () => {
  it('reads the channel feed with view counts and picks the week\'s most-watched Short', () => {
    const videos = parseChannelFeed(channel);
    expect(videos).toHaveLength(4);
    expect(videos[1]).toMatchObject({ videoId: 'b2', title: 'She Saw "Light"', views: 700, url: 'https://www.youtube.com/shorts/b2' });
    const now = new Date('2026-11-19T13:17:00Z');
    // a1 is too old, d4 is not a Short: b2 has the most views of the week.
    expect(bestShortOfWeek(videos, now)?.videoId).toBe('b2');
    expect(bestShortOfWeek(videos, new Date('2026-12-30T00:00:00Z'))).toBeNull();
    // Without shortsOnly, a full video counts too: d4 has the most views of the week.
    expect(bestOfWeek(videos, now)?.videoId).toBe('d4');
  });

  it('takes the first paragraph of a description, and the first sentences of a summary', () => {
    expect(firstParagraph('What is the meaning of life?\n\nMore.')).toBe('What is the meaning of life?');
    expect(firstParagraph('https://x.y\n\n#tag')).toBe('');
    expect(firstParagraph('word '.repeat(200), 40).endsWith('…')).toBe(true);
    expect(sentences('One. Two! Three? Four.', 3)).toBe('One. Two! Three?');
  });

  it('tags only our own links, and names the week', () => {
    expect(tagged('https://projectprofound.org/video/x', 'nde-of-the-week-2026-11-19')).toBe(
      'https://projectprofound.org/video/x?utm_source=newsletter&utm_medium=email&utm_campaign=nde-of-the-week-2026-11-19',
    );
    expect(tagged('https://www.youtube.com/shorts/b2', 'c')).toBe('https://www.youtube.com/shorts/b2');
    expect(weekName(new Date('2026-11-23T11:23:00Z'))).toBe('nde-of-the-week-2026-11-23');
  });

  it('leads the subject with the Short, else the story', () => {
    const short = parseChannelFeed(channel)[1];
    const story = { videoId: 'v', title: 'A Story', channelName: null, summary: null };
    const pp = ppWeekly({ short, story });
    expect(pp.subject).toBe('NDE of the Week: She Saw "Light"');
    expect(pp.previewText).toBe('Plus a story from the archive.');
    expect(ppWeekly({ short: null, story }).subject).toBe('NDE of the Week: A Story');
  });

  it('sends at 9:00 am Eastern on the morning it runs, in winter and in summer', () => {
    // Monday 23 Nov 2026, EST (UTC-5): the job runs 6:23 am, the email goes at 9:00 am = 14:00 UTC.
    expect(sendTime(new Date('2026-11-23T11:23:00Z')).toISOString()).toBe('2026-11-23T14:00:00.000Z');
    // Monday 8 Jun 2026, EDT (UTC-4): 9:00 am = 13:00 UTC.
    expect(sendTime(new Date('2026-06-08T11:23:00Z')).toISOString()).toBe('2026-06-08T13:00:00.000Z');
    // Monday 9 Mar 2026, the day after the clocks went forward.
    expect(sendTime(new Date('2026-03-09T11:23:00Z')).toISOString()).toBe('2026-03-09T13:00:00.000Z');
    // A late run (after 9) goes ten minutes later, never in the past.
    expect(sendTime(new Date('2026-11-23T15:00:00Z')).toISOString()).toBe('2026-11-23T15:10:00.000Z');
  });
});

describe('the newsletter lists', () => {
  it('are Project Profound\'s own; Soul Wisdom sign-ups are not taken here', () => {
    expect(isNewsletterList('newsletter_nde')).toBe(true);
    expect(isNewsletterList('newsletter_uap')).toBe(true);
    expect(isNewsletterList('newsletter_swc')).toBe(false);
    expect(isNewsletterList('griever')).toBe(false);
    expect(emailForms(' Ann@Example.com ')).toEqual(['Ann@Example.com', 'ann@example.com']);
    process.env.RESEND_SEGMENT_ID = ' seg-pp ';
    expect(newsletterSegmentId()).toBe('seg-pp');
    delete process.env.RESEND_SEGMENT_ID;
    expect(newsletterSegmentId()).toBeNull();
  });
});

describe('story of the day', () => {
  it('is the same all day and changes the next day', () => {
    const pool = Array.from({ length: 100 }, (_, i) => i);
    const day = Date.UTC(2026, 10, 19);
    expect(storyOfTheDay(pool, day + 1000)).toBe(storyOfTheDay(pool, day + 80_000_000));
    expect(seededShuffle(pool, 1)).not.toEqual(seededShuffle(pool, 2));
    expect(storyOfTheDay([], day)).toBeNull();
  });
});

describe('the weekly emails', () => {
  it('renders PP\'s with the Short, the story and one podcast line', async () => {
    const { render } = await import('@react-email/render');
    const { NdeOfTheWeekEmail } = await import('@/lib/email/templates/NdeOfTheWeekEmail');
    const content = ppWeekly({
      short: parseChannelFeed(channel)[1],
      story: { videoId: 'v9', title: 'The Story', channelName: 'NDE Channel', summary: 'One. Two. Three. Four.' },
    });
    const html = await render(NdeOfTheWeekEmail({ content, campaign: 'nde-of-the-week-2026-11-19' }));
    expect(html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(html).toContain('https://www.youtube.com/shorts/b2');
    expect(html).toContain('https://projectprofound.org/video/v9?utm_source=newsletter');
    expect(html).toContain('podcasts.apple.com');
    expect(html).toContain('spiritual podcast, Soul Wisdom Collective');
    expect(html).toContain('https://www.youtube.com/@SoulWisdomCollective');
    expect(html).toContain('https://soulwisdomcollective.com/?utm_source=newsletter');
    expect(html).not.toContain('Four.');
  });
});

describe('making the email ahead (Tom, 2026-11-24)', () => {
  const at = (d: Date) => d.toISOString();
  it('makes Monday\'s email from Sunday, scheduled for 9:00 am ET', () => {
    // Sunday 2026-11-29, 6:00 pm EST.
    expect(nextSend(new Date('2026-11-29T23:00:00Z'))).toEqual({ day: '2026-11-30', at: new Date('2026-11-30T14:00:00Z') });
    // A GitHub run on Sunday morning, even hours late: still within 36 hours.
    expect(nextSend(new Date('2026-11-29T11:23:00Z'))?.day).toBe('2026-11-30');
  });

  it('does nothing earlier in the week', () => {
    expect(nextSend(new Date('2026-11-28T15:00:00Z'))).toBeNull(); // Saturday 10 am
    expect(nextSend(new Date('2026-11-24T15:00:00Z'))).toBeNull(); // Tuesday
    expect(nextSend(new Date('2026-11-24T15:00:00Z'), undefined, undefined, Infinity)?.day).toBe('2026-11-30');
  });

  it('on Monday itself sends at 9, or ten minutes after a late run', () => {
    expect(at(nextSend(new Date('2026-11-30T11:23:00Z'))!.at)).toBe('2026-11-30T14:00:00.000Z');
    expect(at(nextSend(new Date('2026-11-30T19:00:00Z'))!.at)).toBe('2026-11-30T19:10:00.000Z');
  });

  it('keeps 9:00 am Eastern across the clock change, and names the email for its Monday', () => {
    // Sunday 2027-03-14 is the day clocks go forward: Monday's 9:00 am is EDT.
    expect(nextSend(new Date('2027-03-14T22:00:00Z'))).toEqual({ day: '2027-03-15', at: new Date('2027-03-15T13:00:00Z') });
    expect(weekName(new Date('2026-11-30T12:00:00Z'))).toBe('nde-of-the-week-2026-11-30');
  });
});
