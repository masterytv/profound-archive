import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

export const metadata: Metadata = {
  title: 'Hynek Classification Space | Project Profound',
  description: '',
  ...ogImage('/visualize/hynek-space'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
