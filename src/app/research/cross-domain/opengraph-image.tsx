/**
 * Dynamic OG image for /research/cross-domain.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Cross-Domain Research — Where NDE & UAP Phenomena Overlap';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const [nde, uap] = await Promise.all([getNdeStats(), getUapStats()]);
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Cross-Domain Research"
        subtitle="Where NDE & UAP Phenomena Overlap"
        theme="viz"
        stats={[
          { value: formatCount(nde.videos), label: 'NDE Accounts' },
          { value: formatCount(uap.encounters), label: 'UAP Encounters' },
        ]}
        footerUrl="projectprofound.org/research/cross-domain"
      />
    ),
    { ...size },
  );
}
