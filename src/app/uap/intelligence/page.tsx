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
  // NEXT_PUBLIC_SITE_URL is set in production (e.g., https://projectprofound.org)
  // VERCEL_URL is set in Vercel deployments (without protocol)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000';

  try {
    // Why: Analytics API now requires internal auth to prevent public SERVICE_KEY abuse.
    // Pass CRON_SECRET as fallback since server-side referer may vary across environments.
    const headers: HeadersInit = {};
    if (process.env.CRON_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
    }

    const res = await fetch(`${baseUrl}/api/uap/analytics`, {
      headers,
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
