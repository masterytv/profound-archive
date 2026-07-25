/**
 * Merge the discovery agents' output, then verify it against the corpus.
 *
 * Every claim an agent made is re-checked here in code:
 *   - does the regex compile, and is it non-degenerate?
 *   - do the counts it reported match what the corpus actually says?  (agents can mis-transcribe)
 *   - does every quote appear verbatim in the document it was attributed to?
 *   - where does this place actually fall in the narrative arc?       (measured, not asserted)
 *
 * Nothing an agent asserted is taken on trust.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('scratch/afterlife');
const docs = fs.readFileSync(path.join(ROOT, 'transcripts.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));
const byId = new Map(docs.map(d => [d.id, d]));
const N = docs.length;
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const normDoc = new Map(docs.map(d => [d.id, norm(d.text)]));

// ── Load ─────────────────────────────────────────────────────────────────────
const files = fs.readdirSync(path.join(ROOT, 'found')).filter(f => f.endsWith('.json'));
const raw = [];
for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'found', f), 'utf8'));
    const places = j.places || j;
    if (!Array.isArray(places)) { console.error(`SKIP ${f}: no places array`); continue; }
    for (const p of places) raw.push({ ...p, _src: f.replace('.json', '') });
  } catch (e) { console.error(`SKIP ${f}: ${e.message}`); }
}
console.log(`Loaded ${raw.length} candidate places from ${files.length} files\n`);

// ── Anchors: calibrate a narrative axis inside each transcript ───────────────
// Position is measured against where the NDE narrative actually sits in the interview,
// not against raw character offset (interviews open and close with biography).
const ANCHORS = [
  ['obe',      /\b(left|out of|above|floating above|looking down at) (my|the) (body|self)\b|\bout[- ]of[- ]body\b/i, 0.05],
  ['tunnel',   /\btunnel\b/i, 0.22],
  ['light',    /\b(the|a) (bright|brilliant|blinding|white|beautiful) light\b/i, 0.30],
  ['review',   /\blife review\b|\bmy (whole|entire) life (flashed|passed)\b/i, 0.57],
  ['return',   /\b(came|come|snapped|slammed|shot|sucked|went) back (in|into|to) (my|the) body\b|\bwoke up in\b/i, 0.95],
];

function narrativeSpan(text) {
  const hits = [];
  for (const [, re, pos] of ANCHORS) {
    const m = re.exec(text);
    if (m) hits.push([m.index / text.length, pos]);
  }
  if (hits.length < 2) return null;
  hits.sort((a, b) => a[0] - b[0]);
  return hits;
}
// Piecewise-linear map from raw offset -> journey position, using the anchors present.
function toJourneyPos(offsetFrac, hits) {
  if (!hits) return null;
  if (offsetFrac <= hits[0][0]) return hits[0][1];
  for (let i = 0; i < hits.length - 1; i++) {
    const [x0, y0] = hits[i], [x1, y1] = hits[i + 1];
    if (offsetFrac <= x1) {
      if (x1 === x0) return y1;
      return y0 + ((offsetFrac - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return hits[hits.length - 1][1];
}
const spans = new Map(docs.map(d => [d.id, narrativeSpan(d.text)]));
console.log(`Anchor calibration available for ${[...spans.values()].filter(Boolean).length}/${N} docs\n`);

// ── Verify each place ────────────────────────────────────────────────────────
const strata = {
  all: docs,
  cv13: docs.filter(d => (d.cvnde ?? 0) >= 13),
  cv18: docs.filter(d => (d.cvnde ?? 0) >= 18),
  cv23: docs.filter(d => (d.cvnde ?? 0) >= 23),
};

const results = [];
const problems = [];

for (const p of raw) {
  let re, negRe = null;
  try { re = new RegExp(p.regex, 'i'); }
  catch (e) { problems.push(`${p._src}/${p.id}: BAD REGEX (${e.message})`); continue; }
  if (p.negative_regex) { try { negRe = new RegExp(p.negative_regex, 'i'); } catch { negRe = null; } }

  // Degenerate-pattern guard: a regex matching >80% of docs is measuring English, not a place.
  const match = d => re.test(d.text) && !(negRe && negRe.test(d.text));

  const counts = {};
  for (const [k, set] of Object.entries(strata)) {
    const hits = set.filter(match).length;
    counts[k] = { n: hits, denom: set.length, pct: +(hits / set.length).toFixed(4) };
  }

  // Measured journey position across every matching doc.
  const positions = [];
  for (const d of strata.all) {
    if (!match(d)) continue;
    const m = new RegExp(p.regex, 'i').exec(d.text);
    const hits = spans.get(d.id);
    if (!m || !hits) continue;
    const jp = toJourneyPos(m.index / d.text.length, hits);
    if (jp != null) positions.push(jp);
  }
  positions.sort((a, b) => a - b);
  const measuredPos = positions.length >= 20 ? +(positions[Math.floor(positions.length / 2)]).toFixed(3) : null;

  // Quote verification.
  const quotes = [];
  for (const q of p.quotes || []) {
    const d = byId.get(q.videoId);
    if (!d) { quotes.push({ ...q, ok: false, why: 'unknown videoId' }); continue; }
    const needle = norm(q.text).replace(/^\W+|\W+$/g, '');
    if (needle.length < 12) { quotes.push({ ...q, ok: false, why: 'too short' }); continue; }
    const ok = normDoc.get(q.videoId).includes(needle);
    quotes.push({ videoId: q.videoId, text: q.text, cvnde: d.cvnde, ok, why: ok ? null : 'not found verbatim' });
  }
  const verifiedQuotes = quotes.filter(q => q.ok);

  if (counts.all.pct > 0.80) problems.push(`${p._src}/${p.id}: DEGENERATE regex matches ${(counts.all.pct * 100).toFixed(0)}% of corpus`);
  if (counts.all.n < 8) problems.push(`${p._src}/${p.id}: too rare (${counts.all.n} docs) — keeping but flagged`);
  if (verifiedQuotes.length === 0 && (p.quotes || []).length > 0) problems.push(`${p._src}/${p.id}: 0/${p.quotes.length} quotes verified`);

  results.push({
    ...p,
    counts,
    measured_journey_position: measuredPos,
    position_n: positions.length,
    quotes: verifiedQuotes,
    quotes_rejected: quotes.filter(q => !q.ok).length,
    agent_reported_pct: p.measured?.all_pct ?? null,
    count_discrepancy: p.measured?.all_pct != null
      ? +(Math.abs(p.measured.all_pct - counts.all.pct * 100) > 2 ? 1 : 0) : null,
  });
}

// ── Report ───────────────────────────────────────────────────────────────────
results.sort((a, b) => b.counts.all.pct - a.counts.all.pct);
console.log('## VERIFIED PLACES');
console.log('id'.padEnd(34), 'cat'.padEnd(11), 'all%'.padStart(7), 'cv18%'.padStart(7), 'docs'.padStart(6), 'pos'.padStart(6), 'q✓'.padStart(4));
for (const r of results) {
  console.log(
    r.id.slice(0, 33).padEnd(34),
    (r.category || '?').slice(0, 10).padEnd(11),
    (r.counts.all.pct * 100).toFixed(1).padStart(6) + '%',
    (r.counts.cv18.pct * 100).toFixed(1).padStart(6) + '%',
    String(r.counts.all.n).padStart(6),
    (r.measured_journey_position ?? '—').toString().padStart(6),
    String(r.quotes.length).padStart(4)
  );
}

const qTotal = results.reduce((s, r) => s + r.quotes.length + r.quotes_rejected, 0);
const qOk = results.reduce((s, r) => s + r.quotes.length, 0);
const disc = results.filter(r => r.count_discrepancy).length;
console.log(`\nQuotes verified verbatim: ${qOk}/${qTotal} (${((qOk / qTotal) * 100).toFixed(0)}%)`);
console.log(`Places where the agent's reported % differed from measured by >2pt: ${disc}/${results.length}`);
console.log(`\n## PROBLEMS (${problems.length})`);
for (const p of problems.slice(0, 60)) console.log(' -', p);

fs.writeFileSync(path.join(ROOT, 'verified-places.json'), JSON.stringify({ n: N, strata: Object.fromEntries(Object.entries(strata).map(([k, v]) => [k, v.length])), places: results }, null, 1));
console.log(`\n-> verified-places.json  (${results.length} places)`);
