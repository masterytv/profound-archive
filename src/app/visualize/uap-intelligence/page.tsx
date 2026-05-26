'use client';

import dynamic from 'next/dynamic';

const UapIntelligenceGraph = dynamic(
  () => import('./uap-intelligence-graph').then(mod => ({ default: mod.UapIntelligenceGraph })),
  { ssr: false },
);

export default function UapIntelligencePage() {
  return <UapIntelligenceGraph />;
}
