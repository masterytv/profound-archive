import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '3D Visualizations | Project Profound',
  description: 'Explore near-death experiences and UAP encounters through interactive 3D visualizations. See how elements connect, where encounters happen, and what patterns emerge.',
  openGraph: {
    title: '3D Visualizations | Project Profound',
    description: 'Interactive 3D maps of consciousness research data.',
  },
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
