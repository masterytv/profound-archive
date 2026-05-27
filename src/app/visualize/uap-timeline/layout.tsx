import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

export const metadata: Metadata = {
  title: 'UAP Timeline Helix | Project Profound',
  description: '',
  ...ogImage('/visualize/uap-timeline'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
