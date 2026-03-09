/**
 * scripts/run-seed-pg.mjs
 * Applies the seed SQL file via a direct PostgreSQL connection.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '.env.local') });

// We need the DB password — Supabase uses the project password set at creation.
// Check for it in env vars under common names.
const DB_PASSWORD =
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.DB_PASSWORD ||
  process.env.POSTGRES_PASSWORD ||
  null;

const PROJECT_REF = 'vnycavclrndjwmpaugju';
const DB_HOST     = `db.${PROJECT_REF}.supabase.co`;
const DB_USER     = `postgres.${PROJECT_REF}`;
const DB_PORT     = 5432;
const DB_NAME     = 'postgres';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

if (!DB_PASSWORD) {
  console.error('❌  No DB password found in env.');
  console.error('   Set SUPABASE_DB_PASSWORD in .env.local to the password you set when creating the project.');
  console.error('   (Find it: Supabase Dashboard → Project Settings → Database → Connection string)');
  process.exit(1);
}

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260308_seed_nde_questions.sql'),
  'utf8'
);

const client = new Client({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  port: DB_PORT,
  database: DB_NAME,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log(`Connecting to ${DB_HOST}...`);
  await client.connect();
  console.log('Connected! Applying seed...');
  await client.query(sql);
  console.log('✅  Seed applied!');
  await client.end();
}

run().catch(async e => {
  console.error('Error:', e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
