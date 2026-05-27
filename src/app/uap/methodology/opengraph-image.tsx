/**
 * Dynamic OG image for /uap/methodology.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'UAP Analysis Methodology — How We Score & Classify Encounters';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Our Methodology"
        subtitle="How We Score & Classify UAP Encounters"
        theme="uap"
        stats={[
          { value: '4', label: 'Scoring Axes' },
          { value: 'AI', label: 'Powered' },
        ]}
        footerUrl="projectprofound.org/uap/methodology"
      />
    ),
    { ...size },
  );
}
