/**
 * Dynamic OG image for /uap/events.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'UAP Events Timeline — Key Incidents & Sightings';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Events Timeline"
        subtitle="Key Incidents, Sightings & Government Disclosures"
        theme="uap"
        footerUrl="projectprofound.org/uap/events"
      />
    ),
    { ...size },
  );
}
