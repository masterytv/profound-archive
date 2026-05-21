'use client';

/**
 * UAP Intelligence Dashboard — Client Layout Component
 *
 * Assembles all widget components into a responsive grid layout.
 * Handles the loading/empty states gracefully.
 */

import { BarChart3 } from 'lucide-react';
import {
  HeroStats,
  SecondaryStats,
  DailyFactCard,
  ClaimDistribution,
  ToneDistribution,
  PersonLeaderboard,
  PersonClaimHeatmap,
  EncounterStats,
  HynekBreakdown,
  PhysicalEffects,
  PrimaryTopics,
  TopCredibleSources,
} from './components';

interface AnalyticsData {
  hero_stats: any;
  tone_distribution: any[];
  entity_distribution: any[];
  claim_categories: any[];
  top_persons: any[];
  person_claim_matrix: any[];
  encounter_stats: any;
  hynek_distribution: any[];
  physical_effects: any[];
  primary_topics: any[];
  knowledge_sources: any[];
  avg_credibility: number | null;
  top_credible_sources: any[];
  daily_fact: any;
  all_facts: any[];
  computed_at: string;
}

export function IntelligenceDashboard({ analytics }: { analytics: AnalyticsData | null }) {
  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2 font-serif">
          Intelligence Dashboard Loading
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Analytics are computed from our video analysis pipeline. Once videos are analyzed,
          cross-video intelligence will appear here.
        </p>
      </div>
    );
  }

  // Extract heatmap categories from the matrix data
  const heatmapCategories = analytics.person_claim_matrix.length > 0
    ? Object.keys(analytics.person_claim_matrix[0]).filter(k => k !== 'person')
    : [];

  return (
    <div className="min-h-screen">
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <section
        className="border-b border-border/60"
        style={{
          background: 'linear-gradient(135deg, var(--domain-accent-light, #DCFCE7)08, var(--background) 40%, var(--domain-accent-light, #DCFCE7)04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[var(--domain-accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--domain-accent)] uppercase tracking-wider">
                UFO/UAP Research
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-serif tracking-tight">
                Intelligence Dashboard
              </h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
            Cross-video analytics and network intelligence derived from AI analysis of our UFO/UAP research dataset.
            Updated daily as new videos are processed.
          </p>
        </div>
      </section>

      {/* ── Dashboard Content ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Layer 1: Hero Stats */}
        <HeroStats data={analytics.hero_stats} />

        {/* Secondary Stats Pills */}
        <SecondaryStats data={analytics.hero_stats} />

        {/* Layer 2: Daily Fact */}
        <DailyFactCard fact={analytics.daily_fact} />

        {/* Layer 3: Distribution Charts — side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ClaimDistribution data={analytics.claim_categories} />
          </div>
          <div className="lg:col-span-2">
            <ToneDistribution data={analytics.tone_distribution} />
          </div>
        </div>

        {/* Layer 4: Person Intelligence — side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <PersonLeaderboard data={analytics.top_persons} />
          </div>
          <div className="lg:col-span-3">
            <PersonClaimHeatmap data={analytics.person_claim_matrix} categories={heatmapCategories} />
          </div>
        </div>

        {/* Layer 5: Encounter Analysis — Expandable */}
        <EncounterStats
          data={analytics.encounter_stats}
          entities={analytics.entity_distribution}
        />

        {/* Layer 6: Phenomenology Deep Dive — Hynek + Physical Effects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HynekBreakdown data={analytics.hynek_distribution} />
          <PhysicalEffects data={analytics.physical_effects} />
        </div>

        {/* Layer 7: Topics + Credibility — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <PrimaryTopics data={analytics.primary_topics} />
          </div>
          <div className="lg:col-span-2">
            <TopCredibleSources
              data={analytics.top_credible_sources}
              avgCredibility={analytics.avg_credibility}
            />
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center py-6 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            Analytics computed from {analytics.hero_stats.total_videos} analyzed videos ·{' '}
            Last updated {new Date(analytics.computed_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
