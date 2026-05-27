/**
 * Dynamic OG image for /visualize/channel-constellation.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Channel Constellation — 3D Star Map of UAP YouTube Channels';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Channel Constellation"
        subtitle="3D Star Map of UAP YouTube Channels"
        theme="viz"
        stats={[
          { value: formatCount(stats.channels), label: 'Channels' },
          { value: '3D', label: 'Interactive' },
        ]}
        footerUrl="projectprofound.org/visualize/channel-constellation"
      />
    ),
    { ...size },
  );
}
