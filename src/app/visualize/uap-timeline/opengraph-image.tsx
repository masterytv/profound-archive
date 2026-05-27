/**
 * Dynamic OG image for /visualize/uap-timeline.
 */

import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Timeline Helix — 350 Years of UFO Encounters in 3D';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();

  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Timeline Helix"
        subtitle="350 Years of UFO Encounters in 3D"
        theme="viz"
        stats={[
          { value: formatCount(stats.encounters), label: 'Encounters' },
          { value: '1670–2026', label: 'Time Span' },
          { value: '3', label: 'View Modes' },
          { value: '3D', label: 'Interactive' },
        ]}
        footerUrl="projectprofound.org/visualize/uap-timeline"
      />
    ),
    { ...size },
  );
}
