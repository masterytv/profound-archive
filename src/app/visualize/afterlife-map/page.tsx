'use client';

import dynamic from 'next/dynamic';

// WebGL requires the browser; next/dynamic with ssr:false must live in a Client Component
// in Next.js 16, matching the other /visualize pages.
const AfterlifeMap = dynamic(
  () => import('./afterlife-map').then(mod => ({ default: mod.AfterlifeMap })),
  { ssr: false },
);

export default function AfterlifeMapPage() {
  return <AfterlifeMap />;
}
