import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'NDE Element Network | 3D Visualization | Project Profound';
const description = 'Explore how the 15 core near-death experience elements connect in 3D. See which elements appear together most often across thousands of documented NDEs.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/nde-elements', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
