/**
 * scripts/alter-nde-questions.ts
 * Adds missing columns to the existing nde_questions table.
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabase also exposes a pg endpoint for raw SQL via the management API:
// https://api.supabase.com/v1/projects/{ref}/database/query
const PROJECT_REF = SUPABASE_URL.match(/https?:\/\/([^.]+)/)?.[1] ?? '';

const ALTER_SQL = `
ALTER TABLE nde_questions 
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS ai_query text,
  ADD COLUMN IF NOT EXISTS needs_refresh boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN nde_questions.subcategory IS 'Optional sub-grouping within the category';
COMMENT ON COLUMN nde_questions.ai_query IS 'HyDE-style passage for embedding generation';
COMMENT ON COLUMN nde_questions.needs_refresh IS 'Flag to indicate the answer needs re-generation';
COMMENT ON COLUMN nde_questions.is_active IS 'Soft-disable a question without deletion';
`;

async function main() {
  console.log('🔧  Applying ALTER TABLE to nde_questions…');
  
  // Try Supabase Management API
  const mgmtResp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: ALTER_SQL }),
  });

  if (mgmtResp.ok) {
    const result = await mgmtResp.json();
    console.log('✅  ALTER TABLE applied via Management API:', JSON.stringify(result));
    return;
  }

  const mgmtErr = await mgmtResp.text();
  console.log(`Management API ${mgmtResp.status}: ${mgmtErr.slice(0, 300)}`);

  // Try the pg REST endpoint (Supabase exposes this for service role)
  const pgResp = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: ALTER_SQL }),
  });

  if (pgResp.ok) {
    console.log('✅  ALTER TABLE applied via /pg/query');
    return;
  }

  const pgErr = await pgResp.text();
  console.log(`/pg/query ${pgResp.status}: ${pgErr.slice(0, 300)}`);

  // Final: print the SQL for manual application
  console.log('\n──────────────────────────────────────────');
  console.log('📋  Please run this SQL in the Supabase SQL Editor:');
  console.log(`    https://supabase.com/dashboard/project/${PROJECT_REF}/sql`);
  console.log('──────────────────────────────────────────');
  console.log(ALTER_SQL);
  console.log('──────────────────────────────────────────');
}

main().catch(e => { console.error(e); process.exit(1); });
