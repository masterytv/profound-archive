import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

export const metadata: Metadata = {
  title: 'NDE Element Network | 3D Visualization | Project Profound',
  description: 'Explore how the 15 core near-death experience elements connect in 3D. See which elements appear together most often across thousands of documented NDEs.',
  ...ogImage('/visualize/nde-elements'),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
