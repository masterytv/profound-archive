/**
 * UAP Analytics API
 *
 * GET /api/uap/analytics — Returns pre-computed cross-video analytics JSON.
 * Cached for 1 hour via Cache-Control. No auth required (public dashboard).
 *
 * Sources: uap_video_stats (fast), uap_analysis + uap_encounters (JSONB unpacking)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // ISR: revalidate hourly

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

export async function GET() {
  const supabase = getSupabase();

  try {
    // ── 1. Hero stats from uap_video_stats (fast, no JSONB) ──────────
    const { data: statsRows } = await supabase
      .from('uap_video_stats')
      .select('*');

    const stats = statsRows || [];
    const total = stats.length;

    const heroStats = {
      total_videos: total,
      total_persons: stats.reduce((s, r) => s + (r.persons_count || 0), 0),
      total_claims: stats.reduce((s, r) => s + (r.claims_count || 0), 0),
      total_programs: stats.reduce((s, r) => s + (r.programs_count || 0), 0),
      total_organizations: stats.reduce((s, r) => s + (r.organizations_count || 0), 0),
      psi_percent: total > 0 ? Math.round((stats.filter(r => r.has_psi_content).length / total) * 100) : 0,
      crash_retrieval_percent: total > 0 ? Math.round((stats.filter(r => r.has_crash_retrieval_claim).length / total) * 100) : 0,
      biologics_percent: total > 0 ? Math.round((stats.filter(r => r.has_biologics_claim).length / total) * 100) : 0,
      under_oath_percent: total > 0 ? Math.round((stats.filter(r => r.has_under_oath_claims).length / total) * 100) : 0,
      craft_observation_percent: total > 0 ? Math.round((stats.filter(r => r.has_craft_observation).length / total) * 100) : 0,
    };

    // ── 2. Tone distribution ────────────────────────────────────────
    const toneMap: Record<string, number> = {};
    for (const r of stats) {
      if (r.video_tone) toneMap[r.video_tone] = (toneMap[r.video_tone] || 0) + 1;
    }
    const tone_distribution = Object.entries(toneMap)
      .map(([tone, count]) => ({ id: tone, label: tone.replace(/_/g, ' '), value: count }))
      .sort((a, b) => b.value - a.value);

    // ── 3. Entity type distribution ─────────────────────────────────
    const entityMap: Record<string, number> = {};
    for (const r of stats) {
      if (r.dominant_entity_type && r.dominant_entity_type !== 'none' && r.dominant_entity_type !== 'not_stated') {
        entityMap[r.dominant_entity_type] = (entityMap[r.dominant_entity_type] || 0) + 1;
      }
    }
    const entity_distribution = Object.entries(entityMap)
      .map(([entity, count]) => ({ id: entity, label: entity.replace(/_/g, ' '), value: count }))
      .sort((a, b) => b.value - a.value);

    // ── 4. JSONB unpacking: persons + claims for network analysis ────
    const { data: analysisRows } = await supabase
      .from('uap_analysis')
      .select('video_id, program_intel_breakdown');

    // Person frequency + credibility
    const personMap: Record<string, { appearances: number; credibility_scores: number[]; roles: Set<string> }> = {};
    // Claim category frequency
    const claimCatMap: Record<string, number> = {};
    // Person ↔ Claim co-occurrence
    const personClaimMap: Record<string, Record<string, number>> = {};

    for (const row of (analysisRows || [])) {
      const intel = row.program_intel_breakdown;
      if (!intel) continue;

      // Persons
      const persons = intel.persons ?? [];
      for (const p of persons) {
        const name = p.name;
        if (!name) continue;
        if (!personMap[name]) personMap[name] = { appearances: 0, credibility_scores: [], roles: new Set() };
        personMap[name].appearances++;
        if (p.credibility_score) personMap[name].credibility_scores.push(p.credibility_score);
        if (p.role) personMap[name].roles.add(p.role);
      }

      // Claims
      const claims = intel.claims ?? [];
      const claimCategories = new Set<string>();
      for (const c of claims) {
        if (c.category) {
          claimCatMap[c.category] = (claimCatMap[c.category] || 0) + 1;
          claimCategories.add(c.category);
        }
      }

      // Person ↔ Claim matrix
      const personNames = persons.map((p: any) => p.name).filter(Boolean);
      for (const name of personNames) {
        if (!personClaimMap[name]) personClaimMap[name] = {};
        for (const cat of claimCategories) {
          personClaimMap[name][cat] = (personClaimMap[name][cat] || 0) + 1;
        }
      }
    }

    // Top persons (sorted by appearances)
    const top_persons = Object.entries(personMap)
      .map(([name, data]) => ({
        name,
        appearances: data.appearances,
        avg_credibility: data.credibility_scores.length > 0
          ? Math.round(data.credibility_scores.reduce((a, b) => a + b, 0) / data.credibility_scores.length)
          : null,
        roles: Array.from(data.roles),
      }))
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 15);

    // Claim categories
    const claim_categories = Object.entries(claimCatMap)
      .map(([category, count]) => ({ category: category.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count);

    // Person ↔ Claim matrix (top 10 persons × top 8 categories)
    const topPersonNames = top_persons.slice(0, 10).map(p => p.name);
    const topClaimCats = claim_categories.slice(0, 8).map(c => c.category.replace(/ /g, '_'));
    const person_claim_matrix = topPersonNames.map(person => {
      const row: Record<string, any> = { person };
      for (const cat of topClaimCats) {
        row[cat] = personClaimMap[person]?.[cat] || 0;
      }
      return row;
    });

    // ── 5. Encounter-level stats ────────────────────────────────────
    const { data: encounterRows } = await supabase
      .from('uap_encounters')
      .select('evidence_score, contact_depth_score, transformation_score, phenomenology_breakdown, experiencer_name')
      .not('phenomenology_breakdown', 'is', null);

    const encounterStats = {
      total_encounters: encounterRows?.length || 0,
      avg_evidence_score: 0,
      avg_contact_depth_score: 0,
      avg_transformation_score: 0,
      consciousness_alteration_rate: 0,
    };

    // Hynek classification distribution
    const hynekMap: Record<string, number> = {};
    // Physical effects aggregation
    const physicalEffectsMap: Record<string, number> = {};

    if (encounterRows && encounterRows.length > 0) {
      const evidenceScores = encounterRows.map(r => r.evidence_score).filter(Boolean);
      const contactScores = encounterRows.map(r => r.contact_depth_score).filter(Boolean);
      const transScores = encounterRows.map(r => r.transformation_score).filter(Boolean);

      encounterStats.avg_evidence_score = evidenceScores.length > 0
        ? Math.round(evidenceScores.reduce((a: number, b: number) => a + b, 0) / evidenceScores.length * 10) / 10
        : 0;
      encounterStats.avg_contact_depth_score = contactScores.length > 0
        ? Math.round(contactScores.reduce((a: number, b: number) => a + b, 0) / contactScores.length * 10) / 10
        : 0;
      encounterStats.avg_transformation_score = transScores.length > 0
        ? Math.round(transScores.reduce((a: number, b: number) => a + b, 0) / transScores.length * 10) / 10
        : 0;

      const withConsciousness = encounterRows.filter(r =>
        r.phenomenology_breakdown?.consciousness_effects?.length > 0
        || r.phenomenology_breakdown?.consciousness_alteration?.reported === true
      ).length;
      encounterStats.consciousness_alteration_rate = Math.round((withConsciousness / encounterRows.length) * 100);

      // Hynek classification from phenomenology JSONB (stored as string value)
      for (const row of encounterRows) {
        const hynek = row.phenomenology_breakdown?.hynek_classification;
        if (hynek && typeof hynek === 'string' && hynek !== 'unknown' && hynek !== 'not_stated') {
          hynekMap[hynek] = (hynekMap[hynek] || 0) + 1;
        }
      }

      // Physical effects from all four categories
      for (const row of encounterRows) {
        const phys = row.phenomenology_breakdown?.physical_effects;
        if (!phys) continue;
        for (const category of ['temporal', 'witness_physiological', 'environmental', 'vehicle_equipment'] as const) {
          const effects = phys[category];
          if (Array.isArray(effects)) {
            for (const effect of effects) {
              if (effect && effect !== 'none' && effect !== '') {
                physicalEffectsMap[effect] = (physicalEffectsMap[effect] || 0) + 1;
              }
            }
          }
        }
      }
    }

    const hynek_distribution = Object.entries(hynekMap)
      .map(([type, count]) => ({ id: type, label: type, value: count }))
      .sort((a, b) => b.value - a.value);

    const physical_effects = Object.entries(physicalEffectsMap)
      .map(([effect, count]) => ({ id: effect, label: effect.replace(/_/g, ' '), value: count }))
      .sort((a, b) => b.value - a.value);

    // ── 5b. Credibility & knowledge source analytics ────────────────
    const credibilityScores: number[] = [];
    const knowledgeSourceMap: Record<string, number> = {};
    const topicMap: Record<string, number> = {};

    for (const row of (analysisRows || [])) {
      const intel = row.program_intel_breakdown;
      if (!intel) continue;

      // Credibility from persons
      const persons = intel.persons ?? [];
      for (const p of persons) {
        if (p.credibility_score && typeof p.credibility_score === 'number') {
          credibilityScores.push(p.credibility_score);
        }
      }

      // Primary topic
      if (intel.primary_topic && intel.primary_topic !== 'unknown') {
        topicMap[intel.primary_topic] = (topicMap[intel.primary_topic] || 0) + 1;
      }
    }

    // Knowledge source breakdown from uap_video_stats
    // (video_tone already processed above; knowledge_source is from program_intel)
    for (const row of (analysisRows || [])) {
      const intel = row.program_intel_breakdown;
      if (!intel) continue;
      // Some videos store knowledge_source as string, others as array
      const sources = Array.isArray(intel.knowledge_sources)
        ? intel.knowledge_sources
        : intel.knowledge_source ? [intel.knowledge_source] : [];
      for (const src of sources) {
        if (src && src !== 'unknown') {
          knowledgeSourceMap[src] = (knowledgeSourceMap[src] || 0) + 1;
        }
      }
    }

    const avg_credibility = credibilityScores.length > 0
      ? Math.round(credibilityScores.reduce((a, b) => a + b, 0) / credibilityScores.length)
      : null;

    const knowledge_sources = Object.entries(knowledgeSourceMap)
      .map(([source, count]) => ({ id: source, label: source.replace(/_/g, ' '), value: count }))
      .sort((a, b) => b.value - a.value);

    const primary_topics = Object.entries(topicMap)
      .map(([topic, count]) => ({ id: topic, label: topic.replace(/_/g, ' '), value: count }))
      .sort((a, b) => b.value - a.value);

    // Top credible sources (persons with highest avg credibility, min 2 appearances)
    const top_credible_sources = Object.entries(personMap)
      .filter(([, data]) => data.credibility_scores.length >= 1)
      .map(([name, data]) => ({
        name,
        appearances: data.appearances,
        avg_credibility: Math.round(data.credibility_scores.reduce((a, b) => a + b, 0) / data.credibility_scores.length),
        roles: Array.from(data.roles),
      }))
      .sort((a, b) => b.avg_credibility - a.avg_credibility)
      .slice(0, 10);

    // ── 6. Daily fact — prefer DB table, fallback to inline generator ─
    const today = new Date().toISOString().split('T')[0];
    const { data: dbFact } = await supabase
      .from('uap_daily_facts')
      .select('fact_text, fact_category, fact_emoji, sample_size, related_video_ids')
      .lte('fact_date', today)
      .order('fact_date', { ascending: false })
      .limit(1)
      .single();

    const facts = generateFacts(heroStats, top_persons, claim_categories, encounterStats, entity_distribution);
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

    const daily_fact = dbFact
      ? { text: dbFact.fact_text, category: dbFact.fact_category, emoji: dbFact.fact_emoji, sample_size: dbFact.sample_size, related_video_ids: dbFact.related_video_ids }
      : facts.length > 0 ? facts[dayOfYear % facts.length] : null;

    // ── Response ────────────────────────────────────────────────────
    const analytics = {
      hero_stats: heroStats,
      tone_distribution,
      entity_distribution,
      claim_categories,
      top_persons,
      person_claim_matrix,
      encounter_stats: encounterStats,
      hynek_distribution,
      physical_effects,
      primary_topics,
      knowledge_sources,
      avg_credibility,
      top_credible_sources,
      daily_fact,
      all_facts: facts,
      computed_at: new Date().toISOString(),
    };

    return NextResponse.json(analytics, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('[UAP Analytics] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Fact Generator ──────────────────────────────────────────────────────────

function generateFacts(
  hero: any,
  persons: any[],
  claims: any[],
  encounters: any,
  entities: any[],
): { text: string; category: string }[] {
  const facts: { text: string; category: string }[] = [];

  // Percentage-based facts
  if (hero.psi_percent > 0) {
    facts.push({
      text: `${hero.psi_percent}% of analyzed UAP videos discuss PSI or consciousness phenomena.`,
      category: 'psi',
    });
  }
  if (hero.crash_retrieval_percent > 0) {
    facts.push({
      text: `${hero.crash_retrieval_percent}% of videos reference crash retrieval programs.`,
      category: 'crash_retrieval',
    });
  }
  if (hero.biologics_percent > 0) {
    facts.push({
      text: `${hero.biologics_percent}% of analyzed videos contain claims about recovered biological materials.`,
      category: 'biologics',
    });
  }
  if (hero.under_oath_percent > 0) {
    facts.push({
      text: `${hero.under_oath_percent}% of videos contain claims made under sworn testimony or oath.`,
      category: 'credibility',
    });
  }

  // Volume facts
  if (hero.total_persons > 0) {
    facts.push({
      text: `Our analysis has extracted ${hero.total_persons} unique persons of interest across ${hero.total_videos} UAP videos.`,
      category: 'network',
    });
  }
  if (hero.total_claims > 0) {
    facts.push({
      text: `${hero.total_claims} discrete claims have been mapped and categorized from UAP testimony.`,
      category: 'claims',
    });
  }

  // Person-specific facts
  if (persons.length >= 1) {
    const top = persons[0];
    facts.push({
      text: `${top.name} is the most referenced person in the dataset, appearing in ${top.appearances} videos${top.avg_credibility ? ` with an average credibility score of ${top.avg_credibility}/100` : ''}.`,
      category: 'persons',
    });
  }
  if (persons.length >= 3) {
    facts.push({
      text: `The top 3 most connected figures in UAP research: ${persons.slice(0, 3).map(p => p.name).join(', ')}.`,
      category: 'network',
    });
  }

  // Encounter facts
  if (encounters.total_encounters > 0) {
    facts.push({
      text: `${encounters.total_encounters} distinct UAP encounters have been analyzed with phenomenological breakdowns.`,
      category: 'encounters',
    });
    if (encounters.consciousness_alteration_rate > 0) {
      facts.push({
        text: `${encounters.consciousness_alteration_rate}% of analyzed encounters include reports of consciousness alteration.`,
        category: 'consciousness',
      });
    }
  }

  // Entity facts
  if (entities.length > 0) {
    const topEntity = entities[0];
    facts.push({
      text: `The most commonly reported entity type across encounters: ${topEntity.label} (${topEntity.value} encounters).`,
      category: 'entities',
    });
  }

  // Top claim category
  if (claims.length > 0) {
    facts.push({
      text: `"${claims[0].category}" is the most frequently documented claim category with ${claims[0].count} instances across the dataset.`,
      category: 'claims',
    });
  }

  return facts;
}
