/**
 * Dynamic OG image for /uap/experiencer (listing page).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'UAP Experiencers — Firsthand Encounter Testimonies';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Experiencers"
        subtitle="Firsthand Encounter Testimonies, AI-Analyzed"
        theme="uap"
        footerUrl="projectprofound.org/uap/experiencer"
      />
    ),
    { ...size },
  );
}
