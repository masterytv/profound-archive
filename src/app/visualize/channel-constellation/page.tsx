'use client';

import dynamic from 'next/dynamic';

const ChannelConstellationGraph = dynamic(
  () => import('./channel-constellation-graph').then(mod => ({ default: mod.ChannelConstellationGraph })),
  { ssr: false },
);

export default function ChannelConstellationPage() {
  return <ChannelConstellationGraph />;
}
