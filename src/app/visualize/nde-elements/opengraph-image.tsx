/**
 * Dynamic OG image for /visualize/nde-elements.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, formatCount } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'NDE Core Elements — Visualize Common Patterns Across Accounts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getNdeStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="NDE Core Elements"
        subtitle="Visualize Common Patterns Across Accounts"
        theme="viz"
        stats={[
          { value: formatCount(stats.videos), label: 'Accounts' },
          { value: '3D', label: 'Interactive' },
        ]}
        footerUrl="projectprofound.org/visualize/nde-elements"
      />
    ),
    { ...size },
  );
}
