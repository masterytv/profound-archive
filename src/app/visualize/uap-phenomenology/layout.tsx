import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

export const metadata: Metadata = {
  title: 'UAP Phenomenology Network | Project Profound',
  description: '',
  ...ogImage('/visualize/uap-phenomenology'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
