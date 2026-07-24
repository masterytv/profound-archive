/**
 * Bias audit of the corpus itself. Prevalence figures are only as good as the sample,
 * so: is one channel dominating? Are experiencers duplicated across videos? Are some
 * accounts third-person retellings rather than first-person testimony?
 */
import fs from 'fs';
import path from 'path';
const ROOT = path.resolve('scratch/afterlife');
const docs = fs.readFileSync(path.join(ROOT, 'transcripts.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const N = docs.length;

// ── Channel concentration ────────────────────────────────────────────────────
const byChannel = {};
for (const d of docs) byChannel[d.channel || '?'] = (byChannel[d.channel || '?'] || 0) + 1;
const ranked = Object.entries(byChannel).sort((a, b) => b[1] - a[1]);
console.log(`## CHANNELS: ${ranked.length} distinct, ${N} accounts`);
let cum = 0;
for (const [c, n] of ranked.slice(0, 20)) {
  cum += n;
  console.log(`${String(n).padStart(5)}  ${((n / N) * 100).toFixed(1).padStart(5)}%  cum ${((cum / N) * 100).toFixed(1).padStart(5)}%  ${c.slice(0, 50)}`);
}
const top1 = ranked[0][1] / N, top5 = ranked.slice(0, 5).reduce((s, x) => s + x[1], 0) / N;
console.log(`\ntop-1 channel share: ${(top1 * 100).toFixed(1)}%   top-5: ${(top5 * 100).toFixed(1)}%`);

// ── Duplicate experiencers ───────────────────────────────────────────────────
const byName = {};
for (const d of docs) {
  const n = (d.name || '').trim().toLowerCase();
  if (n.length > 3) (byName[n] ??= []).push(d.id);
}
const dupes = Object.entries(byName).filter(([, ids]) => ids.length > 1).sort((a, b) => b[1].length - a[1].length);
const dupAccounts = dupes.reduce((s, [, ids]) => s + ids.length, 0);
console.log(`\n## DUPLICATE EXPERIENCERS`);
console.log(`${dupes.length} names appear more than once, covering ${dupAccounts} accounts (${((dupAccounts / N) * 100).toFixed(1)}% of corpus)`);
console.log(`named accounts total: ${Object.values(byName).reduce((s, v) => s + v.length, 0)} / ${N}`);
for (const [n, ids] of dupes.slice(0, 15)) console.log(`  ${String(ids.length).padStart(3)}x  ${n.slice(0, 40)}`);

// ── First-person vs narrated retelling ───────────────────────────────────────
// A first-person interview is dense with "I"; a dramatized retelling narrates "he/she".
let firstPerson = 0, thirdPerson = 0;
const thirdChannels = {};
for (const d of docs) {
  const head = d.text.slice(0, 6000);
  const i = (head.match(/\bI\b/g) || []).length;
  const he = (head.match(/\b(he|she)\b/gi) || []).length;
  if (i >= he) firstPerson++;
  else { thirdPerson++; thirdChannels[d.channel || '?'] = (thirdChannels[d.channel || '?'] || 0) + 1; }
}
console.log(`\n## VOICE`);
console.log(`first-person dominant: ${firstPerson} (${((firstPerson / N) * 100).toFixed(1)}%)`);
console.log(`third-person dominant: ${thirdPerson} (${((thirdPerson / N) * 100).toFixed(1)}%)  <- likely narrated retellings`);
console.log('channels producing third-person accounts:');
for (const [c, n] of Object.entries(thirdChannels).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(n).padStart(4)}  ${c.slice(0, 50)}`);

// ── Near-duplicate transcripts (same account re-uploaded) ───────────────────
const sig = new Map();
let nearDupes = 0;
for (const d of docs) {
  // Signature from a mid-transcript slice — intros vary, bodies do not.
  const mid = d.text.slice(Math.floor(d.text.length * 0.4), Math.floor(d.text.length * 0.4) + 300).replace(/\s+/g, ' ').toLowerCase();
  if (mid.length < 100) continue;
  if (sig.has(mid)) nearDupes++;
  else sig.set(mid, d.id);
}
console.log(`\n## NEAR-DUPLICATE TRANSCRIPTS: ${nearDupes} (${((nearDupes / N) * 100).toFixed(2)}%)`);

// ── Length distribution (short transcripts under-report everything) ──────────
const lens = docs.map(d => d.text.length).sort((a, b) => a - b);
const q = f => lens[Math.floor(lens.length * f)];
console.log(`\n## TRANSCRIPT LENGTH (chars)  p10=${q(0.1)} p25=${q(0.25)} median=${q(0.5)} p75=${q(0.75)} p90=${q(0.9)}`);
console.log(`under 8k chars: ${lens.filter(l => l < 8000).length} accounts — these will under-report by construction`);

// ── cvNDE availability ───────────────────────────────────────────────────────
console.log(`\n## cvNDE COVERAGE: ${docs.filter(d => d.cvnde != null).length}/${N} scored`);
