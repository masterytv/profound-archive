import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'Global Encounter Map | Project Profound';
const description = 'Explore global NDE and UAP encounters on an interactive 3D globe. Visualize geographic distribution, cluster densities, and local cases.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/geography', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
