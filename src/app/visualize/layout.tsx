import type { Metadata } from 'next';
import { ogImage } from '@/lib/og/metadata';

const title = '3D Visualizations | Project Profound';
const description = 'Explore near-death experiences and UAP encounters through interactive 3D visualizations. See how elements connect, where encounters happen, and what patterns emerge.';

export const metadata: Metadata = {
  title,
  description,
  ...ogImage('/visualize', { title, description }),
};

/**
 * Visualize layout — dark immersive wrapper for all /visualize/* pages.
 * Forces dark mode context and removes standard site chrome.
 */
export default function VisualizeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark" style={{ colorScheme: 'dark' }}>
      {children}
    </div>
  );
}
