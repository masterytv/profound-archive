/**
 * Dynamic OG image for /uap/intelligence.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'UAP Intelligence Network — Entity Relationships & Connections';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Intelligence Network"
        subtitle="Entity Relationships, Connections & Patterns"
        theme="uap"
        stats={[
          { value: formatCount(stats.encounters), label: 'Encounters' },
        ]}
        footerUrl="projectprofound.org/uap/intelligence"
      />
    ),
    { ...size },
  );
}
