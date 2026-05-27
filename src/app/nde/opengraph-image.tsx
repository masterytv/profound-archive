/**
 * Dynamic OG image for /nde (NDE Landing Page).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, formatCount } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'Near-Death Experiences — AI-Analyzed Accounts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getNdeStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Archive of the Extraordinary"
        subtitle="AI-Analyzed Near-Death Experience Accounts"
        theme="nde"
        stats={[
          { value: formatCount(stats.videos), label: 'NDE Accounts' },
          { value: formatCount(stats.channels), label: 'Channels' },
          { value: '3', label: 'Research Scales' },
        ]}
        footerUrl="projectprofound.org/nde"
      />
    ),
    { ...size },
  );
}
