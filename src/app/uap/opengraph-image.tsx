/**
 * Dynamic OG image for /uap (UAP Landing Page).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'UAP & UFO Archive — AI-Analyzed Encounters';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="The UFO & UAP Archive"
        subtitle="AI-Analyzed Encounters from YouTube Channels"
        theme="uap"
        stats={[
          { value: formatCount(stats.encounters), label: 'Encounters' },
          { value: formatCount(stats.channels), label: 'Channels' },
          { value: formatCount(stats.videos), label: 'Videos' },
        ]}
        footerUrl="projectprofound.org/uap"
      />
    ),
    { ...size },
  );
}
