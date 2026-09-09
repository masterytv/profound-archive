/**
 * Regenerate the derived ("celebration") fields of one experiencer profile
 * from its linked videos, using the same pipeline the admin refresh button uses.
 * No LLM calls — highlight quotes, channel appearances, themes, trigger,
 * scores and view totals are all re-derived from nde_vids / nde_analysis.
 *
 * Usage: npx tsx scripts/regenerate-experiencer-profile.ts <profileId> [<profileId> ...]
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)
 * from the environment, falling back to .env.local.
 */

import { existsSync, readFileSync } from 'fs';
import { createExperiencerPipelineClient, generateExperiencerProfile } from '../src/lib/pipeline/experiencer-profile';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  }
}

async function main() {
  const ids = process.argv.slice(2).map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
  if (ids.length === 0) {
    console.error('Usage: npx tsx scripts/regenerate-experiencer-profile.ts <profileId> [...]');
    process.exit(1);
  }
  const supabase = createExperiencerPipelineClient();
  let failed = 0;
  for (const id of ids) {
    const result = await generateExperiencerProfile(supabase, id);
    console.log(`[${id}] ${result.full_name || '?'} (${result.slug || '?'}): ${result.status} — ${result.message ?? ''}`);
    if (result.status !== 'success') failed++;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
