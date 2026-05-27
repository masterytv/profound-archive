/**
 * Dynamic OG image for /uap/organizations.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'UAP Organizations — Government, Military & Research Bodies';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Organizations"
        subtitle="Government, Military & Research Bodies"
        theme="uap"
        footerUrl="projectprofound.org/uap/organizations"
      />
    ),
    { ...size },
  );
}
