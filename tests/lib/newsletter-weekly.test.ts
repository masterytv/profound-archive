/**
 * The weekly "NDE of the Week" newsletter's pure parts (src/lib/email/weekly.ts), the newsletter lists and the
 * sites allowed to sign people up (src/lib/email/audience.ts, cors.ts), and the shared Story of the Day pick.
 */
import { describe, it, expect } from 'vitest';
import {
  bestOfWeek, bestShortOfWeek, firstParagraph, newestEpisode, parseChannelFeed, ppWeekly, sentences, swcWeekly, tagged, weekName,
} from '@/lib/email/weekly';
import { emailForms, isNewsletterList, listsOf, NEWSLETTER_OF, segmentIdOf } from '@/lib/email/audience';
import { allowedOrigin, corsHeaders } from '@/lib/email/cors';
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
    // Soul Wisdom's video of the week may be a full episode: d4 has the most views of the week.
    expect(bestOfWeek(videos, now)?.videoId).toBe('d4');
  });

  it('takes the newest podcast episode and the first paragraph of a description', () => {
    const feed = `<rss><channel><item><title>Older</title><description><![CDATA[Old.]]></description><pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate></item>
      <item><title>Meaning of Life, Pt 2</title><description><![CDATA[What is the meaning of life?

More.]]></description><pubDate>Wed, 18 Nov 2026 17:42:01 GMT</pubDate></item></channel></rss>`;
    const ep = newestEpisode(feed);
    expect(ep?.title).toBe('Meaning of Life, Pt 2');
    expect(firstParagraph(ep!.description)).toBe('What is the meaning of life?');
    expect(firstParagraph('https://x.y\n\n#tag')).toBe('');
    expect(firstParagraph('word '.repeat(200), 40).endsWith('…')).toBe(true);
    expect(sentences('One. Two! Three? Four.', 3)).toBe('One. Two! Three?');
    expect(newestEpisode('<rss></rss>')).toBeNull();
  });

  it('tags only our own links, and names the week', () => {
    expect(tagged('https://projectprofound.org/video/x', 'nde-of-the-week-2026-11-19')).toBe(
      'https://projectprofound.org/video/x?utm_source=newsletter&utm_medium=email&utm_campaign=nde-of-the-week-2026-11-19',
    );
    expect(tagged('https://www.youtube.com/shorts/b2', 'c')).toBe('https://www.youtube.com/shorts/b2');
    expect(weekName('pp', new Date('2026-11-19T13:17:00Z'))).toBe('nde-of-the-week-2026-11-19');
    expect(weekName('swc', new Date('2026-11-19T13:17:00Z'))).toBe('swc-video-of-the-week-2026-11-19');
  });

  it('gives each site its own subject', () => {
    const short = parseChannelFeed(channel)[1];
    const story = { videoId: 'v', title: 'A Story', channelName: null, summary: null };
    const pp = ppWeekly({ short, story });
    expect(pp.subject).toBe('NDE of the Week: She Saw "Light"');
    expect(pp.previewText).toBe('Plus a story from the archive.');
    expect(ppWeekly({ short: null, story }).subject).toBe('NDE of the Week: A Story');

    const episode = { title: 'Meaning of Life, Pt 2', description: 'About it.', published: null };
    const swc = swcWeekly({ video: short, episode });
    expect(swc.subject).toBe('Soul Wisdom Video of the Week: She Saw "Light"');
    expect(swc.previewText).toBe('Plus our newest episode: Meaning of Life, Pt 2');
    // When the video of the week is the newest episode itself, it is not shown twice.
    expect(swcWeekly({ video: { ...short, title: episode.title }, episode }).episode).toBeNull();
    expect(swcWeekly({ video: null, episode }).subject).toBe('Soul Wisdom Video of the Week: Meaning of Life, Pt 2');
  });
});

describe('newsletter lists and sign-ups from Soul Wisdom', () => {
  it('puts PP\'s lists in one newsletter and Soul Wisdom sign-ups in the other', () => {
    expect(isNewsletterList('newsletter_swc')).toBe(true);
    expect(isNewsletterList('griever')).toBe(false);
    expect(NEWSLETTER_OF.newsletter_swc).toBe('swc');
    expect(listsOf('pp')).toEqual(['newsletter_nde', 'newsletter_uap']);
    expect(listsOf('swc')).toEqual(['newsletter_swc']);
    expect(emailForms(' Ann@Example.com ')).toEqual(['Ann@Example.com', 'ann@example.com']);
    delete process.env.RESEND_SEGMENT_ID;
    process.env.RESEND_SWC_SEGMENT_ID = ' seg-swc ';
    expect(segmentIdOf('pp')).toBeNull();
    expect(segmentIdOf('swc')).toBe('seg-swc');
    delete process.env.RESEND_SWC_SEGMENT_ID;
  });

  it('lets only the Soul Wisdom sites (and local dev) post sign-ups from the browser', () => {
    expect(allowedOrigin('https://soulwisdomcollective.com')).toBe('https://soulwisdomcollective.com');
    expect(allowedOrigin('https://staging.soulwisdomcollective.com')).toBe('https://staging.soulwisdomcollective.com');
    expect(allowedOrigin('https://evil.example')).toBeNull();
    expect(allowedOrigin(null)).toBeNull();
    expect(corsHeaders('https://evil.example')).toEqual({});
    expect(corsHeaders('https://soulwisdomcollective.com')['Access-Control-Allow-Origin']).toBe('https://soulwisdomcollective.com');
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
    expect(html).not.toContain('Four.');
    expect(html).not.toContain('soulwisdomcollective.com.');
  });

  it('renders Soul Wisdom\'s with the video, the newest episode and one Project Profound line', async () => {
    const { render } = await import('@react-email/render');
    const { SwcVideoOfTheWeekEmail } = await import('@/lib/email/templates/SwcVideoOfTheWeekEmail');
    const content = swcWeekly({
      video: parseChannelFeed(channel)[3],
      episode: { title: 'The Episode', description: 'About it.\n\nMore.', published: null },
    });
    const html = await render(SwcVideoOfTheWeekEmail({ content, campaign: 'swc-video-of-the-week-2026-11-19' }));
    expect(html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(html).toContain('Soul Wisdom Video of the Week');
    expect(html).toContain('The Episode');
    expect(html).toContain('https://projectprofound.org/?utm_source=newsletter');
    expect(html).toContain('signed up at soulwisdomcollective.com');
    expect(html).not.toContain('More.');
  });
});
