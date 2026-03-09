/**
 * scripts/run-seed.ts
 * Applies a SQL seed file to Supabase via the Management API SQL endpoint.
 * Usage: npx tsx scripts/run-seed.ts <sql-file>
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY!.trim();
const PROJECT_REF  = SUPABASE_URL.match(/https?:\/\/([^.]+)/)?.[1] ?? '';

const file = process.argv[2] ?? 'supabase/migrations/20260308_seed_nde_questions.sql';
const sql  = readFileSync(resolve(process.cwd(), file), 'utf8');

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SERVICE_KEY');
    process.exit(1);
  }
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`File:    ${file}  (${sql.length} chars)`);

  // Supabase Management API: POST /v1/projects/{ref}/database/query
  const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const resp = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await resp.text();
  if (resp.ok) {
    console.log('✅  Seed applied successfully via Management API');
    console.log(body.slice(0, 500));
    return;
  }

  console.log(`Management API returned ${resp.status}: ${body.slice(0, 400)}`);

  // Fallback: try the REST /rest/v1/sql endpoint
  const restUrl = `${SUPABASE_URL}/rest/v1/sql`;
  console.log(`\nTrying fallback: ${restUrl}`);
  const resp2 = await fetch(restUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const body2 = await resp2.text();
  if (resp2.ok) {
    console.log('✅  Seed applied via /rest/v1/sql');
    console.log(body2.slice(0, 500));
    return;
  }

  console.log(`REST SQL returned ${resp2.status}: ${body2.slice(0, 400)}`);
  console.log('\n📋 Manual option: paste contents of', file, 'in Supabase Dashboard → SQL Editor');
}

run().catch(e => { console.error(e); process.exit(1); });
