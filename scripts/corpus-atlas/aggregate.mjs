#!/usr/bin/env node
// scripts/corpus-atlas/aggregate.mjs
//
// Local, offline aggregation of the corpus-atlas JSONL pull (scratch/corpus-atlas/*.jsonl).
// Node built-ins only. No network, no database. Writes:
//   research/corpus-atlas/stats/{nde,uap,cross,channels}.json
//   research/corpus-atlas/stats/tables.md
//   research/corpus-atlas/appendix-top-lists.md
//
// Usage: node scripts/corpus-atlas/aggregate.mjs [--in scratch/corpus-atlas] [--out research/corpus-atlas]

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
function flag(name, dflt) { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; }
const IN = path.resolve(ROOT, flag('--in', 'scratch/corpus-atlas'));
const OUT = path.resolve(ROOT, flag('--out', 'research/corpus-atlas'));
const STATS = path.join(OUT, 'stats');
fs.mkdirSync(STATS, { recursive: true });

// ---------------------------------------------------------------- helpers

async function* rows(name) {
  const file = path.join(IN, name + '.jsonl');
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) { if (line.trim()) yield JSON.parse(line); }
}
async function loadAll(name) { const out = []; for await (const r of rows(name)) out.push(r); return out; }

class Counter extends Map {
  inc(k, by = 1) { this.set(k, (this.get(k) || 0) + by); return this; }
  total() { let t = 0; for (const v of this.values()) t += v; return t; }
  sorted() { return [...this.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); }
  sortedByKey(numeric = false) { return [...this.entries()].sort((a, b) => numeric ? Number(a[0]) - Number(b[0]) : String(a[0]).localeCompare(String(b[0]))); }
}
function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }
function pctS(n, d) { return pct(n, d).toFixed(1) + '%'; }
function r1(x) { return x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10; }
function r2(x) { return x == null || Number.isNaN(x) ? null : Math.round(x * 100) / 100; }
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; }
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function summary(a) { return { n: a.length, min: a.length ? Math.min(...a) : null, max: a.length ? Math.max(...a) : null, mean: r2(mean(a)), median: median(a) }; }
function isNum(x) { return typeof x === 'number' && Number.isFinite(x); }
function norm(s) { return s == null ? null : String(s).trim().toLowerCase().replace(/[\s-]+/g, '_'); }
function band(v, bands) { for (const [lo, hi, label] of bands) if (v >= lo && v <= hi) return label; return 'out_of_range'; }
function fmtInt(n) { return n == null ? '' : Number(n).toLocaleString('en-US'); }
function yearOf(d) { if (!d) return null; const y = Number(String(d).slice(0, 4)); return Number.isFinite(y) ? y : null; }
function trunc(s, n = 220) { if (!s) return ''; s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
function esc(s) { return String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' '); }
function noEmDash(s) { return String(s).replace(/—/g, '-').replace(/–/g, '-'); }
function decade(y) { if (!isNum(y)) return 'unknown'; if (y < 1900) return 'pre-1900'; if (y < 1940) return '1900-1939'; if (y > 2030) return 'implausible (>2030)'; return `${Math.floor(y / 10) * 10}s`; }

// Table registry: every table is stored once (machine-readable) and rendered to tables.md.
const REG = { nde: [], uap: [], cross: [], channels: [] };
function table(domain, id, title, caption, columns, data) {
  const t = { id, title, caption: noEmDash(caption), columns, rows: data };
  REG[domain].push(t);
  return t;
}
function distTable(domain, id, title, counter, denomLabel, opts = {}) {
  const total = counter.total();
  const entries = opts.numericKey ? counter.sortedByKey(true) : counter.sorted();
  const limited = opts.limit ? entries.slice(0, opts.limit) : entries;
  const data = limited.map(([k, v]) => [k, v, pct(v, total)]);
  if (opts.limit && entries.length > opts.limit) {
    const rest = entries.slice(opts.limit).reduce((s, e) => s + e[1], 0);
    data.push([`(other, ${entries.length - opts.limit} values)`, rest, pct(rest, total)]);
  }
  const cap = /n=\d/.test(denomLabel) ? denomLabel : `${denomLabel}; n=${total}`;
  return table(domain, id, title, `${cap}${opts.note ? '. ' + opts.note : ''}`, ['value', 'count', 'pct'], data);
}
function crosstabTable(domain, id, title, caption, rowKeys, colKeys, cells, opts = {}) {
  // cells: Map(rowKey -> Counter(colKey))
  const columns = [opts.rowLabel || 'row', 'n', ...colKeys.map(c => opts.pctOnly ? `${c} %` : `${c}`)];
  const data = rowKeys.map(rk => {
    const c = cells.get(rk) || new Counter();
    const n = c.total();
    return [rk, n, ...colKeys.map(ck => opts.pctOnly ? pct(c.get(ck) || 0, n) : `${c.get(ck) || 0} (${pctS(c.get(ck) || 0, n)})`)];
  });
  return table(domain, id, title, caption, columns, data);
}
function histBands(values, bands) {
  const c = new Counter();
  for (const v of values) c.inc(band(v, bands));
  const order = bands.map(b => b[2]).concat(['out_of_range']);
  const out = new Counter();
  for (const k of order) if (c.get(k)) out.set(k, c.get(k));
  return out;
}
function valueHist(values) { const c = new Counter(); for (const v of values) c.inc(String(v)); return c; }
function groupMeans(items, keyFn, valFns) {
  // returns Map(key -> {n, ...meanOfEach})
  const acc = new Map();
  for (const it of items) {
    const k = keyFn(it); if (k == null) continue;
    let a = acc.get(k); if (!a) { a = { n: 0, vals: Object.fromEntries(Object.keys(valFns).map(v => [v, []])) }; acc.set(k, a); }
    a.n++;
    for (const [name, fn] of Object.entries(valFns)) { const v = fn(it); if (isNum(v)) a.vals[name].push(v); }
  }
  return acc;
}

function fmtCell(v, header) {
  if (typeof v !== 'number') return esc(v);
  const h = String(header).toLowerCase();
  if (h.includes('pct') || h.includes('%')) return v.toFixed(1);
  if (h.includes('year') || h.includes('first shared')) return String(v);
  return Number.isInteger(v) ? fmtInt(v) : String(v);
}

function renderTable(t) {
  const out = [];
  out.push(`### ${t.id}: ${t.title}`);
  out.push('');
  out.push(`_${t.caption}_`);
  out.push('');
  out.push('| ' + t.columns.map(esc).join(' | ') + ' |');
  out.push('| ' + t.columns.map(() => '---').join(' | ') + ' |');
  for (const r of t.rows) out.push('| ' + r.map((v, i) => fmtCell(v, t.columns[i] || '')).join(' | ') + ' |');
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------- NDE

const NDE_ELEMENTS = ['out_of_body', 'tunnel', 'bright_light', 'deceased_relatives', 'life_review', 'being_of_light', 'border_boundary', 'feelings_of_peace', 'cosmic_unity', 'time_distortion', 'enhanced_senses', 'telepathy', 'otherworldly_realm', 'knowledge_download', 'choice_to_return'];
const GREYSON_BANDS = [[0, 7, '0-7'], [8, 15, '8-15'], [16, 23, '16-23'], [24, 32, '24-32']];
const TRANSFORM_BANDS = [[0, 0, '0'], [1, 9, '1-9'], [10, 19, '10-19'], [20, 29, '20-29'], [30, 39, '30-39'], [40, 50, '40-50']];
const RVNDE_BANDS = [[0, 9, '0-9'], [10, 14, '10-14'], [15, 19, '15-19'], [20, 24, '20-24'], [25, 32, '25-32']];
const INTENSITY_BANDS = [[-1, 4, '<=4'], [5, 6, '5-6'], [7, 7, '7'], [8, 8, '8'], [9, 9, '9'], [10, 10, '10']];

async function loadNde() {
  const vids = new Map();
  for await (const v of rows('nde_vids')) {
    vids.set(v.videoId, {
      id: v.videoId, title: v.title, channel: v.channelName, channelId: v.channelId, date: v.date, year: yearOf(v.date),
      views: isNum(v.viewCount) ? v.viewCount : null, likes: v.likes, comments: v.commentsCount, duration: v.duration,
      summary: v.analysis_nde_summary, experiencer: v.experiencerFullName, model: v.analysis_ai_model_used,
      rvnde: isNum(v.rvnde_total_score) ? v.rvnde_total_score : null, rvndeLevel: v.rvnde_level, rvndeDetails: v.rvnde_details,
      intake: v.intake_status,
    });
  }
  const analysis = new Map();
  let analysisRows = 0;
  for await (const a of rows('nde_analysis')) {
    analysisRows++;
    if (!vids.has(a.video_id)) continue; // restrict to confirmed NDEs
    analysis.set(a.video_id, a);
  }
  return { vids, analysis, analysisRows };
}

function ndeStats(N) {
  const { vids, analysis, analysisRows } = N;
  const V = [...vids.values()];
  const A = [...analysis.values()];
  const D = { tables: {}, extra: {} };
  const nV = V.length, nA = A.length;
  const joined = A.map(a => ({ a, v: vids.get(a.video_id) }));

  // ---- coverage
  const cov = [];
  const covRow = (field, n, note = '') => cov.push([field, n, pct(n, nV), note]);
  covRow('nde_vids rows (isNde=clear_nde)', nV, 'denominator for this table');
  covRow('nde_analysis row present', nA, `nde_analysis has ${analysisRows} rows in total; ${analysisRows - nA} belong to non-confirmed videos and are excluded from every NDE table`);
  covRow('analysis_nde_summary', V.filter(v => v.summary).length);
  covRow('experience_type', A.filter(a => a.experience_type).length);
  covRow('trigger_category', A.filter(a => a.trigger_category).length);
  covRow('overall_tone', A.filter(a => a.overall_tone).length);
  covRow('intensity_rating', A.filter(a => isNum(a.intensity_rating)).length);
  covRow('total_greyson_score', A.filter(a => isNum(a.total_greyson_score)).length);
  covRow('greyson_breakdown', A.filter(a => a.greyson_breakdown && typeof a.greyson_breakdown === 'object').length);
  covRow('transformation_score (not analysis_failed)', A.filter(a => isNum(a.transformation_score) && a.transformation_classification !== 'analysis_failed').length);
  covRow('transformation_breakdown.domain_analysis', A.filter(a => a.transformation_breakdown?.domain_analysis).length);
  covRow('journey_sequence (non-null)', A.filter(a => Array.isArray(a.journey_sequence)).length);
  covRow('journey_sequence (non-empty)', A.filter(a => Array.isArray(a.journey_sequence) && a.journey_sequence.length).length, 'empty arrays are journey_valid=false rows');
  covRow('journey_nde_type', A.filter(a => a.journey_nde_type).length);
  covRow('core_elements (15-element array)', A.filter(a => Array.isArray(a.core_elements) && a.core_elements.length >= 15).length, 'object-shaped rows are analysis errors');
  covRow('phenomenology (with reality_comparison)', A.filter(a => a.phenomenology && a.phenomenology.reality_comparison).length);
  covRow('entities.encounters', A.filter(a => Array.isArray(a.entities?.encounters)).length);
  covRow('content_safety.flags', A.filter(a => a.content_safety?.flags).length);
  covRow('scale_agreement', A.filter(a => a.scale_agreement).length);
  covRow('rvnde_total_score (nde_vids)', V.filter(v => v.rvnde != null).length);
  covRow('rvnde_details (nde_vids)', V.filter(v => v.rvndeDetails).length, 'two schemas: c1_..c7_ keys (Grok 4 Fast rows) and long-name keys (gpt-4o-mini rows)');
  covRow('experiencerFullName (nde_vids)', V.filter(v => v.experiencer).length);
  covRow('upload date', V.filter(v => v.date).length);
  covRow('viewCount > 0', V.filter(v => v.views > 0).length);
  covRow('duration (nde_vids)', V.filter(v => v.duration).length);
  table('nde', 'nde-coverage', 'Field coverage among confirmed NDE videos', `Denominator: confirmed NDE videos (isNde=clear_nde), n=${nV}. Always-null columns in nde_analysis: intensity_level, meets_nde_criteria, meets_cutoff_criteria, total_nde_c_score, nde_c_breakdown, primary_phenomenology.`, ['field', 'non-null count', 'pct of confirmed', 'note'], cov);

  const dates = V.map(v => v.date).filter(Boolean).sort();
  const channelSet = new Set(V.map(v => v.channel).filter(Boolean));
  const modelC = new Counter(); for (const v of V) modelC.inc(v.model || 'null');
  D.extra.glance = {
    confirmed_videos: nV, with_analysis: nA, analysis_rows_total: analysisRows,
    upload_date_min: dates[0] || null, upload_date_max: dates[dates.length - 1] || null,
    distinct_channels: channelSet.size,
    analysis_model: Object.fromEntries(modelC.sorted()),
    views: summary(V.map(v => v.views).filter(isNum)),
    likes: summary(V.map(v => v.likes).filter(isNum)),
    total_views: V.reduce((s, v) => s + (v.views || 0), 0),
  };
  table('nde', 'nde-glance', 'Corpus at a glance (NDE)', `n=${nV} confirmed NDE videos`, ['metric', 'value'], [
    ['confirmed NDE videos', nV], ['with nde_analysis row', nA], ['distinct channels (channelName)', channelSet.size],
    ['earliest upload', dates[0]], ['latest upload', dates[dates.length - 1]],
    ['total views', D.extra.glance.total_views], ['median views', D.extra.glance.views.median], ['mean views', r1(D.extra.glance.views.mean)],
    ['analysis model split', modelC.sorted().map(([k, v]) => `${k}=${v}`).join('; ')],
  ]);

  // ---- simple distributions
  const cExp = new Counter(), cTrig = new Counter(), cTone = new Counter(), cInt = new Counter(), cJT = new Counter(), cJV = new Counter(), cScale = new Counter(), cTC = new Counter(), cRvL = new Counter(), cConf = new Counter();
  for (const a of A) {
    if (a.experience_type) cExp.inc(norm(a.experience_type));
    if (a.trigger_category) cTrig.inc(norm(a.trigger_category));
    if (a.overall_tone) cTone.inc(norm(a.overall_tone));
    if (isNum(a.intensity_rating)) cInt.inc(String(a.intensity_rating));
    if (a.journey_nde_type) cJT.inc(norm(a.journey_nde_type));
    if (typeof a.journey_valid === 'boolean') cJV.inc(String(a.journey_valid));
    if (a.scale_agreement) cScale.inc(a.scale_agreement);
    if (a.transformation_classification) cTC.inc(a.transformation_classification);
    if (isNum(a.experience_type_confidence)) cConf.inc(String(a.experience_type_confidence));
  }
  for (const v of V) if (v.rvndeLevel) cRvL.inc(v.rvndeLevel);
  distTable('nde', 'nde-experience-type', 'Experience type', cExp, 'Confirmed NDE videos with non-null experience_type', { note: 'lowercased and trimmed' });
  distTable('nde', 'nde-experience-type-confidence', 'Experience type confidence', cConf, 'Confirmed NDE videos with non-null experience_type_confidence', { numericKey: true });
  distTable('nde', 'nde-trigger', 'Trigger category', cTrig, 'Confirmed NDE videos with non-null trigger_category', { note: 'normalized: lowercase, spaces and hyphens to underscores (so "car accident" and "car_accident" merge)' });
  distTable('nde', 'nde-tone', 'Overall tone', cTone, 'Confirmed NDE videos with non-null overall_tone');
  distTable('nde', 'nde-intensity', 'Intensity rating (raw values)', cInt, 'Confirmed NDE videos with non-null intensity_rating', { numericKey: true, note: 'values -1 and 0 look like failed scoring rather than real ratings' });
  distTable('nde', 'nde-journey-type', 'Journey NDE type', cJT, 'Confirmed NDE videos with non-null journey_nde_type');
  distTable('nde', 'nde-journey-valid', 'Journey valid flag', cJV, 'Confirmed NDE videos with non-null journey_valid');
  distTable('nde', 'nde-scale-agreement', 'Scale agreement label', cScale, 'Confirmed NDE videos with non-null scale_agreement');
  distTable('nde', 'nde-transformation-class', 'Transformation classification', cTC, 'Confirmed NDE videos with non-null transformation_classification');
  distTable('nde', 'nde-rvnde-level', 'Veridical (rvnde) level', cRvL, 'Confirmed NDE videos with non-null rvnde_level');

  // ---- Greyson
  const greyVals = A.map(a => a.total_greyson_score).filter(isNum);
  D.extra.greyson = summary(greyVals);
  distTable('nde', 'nde-greyson-values', 'Greyson total score (raw values)', valueHist(greyVals), `Confirmed NDE videos with non-null total_greyson_score; observed range ${D.extra.greyson.min}-${D.extra.greyson.max}, mean ${D.extra.greyson.mean}, median ${D.extra.greyson.median}`, { numericKey: true });
  distTable('nde', 'nde-greyson-bands', 'Greyson total score bands', histBands(greyVals, GREYSON_BANDS), `Confirmed NDE videos with non-null total_greyson_score; observed range ${D.extra.greyson.min}-${D.extra.greyson.max}`);
  // Greyson items
  const gItems = new Map(); let gOdd = 0;
  for (const a of A) {
    const g = a.greyson_breakdown; if (!g || typeof g !== 'object') continue;
    for (const [cat, items] of Object.entries(g)) {
      if (!items || typeof items !== 'object') continue;
      for (const [k, v] of Object.entries(items)) {
        if (!v || typeof v !== 'object' || !isNum(v.score)) { gOdd++; continue; }
        const key = `${cat}.${k}`; let e = gItems.get(key); if (!e) { e = { n: 0, sum: 0, two: 0, one: 0, zero: 0 }; gItems.set(key, e); }
        e.n++; e.sum += v.score; if (v.score === 2) e.two++; else if (v.score === 1) e.one++; else if (v.score === 0) e.zero++;
      }
    }
  }
  table('nde', 'nde-greyson-items', 'Greyson items: mean score and share scoring 2 (max)', `Confirmed NDE videos with greyson_breakdown; per-item n shown (items are scored 0/1/2). ${gOdd} mis-nested item objects skipped.`, ['item', 'n', 'mean score', 'pct score=2', 'pct score=1', 'pct score=0'],
    [...gItems.entries()].filter(([k]) => k.split('.').length === 2 && !['affective', 'cognitive', 'paranormal', 'transcendental'].includes(k.split('.')[1])).sort((x, y) => y[1].sum / y[1].n - x[1].sum / x[1].n).map(([k, e]) => [k, e.n, r2(e.sum / e.n), pct(e.two, e.n), pct(e.one, e.n), pct(e.zero, e.n)]));

  // ---- transformation
  const TA = A.filter(a => isNum(a.transformation_score) && a.transformation_classification !== 'analysis_failed');
  const trVals = TA.map(a => a.transformation_score);
  D.extra.transformation = summary(trVals);
  distTable('nde', 'nde-transformation-values', 'Transformation score (raw values)', valueHist(trVals), `Confirmed NDE videos with transformation score (analysis_failed excluded); observed range ${D.extra.transformation.min}-${D.extra.transformation.max}, mean ${D.extra.transformation.mean}, median ${D.extra.transformation.median}`, { numericKey: true });
  distTable('nde', 'nde-transformation-bands', 'Transformation score bands', histBands(trVals, TRANSFORM_BANDS), `Confirmed NDE videos with transformation score (analysis_failed excluded)`);
  const depth = TA.map(a => a.transformation_breakdown?.quantitative_metrics?.transformation_depth).filter(isNum);
  const breadth = TA.map(a => a.transformation_breakdown?.quantitative_metrics?.transformation_breadth).filter(isNum);
  D.extra.transformation_depth = summary(depth); D.extra.transformation_breadth = summary(breadth);
  distTable('nde', 'nde-transformation-breadth', 'Transformation breadth (number of domains affected)', valueHist(breadth), `Confirmed NDE videos with quantitative_metrics; mean ${D.extra.transformation_breadth.mean}`, { numericKey: true });
  // domains
  const dom = new Map();
  for (const a of TA) {
    const da = a.transformation_breakdown?.domain_analysis; if (!da) continue;
    for (const [code, d] of Object.entries(da)) {
      let e = dom.get(code); if (!e) { e = { name: d.name, n: 0, scores: [], dir: new Counter(), high: 0 }; dom.set(code, e); }
      e.n++; if (isNum(d.score)) { e.scores.push(d.score); if (d.score >= 4) e.high++; } e.dir.inc(norm(d.direction) || 'null');
    }
  }
  table('nde', 'nde-transformation-domains', 'Transformation domains ranked by mean score', `Confirmed NDE videos with domain_analysis, n=${TA.filter(a => a.transformation_breakdown?.domain_analysis).length}; "present" = domain appears in the breakdown; mean over present rows (0-5 scale)`, ['code', 'domain', 'present n', 'present pct', 'mean score', 'pct score>=4', 'direction split'],
    [...dom.entries()].sort((x, y) => mean(y[1].scores) - mean(x[1].scores)).map(([code, e]) => [code, e.name, e.n, pct(e.n, TA.length), r2(mean(e.scores)), pct(e.high, e.n), e.dir.sorted().map(([k, v]) => `${k}=${v}`).join('; ')]));
  const themes = new Counter();
  for (const a of TA) for (const t of (a.transformation_breakdown?.qualitative_profile?.dominant_themes || [])) themes.inc(String(t).trim().toLowerCase());
  distTable('nde', 'nde-transformation-themes', 'Dominant transformation themes (free text, lowercased)', themes, 'Theme mentions across confirmed NDE videos (up to 3 per video)', { limit: 30 });

  // ---- veridical
  const rv = V.filter(v => v.rvnde != null);
  const rvVals = rv.map(v => v.rvnde);
  D.extra.rvnde = summary(rvVals);
  distTable('nde', 'nde-rvnde-values', 'Veridical (rvnde) total score (raw values)', valueHist(rvVals), `Confirmed NDE videos with rvnde_total_score; observed range ${D.extra.rvnde.min}-${D.extra.rvnde.max}, mean ${D.extra.rvnde.mean}, median ${D.extra.rvnde.median}`, { numericKey: true });
  distTable('nde', 'nde-rvnde-bands', 'Veridical (rvnde) score bands', histBands(rvVals, RVNDE_BANDS), 'Confirmed NDE videos with rvnde_total_score');
  const rvCrit = new Map();
  const critAlias = { c1_medical_severity: 'medical_state_severity', c2_access_impossibility: 'perceptual_access_impossibility', c3_specificity: 'specificity_precision', c4_unpredictability: 'unpredictability', c5_verification: 'verification_quality', c6_weight: 'verified_perception_weight', c7_precedence: 'temporal_precedence' };
  for (const v of rv) {
    const d = v.rvndeDetails; if (!d) continue;
    const schema = 'c1_medical_severity' in d ? 'c1..c7 (Grok)' : 'long names (gpt-4o-mini)';
    for (const [k, val] of Object.entries(d)) {
      if (!val || typeof val !== 'object' || !isNum(val.score)) continue;
      const canon = critAlias[k] || k;
      let e = rvCrit.get(canon); if (!e) { e = { byS: new Map() }; rvCrit.set(canon, e); }
      let s = e.byS.get(schema); if (!s) { s = []; e.byS.set(schema, s); }
      s.push(val.score);
    }
  }
  table('nde', 'nde-rvnde-criteria', 'Veridical criteria mean scores by scoring schema', `Confirmed NDE videos with rvnde_details; criteria mapped to one name set (c1..c7 = long names). Two model runs used different key names and, apparently, different scales; compare within a schema only.`, ['criterion', 'schema', 'n', 'mean', 'min', 'max'],
    [...rvCrit.entries()].flatMap(([k, e]) => [...e.byS.entries()].map(([s, arr]) => [k, s, arr.length, r2(mean(arr)), Math.min(...arr), Math.max(...arr)])));

  // ---- core elements
  const CE = A.filter(a => Array.isArray(a.core_elements) && a.core_elements.length >= 15);
  const elemPresent = new Counter(), elemConf = new Map(), pair = new Counter();
  const presentSets = [];
  for (const a of CE) {
    const set = new Set();
    for (const e of a.core_elements) {
      if (!NDE_ELEMENTS.includes(e.name)) continue;
      if (e.present) { set.add(e.name); elemPresent.inc(e.name); if (isNum(e.confidence)) { if (!elemConf.has(e.name)) elemConf.set(e.name, []); elemConf.get(e.name).push(e.confidence); } }
    }
    presentSets.push(set);
    const arr = [...set].sort();
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) pair.inc(arr[i] + ' + ' + arr[j]);
  }
  const nCE = CE.length;
  D.extra.core_elements_n = nCE;
  table('nde', 'nde-core-elements', 'The 15 core NDE elements by frequency', `Confirmed NDE videos with a 15-element core_elements array, n=${nCE}`, ['element', 'present n', 'present pct', 'mean confidence when present'],
    NDE_ELEMENTS.map(e => [e, elemPresent.get(e) || 0, pct(elemPresent.get(e) || 0, nCE), r1(mean(elemConf.get(e) || []))]).sort((x, y) => y[1] - x[1]));
  const elemCount = new Counter(); for (const s of presentSets) elemCount.inc(String(s.size));
  distTable('nde', 'nde-core-elements-count', 'Number of core elements present per video', elemCount, `Confirmed NDE videos with core_elements, n=${nCE}`, { numericKey: true });
  const pairRows = pair.sorted().slice(0, 25).map(([k, v]) => {
    const [x, y] = k.split(' + ');
    const lift = (v / nCE) / ((elemPresent.get(x) / nCE) * (elemPresent.get(y) / nCE));
    return [k, v, pct(v, nCE), r2(lift)];
  });
  table('nde', 'nde-core-element-pairs', 'Top co-occurring core element pairs', `Confirmed NDE videos with core_elements, n=${nCE}; lift = P(both) / (P(a) P(b)); top 25 by count`, ['pair', 'both present n', 'pct of videos', 'lift'], pairRows);
  const liftRows = pair.sorted().filter(([, v]) => v >= 200).map(([k, v]) => { const [x, y] = k.split(' + '); return [k, v, pct(v, nCE), r2((v / nCE) / ((elemPresent.get(x) / nCE) * (elemPresent.get(y) / nCE)))]; }).sort((a, b) => b[3] - a[3]).slice(0, 15);
  table('nde', 'nde-core-element-pairs-lift', 'Core element pairs with highest lift (count >= 200)', `Confirmed NDE videos with core_elements, n=${nCE}`, ['pair', 'both present n', 'pct of videos', 'lift'], liftRows);
  // full pair matrix for JSON
  D.extra.core_element_pairs_all = pair.sorted().map(([k, v]) => ({ pair: k, n: v, pct: pct(v, nCE) }));

  // ---- entities
  const EA = A.filter(a => Array.isArray(a.entities?.encounters));
  const entType = new Counter(), domType = new Counter(), entCount = new Counter(), comm = new Counter(), emo = new Counter(), lum = new Counter(), gen = new Counter(), age = new Counter();
  let encTotal = 0;
  for (const a of EA) {
    const enc = a.entities.encounters; encTotal += enc.length;
    entCount.inc(String(enc.length));
    if (a.entities.dominant_entity_type) domType.inc(norm(a.entities.dominant_entity_type));
    for (const e of enc) {
      entType.inc(norm(e.entity_type) || 'null'); comm.inc(norm(e.communication_method) || 'null'); emo.inc(norm(e.emotional_quality) || 'null'); lum.inc(norm(e.luminosity) || 'null'); gen.inc(norm(e.gender) || 'null'); age.inc(norm(e.age_appearance) || 'null');
    }
  }
  D.extra.entities = { videos_with_entities_field: EA.length, encounters_total: encTotal, videos_with_at_least_one_entity: EA.filter(a => a.entities.encounters.length > 0).length };
  distTable('nde', 'nde-entity-types', 'Entity types across all entity encounters', entType, `Entity encounters listed under entities.encounters in confirmed NDE videos (${EA.length} videos)`, { limit: 25, note: 'normalized: lowercase, spaces to underscores' });
  distTable('nde', 'nde-entity-dominant', 'Dominant entity type per video', domType, `Confirmed NDE videos with entities.dominant_entity_type`, { limit: 20 });
  const anyType = new Counter();
  for (const a of EA) { const seen = new Set(a.entities.encounters.map(e => norm(e.entity_type) || 'null')); for (const t of seen) anyType.inc(t); }
  table('nde', 'nde-entity-any-type', 'Share of videos with at least one entity of each type', `Confirmed NDE videos with entities.encounters, n=${EA.length}; a video counts once per type; top 15 types`, ['entity type', 'videos', 'pct of videos'], anyType.sorted().slice(0, 15).map(([k, v]) => [k, v, pct(v, EA.length)]));
  distTable('nde', 'nde-entity-count', 'Entities per video (length of entities.encounters)', entCount, `Confirmed NDE videos with entities.encounters`, { numericKey: true });
  distTable('nde', 'nde-entity-communication', 'Entity communication method', comm, 'Entity encounters', { limit: 12, note: 'normalized; "not stated" and "not_stated" merged' });
  distTable('nde', 'nde-entity-emotion', 'Entity emotional quality', emo, 'Entity encounters', { limit: 12 });
  distTable('nde', 'nde-entity-luminosity', 'Entity luminosity', lum, 'Entity encounters', { limit: 8 });
  distTable('nde', 'nde-entity-gender', 'Entity gender', gen, 'Entity encounters', { limit: 8 });
  distTable('nde', 'nde-entity-age', 'Entity apparent age', age, 'Entity encounters', { limit: 8 });

  // ---- journey shapes
  const JA = A.filter(a => Array.isArray(a.journey_sequence) && a.journey_sequence.length > 0);
  const first = new Counter(), last = new Counter(), tri = new Counter(), bi = new Counter(), jElem = new Counter(), jLen = new Counter();
  for (const a of JA) {
    const seq = [...a.journey_sequence].sort((x, y) => (x.order ?? 0) - (y.order ?? 0)).map(s => norm(s.element)).filter(Boolean);
    if (!seq.length) continue;
    jLen.inc(String(seq.length)); first.inc(seq[0]); last.inc(seq[seq.length - 1]);
    const seen = new Set(seq); for (const e of seen) jElem.inc(e);
    for (let i = 0; i + 1 < seq.length; i++) bi.inc(seq[i] + ' > ' + seq[i + 1]);
    for (let i = 0; i + 2 < seq.length; i++) tri.inc(seq[i] + ' > ' + seq[i + 1] + ' > ' + seq[i + 2]);
  }
  D.extra.journey_n = JA.length;
  table('nde', 'nde-journey-elements', 'Journey elements (share of videos whose sequence contains the element)', `Confirmed NDE videos with a non-empty journey_sequence, n=${JA.length}; journey elements are a separate vocabulary from the 15 core elements; top 30 of ${jElem.size} distinct values`, ['element', 'videos', 'pct of videos'], jElem.sorted().slice(0, 30).map(([k, v]) => [k, v, pct(v, JA.length)]));
  distTable('nde', 'nde-journey-first', 'Most common first journey element', first, `Non-empty journey sequences, n=${JA.length}`, { limit: 12 });
  distTable('nde', 'nde-journey-last', 'Most common last journey element', last, `Non-empty journey sequences, n=${JA.length}`, { limit: 12 });
  distTable('nde', 'nde-journey-length', 'Journey sequence length', jLen, `Non-empty journey sequences, n=${JA.length}`, { numericKey: true });
  distTable('nde', 'nde-journey-bigrams', 'Top two-step transitions', bi, `Consecutive element pairs across non-empty journey sequences (${JA.length} videos)`, { limit: 20 });
  distTable('nde', 'nde-journey-trigrams', 'Top three-step sequences', tri, `Consecutive element triples across non-empty journey sequences (${JA.length} videos)`, { limit: 20 });

  // ---- phenomenology
  const PA = A.filter(a => a.phenomenology && a.phenomenology.reality_comparison);
  const real = new Counter(), viv = new Counter(), ts = new Counter(), mq = new Counter(), sa = new Counter(), tc = new Counter(), modAct = new Counter(), modExt = new Counter(), emoFirst = new Counter(), emoLast = new Counter(), emoAll = new Counter();
  for (const a of PA) {
    const p = a.phenomenology;
    real.inc(norm(p.reality_comparison)); if (isNum(p.vividness_rating)) viv.inc(String(p.vividness_rating));
    const ac = p.altered_cognition || {}; ts.inc(norm(ac.thought_speed) || 'null'); mq.inc(norm(ac.memory_quality) || 'null'); sa.inc(norm(ac.self_awareness) || 'null'); tc.inc(norm(ac.thought_clarity) || 'null');
    for (const [m, o] of Object.entries(p.sensory_modalities || {})) { if (o?.active) modAct.inc(m); if (o?.extraordinary) modExt.inc(m); }
    const ep = p.emotional_progression; if (Array.isArray(ep) && ep.length) { emoFirst.inc(norm(ep[0].emotion) || 'null'); emoLast.inc(norm(ep[ep.length - 1].emotion) || 'null'); for (const e of ep) emoAll.inc(norm(e.emotion) || 'null'); }
  }
  distTable('nde', 'nde-pheno-reality', 'Reality comparison', real, `Confirmed NDE videos with phenomenology, n=${PA.length}`);
  distTable('nde', 'nde-pheno-vividness', 'Vividness rating', viv, `Confirmed NDE videos with phenomenology, n=${PA.length}`, { numericKey: true });
  distTable('nde', 'nde-pheno-thought-speed', 'Altered cognition: thought speed', ts, `n=${PA.length}`);
  distTable('nde', 'nde-pheno-memory', 'Altered cognition: memory quality', mq, `n=${PA.length}`);
  distTable('nde', 'nde-pheno-self-awareness', 'Altered cognition: self awareness', sa, `n=${PA.length}`);
  distTable('nde', 'nde-pheno-clarity', 'Altered cognition: thought clarity', tc, `n=${PA.length}`);
  table('nde', 'nde-pheno-senses', 'Sensory modalities active and extraordinary', `Confirmed NDE videos with phenomenology, n=${PA.length}`, ['modality', 'active n', 'active pct', 'extraordinary n', 'extraordinary pct'], ['visual', 'auditory', 'tactile', 'kinesthetic', 'olfactory', 'gustatory'].map(m => [m, modAct.get(m) || 0, pct(modAct.get(m) || 0, PA.length), modExt.get(m) || 0, pct(modExt.get(m) || 0, PA.length)]));
  distTable('nde', 'nde-pheno-emotion-first', 'First emotion in emotional_progression', emoFirst, `Videos with non-empty emotional_progression, n=${emoFirst.total()}`, { limit: 12 });
  distTable('nde', 'nde-pheno-emotion-last', 'Last emotion in emotional_progression', emoLast, `Videos with non-empty emotional_progression, n=${emoLast.total()}`, { limit: 12 });
  distTable('nde', 'nde-pheno-emotion-all', 'All emotions mentioned in emotional_progression', emoAll, 'Emotion steps across confirmed NDE videos', { limit: 25 });

  // ---- content safety
  const SA = A.filter(a => a.content_safety?.flags);
  const flags = new Counter(), warn = new Counter(), safe = new Counter();
  for (const a of SA) { for (const [k, v] of Object.entries(a.content_safety.flags)) if (v === true) flags.inc(k); warn.inc(norm(a.content_safety.warning_level) || 'null'); safe.inc(String(a.content_safety.overall_safe)); }
  table('nde', 'nde-safety-flags', 'Content safety flag rates', `Confirmed NDE videos with content_safety.flags, n=${SA.length}`, ['flag', 'true n', 'pct'], ['self_harm', 'suicide_related', 'child_death', 'medical_graphic', 'distressing_content'].map(f => [f, flags.get(f) || 0, pct(flags.get(f) || 0, SA.length)]));
  distTable('nde', 'nde-safety-warning', 'Content safety warning level', warn, `n=${SA.length}`);
  distTable('nde', 'nde-safety-overall', 'Content safety overall_safe', safe, `n=${SA.length}`);

  // ---- cross-tabs
  const toneKeys = ['very_positive', 'positive', 'mixed', 'neutral', 'negative', 'very_negative'];
  const topTrig = cTrig.sorted().slice(0, 14).map(([k]) => k);
  const ct1 = new Map();
  for (const a of A) { if (!a.trigger_category || !a.overall_tone) continue; const t = norm(a.trigger_category); if (!topTrig.includes(t)) continue; if (!ct1.has(t)) ct1.set(t, new Counter()); ct1.get(t).inc(norm(a.overall_tone)); }
  crosstabTable('nde', 'nde-x-tone-by-trigger', 'Tone by trigger category (row %)', `Confirmed NDE videos with both fields; top 14 trigger categories; row n stated per row`, topTrig, toneKeys, ct1, { rowLabel: 'trigger', pctOnly: true });
  const tcKeys = ['No Transformation Discussed', 'Minimal Transformation', 'Moderate Transformation', 'Significant Transformation', 'Major Transformation', 'Comprehensive Profound Transformation'];
  const ct2 = new Map();
  for (const a of TA) { if (!isNum(a.total_greyson_score)) continue; const b = band(a.total_greyson_score, GREYSON_BANDS); if (!ct2.has(b)) ct2.set(b, new Counter()); ct2.get(b).inc(a.transformation_classification); }
  crosstabTable('nde', 'nde-x-transformation-by-greyson', 'Transformation classification by Greyson band (row %)', `Confirmed NDE videos with Greyson and transformation scores`, GREYSON_BANDS.map(b => b[2]), tcKeys, ct2, { rowLabel: 'Greyson band', pctOnly: true });
  const ct2b = new Map();
  for (const a of TA) { const b = band(a.transformation_score, TRANSFORM_BANDS); if (!ct2b.has(b)) ct2b.set(b, new Counter()); ct2b.get(b).inc(a.transformation_classification); }
  crosstabTable('nde', 'nde-x-class-by-transformation-band', 'Transformation classification by transformation score band (counts)', `Confirmed NDE videos with transformation score; shows the thresholds the classifier used`, TRANSFORM_BANDS.map(b => b[2]), tcKeys, ct2b, { rowLabel: 'score band' });
  // core elements by experience type
  const expTypes = cExp.sorted().filter(([k, v]) => v >= 40 && k !== 'analysis_failed').map(([k]) => k);
  const ceByType = new Map(); const nByType = new Counter();
  for (const a of CE) { const t = norm(a.experience_type); if (!expTypes.includes(t)) continue; nByType.inc(t); if (!ceByType.has(t)) ceByType.set(t, new Counter()); for (const e of a.core_elements) if (e.present && NDE_ELEMENTS.includes(e.name)) ceByType.get(t).inc(e.name); }
  table('nde', 'nde-x-elements-by-type', 'Core element presence by experience type (%)', `Confirmed NDE videos with core_elements; column n: ${expTypes.map(t => `${t}=${nByType.get(t)}`).join(', ')}`, ['element', ...expTypes.map(t => t + ' %')], NDE_ELEMENTS.map(e => [e, ...expTypes.map(t => pct(ceByType.get(t)?.get(e) || 0, nByType.get(t)))]));
  const diffs = [];
  for (const t of expTypes) { if (t === 'nde') continue; for (const e of NDE_ELEMENTS) { const r = pct(ceByType.get(t)?.get(e) || 0, nByType.get(t)); const rn = pct(ceByType.get('nde')?.get(e) || 0, nByType.get('nde')); diffs.push([t, e, r, rn, r1(r - rn)]); } }
  table('nde', 'nde-x-elements-type-diffs', 'Largest core element differences vs nde type', `Percentage point difference (type rate minus nde rate); top 15 by absolute difference; types with n>=40`, ['type', 'element', 'type pct', 'nde pct', 'diff (pts)'], diffs.sort((a, b) => Math.abs(b[4]) - Math.abs(a[4])).slice(0, 15));
  // tone by journey type
  const jtKeys = ['positive', 'neutral', 'mixed', 'distressing'];
  const ct3 = new Map();
  for (const a of A) { if (!a.journey_nde_type || !a.overall_tone) continue; const j = norm(a.journey_nde_type); if (!jtKeys.includes(j)) continue; if (!ct3.has(j)) ct3.set(j, new Counter()); ct3.get(j).inc(norm(a.overall_tone)); }
  crosstabTable('nde', 'nde-x-tone-by-journey', 'Tone by journey type (row %)', `Confirmed NDE videos with both fields`, jtKeys, toneKeys, ct3, { rowLabel: 'journey type', pctOnly: true });
  // intensity by transformation class
  const ct4 = new Map(); const intByClass = new Map();
  for (const a of TA) { if (!isNum(a.intensity_rating)) continue; const c = a.transformation_classification; if (!ct4.has(c)) { ct4.set(c, new Counter()); intByClass.set(c, []); } ct4.get(c).inc(band(a.intensity_rating, INTENSITY_BANDS)); intByClass.get(c).push(a.intensity_rating); }
  const t4 = crosstabTable('nde', 'nde-x-intensity-by-class', 'Intensity by transformation classification (row %)', `Confirmed NDE videos with intensity and transformation`, tcKeys, INTENSITY_BANDS.map(b => b[2]), ct4, { rowLabel: 'classification', pctOnly: true });
  t4.columns.push('mean intensity'); t4.rows.forEach(r => r.push(r2(mean(intByClass.get(r[0]) || []))));
  // upload year
  const byYear = groupMeans(joined.filter(j => j.v.year), j => String(j.v.year), { transformation: j => (j.a.transformation_classification !== 'analysis_failed' ? j.a.transformation_score : null), greyson: j => j.a.total_greyson_score, rvnde: j => j.v.rvnde, views: j => j.v.views });
  table('nde', 'nde-x-year', 'Upload year: count and mean scores', `Confirmed NDE videos with an upload date, n=${joined.filter(j => j.v.year).length}`, ['year', 'n', 'mean transformation', 'mean Greyson', 'mean rvnde', 'median views'],
    [...byYear.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([y, e]) => [y, e.n, r1(mean(e.vals.transformation)), r1(mean(e.vals.greyson)), r1(mean(e.vals.rvnde)), median(e.vals.views)]));
  // channels
  const byChan = groupMeans(joined.filter(j => j.v.channel), j => j.v.channel, { transformation: j => (j.a.transformation_classification !== 'analysis_failed' ? j.a.transformation_score : null), greyson: j => j.a.total_greyson_score, rvnde: j => j.v.rvnde, views: j => j.v.views, vpos: j => (j.a.overall_tone ? (j.a.overall_tone === 'very_positive' ? 1 : 0) : null), distress: j => (j.a.journey_nde_type ? (j.a.journey_nde_type === 'distressing' ? 1 : 0) : null) });
  const chanRows = [...byChan.entries()].sort((a, b) => b[1].n - a[1].n).map(([c, e]) => [c, e.n, r1(mean(e.vals.greyson)), r1(mean(e.vals.transformation)), r1(mean(e.vals.rvnde)), median(e.vals.views), pct(e.vals.vpos.reduce((s, x) => s + x, 0), e.vals.vpos.length), pct(e.vals.distress.reduce((s, x) => s + x, 0), e.vals.distress.length)]);
  table('nde', 'nde-x-channels-top15', 'Top 15 channels by confirmed NDE count with mean scores', `Confirmed NDE videos with channelName, n=${joined.filter(j => j.v.channel).length}; ${byChan.size} channels in total`, ['channel', 'n', 'mean Greyson', 'mean transformation', 'mean rvnde', 'median views', 'pct very_positive', 'pct distressing journey'], chanRows.slice(0, 15));
  D.extra.channels_all = chanRows.map(r => ({ channel: r[0], n: r[1], mean_greyson: r[2], mean_transformation: r[3], mean_rvnde: r[4], median_views: r[5], pct_very_positive: r[6], pct_distressing: r[7] }));
  // extra cross-tabs
  const byTrig = groupMeans(joined.filter(j => j.a.trigger_category), j => norm(j.a.trigger_category), { rvnde: j => j.v.rvnde, greyson: j => j.a.total_greyson_score, transformation: j => (j.a.transformation_classification !== 'analysis_failed' ? j.a.transformation_score : null), intensity: j => j.a.intensity_rating });
  table('nde', 'nde-x-scores-by-trigger', 'Mean scores by trigger category', `Confirmed NDE videos with trigger_category; categories with n>=40`, ['trigger', 'n', 'mean Greyson', 'mean transformation', 'mean rvnde', 'mean intensity'], [...byTrig.entries()].filter(([, e]) => e.n >= 40).sort((a, b) => b[1].n - a[1].n).map(([k, e]) => [k, e.n, r1(mean(e.vals.greyson)), r1(mean(e.vals.transformation)), r1(mean(e.vals.rvnde)), r2(mean(e.vals.intensity))]));
  const byModel = groupMeans(joined, j => j.v.model || 'null', { transformation: j => (j.a.transformation_classification !== 'analysis_failed' ? j.a.transformation_score : null), greyson: j => j.a.total_greyson_score, rvnde: j => j.v.rvnde, intensity: j => j.a.intensity_rating, t30: j => (j.a.transformation_classification !== 'analysis_failed' && isNum(j.a.transformation_score) ? (j.a.transformation_score === 30 ? 1 : 0) : null), t36: j => (j.a.transformation_classification !== 'analysis_failed' && isNum(j.a.transformation_score) ? (j.a.transformation_score === 36 ? 1 : 0) : null), g30: j => (isNum(j.a.total_greyson_score) ? (j.a.total_greyson_score === 30 ? 1 : 0) : null), vpos: j => (j.a.overall_tone ? (j.a.overall_tone === 'very_positive' ? 1 : 0) : null) });
  table('nde', 'nde-x-scores-by-model', 'Mean scores by analysis model (nde_vids.analysis_ai_model_used)', `Confirmed NDE videos, n=${joined.length}; the model that wrote the summary and (by timestamp) the analysis row`, ['model', 'n', 'mean Greyson', 'pct Greyson=30', 'mean transformation', 'pct transformation=30', 'pct transformation=36', 'mean rvnde', 'mean intensity', 'pct very_positive'], [...byModel.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, e]) => [k, e.n, r1(mean(e.vals.greyson)), pct(e.vals.g30.reduce((s, x) => s + x, 0), e.vals.g30.length), r1(mean(e.vals.transformation)), pct(e.vals.t30.reduce((s, x) => s + x, 0), e.vals.t30.length), pct(e.vals.t36.reduce((s, x) => s + x, 0), e.vals.t36.length), r1(mean(e.vals.rvnde)), r2(mean(e.vals.intensity)), pct(e.vals.vpos.reduce((s, x) => s + x, 0), e.vals.vpos.length)]));
  const ct5 = new Map();
  for (const a of A) { if (!a.experience_type || !a.overall_tone) continue; const t = norm(a.experience_type); if (!expTypes.includes(t)) continue; if (!ct5.has(t)) ct5.set(t, new Counter()); ct5.get(t).inc(norm(a.overall_tone)); }
  crosstabTable('nde', 'nde-x-tone-by-type', 'Tone by experience type (row %)', 'Confirmed NDE videos with both fields; types with n>=40', expTypes, toneKeys, ct5, { rowLabel: 'experience type', pctOnly: true });
  const ct6 = new Map();
  for (const j of joined) { if (j.v.rvndeLevel && isNum(j.a.total_greyson_score)) { const b = band(j.a.total_greyson_score, GREYSON_BANDS); if (!ct6.has(b)) ct6.set(b, new Counter()); ct6.get(b).inc(j.v.rvndeLevel); } }
  crosstabTable('nde', 'nde-x-rvnde-by-greyson', 'Veridical level by Greyson band (row %)', 'Confirmed NDE videos with both scores', GREYSON_BANDS.map(b => b[2]), ['Low Evidential Strength', 'Moderate Evidential Strength', 'High Evidential Strength', 'Exceptional Evidential Strength'], ct6, { rowLabel: 'Greyson band', pctOnly: true });
  const ct7 = new Map();
  for (const a of A) { if (!a.trigger_category || !a.journey_nde_type) continue; const t = norm(a.trigger_category); if (!topTrig.includes(t)) continue; if (!ct7.has(t)) ct7.set(t, new Counter()); ct7.get(t).inc(norm(a.journey_nde_type)); }
  crosstabTable('nde', 'nde-x-journey-by-trigger', 'Journey type by trigger category (row %)', 'Confirmed NDE videos with both fields; top 14 triggers', topTrig, jtKeys, ct7, { rowLabel: 'trigger', pctOnly: true });
  const domByTone = new Map();
  for (const a of TA) { const da = a.transformation_breakdown?.domain_analysis; if (!da || !a.overall_tone) continue; const t = norm(a.overall_tone); if (!domByTone.has(t)) domByTone.set(t, new Map()); for (const [code, d] of Object.entries(da)) { if (!isNum(d.score)) continue; const m = domByTone.get(t); if (!m.has(code)) m.set(code, []); m.get(code).push(d.score); } }
  const domCodes = [...dom.keys()];
  table('nde', 'nde-x-domains-by-tone', 'Mean transformation domain score by tone', 'Confirmed NDE videos with domain_analysis and tone; mean over videos where the domain is present', ['tone', ...domCodes], toneKeys.filter(t => domByTone.has(t)).map(t => [t, ...domCodes.map(c => r1(mean(domByTone.get(t).get(c) || [])))]));

  // ---- top lists
  const L = {};
  const row = (j, scoreLabel) => ({ id: j.v.id, title: j.v.title, channel: j.v.channel, year: j.v.year, views: j.v.views, score: scoreLabel, summary: trunc(j.v.summary) });
  const byViews = (a, b) => (b.v.views || 0) - (a.v.views || 0);
  L.transformation = joined.filter(j => j.a.transformation_classification !== 'analysis_failed' && isNum(j.a.transformation_score)).sort((a, b) => b.a.transformation_score - a.a.transformation_score || (b.a.total_greyson_score || 0) - (a.a.total_greyson_score || 0) || byViews(a, b)).slice(0, 25).map(j => row(j, `transformation ${j.a.transformation_score} (${j.a.transformation_classification}; Greyson ${j.a.total_greyson_score})`));
  L.greyson = joined.filter(j => isNum(j.a.total_greyson_score)).sort((a, b) => b.a.total_greyson_score - a.a.total_greyson_score || (b.v.rvnde || 0) - (a.v.rvnde || 0) || byViews(a, b)).slice(0, 25).map(j => row(j, `Greyson ${j.a.total_greyson_score} (rvnde ${j.v.rvnde}; transformation ${j.a.transformation_score})`));
  L.veridical = joined.filter(j => j.v.rvnde != null).sort((a, b) => b.v.rvnde - a.v.rvnde || byViews(a, b)).slice(0, 25).map(j => row(j, `rvnde ${j.v.rvnde} (${j.v.rvndeLevel}; Greyson ${j.a.total_greyson_score})`));
  L.views = joined.filter(j => isNum(j.v.views)).sort(byViews).slice(0, 25).map(j => row(j, `views ${fmtInt(j.v.views)} (Greyson ${j.a.total_greyson_score}; transformation ${j.a.transformation_score})`));
  const distressing = joined.filter(j => j.a.overall_tone === 'very_negative' || j.a.journey_nde_type === 'distressing');
  L.distressing = distressing.sort((a, b) => (b.a.intensity_rating || 0) - (a.a.intensity_rating || 0) || byViews(a, b)).slice(0, 25).map(j => row(j, `intensity ${j.a.intensity_rating} (tone ${j.a.overall_tone}; journey ${j.a.journey_nde_type}; Greyson ${j.a.total_greyson_score})`));
  D.extra.distressing_n = distressing.length;
  // repeat experiencers
  const byName = new Map();
  for (const j of joined) { const n = (j.v.experiencer || '').trim(); if (!n || n.split(/\s+/).length < 2) continue; if (!byName.has(n)) byName.set(n, []); byName.get(n).push(j); }
  const repeat = [...byName.entries()].filter(([, arr]) => arr.length >= 2).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  D.extra.repeat_experiencers = { names_with_2plus_videos: repeat.length, names_with_3plus_videos: repeat.filter(([, a]) => a.length >= 3).length, names_total_two_word: byName.size };
  L.repeat = repeat.slice(0, 25).map(([name, arr]) => { const top = [...arr].sort(byViews)[0]; return { id: top.v.id, title: top.v.title, channel: [...new Set(arr.map(j => j.v.channel))].slice(0, 4).join(' / '), year: top.v.year, views: arr.reduce((s, j) => s + (j.v.views || 0), 0), score: `${name}: ${arr.length} videos (mean Greyson ${r1(mean(arr.map(j => j.a.total_greyson_score).filter(isNum)))}, max rvnde ${Math.max(...arr.map(j => j.v.rvnde ?? 0))})`, summary: trunc(top.v.summary) }; });
  const multiRe = /\b(second|two|three|four|multiple|several|third|another|repeated)\s+(near[- ]death experiences?|NDEs?)\b/i;
  const multi = joined.filter(j => multiRe.test(j.v.summary || ''));
  D.extra.multiple_nde_regex = { n: multi.length, regex: multiRe.source };
  L.multiple = multi.sort((a, b) => (b.a.total_greyson_score || 0) - (a.a.total_greyson_score || 0) || byViews(a, b)).slice(0, 25).map(j => row(j, `summary mentions multiple NDEs; Greyson ${j.a.total_greyson_score}; transformation ${j.a.transformation_score}`));
  // high transformation low Greyson
  const hiLo = joined.filter(j => j.a.transformation_classification !== 'analysis_failed' && isNum(j.a.transformation_score) && isNum(j.a.total_greyson_score) && j.a.transformation_score >= 35 && j.a.total_greyson_score <= 15);
  D.extra.high_transformation_low_greyson = { n_t35_g15: hiLo.length, n_t35_g7: hiLo.filter(j => j.a.total_greyson_score <= 7).length, n_t30_g15: joined.filter(j => isNum(j.a.transformation_score) && isNum(j.a.total_greyson_score) && j.a.transformation_score >= 30 && j.a.total_greyson_score <= 15 && j.a.transformation_classification !== 'analysis_failed').length };
  L.hiLo = hiLo.sort((a, b) => a.a.total_greyson_score - b.a.total_greyson_score || b.a.transformation_score - a.a.transformation_score || byViews(a, b)).slice(0, 25).map(j => row(j, `transformation ${j.a.transformation_score} with Greyson ${j.a.total_greyson_score} (type ${j.a.experience_type}; tone ${j.a.overall_tone})`));
  // child experiencers (heuristic)
  const ageRe = /\b(\d{1,2})[- ]?(?:years?|yrs?)[- ]old\b|\bat (?:the )?age (?:of )?(\d{1,2})\b|\bage (\d{1,2})\b|\baged (\d{1,2})\b|\bwhen (?:he|she|they|i) (?:was|were) (\d{1,2})\b|\bat (\d{1,2}) years\b/i;
  const childWordRe = /\blittle (?:girl|boy)\b|\bas a (?:kid|child|little (?:girl|boy))\b|\btoddler\b|\binfant\b|\bnewborn\b|\byoung (?:child|boy|girl)\b|\bchildhood (?:nde|near-death|experience|illness|accident|drowning)\b|\b(?:he|she) was a child\b|\bwhen (?:he|she) was (?:a )?(?:child|kid|young)\b|\b(?:his|her) (?:childhood|early years)\b/i;
  const childRows = [];
  for (const j of joined) {
    const text = `${j.v.summary || ''} ${j.a.trigger_description || ''}`;
    const m = text.match(ageRe);
    let age = null, why = null;
    if (m) { age = Number(m.slice(1).find(x => x != null)); if (age <= 12) why = `age ${age} parsed from "${m[0]}"`; }
    if (!why && !m) { const w = text.match(childWordRe); if (w) why = `phrase "${w[0]}"`; }
    if (why) childRows.push({ j, age, why });
  }
  D.extra.child_heuristic = { n: childRows.length, with_parsed_age_le_12: childRows.filter(c => c.age != null && c.age <= 12).length, phrase_only: childRows.filter(c => c.age == null).length, age_regex: ageRe.source, phrase_regex: childWordRe.source };
  L.child = childRows.sort((a, b) => (a.age ?? 99) - (b.age ?? 99) || byViews(a.j, b.j)).slice(0, 25).map(c => row(c.j, `child heuristic: ${c.why}; Greyson ${c.j.a.total_greyson_score}; transformation ${c.j.a.transformation_score}`));
  const childAges = new Counter(); for (const c of childRows) childAges.inc(c.age == null ? 'phrase only' : String(c.age));
  distTable('nde', 'nde-child-ages', 'Child experiencer heuristic: parsed age at NDE (<=12) or phrase-only match', childAges, `Confirmed NDE videos whose summary or trigger_description matched the child heuristic, n=${childRows.length}. HEURISTIC: regex over AI summaries, not a coded field.`, { numericKey: false });
  D.topLists = L;
  D.tables = Object.fromEntries(REG.nde.map(t => [t.id, t]));
  return D;
}

// ---------------------------------------------------------------- UAP

const EVIDENCE_BANDS = [[0, 9, '0-9'], [10, 12, '10-12'], [13, 15, '13-15'], [16, 18, '16-18'], [19, 30, '19-30']];
const CONTACT_BANDS = [[0, 0, '0'], [1, 8, '1-8'], [9, 16, '9-16'], [17, 24, '17-24'], [25, 32, '25-32']];
const UTRANS_BANDS = [[0, 0, '0'], [1, 9, '1-9'], [10, 19, '10-19'], [20, 29, '20-29'], [30, 60, '30-60']];
const WITNESS_BANDS = [[0, 0, '0'], [1, 1, '1'], [2, 2, '2'], [3, 5, '3-5'], [6, 10, '6-10'], [11, 100, '11-100'], [101, 1e9, '>100']];

async function loadUap() {
  const vids = new Map();
  for await (const v of rows('uap_vids')) vids.set(v.video_id, { id: v.video_id, title: v.title, channel: v.channel_name, channelId: v.channel_id, date: v.date, year: v.video_publish_year, views: isNum(v.view_count) ? v.view_count : null, likes: v.likes, comments: v.comments_count, duration: v.duration, summary: v.analysis_uap_summary, content_type: v.content_type, track: v.track, source_type: v.source_type, experiencer: v.experiencer_name, encounter_count: v.encounter_count, multi: v.multi_encounter, tier: v.tier, intake: v.intake_status });
  const enc = await loadAll('uap_encounters');
  const stats = new Map(); for await (const s of rows('uap_video_stats')) stats.set(s.video_id, s);
  const events = await loadAll('uap_events');
  const persons = await loadAll('uap_canonical_persons');
  const orgs = await loadAll('uap_canonical_orgs');
  const programs = await loadAll('uap_canonical_programs');
  const contactees = await loadAll('uap_contactee_profiles');
  return { vids, enc, stats, events, persons, orgs, programs, contactees };
}

function uapStats(U) {
  const { vids, enc, stats, events, persons, orgs, programs, contactees } = U;
  const V = [...vids.values()];
  const S = [...stats.values()];
  const D = { tables: {}, extra: {} };
  const nV = V.length;
  const encInTier = enc.filter(e => vids.has(e.video_id));
  const statsInTier = S.filter(s => vids.has(s.video_id));

  const cov = [];
  const covRow = (f, n, note = '') => cov.push([f, n, pct(n, nV), note]);
  covRow('uap_vids rows (tier 1-2)', nV, 'denominator');
  covRow('analysis_uap_summary', V.filter(v => v.summary).length);
  covRow('content_type', V.filter(v => v.content_type).length);
  covRow('source_type', V.filter(v => v.source_type).length);
  covRow('experiencer_name', V.filter(v => v.experiencer).length);
  covRow('encounter_count > 0', V.filter(v => v.encounter_count > 0).length);
  covRow('uap_video_stats row', statsInTier.length, `${S.length} stats rows in total; ${S.length - statsInTier.length} not in tier 1-2 set`);
  covRow('has >=1 uap_encounters row', new Set(encInTier.map(e => e.video_id)).size, `${enc.length} encounter rows in total; ${enc.length - encInTier.length} belong to videos outside the tier 1-2 pull`);
  covRow('view_count non-null', V.filter(v => v.views != null).length);
  covRow('intake_status = complete', V.filter(v => v.intake === 'complete').length);
  table('uap', 'uap-coverage', 'Field coverage among tier 1-2 UAP videos', `Denominator: uap_vids with tier in (1,2), n=${nV}. Always-null columns: uap_vids.location, uap_encounters.vallee_type, uap_encounters.segment_start_char/segment_end_char, uap_contactee_profiles.experience_type/recurrence (entity_types is always an empty array).`, ['field', 'non-null count', 'pct', 'note'], cov);
  const dates = V.map(v => v.date).filter(Boolean).sort();
  const chanSet = new Set(V.map(v => v.channel).filter(Boolean));
  D.extra.glance = { videos: nV, encounters_total: enc.length, encounters_in_tier: encInTier.length, videos_with_encounters: new Set(encInTier.map(e => e.video_id)).size, stats_rows: S.length, upload_date_min: dates[0], upload_date_max: dates[dates.length - 1], distinct_channels: chanSet.size, views: summary(V.map(v => v.views).filter(isNum)), total_views: V.reduce((s, v) => s + (v.views || 0), 0), kb: { events: events.length, persons: persons.length, orgs: orgs.length, programs: programs.length, contactees: contactees.length } };
  table('uap', 'uap-glance', 'Corpus at a glance (UAP)', `n=${nV} tier 1-2 UAP videos`, ['metric', 'value'], [
    ['tier 1-2 videos', nV], ['tier 1 (encounters track)', V.filter(v => v.tier === 1).length], ['tier 2 (program track)', V.filter(v => v.tier === 2).length], ['distinct channels', chanSet.size], ['earliest upload', dates[0]], ['latest upload', dates[dates.length - 1]],
    ['encounter rows (all)', enc.length], ['encounter rows on tier 1-2 videos', encInTier.length], ['videos with >=1 encounter row', D.extra.glance.videos_with_encounters], ['video_stats rows', S.length],
    ['total views', D.extra.glance.total_views], ['median views', D.extra.glance.views.median], ['mean views', r1(D.extra.glance.views.mean)],
    ['knowledge base: events / persons / orgs / programs / contactee profiles', `${events.length} / ${persons.length} / ${orgs.length} / ${programs.length} / ${contactees.length}`],
  ]);

  // ---- video distributions
  const cCT = new Counter(), cTrack = new Counter(), cST = new Counter(), cYear = new Counter(), cEC = new Counter(), cMulti = new Counter(), cIntake = new Counter(), cTier = new Counter();
  for (const v of V) { if (v.content_type) cCT.inc(norm(v.content_type)); cTrack.inc(v.track || 'null'); if (v.source_type) cST.inc(norm(v.source_type)); cYear.inc(String(v.year)); cEC.inc(String(v.encounter_count)); cMulti.inc(String(v.multi)); cIntake.inc(v.intake || 'null'); cTier.inc(String(v.tier)); }
  distTable('uap', 'uap-content-type', 'Content type', cCT, 'Tier 1-2 videos with non-null content_type');
  distTable('uap', 'uap-track', 'Track', cTrack, 'Tier 1-2 videos');
  distTable('uap', 'uap-source-type', 'Source type (video level)', cST, 'Tier 1-2 videos with non-null source_type');
  distTable('uap', 'uap-publish-year', 'Video publish year', cYear, 'Tier 1-2 videos', { numericKey: true });
  distTable('uap', 'uap-encounter-count', 'Encounter count per video', cEC, 'Tier 1-2 videos', { numericKey: true });
  distTable('uap', 'uap-multi-encounter', 'Multi-encounter flag', cMulti, 'Tier 1-2 videos');
  distTable('uap', 'uap-intake-status', 'Intake status', cIntake, 'Tier 1-2 videos');
  const ctTrack = new Map(); for (const v of V) { if (!v.content_type) continue; if (!ctTrack.has(v.track)) ctTrack.set(v.track, new Counter()); ctTrack.get(v.track).inc(norm(v.content_type)); }
  crosstabTable('uap', 'uap-x-content-by-track', 'Content type by track (row %)', 'Tier 1-2 videos with content_type', ['encounters', 'program'], cCT.sorted().map(([k]) => k), ctTrack, { rowLabel: 'track', pctOnly: true });

  // ---- encounters
  const E = enc;
  const cH = new Counter(), cES = new Counter(), cST2 = new Counter(), cDec = new Counter(), cRep = new Counter(), cMil = new Counter(), cMedia = new Counter(), cWit = new Counter(), cNamed = new Counter(), cConn = new Counter();
  const evVals = [], cdVals = [], trVals = [];
  for (const e of E) {
    cH.inc(e.hynek_type || 'null'); cST2.inc(norm(e.source_type) || 'null');
    if (isNum(e.evidence_score)) evVals.push(e.evidence_score); if (isNum(e.contact_depth_score)) cdVals.push(e.contact_depth_score); if (isNum(e.transformation_score)) trVals.push(e.transformation_score);
    const c = e.encounter_context;
    if (c) { cDec.inc(decade(c.event_year)); cRep.inc(String(c.reported_to_authorities)); cMil.inc(String(c.military_context?.is_military_witness)); cMedia.inc(String(c.media_coverage?.was_reported_in_media ?? 'null')); if (isNum(c.total_witnesses_mentioned)) cWit.inc(band(c.total_witnesses_mentioned, WITNESS_BANDS)); cNamed.inc(String(Array.isArray(c.named_witnesses) ? Math.min(c.named_witnesses.length, 5) : 'null')); cConn.inc(String(Array.isArray(c.connected_cases) ? Math.min(c.connected_cases.length, 4) : 'null')); } else cDec.inc('no encounter_context');
  }
  D.extra.evidence = summary(evVals); D.extra.contact_depth = summary(cdVals); D.extra.transformation = summary(trVals);
  D.extra.encounter_nulls = { evidence_null: E.filter(e => !isNum(e.evidence_score)).length, contact_null: E.filter(e => !isNum(e.contact_depth_score)).length, transformation_null: E.filter(e => !isNum(e.transformation_score)).length, hynek_null: E.filter(e => !e.hynek_type).length, context_null: E.filter(e => !e.encounter_context).length, event_year_null: E.filter(e => !isNum(e.encounter_context?.event_year)).length };
  distTable('uap', 'uap-hynek', 'Hynek type', cH, `All uap_encounters rows, n=${E.length} (null shown as "null")`);
  distTable('uap', 'uap-encounter-source-type', 'Source type (encounter level)', cST2, `All uap_encounters rows`);
  table('uap', 'uap-vallee', 'Vallee type', 'uap_encounters.vallee_type', ['value', 'count', 'pct'], [['null (field never populated)', E.length, 100]]);
  distTable('uap', 'uap-evidence-values', 'Evidence score (raw values)', valueHist(evVals), `Encounters with non-null evidence_score (${D.extra.encounter_nulls.evidence_null} null, ${pctS(D.extra.encounter_nulls.evidence_null, E.length)}); observed range ${D.extra.evidence.min}-${D.extra.evidence.max}, mean ${D.extra.evidence.mean}, median ${D.extra.evidence.median}`, { numericKey: true });
  distTable('uap', 'uap-evidence-bands', 'Evidence score bands', histBands(evVals, EVIDENCE_BANDS), 'Encounters with non-null evidence_score');
  distTable('uap', 'uap-contact-values', 'Contact depth score (raw values)', valueHist(cdVals), `Encounters with non-null contact_depth_score (${D.extra.encounter_nulls.contact_null} null, ${pctS(D.extra.encounter_nulls.contact_null, E.length)}); observed range ${D.extra.contact_depth.min}-${D.extra.contact_depth.max}, mean ${D.extra.contact_depth.mean}, median ${D.extra.contact_depth.median}`, { numericKey: true });
  distTable('uap', 'uap-contact-bands', 'Contact depth bands', histBands(cdVals, CONTACT_BANDS), 'Encounters with non-null contact_depth_score');
  distTable('uap', 'uap-transformation-values', 'Encounter transformation score (raw values)', valueHist(trVals), `Encounters with non-null transformation_score (${D.extra.encounter_nulls.transformation_null} null, ${pctS(D.extra.encounter_nulls.transformation_null, E.length)}); observed range ${D.extra.transformation.min}-${D.extra.transformation.max}, mean ${D.extra.transformation.mean}, median ${D.extra.transformation.median}`, { numericKey: true });
  distTable('uap', 'uap-transformation-bands', 'Encounter transformation bands', histBands(trVals, UTRANS_BANDS), 'Encounters with non-null transformation_score');
  distTable('uap', 'uap-event-decade', 'Encounter event decade (encounter_context.event_year)', cDec, `All uap_encounters rows, n=${E.length}; ${D.extra.encounter_nulls.event_year_null} have no numeric event_year and are shown as "unknown" or "no encounter_context"`);
  distTable('uap', 'uap-reported-authorities', 'Reported to authorities', cRep, `Encounters with encounter_context, n=${cRep.total()}`);
  distTable('uap', 'uap-military-witness', 'Military witness', cMil, `Encounters with encounter_context, n=${cMil.total()}`);
  distTable('uap', 'uap-media-coverage', 'Reported in media', cMedia, `Encounters with media_coverage, n=${cMedia.total()}`);
  distTable('uap', 'uap-witnesses', 'Total witnesses mentioned (bands)', cWit, `Encounters with numeric total_witnesses_mentioned, n=${cWit.total()}`);
  distTable('uap', 'uap-named-witnesses', 'Named witnesses per encounter (capped at 5)', cNamed, `Encounters with encounter_context`, { numericKey: true });
  distTable('uap', 'uap-connected-cases', 'Connected cases per encounter (capped at 4)', cConn, `Encounters with encounter_context`, { numericKey: true });
  const cCountry = new Counter();
  for (const e of E) { const c = e.encounter_context?.location?.country; if (e.encounter_context) cCountry.inc(c ? norm(c) : 'null'); }
  distTable('uap', 'uap-country', 'Encounter country (encounter_context.location.country)', cCountry, `Encounters with encounter_context, n=${cCountry.total()}`, { limit: 25 });

  // ---- video stats
  const cTone = new Counter(), cEnt = new Counter(), cIV = new Counter(), cPsiN = new Counter();
  const flagsC = new Counter(); const flagNames = ['has_psi_content', 'has_craft_observation', 'has_biologics_claim', 'has_crash_retrieval_claim', 'has_under_oath_claims'];
  const countFields = ['persons_count', 'organizations_count', 'programs_count', 'claims_count', 'locations_count', 'technologies_count', 'psi_mentions_count', 'legislative_events_count', 'secrecy_mechanisms_count'];
  const countAcc = Object.fromEntries(countFields.map(f => [f, []]));
  for (const s of S) { cTone.inc(norm(s.video_tone) || 'null'); cEnt.inc(s.dominant_entity_type == null ? 'null' : norm(s.dominant_entity_type)); cIV.inc(String(s.intelligence_value)); cPsiN.inc(String(s.psi_mentions_count)); for (const f of flagNames) if (s[f] === true) flagsC.inc(f); for (const f of countFields) if (isNum(s[f])) countAcc[f].push(s[f]); }
  distTable('uap', 'uap-video-tone', 'Video tone', cTone, `uap_video_stats rows, n=${S.length}`);
  distTable('uap', 'uap-dominant-entity', 'Dominant entity type (video level)', cEnt, `uap_video_stats rows, n=${S.length}; null = no entity coded (usually no encounter)`, { limit: 20 });
  distTable('uap', 'uap-intelligence-value', 'Intelligence value', cIV, `uap_video_stats rows, n=${S.length}`, { numericKey: true });
  table('uap', 'uap-flags', 'has_* flag rates', `uap_video_stats rows, n=${S.length}`, ['flag', 'true n', 'pct'], flagNames.map(f => [f, flagsC.get(f) || 0, pct(flagsC.get(f) || 0, S.length)]));
  table('uap', 'uap-count-fields', 'Entity count fields: mean and share > 0', `uap_video_stats rows, n=${S.length}`, ['field', 'mean', 'median', 'pct > 0', 'max'], countFields.map(f => [f, r2(mean(countAcc[f])), median(countAcc[f]), pct(countAcc[f].filter(x => x > 0).length, countAcc[f].length), Math.max(...countAcc[f])]));
  distTable('uap', 'uap-psi-mentions', 'Psi mentions count per video', cPsiN, `uap_video_stats rows, n=${S.length}`, { numericKey: true });

  // ---- knowledge base
  const cRole = new Counter(), cOrg = new Counter(), cProg = new Counter(), cEvT = new Counter(), cEvDec = new Counter(), cCY = new Counter(), cCV = new Counter(), cPLV = new Counter();
  for (const p of persons) { cRole.inc(norm(p.role) || 'null'); cPLV.inc(String(Math.min(p.linked_video_count, 10))); }
  for (const o of orgs) cOrg.inc(norm(o.org_type) || 'null');
  for (const p of programs) cProg.inc(norm(p.program_type) || 'null');
  for (const e of events) { cEvT.inc(norm(e.event_type) || 'null'); cEvDec.inc(isNum(e.year) ? decade(e.year) : 'unknown'); }
  for (const c of contactees) { cCY.inc(String(c.first_shared_year)); cCV.inc(String(Math.min(c.video_count, 10))); }
  distTable('uap', 'uap-kb-person-roles', 'Canonical persons by role', cRole, `uap_canonical_persons, n=${persons.length}`);
  distTable('uap', 'uap-kb-person-linked-videos', 'Canonical persons by linked video count (capped at 10)', cPLV, `uap_canonical_persons, n=${persons.length}`, { numericKey: true });
  distTable('uap', 'uap-kb-org-types', 'Canonical organizations by type', cOrg, `uap_canonical_orgs, n=${orgs.length}`);
  distTable('uap', 'uap-kb-program-types', 'Canonical programs by type', cProg, `uap_canonical_programs, n=${programs.length}`);
  distTable('uap', 'uap-kb-event-types', 'Events by type', cEvT, `uap_events, n=${events.length}`);
  distTable('uap', 'uap-kb-event-decades', 'Events by decade (uap_events.year)', cEvDec, `uap_events, n=${events.length}`);
  distTable('uap', 'uap-kb-contactee-year', 'Contactee profiles by first_shared_year', cCY, `uap_contactee_profiles, n=${contactees.length}`, { numericKey: true });
  distTable('uap', 'uap-kb-contactee-videos', 'Contactee profiles by video count (capped at 10)', cCV, `uap_contactee_profiles, n=${contactees.length}`, { numericKey: true });
  table('uap', 'uap-kb-top-persons', 'Top 20 canonical persons by linked videos', `uap_canonical_persons, n=${persons.length}`, ['person', 'role', 'linked videos'], [...persons].sort((a, b) => b.linked_video_count - a.linked_video_count).slice(0, 20).map(p => [p.canonical_name, p.role, p.linked_video_count]));
  table('uap', 'uap-kb-top-orgs', 'Top 20 canonical organizations by linked videos', `uap_canonical_orgs, n=${orgs.length}`, ['organization', 'type', 'linked videos'], [...orgs].sort((a, b) => b.linked_video_count - a.linked_video_count).slice(0, 20).map(o => [o.canonical_name, o.org_type, o.linked_video_count]));
  table('uap', 'uap-kb-top-programs', 'Top 20 canonical programs by linked videos', `uap_canonical_programs, n=${programs.length}`, ['program', 'type', 'linked videos'], [...programs].sort((a, b) => b.linked_video_count - a.linked_video_count).slice(0, 20).map(p => [p.canonical_name, p.program_type, p.linked_video_count]));
  table('uap', 'uap-kb-top-events', 'Top 20 events by linked videos', `uap_events, n=${events.length}`, ['event', 'type', 'year', 'linked videos'], [...events].sort((a, b) => b.video_count - a.video_count).slice(0, 20).map(e => [e.name, e.event_type, e.year, e.video_count]));
  table('uap', 'uap-kb-top-contactees', 'Top 20 contactee profiles by video count', `uap_contactee_profiles, n=${contactees.length}`, ['contactee', 'videos', 'avg evidence', 'avg contact depth', 'avg transformation', 'first shared'], [...contactees].sort((a, b) => b.video_count - a.video_count).slice(0, 20).map(c => [c.display_name, c.video_count, r1(c.avg_evidence_score), r1(c.avg_contact_depth), r1(c.avg_transformation_score), c.first_shared_year]));

  // ---- channels
  const byChan = new Map();
  for (const v of V) { if (!v.channel) continue; let e = byChan.get(v.channel); if (!e) { e = { id: v.channelId, n: 0, enc: 0, views: [], ev: [], cd: [], tr: [], iv: [], first: 0, ct: new Counter() }; byChan.set(v.channel, e); } e.n++; if (v.views != null) e.views.push(v.views); if (v.track === 'encounters') e.enc++; if (v.content_type === 'first_person') e.first++; const s = stats.get(v.id); if (s) { if (isNum(s.max_evidence_score)) e.ev.push(s.max_evidence_score); if (isNum(s.max_contact_depth_score)) e.cd.push(s.max_contact_depth_score); if (isNum(s.max_transformation_score)) e.tr.push(s.max_transformation_score); if (isNum(s.intelligence_value)) e.iv.push(s.intelligence_value); } }
  const chanRows = [...byChan.entries()].sort((a, b) => b[1].n - a[1].n).map(([c, e]) => [c, e.n, pct(e.enc, e.n), r1(mean(e.ev)), r1(mean(e.cd)), r1(mean(e.tr)), r2(mean(e.iv)), median(e.views), pct(e.first, e.n)]);
  table('uap', 'uap-x-channels-top15', 'Top 15 UAP channels by tier 1-2 video count with mean scores', `Tier 1-2 videos, n=${nV}; ${byChan.size} channels; means use uap_video_stats max_* scores where present`, ['channel', 'n', 'pct encounters track', 'mean max evidence', 'mean max contact depth', 'mean max transformation', 'mean intelligence value', 'median views', 'pct first_person'], chanRows.slice(0, 15));
  D.extra.channels_all = chanRows.map(r => ({ channel: r[0], n: r[1], pct_encounters_track: r[2], mean_max_evidence: r[3], mean_max_contact_depth: r[4], mean_max_transformation: r[5], mean_intelligence_value: r[6], median_views: r[7], pct_first_person: r[8] }));

  // ---- cross-tabs
  const hynekKeys = cH.sorted().map(([k]) => k).filter(k => k !== 'null');
  const x1 = new Map(), evByH = new Map(), cdByH = new Map(), trByH = new Map();
  for (const e of E) { const h = e.hynek_type || 'null'; if (h === 'null') continue; if (!x1.has(h)) { x1.set(h, new Counter()); evByH.set(h, []); cdByH.set(h, []); trByH.set(h, []); } if (isNum(e.evidence_score)) { x1.get(h).inc(band(e.evidence_score, EVIDENCE_BANDS)); evByH.get(h).push(e.evidence_score); } if (isNum(e.contact_depth_score)) cdByH.get(h).push(e.contact_depth_score); if (isNum(e.transformation_score)) trByH.get(h).push(e.transformation_score); }
  const tx1 = crosstabTable('uap', 'uap-x-hynek-by-evidence', 'Hynek type by evidence band (row %)', 'Encounters with hynek_type and evidence_score', hynekKeys, EVIDENCE_BANDS.map(b => b[2]), x1, { rowLabel: 'Hynek', pctOnly: true });
  tx1.columns.push('mean evidence'); tx1.rows.forEach(r => r.push(r1(mean(evByH.get(r[0]) || []))));
  const x2 = new Map();
  for (const e of E) { const h = e.hynek_type; if (!h || !isNum(e.contact_depth_score)) continue; if (!x2.has(h)) x2.set(h, new Counter()); x2.get(h).inc(band(e.contact_depth_score, CONTACT_BANDS)); }
  const tx2 = crosstabTable('uap', 'uap-x-hynek-by-contact', 'Hynek type by contact depth band (row %)', 'Encounters with hynek_type and contact_depth_score', hynekKeys, CONTACT_BANDS.map(b => b[2]), x2, { rowLabel: 'Hynek', pctOnly: true });
  tx2.columns.push('mean contact depth', 'mean transformation'); tx2.rows.forEach(r => r.push(r1(mean(cdByH.get(r[0]) || [])), r1(mean(trByH.get(r[0]) || []))));
  const entKeys = cEnt.sorted().filter(([k]) => k !== 'null').slice(0, 12).map(([k]) => k);
  const x3 = new Map(), trByEnt = new Map();
  for (const s of S) { if (s.dominant_entity_type == null) continue; const k = norm(s.dominant_entity_type); if (!entKeys.includes(k)) continue; if (!x3.has(k)) { x3.set(k, new Counter()); trByEnt.set(k, []); } if (isNum(s.max_transformation_score)) { x3.get(k).inc(band(s.max_transformation_score, UTRANS_BANDS)); trByEnt.get(k).push(s.max_transformation_score); } else x3.get(k).inc('no score'); }
  const tx3 = crosstabTable('uap', 'uap-x-entity-by-transformation', 'Dominant entity type by max transformation band (row %)', 'uap_video_stats rows with a dominant_entity_type; top 12 entity types; "no score" = max_transformation_score null', entKeys, [...UTRANS_BANDS.map(b => b[2]), 'no score'], x3, { rowLabel: 'entity type', pctOnly: true });
  tx3.columns.push('mean max transformation (scored)'); tx3.rows.forEach(r => r.push(r1(mean(trByEnt.get(r[0]) || []))));
  const ctKeys = cCT.sorted().map(([k]) => k);
  const x4 = new Map(), evByCT = new Map();
  for (const v of V) { if (!v.content_type) continue; const s = stats.get(v.id); const k = norm(v.content_type); if (!x4.has(k)) { x4.set(k, new Counter()); evByCT.set(k, []); } if (s && isNum(s.max_evidence_score)) { x4.get(k).inc(band(s.max_evidence_score, EVIDENCE_BANDS)); evByCT.get(k).push(s.max_evidence_score); } else x4.get(k).inc('no score'); }
  const tx4 = crosstabTable('uap', 'uap-x-content-by-evidence', 'Content type by max evidence band (row %)', 'Tier 1-2 videos with content_type; "no score" = no encounter scored', ctKeys, [...EVIDENCE_BANDS.map(b => b[2]), 'no score'], x4, { rowLabel: 'content type', pctOnly: true });
  tx4.columns.push('mean max evidence (scored)'); tx4.rows.forEach(r => r.push(r1(mean(evByCT.get(r[0]) || []))));
  const x5 = new Map(), cdByPsi = new Map();
  for (const s of S) { const k = String(s.has_psi_content); if (!x5.has(k)) { x5.set(k, new Counter()); cdByPsi.set(k, []); } if (isNum(s.max_contact_depth_score)) { x5.get(k).inc(band(s.max_contact_depth_score, CONTACT_BANDS)); cdByPsi.get(k).push(s.max_contact_depth_score); } else x5.get(k).inc('no score'); }
  const tx5 = crosstabTable('uap', 'uap-x-psi-by-contact', 'Psi content by max contact depth band (row %)', `uap_video_stats rows, n=${S.length}`, ['true', 'false'], [...CONTACT_BANDS.map(b => b[2]), 'no score'], x5, { rowLabel: 'has_psi_content', pctOnly: true });
  tx5.columns.push('mean max contact depth (scored)'); tx5.rows.forEach(r => r.push(r1(mean(cdByPsi.get(r[0]) || []))));
  const x6 = new Map();
  for (const e of E) { if (!e.hynek_type) continue; const k = norm(e.source_type); if (!x6.has(k)) x6.set(k, new Counter()); x6.get(k).inc(e.hynek_type); }
  crosstabTable('uap', 'uap-x-hynek-by-source', 'Hynek type by encounter source type (row %)', 'Encounters with hynek_type', cST2.sorted().map(([k]) => k), hynekKeys, x6, { rowLabel: 'source type', pctOnly: true });
  const x7 = new Map();
  for (const e of E) { if (!e.hynek_type || !e.encounter_context) continue; const d = decade(e.encounter_context.event_year); if (d === 'unknown') continue; if (!x7.has(d)) x7.set(d, new Counter()); x7.get(d).inc(e.hynek_type); }
  const decKeys = [...x7.keys()].sort();
  crosstabTable('uap', 'uap-x-hynek-by-decade', 'Hynek type by event decade (row %)', 'Encounters with hynek_type and a numeric event_year', decKeys, hynekKeys, x7, { rowLabel: 'decade', pctOnly: true });
  const ivByTone = groupMeans(S, s => norm(s.video_tone), { iv: s => s.intelligence_value, ev: s => s.max_evidence_score, cd: s => s.max_contact_depth_score });
  table('uap', 'uap-x-tone-scores', 'Mean scores by video tone', `uap_video_stats rows, n=${S.length}`, ['tone', 'n', 'mean intelligence value', 'mean max evidence', 'mean max contact depth'], [...ivByTone.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, e]) => [k, e.n, r2(mean(e.vals.iv)), r1(mean(e.vals.ev)), r1(mean(e.vals.cd))]));
  const byYr = groupMeans(V, v => String(v.year), { views: v => v.views, ec: v => v.encounter_count, enc: v => (v.track === 'encounters' ? 1 : 0) });
  table('uap', 'uap-x-year', 'Publish year: count, median views, mean encounter count, share encounters track', `Tier 1-2 videos, n=${nV}`, ['year', 'n', 'median views', 'mean encounter count', 'pct encounters track'], [...byYr.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([y, e]) => [y, e.n, median(e.vals.views), r2(mean(e.vals.ec)), pct(e.vals.enc.reduce((s, x) => s + x, 0), e.n)]));

  // ---- top lists
  const L = {};
  const vinfo = (id) => vids.get(id) || { id, title: '(video not in tier 1-2 pull)', channel: '', year: null, views: null, summary: '' };
  const encRow = (e, label) => { const v = vinfo(e.video_id); return { id: e.video_id, title: v.title, channel: v.channel, year: v.year, views: v.views, score: `${label}; ${e.encounter_label || ''} (${e.hynek_type || 'hynek n/a'}, ${e.source_type})`, summary: trunc(v.summary) }; };
  const vidRow = (v, label) => ({ id: v.id, title: v.title, channel: v.channel, year: v.year, views: v.views, score: label, summary: trunc(v.summary) });
  const byV = (a, b) => (vinfo(b.video_id).views || 0) - (vinfo(a.video_id).views || 0);
  L.evidence = E.filter(e => isNum(e.evidence_score)).sort((a, b) => b.evidence_score - a.evidence_score || (b.contact_depth_score || 0) - (a.contact_depth_score || 0) || byV(a, b)).slice(0, 25).map(e => encRow(e, `evidence ${e.evidence_score} (contact ${e.contact_depth_score}; transformation ${e.transformation_score})`));
  L.contact = E.filter(e => isNum(e.contact_depth_score)).sort((a, b) => b.contact_depth_score - a.contact_depth_score || (b.evidence_score || 0) - (a.evidence_score || 0) || byV(a, b)).slice(0, 25).map(e => encRow(e, `contact depth ${e.contact_depth_score} (evidence ${e.evidence_score}; transformation ${e.transformation_score})`));
  L.transformation = E.filter(e => isNum(e.transformation_score)).sort((a, b) => b.transformation_score - a.transformation_score || (b.contact_depth_score || 0) - (a.contact_depth_score || 0) || byV(a, b)).slice(0, 25).map(e => encRow(e, `transformation ${e.transformation_score} (contact ${e.contact_depth_score}; evidence ${e.evidence_score})`));
  L.views = V.filter(v => isNum(v.views)).sort((a, b) => b.views - a.views).slice(0, 25).map(v => vidRow(v, `views ${fmtInt(v.views)} (${v.content_type}; ${v.track}; encounters ${v.encounter_count})`));
  L.multi = V.filter(v => v.encounter_count >= 2).sort((a, b) => b.encounter_count - a.encounter_count || (b.views || 0) - (a.views || 0)).slice(0, 25).map(v => vidRow(v, `encounter_count ${v.encounter_count} (${v.content_type}; experiencer ${v.experiencer || 'n/a'})`));
  L.oath = S.filter(s => s.has_under_oath_claims && vids.has(s.video_id)).sort((a, b) => b.intelligence_value - a.intelligence_value || (vids.get(b.video_id).views || 0) - (vids.get(a.video_id).views || 0)).slice(0, 25).map(s => vidRow(vids.get(s.video_id), `intelligence_value ${s.intelligence_value} (tone ${s.video_tone}; claims ${s.claims_count}; legislative events ${s.legislative_events_count})`));
  D.extra.under_oath_n = S.filter(s => s.has_under_oath_claims).length;
  L.ce45 = E.filter(e => (e.hynek_type === 'CE4' || e.hynek_type === 'CE5') && isNum(e.contact_depth_score)).sort((a, b) => b.contact_depth_score - a.contact_depth_score || (b.transformation_score || 0) - (a.transformation_score || 0) || byV(a, b)).slice(0, 25).map(e => encRow(e, `contact depth ${e.contact_depth_score} (transformation ${e.transformation_score}; evidence ${e.evidence_score})`));
  D.extra.ce45_n = E.filter(e => e.hynek_type === 'CE4' || e.hynek_type === 'CE5').length;
  const dated = E.filter(e => isNum(e.encounter_context?.event_year) && e.encounter_context.event_year <= 2030).sort((a, b) => a.encounter_context.event_year - b.encounter_context.event_year || byV(a, b));
  const locStr = (loc) => { if (!loc || typeof loc !== 'object') return 'n/a'; const parts = [loc.nearest_city, loc.state_province, loc.country].filter(x => x && x !== 'not_stated'); return parts.length ? parts.join(', ') : 'n/a'; };
  L.earliest = dated.slice(0, 25).map(e => encRow(e, `event year ${e.encounter_context.event_year} (date "${e.encounter_context.event_date}"; location ${locStr(e.encounter_context.location)})`));
  D.extra.earliest = { dated_encounters: dated.length, implausible_years_dropped: E.filter(e => isNum(e.encounter_context?.event_year) && e.encounter_context.event_year > 2030).length };
  L.earliestEvents = [...events].filter(e => isNum(e.year)).sort((a, b) => a.year - b.year).slice(0, 15).map(e => ({ id: (e.video_ids || [])[0] || '', title: e.name, channel: e.event_type, year: e.year, views: null, score: `uap_events year ${e.year}; ${e.video_count} linked videos; ${e.location || e.country || 'location n/a'}`, summary: trunc(e.description) }));
  D.topLists = L;
  D.tables = Object.fromEntries(REG.uap.map(t => [t.id, t]));
  return D;
}

// ---------------------------------------------------------------- CROSS + CHANNELS

async function loadViz() {
  const out = {};
  for await (const r of rows('viz_graph_cache')) out[r.viz_id] = { computed_at: r.computed_at, row_count: r.row_count, graph: r.graph_json };
  return out;
}

function crossStats(N, U, ndeD, uapD, viz) {
  const D = { tables: {}, extra: {} };
  const A = [...N.analysis.values()];
  const CE = A.filter(a => Array.isArray(a.core_elements) && a.core_elements.length >= 15);
  const nCE = CE.length;
  const el = (name) => CE.filter(a => a.core_elements.some(e => e.name === name && e.present)).length;
  const EA = A.filter(a => Array.isArray(a.entities?.encounters));
  const nEnt = EA.filter(a => a.entities.encounters.length > 0).length;
  const encAll = EA.flatMap(a => a.entities.encounters);
  const telComm = encAll.filter(e => norm(e.communication_method) === 'telepathy').length;
  const JA = A.filter(a => Array.isArray(a.journey_sequence) && a.journey_sequence.length);
  const fearJ = JA.filter(a => a.journey_sequence.some(s => norm(s.element) === 'fear_distress')).length;
  const hellJ = JA.filter(a => a.journey_sequence.some(s => norm(s.element) === 'hellish_realm')).length;
  const toneA = A.filter(a => a.overall_tone);
  const veryNeg = toneA.filter(a => a.overall_tone === 'very_negative').length;
  const TA = A.filter(a => isNum(a.transformation_score) && a.transformation_classification !== 'analysis_failed');
  const sig = TA.filter(a => a.transformation_score >= 20).length;
  const anyT = TA.filter(a => a.transformation_score > 0).length;
  const PEdom = TA.filter(a => a.transformation_breakdown?.domain_analysis?.PE).length;
  const time = el('time_distortion');
  // UAP side
  const S = [...U.stats.values()];
  const withEnc = S.filter(s => s.encounter_count > 0);
  const entUap = withEnc.filter(s => s.dominant_entity_type && !['none', 'null'].includes(norm(s.dominant_entity_type))).length;
  const E = U.enc;
  const trScored = E.filter(e => isNum(e.transformation_score));
  const trPos = trScored.filter(e => e.transformation_score > 0).length;
  const tr20 = trScored.filter(e => e.transformation_score >= 20).length;
  const psi = S.filter(s => s.has_psi_content).length;
  const ph = viz['uap-phenomenology']?.graph; const phN = ph?.metadata?.totalEncounters; const phNode = (id) => ph?.nodes?.find(n => n.id === id)?.frequency ?? null;
  const cd = viz['cross-domain']?.graph;
  const comm = cd?.dimensions?.find(d => d.label === 'Communication Methods');
  const emo = cd?.dimensions?.find(d => d.label === 'Emotional Quality');
  const cdv = (dim, cat, side) => dim?.data?.find(x => x.category === cat)?.[side] ?? null;
  const rows_ = [
    ['Light (bright light / luminous phenomena)', `${pctS(el('bright_light'), nCE)} (n=${nCE})`, 'core element bright_light', `${ph ? pctS((phNode('entity:light_being') || 0), phN) : 'n/a'} light-being entity (n=${phN}); cache "luminous craft/entities" 69%`, 'uap-phenomenology node entity:light_being; cross-domain cache overlapping_phenomena'],
    ['Beings / entities encountered', `${pctS(nEnt, EA.length)} (n=${EA.length})`, 'entities.encounters non-empty', `${pctS(entUap, withEnc.length)} (n=${withEnc.length} videos with encounters)`, 'uap_video_stats.dominant_entity_type not none among videos with encounter_count>0'],
    ['Telepathic communication', `${pctS(el('telepathy'), nCE)} of videos (core element); ${pctS(telComm, encAll.length)} of entity encounters (n=${encAll.length})`, 'core element telepathy; entities.encounters.communication_method', comm ? `${pctS(cdv(comm, 'Telepathy', 'uap'), comm.uap_n)} of coded entity communications (n=${comm.uap_n})` : 'n/a', 'cross-domain cache Communication Methods dimension'],
    ['Time distortion / missing time', `${pctS(time, nCE)} (n=${nCE})`, 'core element time_distortion', `${ph ? pctS(phNode('effect:missing_time') || 0, phN) : 'n/a'} missing_time effect (n=${phN}); cache "dilated time perception" 27%`, 'uap-phenomenology node effect:missing_time; cross-domain cache'],
    ['Life review', `${pctS(el('life_review'), nCE)} (n=${nCE})`, 'core element life_review', 'not coded', 'no UAP equivalent'],
    ['Message / knowledge download', `${pctS(el('knowledge_download'), nCE)} (n=${nCE})`, 'core element knowledge_download', 'cache "noetic knowing" 40%', 'cross-domain cache overlapping_phenomena (denominator not stated in cache)'],
    ['Fear during the experience', `${pctS(fearJ, JA.length)} journey has fear_distress (n=${JA.length}); ${pctS(veryNeg, toneA.length)} very_negative tone (n=${toneA.length}); ${pctS(hellJ, JA.length)} hellish_realm`, 'journey_sequence elements; overall_tone', emo ? `${pctS(cdv(emo, 'Fear', 'uap'), emo.uap_n)} of coded entity emotional qualities are fear (n=${emo.uap_n}); anxiety ${pctS(cdv(emo, 'Anxiety', 'uap'), emo.uap_n)}; shock ${pctS(cdv(emo, 'Shock', 'uap'), emo.uap_n)}` : 'n/a', 'cross-domain cache Emotional Quality dimension'],
    ['Peace / love', `${pctS(el('feelings_of_peace'), nCE)} feelings_of_peace (n=${nCE})`, 'core element feelings_of_peace', emo ? `${pctS((cdv(emo, 'Love', 'uap') || 0) + (cdv(emo, 'Peace', 'uap') || 0), emo.uap_n)} love+peace (n=${emo.uap_n}); awe ${pctS(cdv(emo, 'Awe', 'uap'), emo.uap_n)}; curiosity ${pctS(cdv(emo, 'Curiosity', 'uap'), emo.uap_n)}` : 'n/a', 'cross-domain cache Emotional Quality dimension'],
    ['Lasting transformation (any)', `${pctS(anyT, TA.length)} transformation_score > 0 (n=${TA.length})`, 'nde_analysis.transformation_score', `${pctS(trPos, trScored.length)} transformation_score > 0 (n=${trScored.length} scored encounters; ${E.length - trScored.length} null)`, 'uap_encounters.transformation_score'],
    ['Lasting transformation (score >= 20)', `${pctS(sig, TA.length)} (n=${TA.length})`, 'Significant or higher', `${pctS(tr20, trScored.length)} (n=${trScored.length})`, 'encounter score >= 20; scales are not equivalent'],
    ['Psi / expanded perception afterwards', `${pctS(PEdom, TA.length)} PE domain present (n=${TA.length})`, 'transformation domain PE', `${pctS(psi, S.length)} has_psi_content (n=${S.length})`, 'uap_video_stats.has_psi_content (video mentions psi at all, not necessarily aftereffect)'],
    ['Out-of-body sensation', `${pctS(el('out_of_body'), nCE)} (n=${nCE})`, 'core element out_of_body', 'cache "kinesthetic displacement" 9%', 'cross-domain cache'],
    ['Paralysis', 'cache "inability to move/speak" 15%', 'cross-domain cache', `${ph ? pctS(phNode('effect:paralysis') || 0, phN) : 'n/a'} paralysis effect (n=${phN}); cache 1%`, 'uap-phenomenology node effect:paralysis'],
  ];
  table('cross', 'cross-phenomenology', 'Cross-domain phenomenology comparison', `NDE side computed from confirmed NDE videos in this pull; UAP side mixes uap_video_stats/uap_encounters (this pull) with the site's viz_graph_cache (uap-phenomenology computed ${viz['uap-phenomenology']?.graph?.metadata?.computedAt || 'n/a'} over ${phN} encounters; cross-domain computed ${cd?.generated_at || 'n/a'}). CAVEAT: the two domains use different coding schemes (15 fixed NDE core elements vs free-form UAP entity/effect coding), so rates are indicative, not equivalent.`, ['phenomenon', 'NDE rate', 'NDE basis', 'UAP rate', 'UAP basis'], rows_);
  if (cd?.overlapping_phenomena) table('cross', 'cross-cache-overlap', 'Site cache: overlapping phenomena (viz_graph_cache cross-domain)', `Copied from viz_graph_cache viz_id=cross-domain, generated ${cd.generated_at}; nde_total=${cd.nde_total}, uap_total=${cd.uap_total}. Percent denominators are the cache's own and are not restated here.`, ['phenomenon', 'NDE pct', 'NDE label', 'UAP pct', 'UAP label', 'significance'], cd.overlapping_phenomena.map(o => [o.phenomenon, o.nde_pct, o.nde_label, o.uap_pct, o.uap_label, o.significance]));
  if (cd?.dimensions) for (const dim of cd.dimensions) table('cross', 'cross-cache-' + norm(dim.label), `Site cache: ${dim.label}`, `viz_graph_cache cross-domain dimension; nde_n=${dim.nde_n}, uap_n=${dim.uap_n}`, ['category', 'NDE n', 'NDE pct', 'UAP n', 'UAP pct'], dim.data.map(x => [x.category, x.nde, pct(x.nde, dim.nde_n), x.uap, pct(x.uap, dim.uap_n)]));
  // side by side sizes
  const V = [...N.vids.values()], UV = [...U.vids.values()];
  const ndeYears = new Counter(), uapYears = new Counter();
  for (const v of V) if (v.year) ndeYears.inc(String(v.year)); for (const v of UV) uapYears.inc(String(v.year));
  const years = [...new Set([...ndeYears.keys(), ...uapYears.keys()])].sort();
  table('cross', 'cross-year', 'Upload year by domain', `NDE n=${ndeYears.total()} dated confirmed videos; UAP n=${uapYears.total()} tier 1-2 videos`, ['year', 'NDE n', 'NDE pct', 'UAP n', 'UAP pct'], years.map(y => [y, ndeYears.get(y) || 0, pct(ndeYears.get(y) || 0, ndeYears.total()), uapYears.get(y) || 0, pct(uapYears.get(y) || 0, uapYears.total())]));
  const nv = V.map(v => v.views).filter(isNum), uv = UV.map(v => v.views).filter(isNum);
  table('cross', 'cross-size', 'Domain size side by side', 'From this pull', ['metric', 'NDE', 'UAP'], [
    ['videos', V.length, UV.length], ['distinct channels', new Set(V.map(v => v.channel).filter(Boolean)).size, new Set(UV.map(v => v.channel).filter(Boolean)).size],
    ['median views', median(nv), median(uv)], ['mean views', r1(mean(nv)), r1(mean(uv))], ['total views', nv.reduce((s, x) => s + x, 0), uv.reduce((s, x) => s + x, 0)],
    ['share of videos with >= 100k views', pctS(nv.filter(x => x >= 100000).length, nv.length), pctS(uv.filter(x => x >= 100000).length, uv.length)],
    ['first-person share', 'n/a (every confirmed NDE video is a first-person account by construction of the isNde filter)',pctS(UV.filter(v => v.content_type === 'first_person').length, UV.filter(v => v.content_type).length) + ' content_type=first_person; ' + pctS(UV.filter(v => v.source_type === 'direct_experiencer').length, UV.filter(v => v.source_type).length) + ' source_type=direct_experiencer'],
    ['per-item analysis units', `${A.length} nde_analysis rows (1 per video)`, `${U.enc.length} uap_encounters rows (0-15 per video)`],
  ]);
  // channel overlap
  const ndeCh = new Set(V.map(v => v.channelId).filter(Boolean)), uapCh = new Set(UV.map(v => v.channelId).filter(Boolean));
  const overlap = [...ndeCh].filter(c => uapCh.has(c));
  D.extra.channel_overlap = { nde_channel_ids: ndeCh.size, uap_channel_ids: uapCh.size, shared: overlap.length, shared_ids: overlap };
  D.extra.viz_cache = Object.fromEntries(Object.entries(viz).map(([k, v]) => [k, { computed_at: v.computed_at, row_count: v.row_count, keys: v.graph && typeof v.graph === 'object' ? Object.keys(v.graph) : null, metadata: v.graph?.metadata || null }]));
  // nde-elements cache vs recomputed
  const ne = viz['nde-elements']?.graph;
  if (ne?.nodes) {
    const elemNow = new Counter(); for (const a of CE) for (const e of a.core_elements) if (e.present && NDE_ELEMENTS.includes(e.name)) elemNow.inc(e.name);
    table('cross', 'cross-nde-elements-cache-vs-now', 'NDE core element rates: site cache vs this pull', `Cache viz_id=nde-elements computed ${ne.metadata?.computedAt} over ${ne.metadata?.totalExperiences} experiences; this pull n=${nCE} confirmed NDE videos with core_elements`, ['element', 'cache pct', 'this pull pct', 'diff (pts)'], NDE_ELEMENTS.map(e => { const c = ne.nodes.find(n => n.id === e); const now = pct(elemNow.get(e) || 0, nCE); return [e, c?.frequencyPct ?? null, now, c ? r1(now - c.frequencyPct) : null]; }));
  }
  D.tables = Object.fromEntries(REG.cross.map(t => [t.id, t]));
  return D;
}

async function channelStats(ndeD, uapD) {
  const channels = await loadAll('channels');
  const uapChannels = await loadAll('uap_channels');
  const scores = new Map(); for await (const s of rows('uap_channel_scores')) scores.set(s.channel_id, s);
  const D = { tables: {}, extra: {} };
  const cCountry = new Counter(); for (const c of channels) cCountry.inc(c.country || 'null');
  distTable('channels', 'ch-nde-country', 'NDE channels (channels table) by country', cCountry, `channels rows, n=${channels.length}`);
  const cGrade = new Counter(), cArch = new Counter(), cCad = new Counter(), cPers = new Counter();
  for (const s of scores.values()) { cGrade.inc(s.letter_grade || 'null'); cArch.inc(s.archetype_primary || 'null'); cCad.inc(s.posting_cadence || 'null'); cPers.inc(s.personality_code || 'null'); }
  distTable('channels', 'ch-uap-grade', 'UAP channel letter grade', cGrade, `uap_channel_scores rows, n=${scores.size}`);
  distTable('channels', 'ch-uap-archetype', 'UAP channel primary archetype', cArch, `uap_channel_scores rows, n=${scores.size}`);
  distTable('channels', 'ch-uap-cadence', 'UAP channel posting cadence', cCad, `uap_channel_scores rows, n=${scores.size}`);
  distTable('channels', 'ch-uap-personality', 'UAP channel personality code', cPers, `uap_channel_scores rows, n=${scores.size}`);
  table('channels', 'ch-nde-all', 'All NDE channels by confirmed NDE count', `From nde_vids; n=${ndeD.extra.channels_all.length} channels`, ['channel', 'n', 'mean Greyson', 'mean transformation', 'mean rvnde', 'median views', 'pct very_positive', 'pct distressing journey'], ndeD.extra.channels_all.map(c => [c.channel, c.n, c.mean_greyson, c.mean_transformation, c.mean_rvnde, c.median_views, c.pct_very_positive, c.pct_distressing]));
  const byName = new Map(uapChannels.map(c => [c.channel_name, c]));
  table('channels', 'ch-uap-all', 'All UAP channels by tier 1-2 video count', `From uap_vids joined to uap_channel_scores by channel name/id; n=${uapD.extra.channels_all.length} channels`, ['channel', 'n', 'pct encounters track', 'mean max evidence', 'mean max contact depth', 'mean max transformation', 'mean intelligence value', 'median views', 'grade', 'archetype', 'subscribers'], uapD.extra.channels_all.map(c => { const meta = byName.get(c.channel); const sc = meta ? scores.get(meta.channel_id) : null; return [c.channel, c.n, c.pct_encounters_track, c.mean_max_evidence, c.mean_max_contact_depth, c.mean_max_transformation, c.mean_intelligence_value, c.median_views, sc?.letter_grade ?? '', sc?.archetype_primary ?? '', meta?.subscriber_count ?? '']; }));
  table('channels', 'ch-nde-meta', 'NDE channels table (metadata)', `channels rows, n=${channels.length}`, ['name', 'country', 'subscribers', 'total videos', 'total views', 'scanner enabled', 'hidden'], channels.sort((a, b) => b.subscriber_count - a.subscriber_count).map(c => [c.name, c.country || '', c.subscriber_count, c.total_video_count, c.total_view_count, String(c.scanner_enabled), String(c.hidden)]));
  D.extra = { nde_channels_table_rows: channels.length, uap_channels_table_rows: uapChannels.length, uap_channel_scores_rows: scores.size };
  D.tables = Object.fromEntries(REG.channels.map(t => [t.id, t]));
  return D;
}

// ---------------------------------------------------------------- render

function renderTopList(title, intro, items) {
  const out = [`## ${title}`, '', noEmDash(intro), ''];
  if (!items.length) out.push('_No rows._', '');
  items.forEach((it, i) => {
    const link = it.id ? `[${it.id}](https://www.youtube.com/watch?v=${it.id})` : '(no video id)';
    out.push(`${i + 1}. ${link} | ${noEmDash(esc(it.title))} | ${noEmDash(esc(it.channel || ''))} | ${it.year ?? 'n/a'} | ${it.views == null ? 'views n/a' : fmtInt(it.views) + ' views'} | ${noEmDash(it.score)}`);
    if (it.summary) out.push(`   ${noEmDash(it.summary)}`);
  });
  out.push('');
  return out.join('\n');
}

async function main() {
  const t0 = Date.now();
  const manifest = JSON.parse(fs.readFileSync(path.join(IN, 'manifest.json'), 'utf8'));
  const inputs = Object.fromEntries(Object.entries(manifest.files).map(([k, v]) => [k, { rows: v.rows_written, pulled_at: v.pulled_at, filters: v.filters }]));
  const N = await loadNde();
  const ndeD = ndeStats(N);
  const U = await loadUap();
  const uapD = uapStats(U);
  const viz = await loadViz();
  const crossD = crossStats(N, U, ndeD, uapD, viz);
  const chD = await channelStats(ndeD, uapD);
  const meta = { generated_at: new Date().toISOString(), generator: 'scripts/corpus-atlas/aggregate.mjs', inputs, normalization: 'categorical values are trimmed, lowercased, with spaces and hyphens replaced by underscores unless a table says otherwise; percentages are one decimal over the denominator stated in each caption' };
  const write = (name, obj) => { const p = path.join(STATS, name); fs.writeFileSync(p, JSON.stringify({ ...meta, ...obj }, null, 1)); console.log('wrote', path.relative(ROOT, p), fmtInt(fs.statSync(p).size), 'bytes'); };
  write('nde.json', { extra: ndeD.extra, top_lists: ndeD.topLists, tables: ndeD.tables });
  write('uap.json', { extra: uapD.extra, top_lists: uapD.topLists, tables: uapD.tables });
  write('cross.json', { extra: crossD.extra, tables: crossD.tables });
  write('channels.json', { extra: chD.extra, tables: chD.tables });

  // tables.md
  const md = ['# Corpus atlas: every computed table', '', `Generated ${meta.generated_at} by \`scripts/corpus-atlas/aggregate.mjs\` from \`scratch/corpus-atlas/*.jsonl\` (pulled ${manifest.updated_at}). Percentages are one decimal over the denominator stated in each caption. Categorical values are trimmed, lowercased, and spaces/hyphens become underscores unless a caption says otherwise. Machine-readable copies: \`stats/nde.json\`, \`stats/uap.json\`, \`stats/cross.json\`, \`stats/channels.json\` (same table ids).`, ''];
  md.push('## Contents', '');
  for (const [dom, list] of Object.entries(REG)) { md.push(`- **${dom}**: ${list.map(t => t.id).join(', ')}`); }
  md.push('');
  for (const [dom, list] of Object.entries(REG)) { md.push(`## ${dom.toUpperCase()} tables`, ''); for (const t of list) md.push(renderTable(t)); }
  const tp = path.join(STATS, 'tables.md');
  fs.writeFileSync(tp, noEmDash(md.join('\n')));
  console.log('wrote', path.relative(ROOT, tp), fmtInt(fs.statSync(tp).size), 'bytes');

  // appendix-top-lists.md
  const L = ndeD.topLists, UL = uapD.topLists, X = ndeD.extra, UX = uapD.extra;
  const ap = ['# Corpus atlas appendix: top-25 lists', '', `Generated ${meta.generated_at} by \`scripts/corpus-atlas/aggregate.mjs\`. Each line: rank. video id (YouTube link) | title | channel | upload year | views | the relevant score, then the AI summary truncated to about 220 characters. Open any video at youtube.com/watch?v=<id>. NDE lists use confirmed NDEs (isNde=clear_nde, n=${X.glance.confirmed_videos}); UAP lists use uap_encounters (n=${UX.glance.encounters_total}) or tier 1-2 uap_vids (n=${UX.glance.videos}) as stated.`, ''];
  ap.push('# NDE', '');
  ap.push(renderTopList('NDE by transformation score', `Top 25 of ${X.transformation.n} scored videos (range ${X.transformation.min}-${X.transformation.max}); ties broken by Greyson total then views.`, L.transformation));
  ap.push(renderTopList('NDE by Greyson total', `Top 25 of ${X.greyson.n} scored videos (range ${X.greyson.min}-${X.greyson.max}); ${ndeD.tables['nde-greyson-values'].rows.filter(r => Number(r[0]) >= 30).reduce((s, r) => s + r[1], 0)} videos score 30 or more, so ties are broken by rvnde score then views.`, L.greyson));
  ap.push(renderTopList('NDE by veridical (rvnde) score', `Top 25 of ${X.rvnde.n} scored videos (range ${X.rvnde.min}-${X.rvnde.max}); ties broken by views.`, L.veridical));
  ap.push(renderTopList('NDE by views', 'Top 25 confirmed NDE videos by viewCount.', L.views));
  ap.push(renderTopList('Distressing NDEs by intensity', `Videos with overall_tone=very_negative or journey_nde_type=distressing (n=${X.distressing_n}); top 25 by intensity_rating then views.`, L.distressing));
  ap.push(renderTopList('Repeat experiencers (same experiencerFullName on 2+ confirmed videos)', `${X.repeat_experiencers.names_with_2plus_videos} names appear on 2+ videos and ${X.repeat_experiencers.names_with_3plus_videos} on 3+ (of ${X.repeat_experiencers.names_total_two_word} two-word names). Top 25 by video count; the linked video is the most-viewed one; views are summed across the person's videos. Name matching is exact-string, so spelling variants split.`, L.repeat));
  ap.push(renderTopList('Multiple-NDE experiencers (summary regex)', `Summaries matching /${X.multiple_nde_regex.regex}/i (n=${X.multiple_nde_regex.n}); top 25 by Greyson then views. HEURISTIC.`, L.multiple));
  ap.push(renderTopList('High transformation with low Greyson', `transformation_score >= 35 and total_greyson_score <= 15 (n=${X.high_transformation_low_greyson.n_t35_g15}; only ${X.high_transformation_low_greyson.n_t35_g7} have Greyson <= 7, and ${X.high_transformation_low_greyson.n_t30_g15} have transformation >= 30 with Greyson <= 15). Sorted by lowest Greyson, then highest transformation.`, L.hiLo));
  ap.push(renderTopList('Child experiencers (heuristic)', `Summary or trigger_description matched an age expression parsed as <= 12 (${X.child_heuristic.with_parsed_age_le_12} videos) or a child phrase with no parseable age (${X.child_heuristic.phrase_only} videos); n=${X.child_heuristic.n}. Sorted youngest first, then views. HEURISTIC: regex on AI summaries, not a coded field; expect some false positives (for example an age that belongs to someone else in the story).`, L.child));
  ap.push('# UAP', '');
  ap.push(renderTopList('UAP encounters by evidence score', `Top 25 of ${UX.evidence.n} scored encounters (range ${UX.evidence.min}-${UX.evidence.max}); ties by contact depth then views.`, UL.evidence));
  ap.push(renderTopList('UAP encounters by contact depth', `Top 25 of ${UX.contact_depth.n} scored encounters (range ${UX.contact_depth.min}-${UX.contact_depth.max}); ties by evidence then views.`, UL.contact));
  ap.push(renderTopList('UAP encounters by transformation score', `Top 25 of ${UX.transformation.n} scored encounters (range ${UX.transformation.min}-${UX.transformation.max}); ties by contact depth then views.`, UL.transformation));
  ap.push(renderTopList('UAP videos by views', 'Top 25 tier 1-2 videos by view_count.', UL.views));
  ap.push(renderTopList('Multi-encounter videos by encounter_count', `Tier 1-2 videos with encounter_count >= 2 (n=${uapD.tables['uap-encounter-count'].rows.filter(r => Number(r[0]) >= 2).reduce((s, r) => s + r[1], 0)}); top 25 by encounter_count then views.`, UL.multi));
  ap.push(renderTopList('Under-oath claim videos by intelligence_value', `uap_video_stats.has_under_oath_claims=true (n=${UX.under_oath_n}); top 25 by intelligence_value then views.`, UL.oath));
  ap.push(renderTopList('CE-4 / CE-5 encounters by contact depth', `Encounters with hynek_type CE4 or CE5 (n=${UX.ce45_n}); top 25 by contact depth then transformation then views.`, UL.ce45));
  ap.push(renderTopList('Earliest-dated encounters (encounter_context.event_year)', `${UX.earliest.dated_encounters} encounters carry a numeric event_year <= 2030 (${UX.earliest.implausible_years_dropped} implausible year(s) > 2030 dropped); 25 earliest. Years before 1900 are historical anecdotes retold on channels, not witness interviews.`, UL.earliest));
  ap.push(renderTopList('Earliest events in the uap_events knowledge base', 'uap_events rows with a numeric year; 15 earliest. The linked id is the first video_id on the event.', UL.earliestEvents));
  const app = path.join(OUT, 'appendix-top-lists.md');
  fs.writeFileSync(app, noEmDash(ap.join('\n')));
  console.log('wrote', path.relative(ROOT, app), fmtInt(fs.statSync(app).size), 'bytes');
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s; tables: nde=${REG.nde.length} uap=${REG.uap.length} cross=${REG.cross.length} channels=${REG.channels.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
