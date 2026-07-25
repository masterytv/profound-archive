/**
 * Final assembly: verified places + blind precision audit -> src/data/afterlife-map.json
 *
 *   confidence = raw regex prevalence x audited precision
 *   ci95       = 1.96 * raw * sqrt(p(1-p)/n_audit)      (uncertainty from the precision estimate)
 *
 * Places are de-duplicated by MATCHED-DOCUMENT OVERLAP rather than by name: if two proposals
 * select nearly the same accounts, they are the same place regardless of what they were called.
 * Edges are derived by measuring which place is narrated first within each account.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('scratch/afterlife');
const OUT = path.resolve('src/data/afterlife-map.json');

const docs = fs.readFileSync(path.join(ROOT, 'transcripts.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const N = docs.length;
const { places: verified } = JSON.parse(fs.readFileSync(path.join(ROOT, 'verified-places.json'), 'utf8'));
// Auditors each write their own shard; merge them here.
const auditDir = path.join(ROOT, 'audit-out');
const auditRaw = fs.existsSync(auditDir)
  ? fs.readdirSync(auditDir).filter(f => f.endsWith('.json'))
      .flatMap(f => { try { return JSON.parse(fs.readFileSync(path.join(auditDir, f), 'utf8')).audits || []; } catch { return []; } })
  : [];
const audit = new Map(auditRaw.map(a => [a.id, a]));
console.log(`${verified.length} verified places, ${audit.size} audited`);

// ── People, not videos ───────────────────────────────────────────────────────
// 57% of the corpus is repeat appearances — a frequently-interviewed experiencer appears up
// to 35 times. Counting videos would let a handful of people vote many times each, so every
// figure below is computed over UNIQUE EXPERIENCERS: a person reports a place if any of
// their accounts describe it, and their cvNDE is the best score they achieved.
const personOf = new Map();     // docId -> person key
const persons = new Map();      // person key -> { docIdx:[], cv }
docs.forEach((d, i) => {
  const nm = (d.name || '').trim().toLowerCase();
  const key = nm.length > 3 ? `n:${nm}` : `d:${d.id}`;
  personOf.set(d.id, key);
  const rec = persons.get(key) ?? { docIdx: [], cv: 0 };
  rec.docIdx.push(i);
  rec.cv = Math.max(rec.cv, d.cvnde ?? 0);
  persons.set(key, rec);
});
const personList = [...persons.entries()].map(([key, v]) => ({ key, ...v }));
const P = personList.length;
console.log(`${N} accounts collapse to ${P} unique experiencers`);

const strata = {
  all: personList,
  cv13: personList.filter(p => p.cv >= 13),
  cv18: personList.filter(p => p.cv >= 18),
  cv23: personList.filter(p => p.cv >= 23),
};
console.log(`strata (people): ` + Object.entries(strata).map(([k, v]) => `${k}=${v.length}`).join(' '));

// ── Match matrix: for each place, which docs match and where the first hit falls ──
const docIndex = new Map(docs.map((d, i) => [d.id, i]));
// Places whose numbers come from the per-account AI judgement below, so a failing regex is
// not a reason to drop them — the pattern is only used for positioning and quote retrieval.
const ELEMENT_TO_PLACE = {
  out_of_body: 'leaving-the-body',
  tunnel: 'the-tunnel',
  bright_light: 'the-light',
  deceased_relatives: 'deceased-relatives',
  life_review: 'the-life-review',
  being_of_light: 'the-presence',
  border_boundary: 'point-of-no-return',
  otherworldly_realm: 'the-other-side',
  telepathy: 'telepathic-speech',
  knowledge_download: 'the-knowing',
  choice_to_return: 'the-choice',
  feelings_of_peace: 'place-of-pure-feeling',
  cosmic_unity: 'the-source-and-the-universe',
};
const CANONICAL_IDS = new Set(Object.values(ELEMENT_TO_PLACE));

const kept = [];
for (const p of verified) {
  const a = audit.get(p.id);
  if (a?.verdict === 'reject' && !CANONICAL_IDS.has(p.id)) { console.log(`  drop ${p.id}: audit rejected`); continue; }
  // Keep the AUDITED pattern, not the auditor's suggested replacement. The measured precision
  // describes the pattern it was measured on; pairing an unvalidated tighter regex with the
  // looser pattern's precision would penalise the same false positives twice.
  // (Suggested regexes are retained in audit-out/ for a future re-audit round.)
  const src = p.regex;
  let re, neg = null;
  try { re = new RegExp(src, 'i'); } catch { console.log(`  drop ${p.id}: bad regex`); continue; }
  if (p.negative_regex) { try { neg = new RegExp(p.negative_regex, 'i'); } catch {} }

  const hits = new Uint8Array(N);
  const firstAt = new Float32Array(N).fill(-1);
  let n = 0;
  for (let i = 0; i < N; i++) {
    const t = docs[i].text;
    const m = re.exec(t);
    if (!m || (neg && neg.test(t))) continue;
    hits[i] = 1; firstAt[i] = m.index / t.length; n++;
  }
  if (n < 8) { console.log(`  drop ${p.id}: only ${n} matches`); continue; }
  kept.push({ p, audit: a, regexUsed: src, hits, firstAt, n });
}
console.log(`${kept.length} places survive regex + audit`);

// ── De-duplicate by document-set overlap ──────────────────────────────────────
const jaccard = (a, b) => {
  let inter = 0, uni = 0;
  for (let i = 0; i < N; i++) { const x = a[i], y = b[i]; if (x || y) uni++; if (x && y) inter++; }
  return uni ? inter / uni : 0;
};
kept.sort((a, b) => b.n - a.n);
const merged = [];
for (const k of kept) {
  // Independent researchers converged on the same id for the same thing more than once
  // (two proposed "the-garden"), so an id collision is itself a duplicate signal.
  const dupe = merged.find(m => m.p.id === k.p.id || jaccard(m.hits, k.hits) > 0.72);
  if (dupe) {
    // Fold the loser's aliases and quotes into the survivor.
    const seen = new Set(dupe.p.aliases.map(x => x.term.toLowerCase()));
    for (const al of k.p.aliases || []) if (!seen.has(al.term.toLowerCase())) { dupe.p.aliases.push(al); seen.add(al.term.toLowerCase()); }
    if (!seen.has(k.p.name.toLowerCase())) dupe.p.aliases.push({ term: k.p.name, tradition: null, note: 'merged duplicate' });
    dupe.p.quotes = [...(dupe.p.quotes || []), ...(k.p.quotes || [])];
    dupe.p.sensory = [...new Set([...(dupe.p.sensory || []), ...(k.p.sensory || [])])];
    console.log(`  merge ${k.p.id} -> ${dupe.p.id}`);
    continue;
  }
  merged.push(k);
}
// Second pass: two researchers can name the same thing identically while writing patterns
// that select overlapping-but-not-Jaccard-similar sets ("home", "the home", "the place that is
// home"). Same name after normalisation means same place.
{
  const norm = s => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/^the /, '').trim();
  const byName = new Map();
  const survivors = [];
  for (const k of merged) {
    const key = norm(k.p.name);
    const first = byName.get(key);
    if (first) {
      const seen = new Set(first.p.aliases.map(x => x.term.toLowerCase()));
      for (const al of k.p.aliases || []) if (!seen.has(al.term.toLowerCase())) { first.p.aliases.push(al); seen.add(al.term.toLowerCase()); }
      first.p.quotes = [...(first.p.quotes || []), ...(k.p.quotes || [])];
      first.p.sensory = [...new Set([...(first.p.sensory || []), ...(k.p.sensory || [])])];
      console.log(`  merge (same name) ${k.p.id} -> ${first.p.id}`);
      continue;
    }
    byName.set(key, k);
    survivors.push(k);
  }
  merged.length = 0;
  merged.push(...survivors);
}
console.log(`${merged.length} places after de-duplication`);

// Final guarantee: ids are used as React keys and lookup keys downstream.
{
  const seen = new Set();
  for (const m of merged) {
    let id = m.p.id, i = 2;
    while (seen.has(id)) id = `${m.p.id}-${i++}`;
    if (id !== m.p.id) console.log(`  rename ${m.p.id} -> ${id}`);
    m.p.id = id;
    seen.add(id);
  }
}

// ── Tone (which lobe of the map it belongs to) ───────────────────────────────
const DISTRESS = /hell|demon|dark|void|abyss|pit|torment|distress|scream|trapped|grey|gray|lost|purgator|fear|shadow|nothing/i;
const RADIANT = /light|love|peace|heaven|joy|home|god|jesus|angel|bliss|beaut|garden|music|golden|radian/i;
const toneOf = p => (DISTRESS.test(p.id + ' ' + p.name) && !RADIANT.test(p.id) ? 'distressing'
  : RADIANT.test(p.id + ' ' + p.name) ? 'radiant' : 'neutral');

// ── Assemble ─────────────────────────────────────────────────────────────────
const places = merged.map(({ p, audit: a, hits, firstAt, n }) => {
  const precision = a ? Math.max(0, Math.min(1, a.precision)) : (p.precision_estimate ?? 0.75);
  const pn = a?.judged ?? p.precision_sample_n ?? 20;

  // A person counts once, if ANY of their accounts described this place.
  const raw = {}, conf = {}, counts = {};
  for (const [key, set] of Object.entries(strata)) {
    const h = set.filter(pr => pr.docIdx.some(i => hits[i])).length;
    raw[key] = +(h / set.length).toFixed(4);
    counts[key] = Math.round(h * precision);
    conf[key] = +(raw[key] * precision).toFixed(4);
  }
  const se = Math.sqrt(Math.max(1e-6, precision * (1 - precision)) / Math.max(1, pn));
  const ci95 = +(1.96 * raw.all * se).toFixed(4);

  // Quotes: prefer the auditor's blind pick, then the discovery agent's verified ones.
  const quotes = [];
  if (a?.best_quote?.doc && a.best_quote.text) {
    const d = docs.find(x => x.id === a.best_quote.doc);
    if (d) quotes.push({ videoId: d.id, text: a.best_quote.text, cvnde: d.cvnde, speaker: d.name || null });
  }
  for (const q of p.quotes || []) {
    if (quotes.length >= 5) break;
    if (quotes.some(x => x.videoId === q.videoId)) continue;
    const d = docs.find(x => x.id === q.videoId);
    quotes.push({ videoId: q.videoId, text: q.text, cvnde: d?.cvnde ?? q.cvnde ?? null, speaker: d?.name || null });
  }

  const pos = p.measured_journey_position ?? p.journey_position ?? 0.5;

  return {
    id: p.id,
    name: p.name,
    category: p.category,
    tone: toneOf(p),
    parent: p.parent ?? null,
    description: p.description,
    aliases: (p.aliases || []).filter(a2 => a2?.term).slice(0, 24),
    sensory: (p.sensory || []).slice(0, 8),
    confidence: conf,
    raw,
    precision: +precision.toFixed(3),
    precisionN: pn,
    ci95,
    n: counts,
    position: +Math.max(0, Math.min(1, pos)).toFixed(3),
    quotes: quotes.slice(0, 5),
    notes: [p.notes, a?.failure_modes?.length ? `Audit found false positives of the form: ${a.failure_modes.join('; ')}.` : null]
      .filter(Boolean).join(' ') || null,
    _hits: hits, _firstAt: firstAt,
  };
});

// ── Canonical elements: measured per account by AI, not by pattern ──────────
// A regex cannot tell "I met my grandmother" from "I met nobody, no relatives at all" —
// which is exactly why the audit rejected `deceased-relatives`. But the archive already
// carries a per-account judgement of the 15 canonical NDE elements, made by reading each
// transcript whole. Where a place corresponds to one of those, its number comes from that
// judgement instead, and needs no precision correction.
{
  const analysis = fs.readFileSync(path.join(ROOT, 'analysis.jsonl'), 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l));
  const elemByDoc = new Map();
  for (const a of analysis) {
    if (!Array.isArray(a.core_elements)) continue;
    const set = new Set();
    for (const e of a.core_elements) if (e?.name && e.present && (e.confidence ?? 0) >= 50) set.add(e.name);
    elemByDoc.set(a.video_id, set);
  }
  const personHasElement = (pr, el) =>
    pr.docIdx.some(i => elemByDoc.get(docs[i].id)?.has(el));

  let applied = 0;
  for (const [el, placeId] of Object.entries(ELEMENT_TO_PLACE)) {
    const target = places.find(p => p.id === placeId);
    if (!target) continue;
    const conf = {}, counts = {};
    for (const [key, set] of Object.entries(strata)) {
      const h = set.filter(pr => personHasElement(pr, el)).length;
      conf[key] = +(h / set.length).toFixed(4);
      counts[key] = h;
    }
    if (!conf.all) continue;
    target.raw = { ...conf };
    target.confidence = conf;
    target.n = counts;
    target.precision = 1;
    target.precisionN = 0;
    // Binomial interval on the proportion itself — there is no precision step to propagate.
    target.ci95 = +(1.96 * Math.sqrt((conf.all * (1 - conf.all)) / strata.all.length)).toFixed(4);
    target.method = 'ai-extraction';
    applied++;
  }
  console.log(`canonical elements applied to ${applied} places (AI per-account judgement)`);
}
for (const p of places) p.method ??= 'pattern+audit';

// ── Journey position, by narrative rank ─────────────────────────────────────
// Absolute character offset is a poor clock: interviews open with biography and vary wildly
// in length. What is stable is ORDER — within one telling, the tunnel comes before the life
// review. So for each account we rank the places it mentions by first appearance, and a
// place's position is its mean rank across every account that mentions it.
{
  const sum = new Float64Array(places.length);
  const cnt = new Float64Array(places.length);
  for (let d = 0; d < N; d++) {
    const present = [];
    for (let i = 0; i < places.length; i++) if (places[i]._hits[d]) present.push([i, places[i]._firstAt[d]]);
    if (present.length < 3) continue;
    present.sort((a, b) => a[1] - b[1]);
    for (let r = 0; r < present.length; r++) {
      sum[present[r][0]] += r / (present.length - 1);
      cnt[present[r][0]]++;
    }
  }
  let lo = 1, hi = 0;
  const meanRank = places.map((p, i) => {
    const m = cnt[i] >= 25 ? sum[i] / cnt[i] : null;
    if (m != null) { lo = Math.min(lo, m); hi = Math.max(hi, m); }
    return m;
  });
  // Stretch the observed band across the full arc so the map uses its whole length.
  places.forEach((p, i) => {
    const m = meanRank[i];
    p.position = m != null && hi > lo
      ? +(0.04 + ((m - lo) / (hi - lo)) * 0.92).toFixed(3)
      : +Math.max(0, Math.min(1, p.position)).toFixed(3);   // few matches: keep the researcher's estimate
    p.positionSource = m != null ? 'measured' : 'estimated';
    p.positionN = cnt[i];
  });
  console.log(`journey positions: ${places.filter(p => p.positionSource === 'measured').length}/${places.length} measured from narrative rank`);
}

// Sort BEFORE deriving threads — thread routes reference places by array index.
places.sort((a, b) => b.confidence.all - a.confidence.all);

// ── Parents, by containment ─────────────────────────────────────────────────
// Some places genuinely sit inside others: nearly everyone who describes the meadow is
// already describing the green country, and the screens are a facet of the life review.
// That is hierarchy, not duplication — recording it keeps the fine detail the map exists to
// show, while making clear it should not be read as an independent finding.
{
  let assigned = 0;
  for (const child of places) {
    let best = null, bestScore = 0;
    const childN = child.n.all || 1;
    for (const parent of places) {
      if (parent === child) continue;
      if ((parent.n.all || 0) <= childN * 1.4) continue;   // a parent must be substantially larger
      let inter = 0, cn = 0;
      for (let d = 0; d < N; d++) {
        if (!child._hits[d]) continue;
        cn++;
        if (parent._hits[d]) inter++;
      }
      if (!cn) continue;
      const containment = inter / cn;
      if (containment > 0.85 && containment > bestScore) { bestScore = containment; best = parent; }
    }
    if (best) { child.parent = best.id; child.containment = +bestScore.toFixed(2); assigned++; }
  }
  console.log(`parents assigned by containment: ${assigned}`);
}

// ── Edges: which place is narrated first, among accounts reporting both ──────
const edges = [];
for (let i = 0; i < places.length; i++) {
  for (let j = 0; j < places.length; j++) {
    if (i === j) continue;
    const A = places[i], B = places[j];
    let both = 0, aFirst = 0;
    for (let d = 0; d < N; d++) {
      if (!A._hits[d] || !B._hits[d]) continue;
      both++;
      if (A._firstAt[d] < B._firstAt[d]) aFirst++;
    }
    if (both < 60) continue;
    const share = aFirst / both;
    // Directed and near-adjacent: A reliably precedes B, and they sit close on the arc.
    if (share > 0.66 && Math.abs(A.position - B.position) < 0.28) {
      edges.push({ source: A.id, target: B.id, weight: +(both / N).toFixed(4), order: +share.toFixed(3) });
    }
  }
}
// Keep the strongest few per source so the map reads as a route network, not a hairball.
const perSource = {};
for (const e of edges.sort((a, b) => b.weight - a.weight)) {
  (perSource[e.source] ??= []).push(e);
}
const finalEdges = Object.values(perSource).flatMap(list => list.slice(0, 3));

// ── Threads: individual journeys, so the collective is visibly made of people ──
// Each thread is one account's own route: the places it reported, in the order it narrated
// them. A sample is shipped (the full set would be needlessly large) biased toward
// well-evidenced accounts and toward accounts that reported enough places to trace.
const THREAD_TARGET = 420;
const candidates = [];
for (let d = 0; d < N; d++) {
  const route = places
    .map((p, idx) => (p._hits[d] ? { idx, at: p._firstAt[d] } : null))
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);
  if (route.length < 4) continue;
  candidates.push({ d, person: personOf.get(docs[d].id), cv: docs[d].cvnde ?? 0, route: route.map(r => r.idx).slice(0, 14) });
}
// Prefer strongly-evidenced, richly-described accounts, then fill out with the rest.
candidates.sort((a, b) => (b.cv - a.cv) || (b.route.length - a.route.length));
// One thread per person, so a frequently-interviewed experiencer draws one line, not thirty-five.
const seenPerson = new Set();
const unique = candidates.filter(c => !seenPerson.has(c.person) && seenPerson.add(c.person));
candidates.length = 0;
candidates.push(...unique);
const step = Math.max(1, Math.floor(candidates.length / THREAD_TARGET));
const threads = candidates.filter((_, i) => i % step === 0).slice(0, THREAD_TARGET)
  .map(c => ({ cv: c.cv, r: c.route }));
console.log(`threads: ${threads.length} sampled from ${candidates.length} traceable accounts`);

// ── Canonical traditions ────────────────────────────────────────────────────
// Researchers wrote free-text labels ("Christian/Muslim", "Theosophical / New Age", "none"),
// which is 65 distinct strings and useless as a control. Each label is parsed into zero or
// more canonical tags — a compound label legitimately belongs to several.
const TRADITION_RULES = [
  ['Christian', /christ|catholic|\blds\b|messianic|evangelical|baptist/i],
  ['Jewish', /jewish|hebrew|judai/i],
  ['Muslim', /muslim|islam/i],
  ['Hindu', /hindu|krishna|vedic/i],
  ['Buddhist', /buddhis/i],
  ['Indigenous', /indigenous|native american|african|aborigin/i],
  ['Spiritualist', /spiritualist|wiccan|medium/i],
  ['New Age', /new ?age|theosoph|esoteric|\bsource\b|energy/i],
  ['Secular', /secular|atheis|agnostic|folk|non-?religious|12-step|technological|modern/i],
];
const tagsFor = label => {
  if (!label) return [];
  const s = String(label);
  if (/^\s*(none|n\/?a|universal|hybrid)\s*$/i.test(s)) return [];
  return TRADITION_RULES.filter(([, re]) => re.test(s)).map(([name]) => name);
};
for (const p of places) {
  for (const a of p.aliases) a.traditionTags = tagsFor(a.tradition);
}
const traditionCounts = {};
for (const p of places) {
  const tags = new Set(p.aliases.flatMap(a => a.traditionTags));
  for (const t of tags) traditionCounts[t] = (traditionCounts[t] || 0) + 1;
}
// Only offer a lens that actually filters to something.
const traditions = Object.entries(traditionCounts)
  .filter(([, n]) => n >= 3)
  .sort((a, b) => b[1] - a[1])
  .map(([t]) => t);
console.log('traditions: ' + Object.entries(traditionCounts).map(([t, n]) => `${t}(${n})`).join(' '));

for (const p of places) { delete p._hits; delete p._firstAt; }

const out = {
  corpusSize: P,
  accountCount: N,
  strata: Object.fromEntries(Object.entries(strata).map(([k, v]) => [k, v.length])),
  places,
  edges: finalEdges,
  threads,
  traditions,
  generatedAt: new Date().toISOString().slice(0, 10),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`\n-> ${OUT}`);
console.log(`   ${places.length} places, ${finalEdges.length} edges, ${traditions.length} traditions`);
console.log(`   ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
console.log('\n## FINAL MAP');
for (const p of places) {
  console.log(
    p.id.slice(0, 30).padEnd(31),
    p.category.slice(0, 9).padEnd(10),
    p.tone.slice(0, 11).padEnd(12),
    ('c=' + p.confidence.all.toFixed(3)).padStart(9),
    ('±' + p.ci95.toFixed(3)).padStart(8),
    ('prec ' + p.precision.toFixed(2)).padStart(10),
    ('pos ' + p.position.toFixed(2)).padStart(9),
    String(p.quotes.length) + 'q',
  );
}
