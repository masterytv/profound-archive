/**
 * Experience Listing Page
 *
 * Simple listing for Phase 1 (only Penny's demo).
 * Phase 2+ will pull from the database.
 */

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Immersive NDE Experiences | Project Profound',
  description:
    'Step inside near-death experiences through immersive visual stories. See what people report experiencing when they die and come back.',
};

const experiences = [
  {
    slug: 'penny-anaphylaxis',
    title: "Through the Void",
    experiencer: 'Penny',
    ndeType: 'Anaphylaxis',
    duration: '3–5 min',
    description: 'A critical care nurse stops breathing after a severe allergic reaction. What she sees on the other side changes everything she believes about life, death, and the power of a single act of kindness.',
  },
];

export default function ExperienceListingPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-3xl px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Immersive Experiences
          </h1>
          <p className="mt-4 text-lg text-[hsl(var(--muted-foreground))]">
            Step inside a near-death experience. See what they saw. Hear what they heard.
          </p>
        </div>

        {/* Experience cards */}
        <div className="space-y-6">
          {experiences.map((exp) => (
            <Link
              key={exp.slug}
              href={`/experience/${exp.slug}`}
              className="group block rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 transition-all hover:border-[hsl(var(--primary))] hover:shadow-lg hover:shadow-[hsl(var(--primary)/0.1)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[hsl(var(--card-foreground))] group-hover:text-[hsl(var(--primary))]">
                    {exp.title}
                  </h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    {exp.experiencer}&apos;s NDE &middot; {exp.ndeType} &middot; {exp.duration}
                  </p>
                </div>
                <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-3 py-1 text-xs font-medium text-[hsl(var(--primary))]">
                  New
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                {exp.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
