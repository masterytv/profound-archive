/**
 * Dynamic OG image for /visualize/uap-phenomenology.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'UAP Phenomenology — 3D Visualization of Encounter Characteristics';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Phenomenology"
        subtitle="3D Visualization of Encounter Characteristics"
        theme="viz"
        stats={[
          { value: formatCount(stats.encounters), label: 'Encounters' },
          { value: '3D', label: 'Interactive' },
        ]}
        footerUrl="projectprofound.org/visualize/uap-phenomenology"
      />
    ),
    { ...size },
  );
}
