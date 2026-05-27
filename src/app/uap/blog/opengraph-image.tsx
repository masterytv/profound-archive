/**
 * Dynamic OG image for /uap/blog.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getBlogStats } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'UAP Blog — In-Depth Articles on UFO Encounters';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const { posts } = await getBlogStats('uap');
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="UAP Research Blog"
        subtitle="In-Depth Articles on UFO & UAP Encounters"
        theme="uap"
        stats={[
          { value: String(posts), label: 'Articles' },
        ]}
        footerUrl="projectprofound.org/uap/blog"
      />
    ),
    { ...size },
  );
}
