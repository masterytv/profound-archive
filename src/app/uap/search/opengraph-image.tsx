/**
 * Dynamic OG image for /uap/search.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Search UAP Encounters — Semantic AI Search';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getUapStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Search UAP Encounters"
        subtitle="AI-Powered Semantic Search Across All Testimonies"
        theme="uap"
        stats={[
          { value: formatCount(stats.encounters), label: 'Searchable' },
          { value: formatCount(stats.channels), label: 'Channels' },
        ]}
        footerUrl="projectprofound.org/uap/search"
      />
    ),
    { ...size },
  );
}
