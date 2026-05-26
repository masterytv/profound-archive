'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled (WebGL requires browser)
// Must be in a Client Component in Next.js 16+
const UapPhenomenologyGraph = dynamic(
  () => import('./uap-phenomenology-graph').then(mod => ({ default: mod.UapPhenomenologyGraph })),
  { ssr: false },
);

/**
 * UAP Phenomenology Network page.
 * Client component because next/dynamic ssr:false requires it in Next.js 16.
 * SEO metadata is provided via layout.tsx.
 */
export default function UapPhenomenologyPage() {
  return <UapPhenomenologyGraph />;
}
