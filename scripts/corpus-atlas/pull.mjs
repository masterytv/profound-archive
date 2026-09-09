#!/usr/bin/env node
/**
 * corpus-atlas/pull.mjs — READ-ONLY export of the analysis corpus to local JSONL.
 *
 * Pulls one table per file into scratch/corpus-atlas/<table>.jsonl (gitignored) plus
 * scratch/corpus-atlas/manifest.json. Talks to PostgREST directly with the service key;
 * only ever issues GET requests. Never writes to the database.
 *
 * USAGE (the NODE_USE_ENV_PROXY=1 prefix is REQUIRED in this environment — without it
 * Node's global fetch cannot reach the internet and every request fails):
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/pull.mjs                  # pull everything
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/pull.mjs --only nde_vids  # one table
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/pull.mjs --only uap_vids,uap_encounters
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/pull.mjs --limit 50       # cap rows per table (smoke test)
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/pull.mjs --list           # show table specs and exit
 *
 * Flags:
 *   --only <t1,t2>   pull only these tables (comma-separated or repeat the flag)
 *   --limit N        stop after N rows per table (manifest marks the entry partial)
 *   --page N         page size, default 1000 (PostgREST hard-caps at 1000 anyway)
 *   --out <dir>      output dir, default <repo>/scratch/corpus-atlas
 *   --list           print the table specs and exit without pulling
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY from the process env, falling back
 * to <repo>/.env.local (tiny KEY=value parser, no dotenv). Secret values are never printed.
 *
 * Paging: PostgREST caps responses at 1000 rows, so every table is walked with
 * `Range-Unit: items` + `Range: start-end`, ordered by primary key for stable pages.
 * The first page sends `Prefer: count=exact` and records the total from Content-Range.
 * Failed pages retry up to 3 times with exponential backoff. Each table streams to
 * <table>.jsonl.part and is renamed to <table>.jsonl only on success, so a leftover
 * .part file always means an incomplete pull. The manifest is merged per table, so
 * `--only` reruns do not clobber other tables' entries.
 *
 * Column names were verified against the live PostgREST OpenAPI schema on 2026-09-08
 * (src/lib/supabase/database.types.ts is stale and only covers a few tables).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ───────────────────────────── table specs ─────────────────────────────
// columns: array of column names, or '*' for every column.
// derived: optional (row) => extra fields merged into the row (documented in manifest).
const arrLen = (v) => (Array.isArray(v) ? v.length : 0);

const TABLES = [
  {
    table: 'nde_vids',
    pk: 'videoId',
    filters: 'isNde=eq.clear_nde',
    columns: [
      'videoId', 'title', 'channelName', 'channelId', 'channelUsername', 'date', 'viewCount', 'likes',
      'commentsCount', 'duration', 'type', 'location', 'numberOfSubscribers', 'experiencerFullName',
      'isNde', 'isNdeJustification',
      'analysis_status', 'analysis_nde_summary', 'analysis_nde_tags', 'analysis_generated_timestamp',
      'analysis_ai_model_used', 'analysis_human_reviewed',
      'greyson_score', 'nde_c_score',
      'rvnde_status', 'rvnde_total_score', 'rvnde_level', 'rvnde_summary_reason', 'rvnde_details',
      'intake_status',
    ],
    notes: 'Excluded (huge): description, subtitles*, raw_timestamped_*, subtitles_embedding, nde_analysis_html, analysis_researcher_notes. rvnde_details is jsonb ~2 KB/row (cvNDE breakdown), kept.',
  },
  {
    table: 'nde_analysis',
    pk: 'video_id',
    columns: [
      'video_id', 'experience_type', 'experience_type_confidence', 'trigger_category', 'trigger_description',
      'overall_tone', 'intensity_rating', 'intensity_level', 'meets_nde_criteria', 'meets_cutoff_criteria',
      'total_greyson_score', 'greyson_breakdown', 'total_nde_c_score', 'nde_c_breakdown',
      'transformation_score', 'transformation_classification', 'transformation_breakdown',
      'journey_valid', 'journey_nde_type', 'journey_sequence', 'journey_notes',
      'core_elements', 'phenomenology', 'primary_phenomenology', 'entities', 'content_safety', 'scale_agreement',
    ],
    notes: 'Excluded: cleaned_transcript, analysis_report_html, experience_fingerprint (vector).',
  },
  {
    table: 'uap_vids',
    pk: 'video_id',
    filters: 'tier=in.(1,2)',
    columns: [
      'video_id', 'title', 'channel_name', 'channel_id', 'channel_username', 'date', 'video_publish_year',
      'view_count', 'likes', 'comments_count', 'duration', 'analysis_uap_summary', 'content_type', 'track',
      'source_type', 'type', 'experiencer_name', 'encounter_count', 'multi_encounter', 'tier', 'location',
      'classified_at', 'classifier_model', 'intake_status',
    ],
    notes: 'Excluded (huge): description, subtitles_*, raw_timestamped_*.',
  },
  {
    table: 'uap_encounters',
    pk: 'id',
    columns: [
      'id', 'video_id', 'encounter_index', 'encounter_label', 'encounter_context', 'hynek_type', 'vallee_type',
      'evidence_score', 'contact_depth_score', 'transformation_score', 'experiencer_name', 'source_type',
      'segment_start_char', 'segment_end_char', 'analysis_model', 'analyzed_at',
    ],
    notes: 'Excluded: segment_text (~4 KB/row), *_breakdown jsonb.',
  },
  { table: 'uap_video_stats', pk: 'video_id', columns: '*' },
  { table: 'question_synthesis', pk: 'id', columns: '*' },
  {
    table: 'nde_questions',
    pk: 'id',
    columns: ['id', 'slug', 'category', 'category_label', 'subcategory', 'consumer_question', 'ai_query', 'sort_order', 'is_active', 'needs_refresh', 'created_at'],
    notes: 'Excluded: embedding (vector 1536).',
  },
  { table: 'user_questions', pk: 'id', columns: '*', notes: 'Table has no embedding column; all 6 columns pulled.' },
  {
    table: 'blog_posts',
    pk: 'id',
    filters: 'status=eq.published',
    columns: [
      'id', 'slug', 'domain', 'category', 'series', 'status', 'title', 'subtitle', 'lead_paragraph', 'tags',
      'source_question_slug', 'source_experiencer_slug', 'related_video_ids', 'related_question_slugs',
      'refs', 'word_count', 'read_time_mins', 'published_at', 'updated_at',
    ],
    notes: 'Excluded: body_mdx, research_raw, faq_data, json_ld, seo_*, hero_image_*, author_*.',
  },
  {
    table: 'experiencer_profiles',
    pk: 'id',
    columns: [
      'id', 'slug', 'full_name', 'experience_type', 'trigger_category', 'core_themes', 'summary',
      'highlight_quote', 'highlight_quote_source', 'highlight_elements', 'channel_appearances',
      'avg_greyson_score', 'avg_veridical_score', 'avg_transformation_score', 'total_views', 'video_ids',
      'first_shared_year', 'contribution_label', 'published_at', 'updated_at',
    ],
    derived: { video_count: (r) => arrLen(r.video_ids) },
    notes: 'Excluded: bio, thank_you_note, big_questions_answered, photo_url, social_links, offerings.',
  },
  { table: 'viz_graph_cache', pk: 'viz_id', columns: '*', notes: 'graph_json averages ~275 KB/row; 9 rows.' },
  { table: 'uap_daily_facts', pk: 'id', columns: '*' },
  {
    table: 'channels',
    pk: 'channel_id',
    columns: ['channel_id', 'name', 'custom_url', 'country', 'subscriber_count', 'total_video_count', 'total_view_count', 'hidden', 'scanner_enabled', 'published_at', 'last_scanned_at'],
  },
  {
    table: 'uap_channels',
    pk: 'channel_id',
    columns: ['channel_id', 'channel_name', 'custom_url', 'track', 'video_count', 'subscriber_count', 'total_video_count', 'total_view_count', 'hidden', 'scanner_enabled', 'published_at', 'last_scanned_at'],
    notes: 'No `handle` column exists; custom_url is the @handle. No tier/score columns on this table — see uap_channel_scores.',
  },
  { table: 'uap_channel_scores', pk: 'channel_id', columns: '*' },
  {
    table: 'uap_canonical_persons',
    pk: 'id',
    columns: ['id', 'slug', 'canonical_name', 'aliases', 'role', 'affiliation', 'bio', 'total_mentions', 'avg_credibility_score', 'linked_video_ids', 'created_at', 'updated_at'],
    derived: { linked_video_count: (r) => arrLen(r.linked_video_ids) },
  },
  {
    table: 'uap_canonical_orgs',
    pk: 'id',
    columns: ['id', 'slug', 'canonical_name', 'aliases', 'org_type', 'description', 'total_mentions', 'linked_video_ids', 'linked_person_ids', 'created_at', 'updated_at'],
    derived: { linked_video_count: (r) => arrLen(r.linked_video_ids), linked_person_count: (r) => arrLen(r.linked_person_ids) },
    notes: 'Real table name is uap_canonical_orgs (not uap_canonical_organizations).',
  },
  {
    table: 'uap_canonical_programs',
    pk: 'id',
    columns: ['id', 'slug', 'canonical_name', 'aliases', 'program_type', 'description', 'total_mentions', 'linked_video_ids', 'linked_person_ids', 'created_at', 'updated_at'],
    derived: { linked_video_count: (r) => arrLen(r.linked_video_ids), linked_person_count: (r) => arrLen(r.linked_person_ids) },
  },
  {
    table: 'uap_events',
    pk: 'id',
    columns: ['id', 'slug', 'name', 'aliases', 'event_type', 'event_date', 'year', 'location', 'country', 'description', 'video_ids', 'contactee_ids', 'witness_count', 'source_count', 'created_at', 'updated_at'],
    derived: { video_count: (r) => arrLen(r.video_ids), contactee_count: (r) => arrLen(r.contactee_ids) },
  },
  {
    table: 'uap_contactee_profiles',
    pk: 'id',
    columns: [
      'id', 'slug', 'display_name', 'is_anonymous', 'experience_type', 'entity_types', 'recurrence', 'core_themes',
      'summary', 'highlight_quote', 'highlight_quote_source', 'channel_appearances',
      'avg_evidence_score', 'avg_contact_depth', 'avg_transformation_score', 'total_views',
      'video_ids', 'channel_ids', 'first_shared_year', 'contribution_label', 'published_at', 'created_at', 'updated_at',
    ],
    derived: { video_count: (r) => arrLen(r.video_ids) },
    notes: 'Excluded: bio, photo_url, social_links.',
  },
];

// ───────────────────────────── args ─────────────────────────────
const args = process.argv.slice(2);
const opts = { only: [], limit: Infinity, page: 1000, out: path.join(REPO_ROOT, 'scratch', 'corpus-atlas'), list: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--only') opts.only.push(...String(args[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  else if (a.startsWith('--only=')) opts.only.push(...a.slice(7).split(',').map((s) => s.trim()).filter(Boolean));
  else if (a === '--limit') opts.limit = Number(args[++i]);
  else if (a.startsWith('--limit=')) opts.limit = Number(a.slice(8));
  else if (a === '--page') opts.page = Number(args[++i]);
  else if (a.startsWith('--page=')) opts.page = Number(a.slice(7));
  else if (a === '--out') opts.out = path.resolve(args[++i]);
  else if (a.startsWith('--out=')) opts.out = path.resolve(a.slice(6));
  else if (a === '--list') opts.list = true;
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); process.exit(0); }
  else { console.error(`Unknown arg: ${a}`); process.exit(2); }
}
if (!Number.isFinite(opts.limit) && args.some((a) => a.startsWith('--limit'))) { console.error('--limit needs a number'); process.exit(2); }
if (!(opts.page > 0 && opts.page <= 1000)) { console.error('--page must be 1..1000 (PostgREST cap)'); process.exit(2); }

let selected = TABLES;
if (opts.only.length) {
  const known = new Set(TABLES.map((t) => t.table));
  const bad = opts.only.filter((t) => !known.has(t));
  if (bad.length) { console.error(`Unknown table(s): ${bad.join(', ')}\nKnown: ${[...known].join(', ')}`); process.exit(2); }
  selected = TABLES.filter((t) => opts.only.includes(t.table));
}

if (opts.list) {
  for (const t of TABLES) console.log(`${t.table.padEnd(24)} pk=${t.pk.padEnd(10)} filters=${t.filters ?? '-'}  columns=${t.columns === '*' ? '*' : t.columns.length}`);
  process.exit(0);
}

// ───────────────────────────── env ─────────────────────────────
function loadEnv() {
  const need = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const env = {};
  for (const k of need) if (process.env[k]) env[k] = process.env[k];
  if (need.some((k) => !env[k])) {
    const p = path.join(REPO_ROOT, '.env.local');
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const l = line.trim();
        if (!l || l.startsWith('#') || !l.includes('=')) continue;
        const i = l.indexOf('=');
        const k = l.slice(0, i).trim();
        const v = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        if (need.includes(k) && !env[k]) env[k] = v;
      }
    }
  }
  const missing = need.filter((k) => !env[k]);
  if (missing.length) { console.error(`Missing env: ${missing.join(', ')} (not in process env or .env.local)`); process.exit(2); }
  return env;
}
const ENV = loadEnv();
const BASE = ENV.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1';
const HEADERS = { apikey: ENV.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_KEY}`, Accept: 'application/json' };

if (!process.env.NODE_USE_ENV_PROXY && (process.env.HTTPS_PROXY || process.env.https_proxy)) {
  console.error('WARNING: HTTPS_PROXY is set but NODE_USE_ENV_PROXY is not — fetch will likely fail. Run with NODE_USE_ENV_PROXY=1.');
}

// ───────────────────────────── helpers ─────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error(new Date().toISOString().slice(11, 19), ...a);

function parseContentRange(h) {
  // "0-999/6304" | "*/0" | "0-0/*"
  if (!h) return { total: null };
  const m = /^(?:(\d+)-(\d+)|\*)\/(\d+|\*)$/.exec(h.trim());
  if (!m) return { total: null };
  return { total: m[3] === '*' ? null : Number(m[3]) };
}

/** GET one page. Returns { rows, total } — total only populated when count=exact requested. */
async function fetchPage(spec, start, end, wantCount) {
  const select = spec.columns === '*' ? '*' : spec.columns.join(',');
  const qs = [`select=${select}`, `order=${spec.pk}.asc`];
  if (spec.filters) qs.push(spec.filters);
  const url = `${BASE}/${spec.table}?${qs.join('&')}`;
  const headers = { ...HEADERS, 'Range-Unit': 'items', Range: `${start}-${end}` };
  if (wantCount) headers.Prefer = 'count=exact';

  const MAX = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 416) return { rows: [], total: parseContentRange(res.headers.get('content-range')).total, exhausted: true };
      if (res.status === 429 || res.status === 408 || res.status >= 500) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // Non-retryable client error (bad column, bad filter...). Fail fast.
        const e = new Error(`HTTP ${res.status} on ${spec.table} range ${start}-${end}: ${body.slice(0, 500)}`);
        e.fatal = true; throw e;
      }
      const rows = await res.json();
      if (!Array.isArray(rows)) throw new Error(`Non-array response for ${spec.table}`);
      return { rows, total: parseContentRange(res.headers.get('content-range')).total };
    } catch (e) {
      if (e.fatal) throw e;
      lastErr = e;
      if (attempt < MAX) {
        const wait = 1000 * 3 ** (attempt - 1);
        log(`  [${spec.table}] page ${start}-${end} attempt ${attempt} failed (${e.message}); retrying in ${wait}ms`);
        await sleep(wait);
      }
    }
  }
  throw new Error(`Gave up on ${spec.table} range ${start}-${end} after ${MAX} attempts: ${lastErr?.message}`);
}

function readManifest(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { generated_by: 'scripts/corpus-atlas/pull.mjs', files: {} }; }
}
function writeManifest(file, m) {
  m.updated_at = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
}

// ───────────────────────────── pull one table ─────────────────────────────
async function pullTable(spec, manifestFile) {
  const outFile = path.join(opts.out, `${spec.table}.jsonl`);
  const partFile = outFile + '.part';
  const t0 = Date.now();
  const ws = fs.createWriteStream(partFile, { flags: 'w' });
  const writeLine = (s) => new Promise((resolve, reject) => { if (!ws.write(s)) ws.once('drain', resolve); else resolve(); ws.once('error', reject); });

  let written = 0, expected = null, pages = 0, bytes = 0, firstRowKeys = null, exhausted = false;
  log(`[${spec.table}] start  filters=${spec.filters ?? '-'}  order=${spec.pk}.asc  cols=${spec.columns === '*' ? '*' : spec.columns.length}`);
  try {
    for (let start = 0; ; start += opts.page) {
      const remaining = opts.limit - written;
      if (remaining <= 0) break;
      const size = Math.min(opts.page, remaining);
      const end = start + size - 1;
      const { rows, total, exhausted: ex } = await fetchPage(spec, start, end, pages === 0);
      if (pages === 0 && total != null) expected = total;
      pages++;
      if (ex) { exhausted = true; break; }
      let chunk = '';
      for (const r of rows) {
        if (!firstRowKeys) firstRowKeys = Object.keys(r);
        if (spec.derived) for (const [k, fn] of Object.entries(spec.derived)) r[k] = fn(r);
        chunk += JSON.stringify(r) + '\n';
      }
      bytes += Buffer.byteLength(chunk);
      await writeLine(chunk);
      written += rows.length;
      log(`  [${spec.table}] page ${pages} rows ${start}-${start + rows.length - 1}  (${written}${expected != null ? '/' + expected : ''})`);
      if (rows.length < size) { exhausted = true; break; }
    }
  } finally {
    await new Promise((r) => ws.end(r));
  }

  const complete = exhausted || (expected != null && written >= expected);
  const limited = Number.isFinite(opts.limit) && written >= opts.limit && !exhausted;
  fs.renameSync(partFile, outFile);

  const entry = {
    table: spec.table,
    file: path.relative(REPO_ROOT, outFile),
    filters: spec.filters ?? null,
    order: `${spec.pk}.asc`,
    columns: spec.columns === '*' ? '*' : spec.columns,
    columns_resolved: firstRowKeys ?? [],
    derived_columns: spec.derived ? Object.keys(spec.derived) : [],
    rows_written: written,
    rows_expected: expected,
    complete: complete && !limited,
    limited_by_flag: limited ? opts.limit : null,
    pages,
    bytes,
    duration_ms: Date.now() - t0,
    pulled_at: new Date().toISOString(),
    notes: spec.notes ?? null,
  };
  const m = readManifest(manifestFile);
  m.files[spec.table] = entry;
  writeManifest(manifestFile, m);

  const status = entry.complete ? (written === expected ? 'OK' : 'MISMATCH') : (limited ? 'PARTIAL(--limit)' : 'INCOMPLETE');
  log(`[${spec.table}] done   ${written}/${expected ?? '?'} rows  ${(bytes / 1e6).toFixed(2)} MB  ${pages} pages  ${entry.duration_ms} ms  ${status}`);
  return entry;
}

// ───────────────────────────── main ─────────────────────────────
fs.mkdirSync(opts.out, { recursive: true });
const manifestFile = path.join(opts.out, 'manifest.json');
log(`Output dir: ${opts.out}`);
log(`Endpoint: ${new URL(BASE).host} (service key loaded, not shown)`);
log(`Tables: ${selected.map((t) => t.table).join(', ')}${Number.isFinite(opts.limit) ? `  --limit ${opts.limit}` : ''}`);

const results = [];
let failures = 0;
for (const spec of selected) {
  try {
    results.push(await pullTable(spec, manifestFile));
  } catch (e) {
    failures++;
    log(`[${spec.table}] FAILED: ${e.message}`);
    const m = readManifest(manifestFile);
    m.files[spec.table] = { table: spec.table, error: e.message, pulled_at: new Date().toISOString(), complete: false };
    writeManifest(manifestFile, m);
  }
}

console.error('\n── summary ──');
let mismatches = 0;
for (const r of results) {
  const flag = r.complete ? (r.rows_written === r.rows_expected ? 'OK' : 'MISMATCH') : (r.limited_by_flag ? 'PARTIAL' : 'INCOMPLETE');
  if (flag === 'MISMATCH' || flag === 'INCOMPLETE') mismatches++;
  console.error(`${r.table.padEnd(24)} ${String(r.rows_written).padStart(6)} / ${String(r.rows_expected ?? '?').padStart(6)}  ${(r.bytes / 1e6).toFixed(2).padStart(8)} MB  ${flag}`);
}
console.error(`manifest: ${path.relative(REPO_ROOT, manifestFile)}`);
if (failures || mismatches) { console.error(`${failures} table(s) failed, ${mismatches} incomplete/mismatched`); process.exit(1); }
