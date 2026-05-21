import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search UFO/UAP Encounters | Project Profound",
  description:
    "Search across 500+ analyzed UFO/UAP encounter videos using keyword or AI-powered semantic search. Find timestamped moments, evidence-scored accounts, and government disclosure analysis.",
  openGraph: {
    title: "Search UFO/UAP Encounters | Project Profound",
    description:
      "AI-powered search across UFO/UAP contact accounts and disclosure analysis with timestamped results.",
    type: "website",
    url: "https://projectprofound.org/uap/search",
  },
  alternates: {
    canonical: "https://projectprofound.org/uap/search",
  },
};

export default function UapSearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
