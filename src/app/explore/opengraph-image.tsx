/**
 * Dynamic OG image for /explore (NDE Greyson scale explorer).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, formatCount } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'Explore NDE Patterns — Greyson Scale Analysis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getNdeStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Explore NDE Patterns"
        subtitle="Greyson Scale Analysis Across Thousands of Accounts"
        theme="nde"
        stats={[
          { value: formatCount(stats.videos), label: 'NDE Accounts' },
        ]}
        footerUrl="projectprofound.org/explore"
      />
    ),
    { ...size },
  );
}
