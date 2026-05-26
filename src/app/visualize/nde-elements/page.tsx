'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled (WebGL requires browser)
// Must be in a Client Component in Next.js 16+
const NdeElementGraph = dynamic(
  () => import('./nde-element-graph').then(mod => ({ default: mod.NdeElementGraph })),
  { ssr: false },
);

/**
 * NDE Element Network page.
 * Client component because next/dynamic ssr:false requires it in Next.js 16.
 * SEO metadata is provided via nde-elements/metadata.ts (or parent layout).
 */
export default function NdeElementsPage() {
  return <NdeElementGraph />;
}
