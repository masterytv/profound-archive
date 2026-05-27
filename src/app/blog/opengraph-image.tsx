/**
 * Dynamic OG image for /blog (NDE blog listing).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getBlogStats } from '@/lib/og/stats';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'NDE Blog — In-Depth Articles on Near-Death Experiences';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const { posts } = await getBlogStats('nde');
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="NDE Research Blog"
        subtitle="In-Depth Articles on Near-Death Experiences"
        theme="nde"
        stats={[
          { value: String(posts), label: 'Articles' },
        ]}
        footerUrl="projectprofound.org/blog"
      />
    ),
    { ...size },
  );
}
