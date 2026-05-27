/**
 * Dynamic OG image for /uap/chat.
 */
import { ImageResponse } from 'next/og';
import { BrandedOgTemplate } from '@/lib/og/branded-template';

export const runtime = 'nodejs';
export const revalidate = 86400;
export const alt = 'Chat with the UAP Archive — Ask Anything About UFO Encounters';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <BrandedOgTemplate
        title="Chat with the Archive"
        subtitle="Ask Anything About UAP & UFO Encounters"
        theme="uap"
        stats={[
          { value: 'AI', label: 'Powered' },
          { value: 'RAG', label: 'Grounded' },
        ]}
        footerUrl="projectprofound.org/uap/chat"
      />
    ),
    { ...size },
  );
}
