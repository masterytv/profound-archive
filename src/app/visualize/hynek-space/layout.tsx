import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'Hynek Classification Space | Project Profound';
const description = 'Explore UAP and UFO encounters classified by the Hynek system (Close Encounters 1-4) in a 3D scatter plot. Click individual encounters to read transcripts.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/hynek-space', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
