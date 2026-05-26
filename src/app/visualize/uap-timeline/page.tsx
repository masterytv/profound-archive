'use client';

import dynamic from 'next/dynamic';

const UapTimelineGraph = dynamic(
  () => import('./uap-timeline-graph').then(mod => ({ default: mod.UapTimelineGraph })),
  { ssr: false },
);

export default function UapTimelinePage() {
  return <UapTimelineGraph />;
}
