import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.join(__dirname, '..');

function tsFiles(dir: string): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return []; }
  return entries.flatMap((e) => {
    const full = path.join(dir, e);
    if (statSync(full).isDirectory()) return e === 'node_modules' ? [] : tsFiles(full);
    return /\.(ts|tsx|mts|cts|js|mjs)$/.test(e) ? [full] : [];
  });
}

/** Job scripts must get their DB client from lib/supabase.ts (guarded), never build their own. */
const FORBIDDEN: Array<[RegExp, string]> = [
  [/\bcreateClient\s*\(/, 'calls createClient('],
  [/import\s*(?!type\b)\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*['"]@supabase\/supabase-js['"]/, 'imports createClient from @supabase/supabase-js'],
  [/require\(\s*['"]@supabase\/supabase-js['"]\s*\)/, 'requires @supabase/supabase-js'],
];

describe('job scripts use the guarded Supabase client', () => {
  const files = [...tsFiles(path.join(ROOT, 'job1')), ...tsFiles(path.join(ROOT, 'job2'))];
  it('scans job1/ and job2/ (vacuous until they exist)', () => {
    expect(Array.isArray(files)).toBe(true);
  });
  it('no job file creates a raw Supabase client', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const [re, why] of FORBIDDEN) if (re.test(src)) offenders.push(`${path.relative(ROOT, f)}: ${why}`);
    }
    expect(offenders).toEqual([]);
  });
  it('the detector itself flags the patterns it is meant to', () => {
    const bad = [
      "import { createClient } from '@supabase/supabase-js';",
      "const c = createClient(url, key)",
      "const { createClient } = require('@supabase/supabase-js')",
    ];
    for (const src of bad) expect(FORBIDDEN.some(([re]) => re.test(src))).toBe(true);
    expect(FORBIDDEN.some(([re]) => re.test("import type { SupabaseClient } from '@supabase/supabase-js';"))).toBe(false);
  });
});
