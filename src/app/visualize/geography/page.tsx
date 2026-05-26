'use client';

import dynamic from 'next/dynamic';

const GlobeGraph = dynamic(
  () => import('./globe-graph').then(mod => ({ default: mod.GlobeGraph })),
  { ssr: false },
);

export default function GeographyPage() {
  return <GlobeGraph />;
}
