import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

export const metadata: Metadata = {
  title: 'Global Encounter Map | Project Profound',
  description: '',
  ...ogImage('/visualize/geography'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
