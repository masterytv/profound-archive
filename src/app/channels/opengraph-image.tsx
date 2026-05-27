/**
 * Dynamic OG image for /channels (NDE channel listing).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, formatCount } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'NDE YouTube Channels — Browse & Explore';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getNdeStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title={`${formatCount(stats.channels)} NDE Channels`}
        subtitle="YouTube Channels Sharing Near-Death Experiences"
        theme="nde"
        stats={[
          { value: formatCount(stats.channels), label: 'Channels' },
          { value: formatCount(stats.videos), label: 'NDE Accounts' },
        ]}
        footerUrl="projectprofound.org/channels"
      />
    ),
    { ...size },
  );
}
