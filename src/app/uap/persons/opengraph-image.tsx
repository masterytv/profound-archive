/**
 * Dynamic OG image for /uap/persons.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Key UAP Figures — Researchers, Whistleblowers & Witnesses';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Key UAP Figures"
        subtitle="Researchers, Whistleblowers & Notable Witnesses"
        theme="uap"
        footerUrl="projectprofound.org/uap/persons"
      />
    ),
    { ...size },
  );
}
