/**
 * Dynamic OG image for /uap/channels.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'UAP YouTube Channels — Ranked & Analyzed';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title={`${formatCount(stats.channels)} UAP Channels Ranked`}
        subtitle="AI-Scored for Credibility, Evidence & Research"
        theme="uap"
        stats={[
          { value: formatCount(stats.channels), label: 'Channels' },
          { value: formatCount(stats.videos), label: 'Videos' },
          { value: formatCount(stats.encounters), label: 'Encounters' },
        ]}
        footerUrl="projectprofound.org/uap/channels"
      />
    ),
    { ...size },
  );
}
