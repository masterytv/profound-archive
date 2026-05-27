import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'UAP Phenomenology Network | Project Profound';
const description = 'Analyze the semantic relationships between UAP features, encounter types, and witness characteristics in an interactive 3D phenomenological graph.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/uap-phenomenology', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
