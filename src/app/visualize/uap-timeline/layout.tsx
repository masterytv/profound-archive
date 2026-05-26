import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UAP Timeline Helix | Project Profound',
  description:
    'Explore 2,200+ UAP encounters across 350+ years in an interactive 3D timeline. Watch the history of contact unfold from 1670 to today.',
};

export default function UapTimelineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
