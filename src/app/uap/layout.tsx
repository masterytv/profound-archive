import type { Metadata } from "next";
import { ogImage } from '@/lib/og/metadata';

export const metadata: Metadata = {
  title: "UFO & UAP Encounters | Project Profound",
  description:
    "Explore first-person UFO and UAP contact accounts, government disclosure analysis, and investigative research through AI-powered search and analysis.",
  openGraph: {
    title: "UFO & UAP Encounters | Project Profound",
    description:
      "Explore first-person UFO and UAP contact accounts, government disclosure analysis, and investigative research.",
    type: "website",
    ...ogImage('/uap').openGraph,
  },
  twitter: {
    card: 'summary_large_image',
    ...ogImage('/uap').twitter,
  },
};

export default function UapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="uap-domain min-h-screen"
      style={
        {
          "--domain-accent": "#16a34a",
          "--domain-accent-light": "#DCFCE7",
          "--domain-accent-dark": "#15803d",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
