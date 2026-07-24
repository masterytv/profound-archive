/**
 * Deterministic aggregation over the AI-extracted structured fields.
 * Produces: element prevalence, the journey transition graph, entity census.
 * No LLM involved — these numbers are counted, not estimated.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('scratch/afterlife');
const readJsonl = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

const analysis = readJsonl('analysis.jsonl');
const meta = readJsonl('meta.jsonl');
const cv = new Map(meta.map(m => [m.videoId, m.rvnde_total_score]));
const isClear = new Map(meta.map(m => [m.videoId, m.isNde === 'clear_nde']));

// Restrict to clear NDEs — the map describes NDEs, not adjacent phenomena.
const rows = analysis.filter(a => isClear.get(a.video_id));
console.log(`# Clear-NDE accounts with analysis: ${rows.length}`);

// ── cvNDE strata ────────────────────────────────────────────────────────────
const strata = {
  all: r => true,
  cv13: r => (cv.get(r.video_id) ?? 0) >= 13,   // Moderate+
  cv18: r => (cv.get(r.video_id) ?? 0) >= 18,   // High+
  cv23: r => (cv.get(r.video_id) ?? 0) >= 23,   // Exceptional
};
for (const [k, f] of Object.entries(strata)) console.log(`# stratum ${k}: ${rows.filter(f).length}`);

// ── 1. core_elements prevalence ─────────────────────────────────────────────
const elementStats = {};
for (const [sName, sFilter] of Object.entries(strata)) {
  const subset = rows.filter(r => sFilter(r) && Array.isArray(r.core_elements));
  const denom = subset.length;
  const tally = {};
  for (const r of subset) {
    for (const e of r.core_elements) {
      if (!e || !e.name) continue;
      tally[e.name] ??= { present: 0, confSum: 0 };
      // `present` plus a confidence floor — the extractor emits present:true at conf 0 sometimes.
      if (e.present && (e.confidence ?? 0) >= 50) {
        tally[e.name].present++;
        tally[e.name].confSum += e.confidence ?? 0;
      }
    }
  }
  for (const [name, t] of Object.entries(tally)) {
    elementStats[name] ??= {};
    elementStats[name][sName] = {
      n: t.present,
      denom,
      pct: +(t.present / denom).toFixed(4),
      avgConf: t.present ? Math.round(t.confSum / t.present) : 0,
    };
  }
}
console.log('\n## CORE ELEMENT PREVALENCE (present & conf>=50)');
console.log('element'.padEnd(24), 'all'.padStart(8), 'cv>=13'.padStart(8), 'cv>=18'.padStart(8), 'cv>=23'.padStart(8), '   n(all)');
const p = (s, k) => ((s[k]?.pct ?? 0) * 100).toFixed(1).padStart(7) + '%';
for (const [name, s] of Object.entries(elementStats).sort((a, b) => (b[1].all?.pct ?? 0) - (a[1].all?.pct ?? 0))) {
  console.log(name.padEnd(24), p(s, 'all'), p(s, 'cv13'), p(s, 'cv18'), p(s, 'cv23'), String(s.all?.n ?? 0).padStart(8));
}

// ── 2. journey_sequence: element vocabulary + transition graph ──────────────
const seqRows = rows.filter(r => Array.isArray(r.journey_sequence) && r.journey_sequence.length);
const vocab = {};
const trans = {};
let pairCount = 0;
for (const r of seqRows) {
  const seq = [...r.journey_sequence].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(s => s.element).filter(Boolean);
  const seen = new Set();
  for (const el of seq) { if (!seen.has(el)) { vocab[el] = (vocab[el] || 0) + 1; seen.add(el); } }
  for (let i = 0; i < seq.length - 1; i++) {
    if (seq[i] === seq[i + 1]) continue;
    const k = `${seq[i]}>${seq[i + 1]}`;
    trans[k] = (trans[k] || 0) + 1;
    pairCount++;
  }
}
console.log(`\n## JOURNEY SEQUENCES: ${seqRows.length} accounts, ${pairCount} transitions`);
console.log('\n### Journey element vocabulary (share of sequenced accounts)');
for (const [el, n] of Object.entries(vocab).sort((a, b) => b[1] - a[1])) {
  console.log(el.padEnd(26), String(n).padStart(6), ((n / seqRows.length) * 100).toFixed(1).padStart(6) + '%');
}
console.log('\n### Top 45 transitions');
for (const [k, n] of Object.entries(trans).sort((a, b) => b[1] - a[1]).slice(0, 45)) {
  console.log(k.padEnd(48), String(n).padStart(5), ((n / seqRows.length) * 100).toFixed(1).padStart(6) + '%');
}

// Mean ordinal position — establishes the vertical axis of the map.
const posSum = {}, posN = {};
for (const r of seqRows) {
  const seq = [...r.journey_sequence].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(s => s.element).filter(Boolean);
  seq.forEach((el, i) => {
    const rel = seq.length > 1 ? i / (seq.length - 1) : 0.5;
    posSum[el] = (posSum[el] || 0) + rel; posN[el] = (posN[el] || 0) + 1;
  });
}
console.log('\n### Mean relative position in journey (0=start, 1=end)');
for (const [el, s] of Object.entries(posSum).sort((a, b) => (a[1] / posN[a[0]]) - (b[1] / posN[b[0]]))) {
  console.log(el.padEnd(26), (s / posN[el]).toFixed(3).padStart(6), String(posN[el]).padStart(6));
}

// ── 3. entity census ────────────────────────────────────────────────────────
const entRows = rows.filter(r => r.entities && Array.isArray(r.entities.encounters));
const byType = {}, byIdentity = {}, byComm = {}, byLum = {};
let encTotal = 0;
for (const r of entRows) {
  for (const e of r.entities.encounters) {
    encTotal++;
    byType[e.entity_type || '?'] = (byType[e.entity_type || '?'] || 0) + 1;
    const id = (e.identity || '?').toLowerCase().trim();
    byIdentity[id] = (byIdentity[id] || 0) + 1;
    byComm[e.communication_method || '?'] = (byComm[e.communication_method || '?'] || 0) + 1;
    byLum[e.luminosity || '?'] = (byLum[e.luminosity || '?'] || 0) + 1;
  }
}
console.log(`\n## ENTITY CENSUS: ${entRows.length} accounts, ${encTotal} encounters`);
console.log('\n### entity_type');
for (const [k, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(24), String(n).padStart(6), ((n / entRows.length) * 100).toFixed(1).padStart(6) + '%');
console.log('\n### communication_method');
for (const [k, n] of Object.entries(byComm).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(24), String(n).padStart(6));
console.log('\n### luminosity');
for (const [k, n] of Object.entries(byLum).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(24), String(n).padStart(6));
console.log('\n### Top 90 raw identities');
for (const [k, n] of Object.entries(byIdentity).sort((a, b) => b[1] - a[1]).slice(0, 90)) console.log(k.slice(0, 40).padEnd(42), String(n).padStart(5));

// ── 4. phenomenology + tone/type distributions ──────────────────────────────
const tone = {}, jtype = {}, realcmp = {}, trig = {};
for (const r of rows) {
  tone[r.overall_tone || '?'] = (tone[r.overall_tone || '?'] || 0) + 1;
  jtype[r.journey_nde_type || '?'] = (jtype[r.journey_nde_type || '?'] || 0) + 1;
  trig[r.trigger_category || '?'] = (trig[r.trigger_category || '?'] || 0) + 1;
  const rc = r.phenomenology?.reality_comparison;
  if (rc) realcmp[rc] = (realcmp[rc] || 0) + 1;
}
console.log('\n## overall_tone'); for (const [k, n] of Object.entries(tone).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(22), String(n).padStart(6), ((n / rows.length) * 100).toFixed(1) + '%');
console.log('\n## journey_nde_type'); for (const [k, n] of Object.entries(jtype).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(22), String(n).padStart(6), ((n / rows.length) * 100).toFixed(1) + '%');
console.log('\n## reality_comparison'); for (const [k, n] of Object.entries(realcmp).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(22), String(n).padStart(6));
console.log('\n## trigger_category'); for (const [k, n] of Object.entries(trig).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(k.padEnd(30), String(n).padStart(6));

fs.writeFileSync(path.join(ROOT, 'structured-stats.json'), JSON.stringify({
  denom: rows.length, strata: Object.fromEntries(Object.entries(strata).map(([k, f]) => [k, rows.filter(f).length])),
  elementStats, journeyVocab: vocab, journeySeqCount: seqRows.length, transitions: trans,
  meanPos: Object.fromEntries(Object.entries(posSum).map(([k, v]) => [k, +(v / posN[k]).toFixed(4)])),
  entityTypes: byType, entityIdentities: byIdentity, entityAccounts: entRows.length, encTotal,
  tone, jtype, realcmp, trig,
}, null, 1));
console.log('\n-> structured-stats.json written');
