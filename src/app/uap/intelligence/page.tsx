/**
 * UAP Research Intelligence Dashboard
 *
 * Public page at /uap/intelligence showing cross-video analytics,
 * network analysis, and daily facts from the UAP dataset.
 *
 * Server component that fetches analytics and renders client widgets.
 */

import type { Metadata } from 'next';
import { IntelligenceDashboard } from './dashboard';

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

// Fetch analytics from our API route
async function getAnalytics() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/uap/analytics`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function IntelligencePage() {
  const analytics = await getAnalytics();

  return <IntelligenceDashboard analytics={analytics} />;
}
