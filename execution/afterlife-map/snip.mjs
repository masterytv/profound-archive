#!/usr/bin/env node
/**
 * Corpus snippet tool for the afterlife-map research.
 *
 *   node snip.mjs count  "<regex>"                 -> doc frequency + pct, by cvNDE stratum
 *   node snip.mjs show   "<regex>" [k] [--cv N]    -> k random matched snippets w/ context
 *   node snip.mjs doc    "<videoId>"               -> full transcript
 *   node snip.mjs sample [k] [--cv N] [--chars N]  -> k random full transcripts (deep reading)
 *
 * Sampling is seeded and deterministic so results are reproducible across agents.
 */
import fs from 'fs';
import path from 'path';

// The corpus dump is large and regenerable, so it lives outside git in a working data dir.
// Override with AFTERLIFE_DATA if you keep it elsewhere. Regenerate with 00-dump-corpus.mjs.
const ROOT = process.env.AFTERLIFE_DATA
  ? path.resolve(process.env.AFTERLIFE_DATA)
  : path.resolve('scratch/afterlife');
const CORPUS = path.join(ROOT, 'transcripts.jsonl');
if (!fs.existsSync(CORPUS)) {
  console.error(`No corpus at ${CORPUS}\nRun from the repo root, or: node execution/afterlife-map/00-dump-corpus.mjs`);
  process.exit(1);
}
const LINES = fs.readFileSync(CORPUS, 'utf8').split('\n').filter(Boolean);

// Deterministic PRNG so every agent sampling the same term sees the same docs.
function rng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const argv = process.argv.slice(3);
const flag = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? Number(argv[i + 1]) : dflt;
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

const cmd = process.argv[2];
const minCv = flag('cv', 0);
const docs = LINES.map(l => JSON.parse(l));
const pool = docs.filter(d => (d.cvnde ?? 0) >= minCv);

function snippet(text, re, pad = 260) {
  const m = re.exec(text);
  if (!m) return null;
  const start = Math.max(0, m.index - pad);
  const end = Math.min(text.length, m.index + m[0].length + pad);
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '…' : '');
}

if (cmd === 'count') {
  const pattern = positional[0];
  const strata = [
    ['all', 0, docs.length],
    ['cv>=13', 13, docs.filter(d => (d.cvnde ?? 0) >= 13).length],
    ['cv>=18', 18, docs.filter(d => (d.cvnde ?? 0) >= 18).length],
    ['cv>=23', 23, docs.filter(d => (d.cvnde ?? 0) >= 23).length],
  ];
  console.log(`pattern: /${pattern}/i`);
  for (const [label, min, denom] of strata) {
    const re = new RegExp(pattern, 'i');
    const hits = docs.filter(d => (d.cvnde ?? 0) >= min && re.test(d.text)).length;
    console.log(`${label.padEnd(8)} ${String(hits).padStart(5)} / ${String(denom).padStart(5)}  = ${((hits / denom) * 100).toFixed(2)}%`);
  }
} else if (cmd === 'show') {
  const pattern = positional[0];
  const k = Number(positional[1] || 12);
  const re = new RegExp(pattern, 'i');
  const matched = pool.filter(d => re.test(d.text));
  const rand = rng(pattern);
  const shuffled = matched.map(d => [rand(), d]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  console.log(`# /${pattern}/i matched ${matched.length}/${pool.length} docs (cv>=${minCv}). Showing ${Math.min(k, matched.length)} random:\n`);
  for (const d of shuffled.slice(0, k)) {
    const re2 = new RegExp(pattern, 'i');
    console.log(`--- ${d.id} | cvNDE=${d.cvnde ?? 'n/a'} | greyson=${d.greyson ?? 'n/a'} | ${(d.name || d.title).slice(0, 60)}`);
    console.log(snippet(d.text, re2) + '\n');
  }
} else if (cmd === 'doc') {
  const d = docs.find(x => x.id === positional[0]);
  if (!d) { console.error('not found'); process.exit(1); }
  console.log(`# ${d.id} | cvNDE=${d.cvnde} | ${d.title}\n`);
  console.log(d.text);
} else if (cmd === 'sample') {
  const k = Number(positional[0] || 10);
  const maxChars = flag('chars', 30000);
  const rand = rng('sample-seed-' + minCv + '-' + k);
  const shuffled = pool.map(d => [rand(), d]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  for (const d of shuffled.slice(0, k)) {
    console.log(`\n===== ${d.id} | cvNDE=${d.cvnde ?? 'n/a'} | greyson=${d.greyson ?? 'n/a'} | tone=${d.tone} | ${(d.name || d.title).slice(0, 70)} =====`);
    console.log(d.text.slice(0, maxChars));
  }
} else {
  console.error('usage: snip.mjs count|show|doc|sample ...');
  process.exit(1);
}
