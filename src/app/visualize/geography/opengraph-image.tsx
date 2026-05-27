/**
 * Dynamic OG image for /visualize/geography.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'UAP Geography — 3D Globe of Encounter Locations';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Geography"
        subtitle="3D Globe of Encounter Locations Worldwide"
        theme="viz"
        stats={[
          { value: formatCount(stats.encounters), label: 'Encounters' },
          { value: '3D', label: 'Globe' },
        ]}
        footerUrl="projectprofound.org/visualize/geography"
      />
    ),
    { ...size },
  );
}
