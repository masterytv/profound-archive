/**
 * UAP Entity Name Normalizer
 *
 * Shared module for deduplicating and normalizing entity names
 * (persons, organizations, programs) extracted from video analyses.
 *
 * Why: The LLM extracts names with inconsistent formatting — honorific
 * prefixes ("Dr. Sean Kirkpatrick" vs "Sean Kirkpatrick"), parenthetical
 * expansions ("MUFON" vs "MUFON (Mutual UFO Network)"), and punctuation
 * variants ("U.S. Army" vs "US Army"). This module ensures one canonical
 * row per real-world entity.
 */

// ─── Honorific / Rank Prefixes to Strip ──────────────────────────────────────

const STRIP_PREFIXES =
  /^(Dr|Prof|Professor|Gen|General|Col|Colonel|Lt|Lieutenant|Sgt|Sergeant|Rev|Reverend|Sen|Senator|Rep|Representative|Cmdr|Commander|Capt|Captain|Maj|Major|Adm|Admiral|Gov|Governor|Pres|President|Mr|Mrs|Ms|Miss|Sir|Dame|Lord|Lady|Amb|Ambassador|Sec|Secretary)\.?\s+/i;

// ─── Normalizer Functions ────────────────────────────────────────────────────

/**
 * Normalize a PERSON name for matching and canonical storage.
 *
 * Rules applied in order:
 * 1. Trim whitespace
 * 2. Strip honorific / military rank prefixes
 * 3. Strip single-letter middle initials ("Frank E. Mannor" → "Frank Mannor")
 * 4. Collapse multiple spaces
 * 5. Title-case the result
 */
export function normalizePersonName(raw: string): string {
  let name = raw.trim();
  if (!name) return '';

  // Strip honorific prefix (may need multiple passes for "Gen. Col. Foo")
  for (let i = 0; i < 3; i++) {
    const before = name;
    name = name.replace(STRIP_PREFIXES, '');
    if (name === before) break;
  }

  // Strip single-letter middle initials: "Frank E. Mannor" → "Frank Mannor"
  name = name.replace(/\s+[A-Z]\.?\s+/g, ' ');

  // Collapse whitespace
  name = name.replace(/\s+/g, ' ').trim();

  // Title-case for consistency
  name = toTitleCase(name);

  return name;
}

/**
 * Normalize an ORGANIZATION name for matching and canonical storage.
 *
 * Rules:
 * 1. Strip trailing parenthetical expansion: "MUFON (Mutual UFO Network)" → "MUFON"
 *    BUT keep the expansion as an alias
 * 2. Normalize "U.S." → "US" style punctuation
 * 3. Collapse whitespace
 */
export function normalizeOrgName(raw: string): { canonical: string; alias: string | null } {
  let name = raw.trim();
  if (!name) return { canonical: '', alias: null };

  // Extract parenthetical expansion as alias: "MUFON (Mutual UFO Network)"
  let alias: string | null = null;
  const parenMatch = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const before = parenMatch[1].trim();
    const inside = parenMatch[2].trim();
    // If the part before parens is an acronym (all caps, ≤10 chars), use it as canonical
    if (before === before.toUpperCase() && before.length <= 10) {
      name = before;
      alias = inside;
    } else {
      // Otherwise keep the full form but store the short form as alias
      name = before;
      alias = inside;
    }
  }

  // Normalize "U.S." → "US", "U.K." → "UK" style punctuation
  name = normalizePunctuation(name);

  // Normalize slash-separated variants: "Area 51 / Groom Lake" → "Area 51" + alias
  const slashMatch = name.match(/^(.+?)\s*\/\s*(.+)$/);
  if (slashMatch) {
    name = slashMatch[1].trim();
    // Merge with existing alias or set new one
    alias = alias ? `${alias}; ${slashMatch[2].trim()}` : slashMatch[2].trim();
  }

  name = name.replace(/\s+/g, ' ').trim();

  return { canonical: name, alias };
}

/**
 * Normalize a PROGRAM name for matching and canonical storage.
 * Same rules as org normalization.
 */
export function normalizeProgramName(raw: string): { canonical: string; alias: string | null } {
  return normalizeOrgName(raw); // Same normalization rules apply
}

// ─── Slug Generation ─────────────────────────────────────────────────────────

/** Convert a name to a URL-safe slug */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

// ─── Matching Helpers ────────────────────────────────────────────────────────

/**
 * Check if a candidate name matches any of the known names/aliases.
 * Returns the matching canonical name or null.
 *
 * Match order:
 * 1. Exact case-insensitive match on canonical_name
 * 2. Exact case-insensitive match on any alias
 * 3. Slug match (handles remaining punctuation variants)
 */
export function findMatchingEntity<T extends { canonical_name: string; slug: string; aliases?: string[] | null }>(
  normalizedName: string,
  normalizedSlug: string,
  existingEntities: T[],
): T | null {
  const lowerName = normalizedName.toLowerCase();

  for (const entity of existingEntities) {
    // 1. Exact match on canonical_name
    if (entity.canonical_name.toLowerCase() === lowerName) return entity;

    // 2. Match on any alias
    if (entity.aliases?.some(a => a.toLowerCase() === lowerName)) return entity;

    // 3. Slug match (catches "U.S. Army" vs "US Army" etc.)
    if (entity.slug === normalizedSlug) return entity;
  }

  return null;
}

/**
 * Merge a new alias into an existing aliases array, deduplicating (case-insensitive).
 */
export function mergeAliases(existing: string[] | null, ...newAliases: (string | null)[]): string[] {
  const set = new Set((existing || []).map(a => a.toLowerCase()));
  const result = [...(existing || [])];

  for (const alias of newAliases) {
    if (!alias) continue;
    // Split semicolon-separated aliases
    for (const part of alias.split(';').map(s => s.trim()).filter(Boolean)) {
      if (!set.has(part.toLowerCase())) {
        set.add(part.toLowerCase());
        result.push(part);
      }
    }
  }

  return result;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/** Normalize punctuation: "U.S." → "US", "N.A.S.A." → "NASA" */
function normalizePunctuation(name: string): string {
  // Replace "U.S." patterns (single letters with dots) → "US"
  return name.replace(/\b([A-Z])\.([A-Z])\.?/g, '$1$2')
    .replace(/\b([A-Z])\.([A-Z])\.([A-Z])\.?/g, '$1$2$3')
    .replace(/\b([A-Z])\.([A-Z])\.([A-Z])\.([A-Z])\.?/g, '$1$2$3$4');
}

/** Title-case a name, preserving particles like "von", "de", "van" */
function toTitleCase(name: string): string {
  const particles = new Set(['von', 'de', 'van', 'der', 'del', 'la', 'le', 'di', 'da']);
  return name
    .split(' ')
    .map((word, i) => {
      if (i > 0 && particles.has(word.toLowerCase())) return word.toLowerCase();
      // Preserve all-caps acronyms (3+ letters)
      if (word.length >= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
