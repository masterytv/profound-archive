#!/usr/bin/env node
/**
 * retrieve.mjs — pull evidence for a candidate book idea by semantic search over
 * the Project Profound video corpus (NDE + UAP), without reading anything in bulk.
 *
 * USAGE
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/retrieve.mjs "<query text>" --domain nde|uap \
 *       [--k 15] [--min-sim 0.45] [--source moments|chunks] [--json]
 *
 *   NODE_USE_ENV_PROXY=1 is REQUIRED in this environment: Node's global fetch only
 *   reaches the internet through the configured proxy when that flag is set.
 *
 * FLAGS
 *   --domain   nde | uap                 (required) which corpus to search
 *   --source   moments | chunks          (default: moments)
 *              moments -> timestamped punctuated-transcript embeddings; every hit has a
 *                         start_time so the YouTube URL carries &t=<seconds>.
 *              chunks  -> chatbot RAG chunks (larger passages, no timestamp).
 *   --k        max hits to return        (default: 15)
 *   --min-sim  cosine-similarity floor   (default: 0.45; the site's question pages use 0.50)
 *   --json     print JSON instead of the human-readable listing
 *   -h/--help  this text
 *
 * WHICH RPC EACH MODE CALLS (all verified live 2026-09-08)
 *   nde/moments  search_punctuated_embeddings_filtered  (query_embedding, similarity_threshold,
 *                                                        sort_column, sort_direction, page_limit, page_offset)
 *   uap/moments  search_uap_punctuated_embeddings       (same parameter names as above)
 *   nde/chunks   nde_chatbot_match                      (query_embedding, match_count, filter)
 *                  -> has NO threshold parameter; --min-sim is applied client-side after
 *                     fetching k rows, so fewer than k hits may print.
 *   uap/chunks   match_uap_chatbot_chunks               (query_embedding, match_threshold, match_count)
 *   The chunk RPCs do not return channel/date, so those modes do one extra read-only
 *   select on nde_vids / uap_vids to fill them in.
 *
 * ENVIRONMENT (values are never printed)
 *   OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Read-only: only POST /rest/v1/rpc/<fn> and GET /rest/v1/<table> selects are issued.
 * Embeddings: OpenAI text-embedding-3-small (1536 dims), the model the corpus was embedded with.
 */

import { parseArgs } from 'node:util';

const EMBED_MODEL = 'text-embedding-3-small';
const DEFAULT_K = 15;
const DEFAULT_MIN_SIM = 0.45;
const MAX_K = 500;
const TITLE_MAX = 80;
const PASSAGE_MAX = 300;

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

// ─── Mode table ──────────────────────────────────────────────────────────────
// Adding a new domain/source pair = adding an entry here. A missing entry is
// reported cleanly ("no retrieval function is wired for ...").

const num = (v) => (v == null || v === '' ? null : Number(v));

const MODES = {
  'nde/moments': {
    rpc: 'search_punctuated_embeddings_filtered',
    table: 'nde_punctuated_embeddings',
    params: ({ vector, k, minSim }) => ({
      query_embedding: vector,
      similarity_threshold: minSim,
      sort_column: 'similarity',
      sort_direction: 'DESC',
      page_limit: k,
      page_offset: 0,
    }),
    normalize: (r) => ({
      id: r.id,
      video_id: r.video_id,
      title: r.title,
      channel: r.channelName,
      date: r.date,
      url: r.url,
      start_time: num(r.start_time),
      similarity: Number(r.similarity),
      text: r.content,
      summary: r.analysis_nde_summary ?? null,
    }),
  },
  'uap/moments': {
    rpc: 'search_uap_punctuated_embeddings',
    table: 'uap_punctuated_embeddings',
    params: ({ vector, k, minSim }) => ({
      query_embedding: vector,
      similarity_threshold: minSim,
      sort_column: 'similarity',
      sort_direction: 'DESC',
      page_limit: k,
      page_offset: 0,
    }),
    normalize: (r) => ({
      id: r.id,
      video_id: r.video_id,
      title: r.title,
      channel: r.channel_name,
      date: r.date,
      url: r.url,
      start_time: num(r.start_time),
      similarity: Number(r.similarity),
      text: r.content,
      summary: r.analysis_uap_summary ?? null,
      tier: r.tier ?? null,
      track: r.track ?? null,
    }),
  },
  'nde/chunks': {
    rpc: 'nde_chatbot_match',
    table: 'nde_chatbot_chunks',
    clientSideThreshold: true,
    enrich: 'nde',
    params: ({ vector, k }) => ({
      query_embedding: vector,
      match_count: k,
      filter: {},
    }),
    normalize: (r) => ({
      id: r.id,
      video_id: r.metadata?.video_id ?? null,
      title: r.video_title ?? null,
      channel: null,
      date: null,
      url: r.video_url ?? null,
      start_time: null,
      similarity: Number(r.similarity),
      text: r.content,
      chunk_index: r.metadata?.chunk_index ?? null,
    }),
  },
  'uap/chunks': {
    rpc: 'match_uap_chatbot_chunks',
    table: 'uap_chatbot_chunks',
    enrich: 'uap',
    params: ({ vector, k, minSim }) => ({
      // This function was written to take the vector as its text form.
      query_embedding: `[${vector.join(',')}]`,
      match_threshold: minSim,
      match_count: k,
    }),
    normalize: (r) => ({
      id: r.id,
      video_id: r.video_id ?? r.metadata?.video_id ?? null,
      title: null,
      channel: null,
      date: null,
      url: null,
      start_time: null,
      similarity: Number(r.similarity),
      text: r.content,
      chunk_index: r.metadata?.chunk_index ?? null,
    }),
  },
};

// Video-metadata lookups used to fill in channel/date/title for the chunk modes.
const VIDEO_TABLES = {
  nde: {
    table: 'nde_vids',
    idCol: 'videoId',
    select: 'videoId,title,channelName,date,url',
    pick: (v) => ({ video_id: v.videoId, title: v.title, channel: v.channelName, date: v.date, url: v.url }),
  },
  uap: {
    table: 'uap_vids',
    idCol: 'video_id',
    select: 'video_id,title,channel_name,date,url',
    pick: (v) => ({ video_id: v.video_id, title: v.title, channel: v.channel_name, date: v.date, url: v.url }),
  },
};

// ─── CLI parsing ─────────────────────────────────────────────────────────────

function usage() {
  return [
    'Usage:',
    '  NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/retrieve.mjs "<query text>" --domain nde|uap \\',
    '      [--k 15] [--min-sim 0.45] [--source moments|chunks] [--json]',
    '',
    'Modes and the Supabase RPC each one calls:',
    '  nde/moments  search_punctuated_embeddings_filtered   (timestamped; URL gets &t=)',
    '  uap/moments  search_uap_punctuated_embeddings        (timestamped; URL gets &t=)',
    '  nde/chunks   nde_chatbot_match                       (no timestamp; --min-sim applied client-side)',
    '  uap/chunks   match_uap_chatbot_chunks                (no timestamp)',
    '',
    'Requires OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY in the environment.',
  ].join('\n');
}

function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        domain: { type: 'string' },
        source: { type: 'string', default: 'moments' },
        k: { type: 'string', default: String(DEFAULT_K) },
        'min-sim': { type: 'string', default: String(DEFAULT_MIN_SIM) },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (err) {
    throw new CliError(`${err.message}\n\n${usage()}`, 2);
  }
  const { values, positionals } = parsed;
  if (values.help) {
    console.log(usage());
    process.exit(0);
  }
  const query = positionals.join(' ').trim();
  if (!query) throw new CliError(`Missing query text.\n\n${usage()}`, 2);

  const domain = (values.domain ?? '').toLowerCase();
  if (!['nde', 'uap'].includes(domain)) {
    throw new CliError(`--domain must be nde or uap (got "${values.domain ?? ''}").\n\n${usage()}`, 2);
  }
  const source = String(values.source).toLowerCase();
  if (!['moments', 'chunks'].includes(source)) {
    throw new CliError(`--source must be moments or chunks (got "${values.source}").\n\n${usage()}`, 2);
  }
  const k = Number.parseInt(values.k, 10);
  if (!Number.isInteger(k) || k < 1 || k > MAX_K) {
    throw new CliError(`--k must be an integer between 1 and ${MAX_K} (got "${values.k}").`, 2);
  }
  const minSim = Number.parseFloat(values['min-sim']);
  if (!Number.isFinite(minSim) || minSim < -1 || minSim > 1) {
    throw new CliError(`--min-sim must be a number between -1 and 1 (got "${values['min-sim']}").`, 2);
  }
  return { query, domain, source, k, minSim, json: values.json };
}

// ─── Environment ─────────────────────────────────────────────────────────────

function readEnv() {
  const missing = ['OPENAI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY'].filter(
    (name) => !process.env[name],
  );
  if (missing.length) {
    throw new CliError(`Missing environment variable(s): ${missing.join(', ')}`);
  }
  return {
    openaiKey: process.env.OPENAI_API_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, ''),
    supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  };
}

// Belt-and-braces: never let a key leak through an echoed error body.
function redact(text) {
  return String(text ?? '')
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, '<redacted-jwt>')
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, '<redacted-key>');
}

function proxyHint(err) {
  const code = err?.cause?.code ?? err?.code ?? '';
  const netCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'];
  if (process.env.NODE_USE_ENV_PROXY !== '1' || netCodes.includes(code)) {
    return ' Hint: start Node with NODE_USE_ENV_PROXY=1 so fetch goes through the proxy.';
  }
  return '';
}

// ─── OpenAI embedding ────────────────────────────────────────────────────────

async function embed(text, env) {
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    });
  } catch (err) {
    throw new CliError(`Network error reaching OpenAI embeddings: ${err.message}.${proxyHint(err)}`);
  }
  const body = await res.text();
  if (!res.ok) {
    let msg = body.slice(0, 300);
    try {
      msg = JSON.parse(body)?.error?.message ?? msg;
    } catch {
      /* keep raw */
    }
    throw new CliError(`OpenAI embeddings request failed (HTTP ${res.status}): ${redact(msg)}${proxyHint()}`);
  }
  const json = JSON.parse(body);
  const vector = json?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== 1536) {
    throw new CliError(`Unexpected embedding shape from OpenAI (got ${Array.isArray(vector) ? vector.length : typeof vector} dims).`);
  }
  return { vector, tokens: json?.usage?.total_tokens ?? null };
}

// ─── Supabase REST ───────────────────────────────────────────────────────────

function supabaseHeaders(env) {
  return {
    apikey: env.supabaseKey,
    Authorization: `Bearer ${env.supabaseKey}`,
    'Content-Type': 'application/json',
  };
}

async function callRpc(fn, params, env) {
  let res;
  try {
    res = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: supabaseHeaders(env),
      body: JSON.stringify(params),
    });
  } catch (err) {
    throw new CliError(`Network error calling RPC ${fn}: ${err.message}.${proxyHint(err)}`);
  }
  const text = await res.text();
  if (res.ok) {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('not an array');
      return data;
    } catch {
      throw new CliError(`RPC ${fn} returned an unexpected body (HTTP ${res.status}): ${redact(text.slice(0, 200))}`);
    }
  }

  let pg = {};
  try {
    pg = JSON.parse(text) ?? {};
  } catch {
    /* non-JSON error body */
  }
  const code = pg.code ? ` ${pg.code}` : '';
  const detail = [pg.message, pg.details, pg.hint].filter(Boolean).join('\n    ') || redact(text.slice(0, 300));
  const sent = Object.keys(params).join(', ');

  if (res.status === 404) {
    throw new CliError(
      `RPC ${fn} was not found (HTTP 404${code}). Either the function does not exist in the database ` +
        `or the parameter names sent (${sent}) do not match its signature. Check docs/supabase/functions ` +
        `and supabase/migrations for the CREATE FUNCTION.\n    ${redact(detail)}`,
    );
  }
  if (res.status === 400) {
    throw new CliError(
      `RPC ${fn} rejected the request (HTTP 400${code}) — usually a parameter type or name mismatch. ` +
        `Sent: ${sent}.\n    ${redact(detail)}`,
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new CliError(`Authentication failed calling RPC ${fn} (HTTP ${res.status}${code}). Check SUPABASE_SERVICE_KEY.\n    ${redact(detail)}`);
  }
  throw new CliError(`RPC ${fn} failed (HTTP ${res.status}${code}).${proxyHint()}\n    ${redact(detail)}`);
}

async function fetchVideoMeta(domain, ids, env) {
  const spec = VIDEO_TABLES[domain];
  if (!spec || ids.length === 0) return new Map();
  const qs = new URLSearchParams({
    select: spec.select,
    [spec.idCol]: `in.(${ids.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',')})`,
  });
  let res;
  try {
    res = await fetch(`${env.supabaseUrl}/rest/v1/${spec.table}?${qs}`, { headers: supabaseHeaders(env) });
  } catch (err) {
    console.error(`warning: could not fetch video metadata from ${spec.table}: ${err.message}`);
    return new Map();
  }
  if (!res.ok) {
    console.error(`warning: video metadata lookup on ${spec.table} returned HTTP ${res.status}; channel/date will be blank.`);
    return new Map();
  }
  const rows = await res.json();
  return new Map(rows.map((v) => [spec.pick(v).video_id, spec.pick(v)]));
}

// ─── Formatting ──────────────────────────────────────────────────────────────

const collapse = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const fmtDate = (d) => (d ? String(d).slice(0, 10) : '—');
const fmtSim = (x) => (Number.isFinite(x) ? x.toFixed(2) : '?');

function watchUrl(hit) {
  const base = hit.url || (hit.video_id ? `https://www.youtube.com/watch?v=${hit.video_id}` : null);
  if (!base) return '(no url)';
  if (hit.start_time == null || !Number.isFinite(hit.start_time)) return base;
  const secs = Math.max(0, Math.floor(hit.start_time));
  return `${base}${base.includes('?') ? '&' : '?'}t=${secs}`;
}

function groupByVideo(hits) {
  const groups = new Map();
  for (const h of hits) {
    const key = h.video_id ?? `unknown:${h.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(h);
  }
  const ordered = [...groups.values()];
  for (const g of ordered) g.sort((a, b) => b.similarity - a.similarity);
  ordered.sort((a, b) => b[0].similarity - a[0].similarity);
  return ordered;
}

function printHuman({ hits, groups, tokens, modeKey, rpc, minSim, k, query }) {
  console.log(`query: ${JSON.stringify(query)}  [${modeKey} via rpc ${rpc}; k=${k}, min-sim=${minSim}]`);
  console.log('');
  if (hits.length === 0) {
    console.log(
      `No hits at or above min-sim ${minSim}. Try lowering --min-sim (e.g. 0.35), or rephrase the ` +
        `query as a first-person passage the way an experiencer would tell it.`,
    );
  }
  groups.forEach((g, gi) => {
    const v = g[0];
    const title = truncate(collapse(v.title ?? '(untitled)'), TITLE_MAX);
    const count = g.length > 1 ? `  (${g.length} hits)` : '';
    console.log(`[${gi + 1}] ${v.video_id ?? '?'}  ${title}`);
    console.log(`    ${collapse(v.channel ?? '(unknown channel)')}  ·  ${fmtDate(v.date)}${count}`);
    for (const h of g) {
      console.log(`    ${`#${h.rank}`.padEnd(4)} sim ${fmtSim(h.similarity)}  ${watchUrl(h)}`);
      console.log(`         ${truncate(collapse(h.text), PASSAGE_MAX)}`);
    }
    console.log('');
  });
  const tok = tokens == null ? 'n/a' : tokens;
  console.log(`${hits.length} hit${hits.length === 1 ? '' : 's'} · ${groups.length} distinct video${groups.length === 1 ? '' : 's'} · embedding tokens: ${tok}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseCli(process.argv.slice(2));
  const modeKey = `${opts.domain}/${opts.source}`;
  const mode = MODES[modeKey];
  if (!mode) {
    throw new CliError(
      `No retrieval function is wired for --domain ${opts.domain} --source ${opts.source}. ` +
        `Available modes: ${Object.keys(MODES).join(', ')}.`,
      2,
    );
  }
  const env = readEnv();

  const { vector, tokens } = await embed(opts.query, env);

  const rows = await callRpc(mode.rpc, mode.params({ vector, k: opts.k, minSim: opts.minSim }), env);

  let hits = rows.map(mode.normalize).filter((h) => Number.isFinite(h.similarity));
  if (mode.clientSideThreshold) hits = hits.filter((h) => h.similarity >= opts.minSim);

  if (mode.enrich) {
    const ids = [...new Set(hits.map((h) => h.video_id).filter(Boolean))];
    const meta = await fetchVideoMeta(mode.enrich, ids, env);
    for (const h of hits) {
      const m = meta.get(h.video_id);
      if (!m) continue;
      h.title = h.title ?? m.title;
      h.channel = h.channel ?? m.channel;
      h.date = h.date ?? m.date;
      h.url = h.url ?? m.url;
    }
  }

  hits.sort((a, b) => b.similarity - a.similarity);
  hits.forEach((h, i) => {
    h.rank = i + 1;
    h.watch_url = watchUrl(h);
  });
  const groups = groupByVideo(hits);

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          query: opts.query,
          domain: opts.domain,
          source: opts.source,
          rpc: mode.rpc,
          k: opts.k,
          min_sim: opts.minSim,
          embedding_model: EMBED_MODEL,
          embedding_tokens: tokens,
          hit_count: hits.length,
          video_count: groups.length,
          hits,
        },
        null,
        2,
      ),
    );
    return;
  }

  printHuman({ hits, groups, tokens, modeKey, rpc: mode.rpc, minSim: opts.minSim, k: opts.k, query: opts.query });
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.error(`error: ${err.message}`);
    process.exit(err.exitCode ?? 1);
  }
  console.error(`error: ${redact(err?.stack ?? err?.message ?? String(err))}`);
  process.exit(1);
});
