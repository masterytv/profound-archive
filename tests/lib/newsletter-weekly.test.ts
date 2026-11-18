/**
 * The weekly "NDE of the Week" newsletter's pure parts (src/lib/email/weekly.ts), the newsletter lists and the
 * sites allowed to sign people up (src/lib/email/audience.ts, cors.ts), and the shared Story of the Day pick.
 */
import { describe, it, expect } from 'vitest';
import {
  bestShortOfWeek, firstParagraph, newestEpisode, parseChannelFeed, sentences, tagged, weekName, weeklyContent,
} from '@/lib/email/weekly';
import { emailForms, isNewsletterList, newsletterSegmentId } from '@/lib/email/audience';
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
    expect(weekName(new Date('2026-11-19T13:17:00Z'))).toBe('nde-of-the-week-2026-11-19');
  });

  it('leads the subject with the Short and says what else is inside', () => {
    const short = parseChannelFeed(channel)[1];
    const story = { videoId: 'v', title: 'A Story', channelName: null, summary: null };
    const episode = { title: 'Ep', description: '', published: null };
    const c = weeklyContent({ short, story, episode });
    expect(c.subject).toBe('NDE of the Week: She Saw "Light"');
    expect(c.previewText).toBe('Plus a story from the archive and a new Soul Wisdom episode.');
    expect(weeklyContent({ short: null, story, episode: null }).subject).toBe('NDE of the Week: A Story');
  });
});

describe('newsletter lists and sign-ups from Soul Wisdom', () => {
  it('knows the newsletter lists, including Soul Wisdom sign-ups', () => {
    expect(isNewsletterList('newsletter_swc')).toBe(true);
    expect(isNewsletterList('newsletter_nde')).toBe(true);
    expect(isNewsletterList('griever')).toBe(false);
    expect(emailForms(' Ann@Example.com ')).toEqual(['Ann@Example.com', 'ann@example.com']);
    delete process.env.RESEND_SEGMENT_ID;
    expect(newsletterSegmentId()).toBeNull();
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

describe('the weekly email', () => {
  it('renders the three parts and keeps Resend\'s unsubscribe placeholder', async () => {
    const { render } = await import('@react-email/render');
    const { NdeOfTheWeekEmail } = await import('@/lib/email/templates/NdeOfTheWeekEmail');
    const short = parseChannelFeed(channel)[1];
    const content = weeklyContent({
      short,
      story: { videoId: 'v9', title: 'The Story', channelName: 'NDE Channel', summary: 'One. Two. Three. Four.' },
      episode: { title: 'The Episode', description: 'About it.\n\nMore.', published: null },
    });
    const html = await render(NdeOfTheWeekEmail({ content, campaign: 'nde-of-the-week-2026-11-19' }));
    expect(html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
    expect(html).toContain('https://www.youtube.com/shorts/b2');
    expect(html).toContain('https://projectprofound.org/video/v9?utm_source=newsletter');
    expect(html).toContain('The Episode');
    expect(html).not.toContain('Four.');
  });
});
