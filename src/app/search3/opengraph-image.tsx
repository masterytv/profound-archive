/**
 * Dynamic OG image for /search3 (NDE semantic search).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Search NDE Accounts — AI-Powered Semantic Search';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getNdeStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Search NDE Accounts"
        subtitle="AI-Powered Semantic Search Across All Testimonies"
        theme="nde"
        stats={[
          { value: formatCount(stats.videos), label: 'Searchable' },
          { value: formatCount(stats.channels), label: 'Channels' },
        ]}
        footerUrl="projectprofound.org/search3"
      />
    ),
    { ...size },
  );
}
