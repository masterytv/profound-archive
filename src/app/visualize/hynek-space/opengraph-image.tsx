/**
 * Dynamic OG image for /visualize/hynek-space.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'Hynek Space — 3D Classification of UAP Encounters';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Hynek Classification Space"
        subtitle="3D Map of UAP Encounter Types"
        theme="viz"
        stats={[
          { value: formatCount(stats.encounters), label: 'Encounters' },
          { value: '6', label: 'Hynek Types' },
          { value: '3D', label: 'Interactive' },
        ]}
        footerUrl="projectprofound.org/visualize/hynek-space"
      />
    ),
    { ...size },
  );
}
