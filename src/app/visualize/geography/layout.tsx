import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Encounter Map | Project Profound',
  description:
    'Explore where UAP encounters happen worldwide on an interactive 3D globe. See hotspots across US states and 50+ countries.',
  openGraph: {
    title: 'Global UAP Encounter Map',
    description:
      '3D globe visualization of 2,300+ UAP encounters across 85 locations worldwide.',
  },
};

export default function GeographyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
