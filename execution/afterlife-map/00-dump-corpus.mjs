/**
 * Dumps the clear-NDE corpus to local disk so downstream analysis never re-hits the
 * shared prod DB. Read-only. Writes JSONL: one account per line.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('scratch/afterlife');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY);

const PAGE = 200;

// ── 1. Metadata + cvNDE scores for every clear NDE ──────────────────────────
async function pull(table, cols, filter, key) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(table).select(cols).order(key, { ascending: true }).range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table} @${from}: ${error.message}`);
    if (!data.length) break;
    out.push(...data);
    process.stderr.write(`\r${table}: ${out.length}   `);
    if (data.length < PAGE) break;
  }
  process.stderr.write('\n');
  return out;
}

console.error('Pulling analysis rows...');
const analysis = await pull(
  'nde_analysis',
  'video_id, total_greyson_score, core_elements, journey_sequence, entities, phenomenology, experience_type, trigger_category, overall_tone, intensity_rating, journey_nde_type, transformation_score',
  null,
  'video_id'
);
const byId = new Map(analysis.map(a => [a.video_id, a]));
fs.writeFileSync(path.join(ROOT, 'analysis.jsonl'), analysis.map(a => JSON.stringify(a)).join('\n'));
console.error(`analysis.jsonl: ${analysis.length} rows`);

console.error('Pulling vids metadata...');
const meta = await pull(
  'nde_vids',
  'videoId, title, channelName, experiencerFullName, date, isNde, rvnde_total_score, rvnde_level, rvnde_summary_reason, viewCount',
  q => q.in('isNde', ['clear_nde', 'possible_nde']),
  'videoId'
);
fs.writeFileSync(path.join(ROOT, 'meta.jsonl'), meta.map(m => JSON.stringify(m)).join('\n'));
console.error(`meta.jsonl: ${meta.length} rows`);

// ── 2. Transcripts, in chunks (the heavy pull) ───────────────────────────────
const ids = meta.filter(m => m.isNde === 'clear_nde').map(m => m.videoId);
console.error(`Pulling ${ids.length} transcripts...`);
const outPath = path.join(ROOT, 'transcripts.jsonl');
const ws = fs.createWriteStream(outPath);
let got = 0, bytes = 0;
for (let i = 0; i < ids.length; i += 50) {
  const slice = ids.slice(i, i + 50);
  const { data, error } = await sb
    .from('nde_vids')
    .select('videoId, subtitles_punctuated, subtitles_cleaned')
    .in('videoId', slice);
  if (error) throw new Error(`transcripts @${i}: ${error.message}`);
  for (const r of data) {
    const text = r.subtitles_punctuated || r.subtitles_cleaned || '';
    if (!text) continue;
    const m = meta.find(x => x.videoId === r.videoId);
    const a = byId.get(r.videoId);
    ws.write(JSON.stringify({
      id: r.videoId,
      title: m?.title || '',
      name: m?.experiencerFullName || '',
      channel: m?.channelName || '',
      cvnde: m?.rvnde_total_score ?? null,
      cvnde_level: m?.rvnde_level ?? null,
      greyson: a?.total_greyson_score ?? null,
      tone: a?.overall_tone ?? null,
      type: a?.journey_nde_type ?? null,
      text,
    }) + '\n');
    got++; bytes += text.length;
  }
  process.stderr.write(`\rtranscripts: ${got}/${ids.length}  ${(bytes / 1e6).toFixed(0)}MB   `);
}
ws.end();
console.error(`\ntranscripts.jsonl: ${got} rows, ${(bytes / 1e6).toFixed(1)}MB`);
