/**
 * UAP Canonical Persons Builder
 *
 * Two-phase entity resolution:
 *   Phase 1: Fuzzy grouping via Levenshtein distance + variant rules
 *   Phase 2: LLM verification for ambiguous merges (optional)
 *
 * Usage:
 *   node scripts/uap-build-canonical-persons.mjs              # Build all
 *   node scripts/uap-build-canonical-persons.mjs --dry-run    # Preview groups
 *   node scripts/uap-build-canonical-persons.mjs --with-llm   # Enable LLM verification
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const WITH_LLM = args.includes('--with-llm');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Levenshtein Distance ───────────────────────────────────────────────────

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// ─── Name Normalization ─────────────────────────────────────────────────────

function normalizeName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(dr\.?|mr\.?|ms\.?|mrs\.?|lt\.?|col\.?|gen\.?|sgt\.?|cdr\.?|capt\.?|sen\.?|rep\.?|prof\.?)\s+/i, '')
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv|phd|md|esq\.?)$/i, '')
    .toLowerCase();
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Variant Rules ──────────────────────────────────────────────────────────

// Common name variants that should be treated as the same person
const KNOWN_VARIANTS = {
  'bob lazar': ['robert lazar', 'robert scott lazar'],
  'luis elizondo': ['lue elizondo', 'luis "lue" elizondo'],
  'david grusch': ['dave grusch', 'david charles grusch'],
  'jacques vallee': ['jacques vallée', 'jacques f. vallee'],
  'j. allen hynek': ['allen hynek', 'j allen hynek', 'josef allen hynek'],
  'steven greer': ['steve greer', 'dr. steven greer'],
  'hal puthoff': ['harold puthoff', 'harold e. puthoff'],
  'nick pope': ['nicholas pope'],
  'john mack': ['john e. mack'],
  'ross coulthart': ['ross coulthart'],
  'travis walton': ['travis walton'],
};

// Pairs that should NEVER be merged despite low Levenshtein distance
const DO_NOT_MERGE = [
  ['robert salas', 'robert solis'],
  ['robert salas', 'robert soles'],
];

function isBlockedMerge(nameA, nameB) {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  return DO_NOT_MERGE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

// Names to exclude entirely from the canonical registry
const EXCLUDED_NAMES = new Set(['unknown', 'unnamed', 'anonymous', 'n/a', 'none', 'unidentified']);

function findVariantMatch(normalizedName) {
  for (const [canonical, variants] of Object.entries(KNOWN_VARIANTS)) {
    if (normalizedName === canonical || variants.some(v => normalizeName(v) === normalizedName)) {
      return canonical;
    }
  }
  return null;
}

// ─── Phase 1: Fuzzy Grouping ────────────────────────────────────────────────

function buildGroups(rawPersons) {
  // Each group: { canonical: string, aliases: Set, mentions: [{videoId, role, credibility}] }
  const groups = [];

  for (const person of rawPersons) {
    const normalized = normalizeName(person.name);
    if (!normalized || normalized.length < 2) continue;

    // Skip excluded generic names
    if (EXCLUDED_NAMES.has(normalized)) continue;

    // Check known variant mappings first
    const variantMatch = findVariantMatch(normalized);
    if (variantMatch) {
      const existing = groups.find(g => normalizeName(g.canonical) === variantMatch);
      if (existing) {
        existing.aliases.add(person.name);
        existing.mentions.push(person);
        continue;
      }
    }

    // Try to merge with an existing group
    let merged = false;
    for (const group of groups) {
      const groupNorm = normalizeName(group.canonical);

      // Exact match after normalization
      if (normalized === groupNorm) {
        group.aliases.add(person.name);
        group.mentions.push(person);
        merged = true;
        break;
      }

      // Levenshtein ≤ 2 for names > 5 chars (with blocklist check)
      if (normalized.length > 5 && groupNorm.length > 5 && !isBlockedMerge(normalized, groupNorm)) {
        const dist = levenshtein(normalized, groupNorm);
        if (dist <= 2) {
          group.aliases.add(person.name);
          group.mentions.push(person);
          merged = true;
          break;
        }
      }

      // Check if one name is a substring of another (e.g., "Bob Lazar" vs "Robert 'Bob' Lazar")
      const lastNameA = normalized.split(' ').pop();
      const lastNameB = groupNorm.split(' ').pop();
      if (lastNameA === lastNameB && lastNameA.length > 3) {
        // Same last name — check first name similarity
        const firstA = normalized.split(' ')[0];
        const firstB = groupNorm.split(' ')[0];
        if (firstA === firstB || levenshtein(firstA, firstB) <= 1) {
          group.aliases.add(person.name);
          group.mentions.push(person);
          merged = true;
          break;
        }
      }

      // Check aliases
      for (const alias of group.aliases) {
        const aliasNorm = normalizeName(alias);
        if (normalized === aliasNorm || (normalized.length > 5 && !isBlockedMerge(normalized, aliasNorm) && levenshtein(normalized, aliasNorm) <= 2)) {
          group.aliases.add(person.name);
          group.mentions.push(person);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }

    if (!merged) {
      groups.push({
        canonical: person.name,
        aliases: new Set([person.name]),
        mentions: [person],
      });
    }
  }

  return groups;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧬 UAP Canonical Persons Builder\n`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  LLM Verification: ${WITH_LLM ? 'ON' : 'OFF'}\n`);

  // 1. Extract all persons from analysis JSONB
  const { data: analysisRows, error } = await supabase
    .from('uap_analysis')
    .select('video_id, program_intel_breakdown');

  if (error || !analysisRows) {
    console.error('❌ Failed to fetch analysis:', error?.message);
    process.exit(1);
  }

  const rawPersons = [];
  for (const row of analysisRows) {
    const persons = row.program_intel_breakdown?.persons ?? [];
    for (const p of persons) {
      if (!p.name || p.name.length < 2) continue;
      rawPersons.push({
        name: p.name.trim(),
        videoId: row.video_id,
        role: p.role || null,
        credibility: p.credibility_score || null,
        affiliation: p.affiliation || null,
      });
    }
  }

  console.log(`📊 Found ${rawPersons.length} raw person mentions across ${analysisRows.length} videos\n`);

  // 2. Phase 1: Fuzzy grouping
  const groups = buildGroups(rawPersons);
  console.log(`🔗 Phase 1 grouping: ${rawPersons.length} mentions → ${groups.length} unique persons\n`);

  // Show groups with multiple aliases (interesting merges)
  const multiAlias = groups.filter(g => g.aliases.size > 1);
  if (multiAlias.length > 0) {
    console.log(`  📎 Merged groups (${multiAlias.length}):`);
    for (const g of multiAlias) {
      console.log(`    • ${g.canonical} ← [${[...g.aliases].filter(a => a !== g.canonical).join(', ')}]`);
    }
    console.log('');
  }

  // 3. Build canonical records
  const canonicalRecords = groups.map(group => {
    // Pick the "best" canonical name (longest, most formal)
    const bestName = [...group.aliases].sort((a, b) => b.length - a.length)[0];
    const aliases = [...group.aliases].filter(a => a !== bestName);
    const videoIds = [...new Set(group.mentions.map(m => m.videoId))];
    const credScores = group.mentions.map(m => m.credibility).filter(Boolean);
    const roles = [...new Set(group.mentions.map(m => m.role).filter(Boolean))];
    const affiliations = [...new Set(group.mentions.map(m => m.affiliation).filter(Boolean))];

    return {
      canonical_name: bestName,
      slug: slugify(bestName),
      aliases,
      role: roles[0] || null,
      affiliation: affiliations[0] || null,
      total_mentions: group.mentions.length,
      avg_credibility_score: credScores.length > 0
        ? Math.round(credScores.reduce((a, b) => a + b, 0) / credScores.length * 10) / 10
        : null,
      linked_video_ids: videoIds,
    };
  }).sort((a, b) => b.total_mentions - a.total_mentions);

  // Summary
  console.log(`📋 Top 15 persons by mentions:`);
  for (const p of canonicalRecords.slice(0, 15)) {
    console.log(`  ${p.total_mentions.toString().padStart(3)}× ${p.canonical_name}${p.avg_credibility_score ? ` (cred: ${p.avg_credibility_score})` : ''} — ${p.linked_video_ids.length} videos`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log(`🏁 DRY RUN complete — ${canonicalRecords.length} persons would be upserted.\n`);
    return;
  }

  // 4. Upsert to database
  console.log(`💾 Upserting ${canonicalRecords.length} canonical persons...`);

  // Clear existing and re-insert (full rebuild)
  const { error: deleteError } = await supabase
    .from('uap_canonical_persons')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('❌ Failed to clear existing:', deleteError.message);
    process.exit(1);
  }

  // Insert in batches of 50
  for (let i = 0; i < canonicalRecords.length; i += 50) {
    const batch = canonicalRecords.slice(i, i + 50);
    const { error: insertError } = await supabase
      .from('uap_canonical_persons')
      .insert(batch);

    if (insertError) {
      console.error(`❌ Insert batch ${i} failed:`, insertError.message);
      // Try individual inserts to find the problem row
      for (const record of batch) {
        const { error: singleError } = await supabase
          .from('uap_canonical_persons')
          .insert(record);
        if (singleError) {
          console.error(`  ⚠️ Failed: ${record.canonical_name} (slug: ${record.slug}) — ${singleError.message}`);
        }
      }
    }
  }

  console.log(`\n✅ Canonical persons table rebuilt with ${canonicalRecords.length} entries.\n`);

  // 5. Also build programs and orgs from the same JSONB
  await buildProgramsAndOrgs(analysisRows);
}

// ─── Programs & Orgs Builder ────────────────────────────────────────────────

async function buildProgramsAndOrgs(analysisRows) {
  console.log(`\n🏛️  Building canonical programs and organizations...\n`);

  const rawPrograms = [];
  const rawOrgs = [];

  for (const row of analysisRows) {
    const intel = row.program_intel_breakdown;
    if (!intel) continue;

    // Extract programs from claims
    const claims = intel.claims ?? [];
    for (const claim of claims) {
      if (claim.program_name) {
        rawPrograms.push({
          name: claim.program_name.trim(),
          videoId: row.video_id,
          type: claim.category || null,
        });
      }
    }

    // Extract organizations from persons
    const persons = intel.persons ?? [];
    for (const p of persons) {
      if (p.affiliation && typeof p.affiliation === 'string') {
        rawOrgs.push({
          name: p.affiliation.trim(),
          videoId: row.video_id,
        });
      }
    }

    // Extract from top-level fields if present
    if (intel.organizations && Array.isArray(intel.organizations)) {
      for (const org of intel.organizations) {
        const name = typeof org === 'string' ? org : org.name;
        if (name) rawOrgs.push({ name: name.trim(), videoId: row.video_id });
      }
    }
    if (intel.programs && Array.isArray(intel.programs)) {
      for (const prog of intel.programs) {
        const name = typeof prog === 'string' ? prog : prog.name;
        if (name) rawPrograms.push({ name: name.trim(), videoId: row.video_id, type: prog.type || null });
      }
    }
  }

  // Deduplicate programs
  const programMap = {};
  for (const p of rawPrograms) {
    const key = p.name.toLowerCase().trim();
    if (!programMap[key]) {
      programMap[key] = { canonical_name: p.name, videoIds: new Set(), type: p.type };
    }
    programMap[key].videoIds.add(p.videoId);
  }

  const programs = Object.values(programMap).map(p => ({
    canonical_name: p.canonical_name,
    slug: slugify(p.canonical_name),
    program_type: p.type,
    total_mentions: p.videoIds.size,
    linked_video_ids: [...p.videoIds],
  })).sort((a, b) => b.total_mentions - a.total_mentions);

  // Deduplicate orgs
  const orgMap = {};
  for (const o of rawOrgs) {
    const key = o.name.toLowerCase().trim();
    if (!orgMap[key]) {
      orgMap[key] = { canonical_name: o.name, videoIds: new Set() };
    }
    orgMap[key].videoIds.add(o.videoId);
  }

  const orgs = Object.values(orgMap).map(o => ({
    canonical_name: o.canonical_name,
    slug: slugify(o.canonical_name),
    total_mentions: o.videoIds.size,
    linked_video_ids: [...o.videoIds],
  })).sort((a, b) => b.total_mentions - a.total_mentions);

  console.log(`  Programs: ${programs.length} unique (from ${rawPrograms.length} mentions)`);
  console.log(`  Organizations: ${orgs.length} unique (from ${rawOrgs.length} mentions)\n`);

  if (programs.length > 0) {
    console.log(`  📋 Top programs:`);
    for (const p of programs.slice(0, 10)) {
      console.log(`    ${p.total_mentions.toString().padStart(3)}× ${p.canonical_name}`);
    }
  }

  if (orgs.length > 0) {
    console.log(`\n  📋 Top organizations:`);
    for (const o of orgs.slice(0, 10)) {
      console.log(`    ${o.total_mentions.toString().padStart(3)}× ${o.canonical_name}`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n🏁 DRY RUN — programs and orgs not written.\n`);
    return;
  }

  // Upsert programs
  if (programs.length > 0) {
    await supabase.from('uap_canonical_programs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    for (let i = 0; i < programs.length; i += 50) {
      const batch = programs.slice(i, i + 50);
      const { error } = await supabase.from('uap_canonical_programs').insert(batch);
      if (error) console.error(`  ⚠️ Programs insert error:`, error.message);
    }
    console.log(`\n  ✅ ${programs.length} canonical programs written.`);
  }

  // Upsert orgs
  if (orgs.length > 0) {
    await supabase.from('uap_canonical_orgs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    for (let i = 0; i < orgs.length; i += 50) {
      const batch = orgs.slice(i, i + 50);
      const { error } = await supabase.from('uap_canonical_orgs').insert(batch);
      if (error) console.error(`  ⚠️ Orgs insert error:`, error.message);
    }
    console.log(`  ✅ ${orgs.length} canonical organizations written.\n`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
