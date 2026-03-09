/**
 * scripts/apply-migration.ts
 * One-shot script to apply 20260308_create_nde_questions.sql to the live DB.
 * Tries the Supabase REST /sql endpoint first; falls back to a table existence check.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing env vars');
    process.exit(1);
  }

  // 1. See if table already exists
  const check = await fetch(`${SUPABASE_URL}/rest/v1/nde_questions?select=id&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });

  if (check.ok) {
    const rows = await check.json() as { id: string }[];
    console.log(`✅  nde_questions table already exists (${rows.length} rows in sample).`);
    return;
  }

  console.log(`Table not found (${check.status}). Attempting to apply migration…`);

  // 2. Try /rest/v1/sql
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260308_create_nde_questions.sql'),
    'utf8'
  );

  const sendSQL = async (body: object) => fetch(`${SUPABASE_URL}/rest/v1/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const sqlResp = await sendSQL({ query: sql });
  if (sqlResp.ok) {
    console.log('✅  Migration applied via /rest/v1/sql');
    return;
  }

  const errBody = await sqlResp.text();
  console.log(`/rest/v1/sql returned ${sqlResp.status}: ${errBody.slice(0, 300)}`);

  // 3. Print instructions
  const projectRef = SUPABASE_URL.match(/https?:\/\/([^.]+)/)?.[1] ?? 'unknown';
  console.log('\n──────────────────────────────────────────');
  console.log('📋  Manual migration required:');
  console.log(`    1. Open: https://supabase.com/dashboard/project/${projectRef}/sql`);
  console.log('    2. Paste contents of: supabase/migrations/20260308_create_nde_questions.sql');
  console.log('    3. Click "Run"');
  console.log('    4. Re-run: npx tsx scripts/seed-nde-questions.ts');
  console.log('──────────────────────────────────────────');
}

main().catch(e => { console.error(e); process.exit(1); });
