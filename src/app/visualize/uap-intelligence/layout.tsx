import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UAP Intelligence Network | Project Profound',
  description:
    'Explore the connections between key people, organizations, and programs in the UAP disclosure landscape through an interactive 3D knowledge graph.',
  openGraph: {
    title: 'UAP Intelligence Network',
    description:
      'Interactive 3D visualization of how investigators, whistleblowers, agencies, and programs connect through shared video evidence.',
  },
};

export default function UapIntelligenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
