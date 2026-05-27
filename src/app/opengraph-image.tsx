/**
 * Dynamic OG image for / (home page).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, getUapStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Project Profound — Exploring Near-Death Experiences & UAP Encounters';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const [nde, uap] = await Promise.all([getNdeStats(), getUapStats()]);
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Explore the Unexplained"
        subtitle="AI-Analyzed Near-Death Experiences & UAP Encounters"
        theme="nde"
        stats={[
          { value: formatCount(nde.videos), label: 'NDE Videos' },
          { value: formatCount(uap.encounters), label: 'UAP Encounters' },
          { value: formatCount(nde.questions), label: 'Questions' },
        ]}
        footerUrl="projectprofound.org"
      />
    ),
    { ...size },
  );
}
