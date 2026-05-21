/**
 * UAP Research Intelligence Dashboard
 *
 * Public page at /uap/intelligence showing cross-video analytics,
 * network analysis, and daily facts from the UAP dataset.
 *
 * Server component — calls analytics computation directly (no self-fetch).
 */

import type { Metadata } from 'next';
import { IntelligenceDashboard } from './dashboard';
import { computeAnalytics } from './compute-analytics';

export const metadata: Metadata = {
  title: 'Research Intelligence | UAP & UFO Analysis | Project Profound',
  description:
    'Cross-video analytics and network intelligence from our UAP research dataset. Explore claim distributions, person networks, encounter phenomenology, and daily facts.',
  openGraph: {
    title: 'UAP Research Intelligence | Project Profound',
    description:
      'Cross-video analytics and network intelligence from our UAP research dataset.',
    type: 'website',
  },
};

export const revalidate = 86400; // ISR: revalidate once per day

export default async function IntelligencePage() {
  let analytics = null;
  try {
    analytics = await computeAnalytics();
  } catch (err) {
    console.error('[Intelligence Page] Failed to compute analytics:', err);
  }

  return <IntelligenceDashboard analytics={analytics} />;
}
