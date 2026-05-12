/**
 * UAP Daily Fact Generator
 *
 * Queries analysis data and generates statistically-backed daily facts.
 * N-value enforcement: N≥5 for percentages, N≥10 for correlations.
 *
 * Usage:
 *   node scripts/uap-generate-facts.mjs              # Generate 30 days ahead
 *   node scripts/uap-generate-facts.mjs --days 7     # Generate 7 days
 *   node scripts/uap-generate-facts.mjs --dry-run    # Preview only
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DAYS = parseInt(args[args.indexOf('--days') + 1] || '30', 10);
const MIN_N_PERCENTAGE = 5;
const MIN_N_CORRELATION = 10;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Fact Generators ────────────────────────────────────────────────────────

async function generateFactPool() {
  const facts = [];

  // 1. Video tone distribution
  const { data: tones } = await supabase
    .from('uap_video_stats')
    .select('video_tone');

  if (tones && tones.length >= MIN_N_PERCENTAGE) {
    const toneCounts = {};
    tones.forEach(r => {
      if (r.video_tone) toneCounts[r.video_tone] = (toneCounts[r.video_tone] || 0) + 1;
    });
    const totalWithTone = Object.values(toneCounts).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(toneCounts).sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
      const [topTone, topCount] = sorted[0];
      const pct = Math.round((topCount / totalWithTone) * 100);
      facts.push({
        fact_text: `${pct}% of analyzed UAP videos have a "${topTone}" tone — the most common across our ${totalWithTone}-video corpus.`,
        fact_category: 'analysis',
        fact_emoji: '🎙️',
        sample_size: totalWithTone,
        supporting_data: { distribution: toneCounts },
      });
    }
  }

  // 2. Entity type distribution from encounters
  const { data: encounters } = await supabase
    .from('uap_encounters')
    .select('phenomenology_breakdown, video_id');

  if (encounters && encounters.length >= MIN_N_PERCENTAGE) {
    const entityCounts = {};
    const entityVideos = {};
    encounters.forEach(enc => {
      const entity = enc.phenomenology_breakdown?.dominant_entity_type;
      if (entity && entity !== 'none' && entity !== 'unknown') {
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
        if (!entityVideos[entity]) entityVideos[entity] = [];
        entityVideos[entity].push(enc.video_id);
      }
    });

    const sorted = Object.entries(entityCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topEntity, count] = sorted[0];
      const label = topEntity.replace(/_/g, ' ');
      facts.push({
        fact_text: `"${label}" is the most frequently reported entity type in our database, appearing in ${count} of ${encounters.length} documented encounters.`,
        fact_category: 'entity',
        fact_emoji: '👽',
        sample_size: encounters.length,
        supporting_data: { distribution: entityCounts },
        related_video_ids: (entityVideos[topEntity] || []).slice(0, 5),
      });
    }

    // Physical effects
    const physicalEffects = {};
    encounters.forEach(enc => {
      const effects = enc.phenomenology_breakdown?.physical_effects;
      if (Array.isArray(effects)) {
        effects.forEach(e => {
          if (e && e !== 'none') physicalEffects[e] = (physicalEffects[e] || 0) + 1;
        });
      }
    });

    const sortedEffects = Object.entries(physicalEffects).sort((a, b) => b[1] - a[1]);
    if (sortedEffects.length > 0 && sortedEffects[0][1] >= 3) {
      const [topEffect, effectCount] = sortedEffects[0];
      const label = topEffect.replace(/_/g, ' ');
      facts.push({
        fact_text: `The most commonly reported physical effect during UAP encounters is "${label}", documented in ${effectCount} cases.`,
        fact_category: 'phenomenon',
        fact_emoji: '⚡',
        sample_size: encounters.length,
        supporting_data: { effects: physicalEffects },
      });
    }
  }

  // 3. Intelligence value stats
  const { data: intelStats } = await supabase
    .from('uap_video_stats')
    .select('intelligence_value, video_id')
    .not('intelligence_value', 'is', null)
    .order('intelligence_value', { ascending: false });

  if (intelStats && intelStats.length >= MIN_N_PERCENTAGE) {
    const avg = intelStats.reduce((s, r) => s + r.intelligence_value, 0) / intelStats.length;
    const high = intelStats.filter(r => r.intelligence_value >= 8).length;
    facts.push({
      fact_text: `The average intelligence value across our UAP video corpus is ${avg.toFixed(1)}/10. ${high} videos scored 8 or higher — indicating exceptional research value.`,
      fact_category: 'quality',
      fact_emoji: '🧠',
      sample_size: intelStats.length,
      supporting_data: { avg: avg.toFixed(1), high_count: high },
      related_video_ids: intelStats.slice(0, 3).map(r => r.video_id),
    });
  }

  // 4. Evidence scores
  const { data: evidenceData } = await supabase
    .from('uap_encounters')
    .select('evidence_score, video_id, experiencer_name')
    .not('evidence_score', 'is', null)
    .order('evidence_score', { ascending: false });

  if (evidenceData && evidenceData.length >= MIN_N_PERCENTAGE) {
    const avg = evidenceData.reduce((s, r) => s + r.evidence_score, 0) / evidenceData.length;
    const top = evidenceData[0];
    facts.push({
      fact_text: `The average evidence strength score across ${evidenceData.length} analyzed encounters is ${avg.toFixed(1)}/20. The highest-scoring account comes from ${top.experiencer_name || 'an unnamed experiencer'}.`,
      fact_category: 'evidence',
      fact_emoji: '🏆',
      sample_size: evidenceData.length,
      supporting_data: { avg: avg.toFixed(1), top_score: top.evidence_score },
      related_video_ids: [top.video_id],
    });
  }

  // 5. PSI content prevalence
  const { data: psiData } = await supabase
    .from('uap_video_stats')
    .select('has_psi_content, video_id');

  if (psiData && psiData.length >= MIN_N_PERCENTAGE) {
    const psiCount = psiData.filter(r => r.has_psi_content === true).length;
    const pct = Math.round((psiCount / psiData.length) * 100);
    facts.push({
      fact_text: `${pct}% of UAP videos in our database contain references to psi phenomena or consciousness-related experiences (${psiCount} of ${psiData.length} videos).`,
      fact_category: 'phenomenon',
      fact_emoji: '🔮',
      sample_size: psiData.length,
      supporting_data: { psi_count: psiCount, total: psiData.length, pct },
    });
  }

  // 6. Under-oath claims
  const { data: oathData } = await supabase
    .from('uap_video_stats')
    .select('has_under_oath_claims, video_id');

  if (oathData && oathData.length >= MIN_N_PERCENTAGE) {
    const oathCount = oathData.filter(r => r.has_under_oath_claims === true).length;
    if (oathCount > 0) {
      facts.push({
        fact_text: `${oathCount} videos in our corpus contain testimony from witnesses who have made their claims under oath or legal affirmation.`,
        fact_category: 'evidence',
        fact_emoji: '⚖️',
        sample_size: oathData.length,
        supporting_data: { oath_count: oathCount, total: oathData.length },
      });
    }
  }

  // 7. Contact depth scores
  const { data: contactData } = await supabase
    .from('uap_encounters')
    .select('contact_depth_score, video_id, experiencer_name')
    .not('contact_depth_score', 'is', null)
    .order('contact_depth_score', { ascending: false });

  if (contactData && contactData.length >= MIN_N_PERCENTAGE) {
    const deep = contactData.filter(r => r.contact_depth_score >= 10).length;
    facts.push({
      fact_text: `${deep} of ${contactData.length} documented encounters describe "deep contact" experiences (score ≥10/15), involving telepathic communication, consciousness transfer, or ontological shifts.`,
      fact_category: 'contact',
      fact_emoji: '🌌',
      sample_size: contactData.length,
      supporting_data: { deep_count: deep },
      related_video_ids: contactData.slice(0, 3).map(r => r.video_id),
    });
  }

  // 8. Hynek classification distribution
  if (encounters && encounters.length >= MIN_N_PERCENTAGE) {
    const hynekCounts = {};
    encounters.forEach(enc => {
      const hynek = enc.phenomenology_breakdown?.hynek_classification;
      if (hynek && hynek !== 'unknown' && hynek !== 'not_stated') {
        hynekCounts[hynek] = (hynekCounts[hynek] || 0) + 1;
      }
    });

    const hynekLabels = {
      ce1: 'Close Encounter of the First Kind (visual)',
      ce2: 'Close Encounter of the Second Kind (physical evidence)',
      ce3: 'Close Encounter of the Third Kind (entity contact)',
      ce4: 'Close Encounter of the Fourth Kind (abduction)',
      ce5: 'Close Encounter of the Fifth Kind (bilateral contact)',
    };

    const sorted = Object.entries(hynekCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] >= 3) {
      const [topHynek, count] = sorted[0];
      facts.push({
        fact_text: `The most common encounter classification in our database is ${hynekLabels[topHynek] || topHynek}, with ${count} documented cases.`,
        fact_category: 'classification',
        fact_emoji: '📡',
        sample_size: encounters.length,
        supporting_data: { hynek_distribution: hynekCounts },
      });
    }
  }

  // 9. Transformation scores
  const { data: transformData } = await supabase
    .from('uap_encounters')
    .select('transformation_score, video_id')
    .not('transformation_score', 'is', null);

  if (transformData && transformData.length >= MIN_N_PERCENTAGE) {
    const highTransform = transformData.filter(r => r.transformation_score >= 70).length;
    const pct = Math.round((highTransform / transformData.length) * 100);
    facts.push({
      fact_text: `${pct}% of experiencers in our database report significant life transformation following their encounter (transformation score ≥70/100).`,
      fact_category: 'transformation',
      fact_emoji: '🦋',
      sample_size: transformData.length,
      supporting_data: { high_count: highTransform, pct },
    });
  }

  // 10. Persons/witnesses mentioned
  const { data: intelData } = await supabase
    .from('uap_analysis')
    .select('video_id, program_intel_breakdown');

  if (intelData && intelData.length >= MIN_N_PERCENTAGE) {
    let totalPersons = 0;
    const allPersonNames = new Set();
    intelData.forEach(row => {
      const persons = row.program_intel_breakdown?.persons;
      if (Array.isArray(persons)) {
        totalPersons += persons.length;
        persons.forEach(p => {
          if (p.name) allPersonNames.add(p.name);
        });
      }
    });

    facts.push({
      fact_text: `Our analysis has identified ${allPersonNames.size} unique individuals mentioned across ${intelData.length} UAP videos — from military personnel to researchers to experiencers.`,
      fact_category: 'persons',
      fact_emoji: '👤',
      sample_size: intelData.length,
      supporting_data: { unique_persons: allPersonNames.size, total_mentions: totalPersons },
    });
  }

  // 11. Content type breakdown
  const { data: contentTypes } = await supabase
    .from('uap_vids')
    .select('content_type')
    .eq('intake_status', 'complete');

  if (contentTypes && contentTypes.length >= MIN_N_PERCENTAGE) {
    const typeCounts = {};
    contentTypes.forEach(r => {
      if (r.content_type) typeCounts[r.content_type] = (typeCounts[r.content_type] || 0) + 1;
    });
    const labels = {
      first_person: 'first-person accounts',
      interview: 'interviews',
      retold_encounter: 'retold encounters',
      research_analysis: 'research analysis',
      program_disclosure: 'program disclosures',
      retold_story: 'retold stories',
    };
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2) {
      facts.push({
        fact_text: `Our UAP video library spans ${sorted.length} content categories. The most common: ${labels[sorted[0][0]] || sorted[0][0]} (${sorted[0][1]} videos) and ${labels[sorted[1][0]] || sorted[1][0]} (${sorted[1][1]} videos).`,
        fact_category: 'general',
        fact_emoji: '📚',
        sample_size: contentTypes.length,
        supporting_data: { distribution: typeCounts },
      });
    }
  }

  // 12. Decade coverage
  const { data: decadeData } = await supabase
    .from('uap_vids')
    .select('published_at')
    .eq('intake_status', 'complete')
    .not('published_at', 'is', null);

  if (decadeData && decadeData.length >= MIN_N_PERCENTAGE) {
    const years = decadeData.map(r => new Date(r.published_at).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    facts.push({
      fact_text: `Our UAP video archive spans ${maxYear - minYear} years of content, from ${minYear} to ${maxYear} — capturing the evolution of UAP discourse over time.`,
      fact_category: 'general',
      fact_emoji: '📅',
      sample_size: decadeData.length,
      supporting_data: { min_year: minYear, max_year: maxYear },
    });
  }

  return facts;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎯 UAP Daily Fact Generator\n`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Days to generate: ${DAYS}\n`);

  // Generate fact pool
  const factPool = await generateFactPool();
  console.log(`📊 Generated ${factPool.length} unique facts from analysis data\n`);

  if (factPool.length === 0) {
    console.log('⚠️  No facts generated — insufficient data (N-value thresholds not met)');
    return;
  }

  // Check existing facts to avoid duplicates
  const today = new Date();
  const { data: existingFacts } = await supabase
    .from('uap_daily_facts')
    .select('fact_date')
    .gte('fact_date', today.toISOString().split('T')[0]);

  const existingDates = new Set((existingFacts || []).map(f => f.fact_date));

  // Assign facts to dates, cycling through the pool
  const factsToInsert = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    if (existingDates.has(dateStr)) {
      console.log(`  ⏭️  ${dateStr} — already has a fact, skipping`);
      continue;
    }

    const fact = factPool[i % factPool.length];
    factsToInsert.push({
      fact_date: dateStr,
      fact_text: fact.fact_text,
      fact_category: fact.fact_category,
      fact_emoji: fact.fact_emoji,
      supporting_data: fact.supporting_data,
      sample_size: fact.sample_size,
      related_video_ids: fact.related_video_ids || [],
    });

    console.log(`  📌 ${dateStr} [${fact.fact_category}] ${fact.fact_emoji} ${fact.fact_text.slice(0, 80)}...`);
  }

  if (DRY_RUN) {
    console.log(`\n🏁 DRY RUN complete — ${factsToInsert.length} facts would be inserted.\n`);
    return;
  }

  if (factsToInsert.length === 0) {
    console.log('\n✅ All dates already populated — nothing to insert.\n');
    return;
  }

  const { error } = await supabase.from('uap_daily_facts').insert(factsToInsert);
  if (error) {
    console.error('\n❌ Insert failed:', error.message);
    process.exit(1);
  }

  console.log(`\n✅ Inserted ${factsToInsert.length} daily facts.\n`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
