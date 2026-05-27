import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'Channel Constellation | Project Profound';
const description = 'Explore the constellation of video channels publishing on NDEs and UAPs. Discover topic overlaps, content themes, and network structures in 3D.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/channel-constellation', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
