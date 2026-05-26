import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hynek Classification Space | Project Profound',
  description:
    'Explore 2,200+ UAP encounters in a 3D scatter plot. See how evidence quality, contact depth, and transformation correlate across Hynek classifications.',
};

export default function HynekSpaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
