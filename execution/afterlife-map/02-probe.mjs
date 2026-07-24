/**
 * Sanity probe: how often do candidate place-words actually occur, and what do
 * the surrounding sentences look like? Establishes whether regex prevalence is viable.
 */
import fs from 'fs';
import path from 'path';
const ROOT = path.resolve('scratch/afterlife');

const probes = {
  tunnel: /\btunnel\b/i,
  river: /\briver\b/i,
  garden: /\bgarden(s)?\b/i,
  city: /\bcity\b/i,
  library: /\blibrar(y|ies)\b/i,
  meadow: /\bmeadow\b/i,
  field_of: /\bfield of (flowers|grass|wheat|light)\b/i,
  gate: /\bgate(s|way)?\b/i,
  road_path: /\b(golden|shining|paved) (road|path|street)\b/i,
  grass_alive: /\bgrass\b/i,
  screen: /\bscreen(s)?\b/i,
  hall: /\bhall(s|way)?\b/i,
  building: /\bbuilding(s)?\b/i,
  temple: /\btemple\b/i,
  bridge: /\bbridge\b/i,
  fence_wall: /\b(fence|wall|barrier)\b/i,
  music: /\bmusic\b/i,
  colors_never: /\bcolors? (I|I'?d|that I) (had )?(never|couldn'?t)/i,
  heaven: /\bheaven\b/i,
  hell: /\bhell\b/i,
  purgatory: /\bpurgator/i,
  jesus: /\bjesus\b/i,
  buddha: /\bbuddha\b/i,
  krishna: /\bkrishna\b/i,
  allah_muhammad: /\b(allah|muhammad|mohammed)\b/i,
  point_no_return: /\bpoint of no return\b/i,
  crossed_over: /\bcross(ed)? over\b/i,
  home: /\b(felt like|was) home\b/i,
  flowers: /\bflowers?\b/i,
  ocean_sea: /\b(ocean|sea)\b/i,
  mountain: /\bmountain(s)?\b/i,
  waterfall: /\bwaterfall\b/i,
  crystal: /\bcrystal\b/i,
  gold_streets: /\bstreets? of gold\b/i,
  book_of_life: /\bbook of life\b/i,
  throne: /\bthrone\b/i,
  robes: /\brobe(s|d)?\b/i,
  children: /\bchildren\b/i,
  animals: /\banimals\b/i,
  void: /\bvoid\b/i,
  darkness: /\bdarkness\b/i,
  waiting_room: /\bwaiting (room|area|place)\b/i,
  school: /\bschool\b/i,
  classroom: /\bclassroom\b/i,
};

const counts = Object.fromEntries(Object.keys(probes).map(k => [k, 0]));
let n = 0;
const samples = {};

const lines = fs.readFileSync(path.join(ROOT, 'transcripts.jsonl'), 'utf8').split('\n');
for (const line of lines) {
  if (!line) continue;
  const r = JSON.parse(line);
  n++;
  for (const [k, re] of Object.entries(probes)) {
    if (re.test(r.text)) {
      counts[k]++;
      if (!samples[k]) {
        const m = r.text.match(new RegExp(`[^.!?]{0,160}${re.source}[^.!?]{0,160}[.!?]`, 'i'));
        if (m) samples[k] = m[0].trim().replace(/\s+/g, ' ');
      }
    }
  }
}

console.log(`n = ${n} transcripts\n`);
console.log('probe'.padEnd(20), 'docs'.padStart(6), 'pct'.padStart(7));
for (const [k, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(k.padEnd(20), String(c).padStart(6), ((c / n) * 100).toFixed(1).padStart(6) + '%');
}
console.log('\n## SAMPLE CONTEXT (first match per probe)');
for (const [k, s] of Object.entries(samples)) console.log(`\n[${k}] ${s.slice(0, 300)}`);
