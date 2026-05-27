import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

export const metadata: Metadata = {
  title: 'Channel Constellation | Project Profound',
  description: '',
  ...ogImage('/visualize/channel-constellation'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
