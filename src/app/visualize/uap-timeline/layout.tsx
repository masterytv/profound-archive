import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'UAP Timeline Helix | Project Profound';
const description = 'Explore 350 years of UFO and UAP encounters in an interactive 3D timeline helix. Analyze cases, witness logs, and classification patterns.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/uap-timeline', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
