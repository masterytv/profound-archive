/**
 * Dynamic OG image for /experience (NDE experience listing).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'NDE Accounts — Browse Thousands of First-Person Accounts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getNdeStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="NDE Accounts"
        subtitle="Browse Thousands of First-Person Accounts"
        theme="nde"
        stats={[
          { value: formatCount(stats.videos), label: 'Accounts' },
          { value: formatCount(stats.channels), label: 'Channels' },
        ]}
        footerUrl="projectprofound.org/experience"
      />
    ),
    { ...size },
  );
}
