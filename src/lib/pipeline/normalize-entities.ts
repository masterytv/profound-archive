/**
 * Entity Normalization Pipeline
 *
 * Deduplicates canonical entity records (persons, orgs, programs) by:
 *   1. Exact match after lowercasing + stripping punctuation
 *   2. Levenshtein distance ≤ 2 on normalized names
 *   3. Common abbreviation patterns (U.S. ↔ US, Dave ↔ David, etc.)
 *
 * Merge strategy: keep highest-mention record, union linked_video_ids,
 * add other names to aliases array.
 *
 * Called weekly by pg_cron → /api/cron/normalize-entities
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CanonicalEntity {
  id: number;
  canonical_name: string;
  slug: string;
  aliases: string[] | null;
  total_mentions: number | null;
  linked_video_ids: string[] | null;
  // Persons-only fields
  avg_credibility_score?: number | null;
  role?: string | null;
  affiliation?: string | null;
  bio?: string | null;
  // Orgs/Programs-only fields
  org_type?: string | null;
  program_type?: string | null;
  description?: string | null;
  linked_person_ids?: number[] | null;
}

interface MergeCandidate {
  primary: CanonicalEntity;
  duplicates: CanonicalEntity[];
  reason: string;
}

export interface NormalizeResult {
  tables_processed: string[];
  merge_candidates: number;
  merges_executed: number;
  duration_ms: number;
  details: {
    table: string;
    candidates: { primary: string; duplicates: string[]; reason: string }[];
    merges: number;
  }[];
  errors: string[];
}

// ─── Name Normalization ─────────────────────────────────────────────────────

// Common abbreviation expansions for fuzzy matching
const ABBREVIATIONS: Record<string, string[]> = {
  'united states': ['us', 'u.s.', 'u.s'],
  'department of defense': ['dod', 'd.o.d.'],
  'central intelligence agency': ['cia', 'c.i.a.'],
  'federal bureau of investigation': ['fbi', 'f.b.i.'],
  'national aeronautics and space administration': ['nasa', 'n.a.s.a.'],
  'unidentified aerial phenomena': ['uap', 'u.a.p.'],
  'unidentified flying object': ['ufo', 'u.f.o.'],
  'department of energy': ['doe', 'd.o.e.'],
  'defense intelligence agency': ['dia', 'd.i.a.'],
  'national security agency': ['nsa', 'n.s.a.'],
  'all-domain anomaly resolution office': ['aaro'],
  'advanced aerospace threat identification program': ['aatip'],
  'advanced aerospace weapons system application program': ['aawsap'],
};

// Common first name aliases
const FIRST_NAME_ALIASES: Record<string, string[]> = {
  'david': ['dave', 'dav'],
  'robert': ['bob', 'rob', 'bobby'],
  'william': ['bill', 'will', 'billy', 'willy'],
  'james': ['jim', 'jimmy'],
  'richard': ['rick', 'dick', 'rich'],
  'michael': ['mike', 'mick'],
  'thomas': ['tom', 'tommy'],
  'christopher': ['chris'],
  'daniel': ['dan', 'danny'],
  'stephen': ['steve', 'steven'],
  'steven': ['steve', 'stephen'],
  'edward': ['ed', 'eddie', 'ted'],
  'joseph': ['joe', 'joey'],
  'charles': ['charlie', 'chuck'],
  'kenneth': ['ken', 'kenny'],
  'timothy': ['tim', 'timmy'],
  'matthew': ['matt'],
  'anthony': ['tony'],
  'nicholas': ['nick'],
  'benjamin': ['ben'],
  'jonathan': ['jon', 'john'],
  'alexander': ['alex'],
  'elizabeth': ['liz', 'beth', 'lizzy'],
  'katherine': ['kate', 'kathy', 'cathy', 'catherine'],
  'catherine': ['kate', 'kathy', 'cathy', 'katherine'],
  'margaret': ['maggie', 'meg', 'peggy'],
  'jennifer': ['jen', 'jenny'],
  'jessica': ['jess', 'jessie'],
  'patricia': ['pat', 'patty'],
};

/** Strip punctuation, normalize whitespace, lowercase */
function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")     // normalize smart quotes
    .replace(/[.,;:!?()[\]{}"""]/g, '')  // strip punctuation
    .replace(/\s+/g, ' ')     // collapse whitespace
    .trim();
}

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Check if two names are abbreviation variants of each other.
 * e.g., "US Senate" ↔ "U.S. Senate" ↔ "United States Senate"
 */
function isAbbreviationMatch(normA: string, normB: string): boolean {
  for (const [full, abbrevs] of Object.entries(ABBREVIATIONS)) {
    for (const abbr of abbrevs) {
      // Check if one has the abbreviation and the other has the full form
      const aHasFull = normA.includes(full);
      const aHasAbbr = normA.includes(abbr);
      const bHasFull = normB.includes(full);
      const bHasAbbr = normB.includes(abbr);

      if ((aHasFull && bHasAbbr) || (aHasAbbr && bHasFull)) {
        // Replace the matched part and check if remainder matches
        const aReplaced = aHasFull ? normA.replace(full, '') : normA.replace(abbr, '');
        const bReplaced = bHasFull ? normB.replace(full, '') : normB.replace(abbr, '');
        if (normalizeForComparison(aReplaced) === normalizeForComparison(bReplaced)) {
          return true;
        }
      }
    }

    // Check abbreviation ↔ abbreviation (e.g., "us" ↔ "u.s.")
    for (let i = 0; i < abbrevs.length; i++) {
      for (let j = i + 1; j < abbrevs.length; j++) {
        if (
          (normA.includes(abbrevs[i]) && normB.includes(abbrevs[j])) ||
          (normA.includes(abbrevs[j]) && normB.includes(abbrevs[i]))
        ) {
          const aR = normA.replace(abbrevs[i], '').replace(abbrevs[j], '');
          const bR = normB.replace(abbrevs[i], '').replace(abbrevs[j], '');
          if (normalizeForComparison(aR) === normalizeForComparison(bR)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Check if two person names are first-name alias matches.
 * e.g., "David Grusch" ↔ "Dave Grusch"
 */
function isFirstNameAliasMatch(normA: string, normB: string): boolean {
  const partsA = normA.split(' ');
  const partsB = normB.split(' ');
  if (partsA.length < 2 || partsB.length < 2) return false;

  const firstA = partsA[0];
  const firstB = partsB[0];
  const lastA = partsA[partsA.length - 1];
  const lastB = partsB[partsB.length - 1];

  // Last names must match
  if (lastA !== lastB) return false;
  // First names must be alias matches
  if (firstA === firstB) return false; // exact match handled elsewhere

  // Check alias table both directions
  const aliasesA = FIRST_NAME_ALIASES[firstA] || [];
  const aliasesB = FIRST_NAME_ALIASES[firstB] || [];

  return aliasesA.includes(firstB) || aliasesB.includes(firstA);
}

// ─── Merge Finding ──────────────────────────────────────────────────────────

function findMergeCandidates(
  entities: CanonicalEntity[],
  tableName: string,
): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];
  const merged = new Set<number>(); // Track already-grouped entity IDs

  // Pre-compute normalized names
  const normalized = entities.map(e => ({
    entity: e,
    norm: normalizeForComparison(e.canonical_name),
  }));

  for (let i = 0; i < normalized.length; i++) {
    if (merged.has(normalized[i].entity.id)) continue;

    const group: CanonicalEntity[] = [];
    let reason = '';

    for (let j = i + 1; j < normalized.length; j++) {
      if (merged.has(normalized[j].entity.id)) continue;

      const a = normalized[i];
      const b = normalized[j];

      // 1. Exact match after normalization
      if (a.norm === b.norm) {
        group.push(b.entity);
        merged.add(b.entity.id);
        reason = 'exact_normalized';
        continue;
      }

      // 2. Levenshtein ≤ 2 (only for names > 5 chars to avoid false positives)
      if (a.norm.length > 5 && b.norm.length > 5) {
        const dist = levenshtein(a.norm, b.norm);
        if (dist <= 2) {
          group.push(b.entity);
          merged.add(b.entity.id);
          reason = reason || `levenshtein_${dist}`;
          continue;
        }
      }

      // 3. Abbreviation match (orgs/programs)
      if (tableName !== 'uap_canonical_persons') {
        if (isAbbreviationMatch(a.norm, b.norm)) {
          group.push(b.entity);
          merged.add(b.entity.id);
          reason = reason || 'abbreviation';
          continue;
        }
      }

      // 4. First-name alias match (persons only)
      if (tableName === 'uap_canonical_persons') {
        if (isFirstNameAliasMatch(a.norm, b.norm)) {
          group.push(b.entity);
          merged.add(b.entity.id);
          reason = reason || 'first_name_alias';
          continue;
        }
      }

      // 5. One name is a substring of another + same last word (for "David Grusch" vs "David Charles Grusch")
      if (tableName === 'uap_canonical_persons') {
        const partsA = a.norm.split(' ');
        const partsB = b.norm.split(' ');
        if (partsA.length >= 2 && partsB.length >= 2) {
          const lastA = partsA[partsA.length - 1];
          const lastB = partsB[partsB.length - 1];
          const firstA = partsA[0];
          const firstB = partsB[0];
          if (lastA === lastB && firstA === firstB && Math.abs(partsA.length - partsB.length) === 1) {
            group.push(b.entity);
            merged.add(b.entity.id);
            reason = reason || 'middle_name_variant';
            continue;
          }
        }
      }
    }

    if (group.length > 0) {
      merged.add(normalized[i].entity.id);
      // Primary = highest total_mentions
      const allInGroup = [normalized[i].entity, ...group];
      allInGroup.sort((a, b) => (b.total_mentions ?? 0) - (a.total_mentions ?? 0));
      candidates.push({
        primary: allInGroup[0],
        duplicates: allInGroup.slice(1),
        reason,
      });
    }
  }

  return candidates;
}

// ─── Merge Execution ────────────────────────────────────────────────────────

async function executeMerge(
  supabase: SupabaseClient,
  tableName: string,
  candidate: MergeCandidate,
): Promise<string | null> {
  const { primary, duplicates } = candidate;

  // 1. Merge linked_video_ids (union)
  const allVideoIds = new Set<string>(primary.linked_video_ids ?? []);
  for (const dup of duplicates) {
    for (const vid of dup.linked_video_ids ?? []) {
      allVideoIds.add(vid);
    }
  }

  // 2. Merge linked_person_ids if present (orgs/programs)
  const allPersonIds = new Set<number>(primary.linked_person_ids ?? []);
  for (const dup of duplicates) {
    for (const pid of dup.linked_person_ids ?? []) {
      allPersonIds.add(pid);
    }
  }

  // 3. Build merged aliases (include all duplicate names)
  const allAliases = new Set<string>(primary.aliases ?? []);
  for (const dup of duplicates) {
    allAliases.add(dup.canonical_name);
    for (const alias of dup.aliases ?? []) {
      allAliases.add(alias);
    }
  }
  // Remove the primary name from aliases
  allAliases.delete(primary.canonical_name);

  // 4. Compute merged total_mentions
  const mergedVideoIds = Array.from(allVideoIds);
  const totalMentions = mergedVideoIds.length;

  // 5. Build update object
  const updateData: Record<string, unknown> = {
    linked_video_ids: mergedVideoIds,
    aliases: Array.from(allAliases),
    total_mentions: totalMentions,
    updated_at: new Date().toISOString(),
  };

  // For persons: recompute avg_credibility_score
  if (tableName === 'uap_canonical_persons') {
    const credScores: number[] = [];
    if (primary.avg_credibility_score != null) {
      // Weight by mention count
      const weight = primary.total_mentions ?? 1;
      for (let i = 0; i < weight; i++) credScores.push(Number(primary.avg_credibility_score));
    }
    for (const dup of duplicates) {
      if (dup.avg_credibility_score != null) {
        const weight = dup.total_mentions ?? 1;
        for (let i = 0; i < weight; i++) credScores.push(Number(dup.avg_credibility_score));
      }
    }
    if (credScores.length > 0) {
      updateData.avg_credibility_score = Math.round(
        (credScores.reduce((a, b) => a + b, 0) / credScores.length) * 100
      ) / 100;
    }

    // Merge linked_person_ids is N/A for persons
  }

  if (tableName === 'uap_canonical_orgs' || tableName === 'uap_canonical_programs') {
    updateData.linked_person_ids = Array.from(allPersonIds);
  }

  // 6. Update primary record
  const { error: updateError } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', primary.id);

  if (updateError) {
    return `Failed to update primary ${primary.canonical_name}: ${updateError.message}`;
  }

  // 7. Delete duplicate records
  const dupIds = duplicates.map(d => d.id);
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .in('id', dupIds);

  if (deleteError) {
    return `Failed to delete duplicates for ${primary.canonical_name}: ${deleteError.message}`;
  }

  console.log(
    `[normalize-entities] Merged ${duplicates.map(d => `"${d.canonical_name}"`).join(', ')} → "${primary.canonical_name}" (${tableName})`
  );

  return null; // success
}

// ─── Main ───────────────────────────────────────────────────────────────────

const TABLES = [
  'uap_canonical_persons',
  'uap_canonical_orgs',
  'uap_canonical_programs',
] as const;

export async function normalizeEntities(
  supabase: SupabaseClient,
  dryRun: boolean = true,
): Promise<NormalizeResult> {
  const start = Date.now();
  const errors: string[] = [];
  const details: NormalizeResult['details'] = [];
  let totalCandidates = 0;
  let totalMerges = 0;

  console.log(`[normalize-entities] Starting ${dryRun ? 'DRY RUN' : 'LIVE MERGE'}...`);

  for (const table of TABLES) {
    // Fetch all entities with pagination
    const PAGE = 1000;
    const all: CanonicalEntity[] = [];
    let from = 0;
    let hasMore = true;

    const selectFields = table === 'uap_canonical_persons'
      ? 'id, canonical_name, slug, aliases, total_mentions, linked_video_ids, avg_credibility_score, role, affiliation, bio'
      : table === 'uap_canonical_orgs'
        ? 'id, canonical_name, slug, aliases, total_mentions, linked_video_ids, linked_person_ids, org_type, description'
        : 'id, canonical_name, slug, aliases, total_mentions, linked_video_ids, linked_person_ids, program_type, description';

    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select(selectFields)
        .range(from, from + PAGE - 1)
        .order('total_mentions', { ascending: false });

      if (error || !data || data.length === 0) {
        if (error) errors.push(`Fetch error on ${table}: ${error.message}`);
        hasMore = false;
      } else {
        all.push(...(data as unknown as CanonicalEntity[]));
        from += PAGE;
        if (data.length < PAGE) hasMore = false;
      }
    }

    console.log(`[normalize-entities] ${table}: ${all.length} entities loaded`);

    // Find merge candidates
    const candidates = findMergeCandidates(all, table);
    totalCandidates += candidates.length;

    const tableDetail: NormalizeResult['details'][number] = {
      table,
      candidates: candidates.map(c => ({
        primary: c.primary.canonical_name,
        duplicates: c.duplicates.map(d => d.canonical_name),
        reason: c.reason,
      })),
      merges: 0,
    };

    if (!dryRun) {
      for (const candidate of candidates) {
        const err = await executeMerge(supabase, table, candidate);
        if (err) {
          errors.push(err);
        } else {
          tableDetail.merges++;
          totalMerges++;
        }
      }
    }

    details.push(tableDetail);
  }

  const duration_ms = Date.now() - start;
  console.log(
    `[normalize-entities] ${dryRun ? 'DRY RUN' : 'COMPLETED'}: ` +
    `${totalCandidates} candidates, ${totalMerges} merges in ${duration_ms}ms`
  );

  return {
    tables_processed: [...TABLES],
    merge_candidates: totalCandidates,
    merges_executed: totalMerges,
    duration_ms,
    details,
    errors,
  };
}
