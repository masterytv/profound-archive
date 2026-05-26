'use client';

import dynamic from 'next/dynamic';

const HynekSpaceGraph = dynamic(
  () => import('./hynek-space-graph').then(mod => ({ default: mod.HynekSpaceGraph })),
  { ssr: false },
);

export default function HynekSpacePage() {
  return <HynekSpaceGraph />;
}
