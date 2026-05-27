/**
 * Dynamic OG image for /questions (listing page).
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';
import { getNdeStats, formatCount } from '@/lib/og/stats';

export const runtime = 'edge';
export const revalidate = 86400;
export const alt = 'Questions About NDEs — Answered by AI from 5,000+ Accounts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const stats = await getNdeStats();
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Questions About NDEs"
        subtitle="AI-Synthesized Answers from Real Accounts"
        theme="nde"
        stats={[
          { value: formatCount(stats.questions), label: 'Questions' },
          { value: formatCount(stats.videos), label: 'NDE Accounts' },
        ]}
        footerUrl="projectprofound.org/questions"
      />
    ),
    { ...size },
  );
}
