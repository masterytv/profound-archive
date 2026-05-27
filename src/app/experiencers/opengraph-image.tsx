/**
 * Dynamic OG image for /experiencers (NDE experiencer listing).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'NDE Experiencers — Profiled with Research-Backed Scores';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="NDE Experiencers"
        subtitle="Profiled with Research-Backed Scores"
        theme="nde"
        stats={[
          { value: '3', label: 'Research Scales' },
          { value: 'AI', label: 'Analyzed' },
        ]}
        footerUrl="projectprofound.org/experiencers"
      />
    ),
    { ...size },
  );
}
