/**
 * Emits blind audit packets — one file per place, each holding a deterministic random
 * sample of the passages its regex matched, stripped of any hint about what the place is
 * "supposed" to be. Auditors judge the passages, not the proposal.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('scratch/afterlife');
const K = 24;
const docs = fs.readFileSync(path.join(ROOT, 'transcripts.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const { places } = JSON.parse(fs.readFileSync(path.join(ROOT, 'verified-places.json'), 'utf8'));

function rng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const dir = path.join(ROOT, 'audit');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const manifest = [];
for (const p of places) {
  let re, neg = null;
  try { re = new RegExp(p.regex, 'i'); } catch { continue; }
  if (p.negative_regex) { try { neg = new RegExp(p.negative_regex, 'i'); } catch {} }

  const matched = docs.filter(d => re.test(d.text) && !(neg && neg.test(d.text)));
  if (!matched.length) continue;
  const rand = rng('audit-' + p.id);
  const sample = matched.map(d => [rand(), d]).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, K);

  const lines = [
    `# AUDIT PACKET: ${p.id}`,
    `# Claim under test: these passages describe — ${p.name}`,
    `# ${p.description}`,
    `# Matched ${matched.length} of ${docs.length} accounts. ${sample.length} random passages below.`,
    '',
  ];
  sample.forEach((d, i) => {
    const m = re.exec(d.text);
    const start = Math.max(0, m.index - 320);
    const end = Math.min(d.text.length, m.index + m[0].length + 320);
    lines.push(`--- PASSAGE ${i + 1} | doc=${d.id} | cvNDE=${d.cvnde ?? 'n/a'}`);
    lines.push(d.text.slice(start, end).replace(/\s+/g, ' ').trim());
    lines.push('');
  });
  fs.writeFileSync(path.join(dir, `${p.id}.txt`), lines.join('\n'));
  manifest.push({ id: p.id, name: p.name, matched: matched.length, sampled: sample.length });
}

fs.writeFileSync(path.join(ROOT, 'audit-manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`Wrote ${manifest.length} audit packets to ${dir}`);
