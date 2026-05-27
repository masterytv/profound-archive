/**
 * Dynamic OG image for /visualize (index page).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'Data Visualizations — Interactive 3D Exploration of NDE & UAP Data';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Data Visualizations"
        subtitle="Interactive 3D Exploration of NDE & UAP Data"
        theme="viz"
        stats={[
          { value: '7', label: 'Visualizations' },
          { value: '3D', label: 'Interactive' },
        ]}
        footerUrl="projectprofound.org/visualize"
      />
    ),
    { ...size },
  );
}
