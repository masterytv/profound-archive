import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = 'UAP Intelligence Network | Project Profound';
const description = 'Analyze the network of government projects, official agencies, and key actors involved in UAP intelligence and disclosure efforts in an interactive 3D graph.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize/uap-intelligence', { title, description }),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
