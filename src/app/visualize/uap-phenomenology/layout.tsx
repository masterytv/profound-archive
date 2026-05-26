import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UAP Phenomenology Network | Project Profound',
  description:
    'Explore the connections between UAP encounter phenomena — entity types, physical effects, craft shapes, and consciousness states — in an interactive 3D network visualization.',
  openGraph: {
    title: 'UAP Phenomenology Network',
    description:
      'Interactive 3D visualization of how UFO encounter phenomena co-occur across 3,700+ analyzed encounters.',
  },
};

export default function UapPhenomenologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
