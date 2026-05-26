import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NDE Element Network | 3D Visualization | Project Profound',
  description: 'Explore how the 15 core near-death experience elements connect in 3D. See which elements appear together most often across thousands of documented NDEs.',
  openGraph: {
    title: 'NDE Element Network | Project Profound',
    description: 'Interactive 3D map of how NDE elements co-occur across thousands of experiences.',
  },
};

export default function NdeElementsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
