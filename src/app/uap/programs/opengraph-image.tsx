/**
 * Dynamic OG image for /uap/programs.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'UAP Programs — Government Research & Investigation Programs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Programs"
        subtitle="Government Research & Investigation Programs"
        theme="uap"
        footerUrl="projectprofound.org/uap/programs"
      />
    ),
    { ...size },
  );
}
