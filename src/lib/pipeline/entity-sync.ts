/**
 * UAP Canonical Entity Sync
 *
 * Extracts persons, organizations, and programs from the
 * `program_intel_breakdown` JSONB in `uap_analysis` and upserts them
 * into the canonical tables (`uap_canonical_persons`, `uap_canonical_orgs`,
 * `uap_canonical_programs`).
 *
 * Called from intake-uap.ts Step 12.6, after contactee profile sync.
 * Also used by the one-time backfill script.
 *
 * Design: Mirrors contactee-sync.ts — zero LLM calls, pure ETL from
 * existing analysis data.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizePersonName,
  normalizeOrgName,
  normalizeProgramName,
  toSlug,
  findMatchingEntity,
  mergeAliases,
} from './entity-normalizer';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EntitySyncResult {
  persons: { created: number; updated: number; skipped: number };
  orgs: { created: number; updated: number; skipped: number };
  programs: { created: number; updated: number; skipped: number };
}

// ─── Cached Entity Lists (per-run) ──────────────────────────────────────────
// Loading all canonical entities into memory once per video avoids N+1 queries.
// For the backfill script, call clearEntityCache() between batches to pick up
// newly-created entities.

let cachedPersons: any[] | null = null;
let cachedOrgs: any[] | null = null;
let cachedPrograms: any[] | null = null;

export function clearEntityCache() {
  cachedPersons = null;
  cachedOrgs = null;
  cachedPrograms = null;
}

async function loadPersons(supabase: SupabaseClient) {
  if (!cachedPersons) {
    const { data } = await supabase
      .from('uap_canonical_persons')
      .select('id, canonical_name, slug, aliases, role, affiliation, total_mentions, linked_video_ids');
    cachedPersons = data || [];
  }
  return cachedPersons;
}

async function loadOrgs(supabase: SupabaseClient) {
  if (!cachedOrgs) {
    const { data } = await supabase
      .from('uap_canonical_orgs')
      .select('id, canonical_name, slug, aliases, org_type, total_mentions, linked_video_ids');
    cachedOrgs = data || [];
  }
  return cachedOrgs;
}

async function loadPrograms(supabase: SupabaseClient) {
  if (!cachedPrograms) {
    const { data } = await supabase
      .from('uap_canonical_programs')
      .select('id, canonical_name, slug, aliases, program_type, total_mentions, linked_video_ids');
    cachedPrograms = data || [];
  }
  return cachedPrograms;
}

// ─── Main: Sync All Entities for a Video ─────────────────────────────────────

/**
 * Sync canonical entities for a single processed video.
 * Reads entity data from program_intel_breakdown in uap_analysis,
 * normalizes names, and upserts to canonical tables.
 */
export async function syncEntitiesForVideo(
  supabase: SupabaseClient,
  videoId: string,
): Promise<EntitySyncResult> {
  const result: EntitySyncResult = {
    persons: { created: 0, updated: 0, skipped: 0 },
    orgs: { created: 0, updated: 0, skipped: 0 },
    programs: { created: 0, updated: 0, skipped: 0 },
  };

  // 1. Fetch program_intel_breakdown for this video
  const { data: analysisRow } = await supabase
    .from('uap_analysis')
    .select('program_intel_breakdown')
    .eq('video_id', videoId)
    .maybeSingle();

  const intel = analysisRow?.program_intel_breakdown;
  if (!intel) return result;

  // 2. Sync each entity type
  const persons = Array.isArray(intel.persons) ? intel.persons : [];
  const orgs = Array.isArray(intel.organizations) ? intel.organizations : [];
  const programs = Array.isArray(intel.programs) ? intel.programs : [];

  if (persons.length > 0) {
    result.persons = await syncPersons(supabase, videoId, persons);
  }
  if (orgs.length > 0) {
    result.orgs = await syncOrgs(supabase, videoId, orgs);
  }
  if (programs.length > 0) {
    result.programs = await syncPrograms(supabase, videoId, programs);
  }

  return result;
}

// ─── Person Sync ─────────────────────────────────────────────────────────────

async function syncPersons(
  supabase: SupabaseClient,
  videoId: string,
  rawPersons: any[],
): Promise<{ created: number; updated: number; skipped: number }> {
  const counts = { created: 0, updated: 0, skipped: 0 };
  const existing = await loadPersons(supabase);

  for (const raw of rawPersons) {
    const rawName = raw?.name;
    if (!rawName || typeof rawName !== 'string' || rawName.length < 2) {
      counts.skipped++;
      continue;
    }

    // Skip generic/unnamed entries
    if (/^(unknown|unnamed|unidentified|narrator|interviewer|host|anonymous)/i.test(rawName)) {
      counts.skipped++;
      continue;
    }

    // Skip single-word names (likely first-name-only references like "Matt", "Joe")
    if (!rawName.trim().includes(' ')) {
      counts.skipped++;
      continue;
    }

    const normalizedName = normalizePersonName(rawName);
    if (!normalizedName || normalizedName.length < 2) {
      counts.skipped++;
      continue;
    }

    const slug = toSlug(normalizedName);
    const match = findMatchingEntity(normalizedName, slug, existing);

    if (match) {
      // Update existing: append video_id and raw name as alias
      const currentVideoIds: string[] = match.linked_video_ids || [];
      if (currentVideoIds.includes(videoId)) {
        counts.skipped++;
        continue;
      }

      const updatedVideoIds = [...currentVideoIds, videoId];
      const updatedAliases = mergeAliases(match.aliases, rawName !== match.canonical_name ? rawName : null);

      await supabase
        .from('uap_canonical_persons')
        .update({
          linked_video_ids: updatedVideoIds,
          total_mentions: updatedVideoIds.length,
          aliases: updatedAliases.length > 0 ? updatedAliases : match.aliases,
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      // Update cache
      match.linked_video_ids = updatedVideoIds;
      match.total_mentions = updatedVideoIds.length;
      match.aliases = updatedAliases.length > 0 ? updatedAliases : match.aliases;

      counts.updated++;
    } else {
      // Create new canonical person
      const newPerson = {
        canonical_name: normalizedName,
        slug,
        role: raw.role || raw.status || null,
        affiliation: raw.title_or_affiliation || (Array.isArray(raw.affiliation) ? raw.affiliation[0] : raw.affiliation) || null,
        aliases: rawName !== normalizedName ? [rawName] : [],
        linked_video_ids: [videoId],
        total_mentions: 1,
      };

      const { data: inserted, error } = await supabase
        .from('uap_canonical_persons')
        .insert(newPerson)
        .select('id, canonical_name, slug, aliases, role, affiliation, total_mentions, linked_video_ids')
        .single();

      if (error) {
        // Slug collision — another concurrent insert may have created it
        if (error.code === '23505') {
          counts.skipped++;
        } else {
          console.error(`[EntitySync] Failed to create person "${normalizedName}": ${error.message}`);
          counts.skipped++;
        }
        continue;
      }

      // Add to cache for subsequent matches in this batch
      existing.push(inserted);
      counts.created++;
    }
  }

  return counts;
}

// ─── Organization Sync ───────────────────────────────────────────────────────

async function syncOrgs(
  supabase: SupabaseClient,
  videoId: string,
  rawOrgs: any[],
): Promise<{ created: number; updated: number; skipped: number }> {
  const counts = { created: 0, updated: 0, skipped: 0 };
  const existing = await loadOrgs(supabase);

  for (const raw of rawOrgs) {
    const rawName = raw?.name;
    if (!rawName || typeof rawName !== 'string' || rawName.length < 2) {
      counts.skipped++;
      continue;
    }

    const { canonical, alias } = normalizeOrgName(rawName);
    if (!canonical || canonical.length < 2) {
      counts.skipped++;
      continue;
    }

    const slug = toSlug(canonical);
    const match = findMatchingEntity(canonical, slug, existing);

    if (match) {
      const currentVideoIds: string[] = match.linked_video_ids || [];
      if (currentVideoIds.includes(videoId)) {
        counts.skipped++;
        continue;
      }

      const updatedVideoIds = [...currentVideoIds, videoId];
      const newAliases = mergeAliases(
        match.aliases,
        rawName !== match.canonical_name ? rawName : null,
        alias,
      );

      await supabase
        .from('uap_canonical_orgs')
        .update({
          linked_video_ids: updatedVideoIds,
          total_mentions: updatedVideoIds.length,
          aliases: newAliases.length > 0 ? newAliases : match.aliases,
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      match.linked_video_ids = updatedVideoIds;
      match.total_mentions = updatedVideoIds.length;
      match.aliases = newAliases.length > 0 ? newAliases : match.aliases;

      counts.updated++;
    } else {
      const newOrg = {
        canonical_name: canonical,
        slug,
        org_type: raw.type || raw.sector || null,
        aliases: mergeAliases(null, rawName !== canonical ? rawName : null, alias),
        linked_video_ids: [videoId],
        total_mentions: 1,
      };

      const { data: inserted, error } = await supabase
        .from('uap_canonical_orgs')
        .insert(newOrg)
        .select('id, canonical_name, slug, aliases, org_type, total_mentions, linked_video_ids')
        .single();

      if (error) {
        if (error.code === '23505') {
          counts.skipped++;
        } else {
          console.error(`[EntitySync] Failed to create org "${canonical}": ${error.message}`);
          counts.skipped++;
        }
        continue;
      }

      existing.push(inserted);
      counts.created++;
    }
  }

  return counts;
}

// ─── Program Sync ────────────────────────────────────────────────────────────

async function syncPrograms(
  supabase: SupabaseClient,
  videoId: string,
  rawPrograms: any[],
): Promise<{ created: number; updated: number; skipped: number }> {
  const counts = { created: 0, updated: 0, skipped: 0 };
  const existing = await loadPrograms(supabase);

  // Also load org names to check for org/program overlap
  const orgs = await loadOrgs(supabase);
  const orgNames = new Set(orgs.map(o => o.canonical_name.toLowerCase()));

  for (const raw of rawPrograms) {
    const rawName = raw?.name;
    if (!rawName || typeof rawName !== 'string' || rawName.length < 2) {
      counts.skipped++;
      continue;
    }

    const { canonical, alias } = normalizeProgramName(rawName);
    if (!canonical || canonical.length < 2) {
      counts.skipped++;
      continue;
    }

    // Skip if this "program" is actually an organization (per approved plan)
    if (orgNames.has(canonical.toLowerCase())) {
      counts.skipped++;
      continue;
    }

    const slug = toSlug(canonical);
    const match = findMatchingEntity(canonical, slug, existing);

    if (match) {
      const currentVideoIds: string[] = match.linked_video_ids || [];
      if (currentVideoIds.includes(videoId)) {
        counts.skipped++;
        continue;
      }

      const updatedVideoIds = [...currentVideoIds, videoId];
      const newAliases = mergeAliases(
        match.aliases,
        rawName !== match.canonical_name ? rawName : null,
        alias,
      );

      await supabase
        .from('uap_canonical_programs')
        .update({
          linked_video_ids: updatedVideoIds,
          total_mentions: updatedVideoIds.length,
          aliases: newAliases.length > 0 ? newAliases : match.aliases,
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id);

      match.linked_video_ids = updatedVideoIds;
      match.total_mentions = updatedVideoIds.length;
      match.aliases = newAliases.length > 0 ? newAliases : match.aliases;

      counts.updated++;
    } else {
      const newProgram = {
        canonical_name: canonical,
        slug,
        program_type: raw.type || raw.status || null,
        aliases: mergeAliases(null, rawName !== canonical ? rawName : null, alias),
        linked_video_ids: [videoId],
        total_mentions: 1,
      };

      const { data: inserted, error } = await supabase
        .from('uap_canonical_programs')
        .insert(newProgram)
        .select('id, canonical_name, slug, aliases, program_type, total_mentions, linked_video_ids')
        .single();

      if (error) {
        if (error.code === '23505') {
          counts.skipped++;
        } else {
          console.error(`[EntitySync] Failed to create program "${canonical}": ${error.message}`);
          counts.skipped++;
        }
        continue;
      }

      existing.push(inserted);
      counts.created++;
    }
  }

  return counts;
}
