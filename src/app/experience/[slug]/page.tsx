/**
 * Experience Page — Dynamic Route
 *
 * Server Component that loads an experience config by slug,
 * validates it with Zod, and renders the ExperienceShell.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ExperienceShell } from '@/components/experience/ExperienceShell';
import { validateExperienceConfig } from '@/components/experience/schema';

// ── Experience Config Registry ──────────────────────────────────────────
// Phase 1: static import. Phase 2+: DB-backed fetch.

import { pennyAnaphylaxis } from '@/data/experiences/penny-anaphylaxis';

const experienceConfigs: Record<string, unknown> = {
  'penny-anaphylaxis': pennyAnaphylaxis,
};

// ── Route Params ────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ── Metadata ────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const raw = experienceConfigs[slug];
  if (!raw) return {};

  const result = validateExperienceConfig(raw);
  if (!result.success) return {};

  const config = result.data;

  return {
    title: `${config.meta.title} | Experience | Project Profound`,
    description: `An immersive experience based on ${config.meta.experiencer_name}'s near-death experience.`,
    openGraph: {
      title: config.meta.title,
      description: `Experience ${config.meta.experiencer_name}'s NDE through visuals, audio, and narrative.`,
      type: 'article',
    },
  };
}

// ── Page Component ──────────────────────────────────────────────────────

export default async function ExperiencePage({ params }: PageProps) {
  const { slug } = await params;
  const raw = experienceConfigs[slug];

  if (!raw) {
    notFound();
  }

  const result = validateExperienceConfig(raw);

  if (!result.success) {
    console.error(`[experience] Invalid config for "${slug}":`, result.error.format());
    notFound();
  }

  // Cast validated data back to ExperienceConfig type
  // (Zod output matches our interface)
  const config = result.data as import('@/components/experience/types').ExperienceConfig;

  return (
    <main className="experience-main">
      <ExperienceShell config={config} />
    </main>
  );
}
