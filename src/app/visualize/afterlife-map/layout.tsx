import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'The Map of the Afterlife | 3D Visualization | Project Profound';
const description =
  'A three-dimensional map of what people report seeing after death, built from 6,176 near-death accounts. Every place is weighted by how many experiencers described it, and by how well-evidenced their account is.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/afterlife-map', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
