/**
 * Helper to generate openGraph.images metadata pointing to our API route.
 *
 * Firebase App Hosting does NOT support the file-convention `opengraph-image.tsx`.
 * This helper generates the explicit metadata reference to `/api/og/page?path=...`
 * which works reliably on all hosting platforms.
 *
 * Usage in any page or layout metadata:
 *   import { ogImage } from '@/lib/og/metadata';
 *   export const metadata: Metadata = {
 *     title: 'My Page',
 *     ...ogImage('/my-page'),
 *   };
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://projectprofound.org';

/**
 * Returns openGraph + twitter metadata with the image pointing to the API route.
 * Spread this into your Metadata export.
 */
export function ogImage(pagePath: string) {
  const imageUrl = `${BASE_URL}/api/og/page?path=${encodeURIComponent(pagePath)}`;
  return {
    openGraph: {
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      images: [imageUrl],
    },
  };
}
