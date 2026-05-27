/**
 * Dynamic OG image for /compass (NDE Compass).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'NDE Compass — Discover Your Connection to the Research';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="NDE Compass"
        subtitle="Discover Your Connection to the Research"
        theme="nde"
        stats={[
          { value: 'AI', label: 'Guided' },
          { value: '3', label: 'Research Scales' },
        ]}
        footerUrl="projectprofound.org/compass"
      />
    ),
    { ...size },
  );
}
