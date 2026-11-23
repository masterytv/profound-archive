/**
 * The preview card for an experiencer's profile (1200 × 630): what Facebook, Messages, X and the rest show when
 * /experiencer/[slug] is shared, and what Short Maker's daily Facebook link posts show (Tom, 2026-11-23: the old card
 * was text on a dark background, and Facebook showed no picture at all).
 *
 * The site's logo, the person's highlight quote in Crimson Pro, their name in the callout gold (#FBBF24, the one
 * highlighted phrase, as on Project Profound's social cards), and the still from their video beside it. Satori
 * (next/og) draws it: flexbox only, inline styles, and no emoji (they render as empty boxes).
 */
import React from 'react';

export const OG_SIZE = { width: 1200, height: 630 } as const;

const NAVY = '#0A0F1E';
const TEXT = '#F8FAFC';
const MUTED = '#94A3B8';
const ACCENT = '#2563EB';
/** The callout colour Project Profound's social cards use for their one key phrase. */
export const HIGHLIGHT = '#FBBF24';

const PHOTO_WIDTH = 460;

/** The quote as the card shows it: at most `max` characters, cut at a word, with an ellipsis when cut. Pure. */
export function cardQuote(quote: string | null | undefined, max = 150): string {
  const q = (quote ?? '').trim().replace(/\s+/g, ' ').replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  if (q.length <= max) return q;
  const cut = q.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, '')}…`;
}

/** The quote's size, so a long one still fits beside the photo. Pure. */
export const quoteSize = (quote: string, withPhoto: boolean) => {
  const n = quote.length;
  if (withPhoto) return n <= 60 ? 46 : n <= 100 ? 40 : 34;
  return n <= 60 ? 54 : n <= 100 ? 46 : 40;
};

/**
 * A YouTube still at the largest size YouTube keeps, without the letterbox bars its smaller stills have: the
 * maxresdefault, else the hqdefault it was given. Pure.
 */
export function youtubeStills(url: string | null | undefined): string[] {
  if (!url) return [];
  const m = /^https:\/\/i\.ytimg\.com\/vi\/([\w-]{6,})\/\w+\.jpg/.exec(url);
  return m ? [`https://i.ytimg.com/vi/${m[1]}/maxresdefault.jpg`, url] : [url];
}

export function ExperiencerCard({
  name,
  quote,
  logoSrc,
  photo,
}: {
  name: string;
  quote: string;
  logoSrc: string | null;
  /** The still as a data URL, and whether it is a letterboxed 4:3 YouTube still (its bars are cropped off). */
  photo: { src: string; letterboxed: boolean } | null;
}) {
  const textWidth = photo ? OG_SIZE.width - PHOTO_WIDTH + 80 : OG_SIZE.width;
  // A letterboxed 480 × 360 still holds a 16:9 picture 270 high: scaled so that picture fills the card's height.
  const photoHeight = photo?.letterboxed ? Math.round(OG_SIZE.height * (360 / 270)) : OG_SIZE.height;
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', backgroundColor: NAVY, fontFamily: 'Inter' }}>
      {photo && (
        <div style={{ position: 'absolute', top: 0, right: 0, width: PHOTO_WIDTH, height: OG_SIZE.height, display: 'flex', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt="" style={{ height: photoHeight, width: Math.round((photoHeight * 16) / 9), objectFit: 'cover' }} />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              backgroundImage: `linear-gradient(to right, ${NAVY} 0%, rgba(10,15,30,0.55) 30%, rgba(10,15,30,0) 65%)`,
            }}
          />
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, width: textWidth, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px 48px' }}>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="Project Profound" width={Math.round((1024 * 44) / 239)} height={44} />
        ) : (
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: TEXT }}>Project Profound</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', paddingRight: photo ? 140 : 0 }}>
          {quote && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontFamily: 'Crimson Pro', fontSize: 110, lineHeight: 1, color: ACCENT, fontWeight: 600, marginBottom: -36 }}>{'“'}</div>
              <div style={{ display: 'flex', fontFamily: 'Crimson Pro', fontSize: quoteSize(quote, !!photo), lineHeight: 1.2, color: TEXT, fontWeight: 600 }}>{quote}</div>
            </div>
          )}
          <div style={{ display: 'flex', marginTop: quote ? 26 : 0, fontSize: quote ? 34 : 64, fontWeight: 700, color: HIGHLIGHT }}>{quote ? `— ${name}` : name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', height: 4, width: 96, backgroundColor: ACCENT, marginBottom: 18 }} />
          <div style={{ display: 'flex', fontSize: 24, color: MUTED, fontWeight: 500 }}>Their full story at projectprofound.org</div>
        </div>
      </div>
    </div>
  );
}
