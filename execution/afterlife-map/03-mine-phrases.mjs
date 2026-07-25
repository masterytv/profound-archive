/**
 * Full-corpus phrase mining. Covers 100% of the 6,176 transcripts (no sampling bias).
 *
 * Strategy: NDE narration uses a small set of stereotyped "place-introducing"
 * constructions ("I found myself in ___", "there was a ___", "I was standing on ___").
 * We harvest the head noun phrase after each construction and count them. This
 * surfaces the collective vocabulary of places WITHOUT us guessing it in advance,
 * and without matching bare nouns in biographical filler.
 */
import fs from 'fs';
import path from 'path';
const ROOT = path.resolve('scratch/afterlife');

// Constructions that introduce a perceived place/object during the experience.
const INTRO = [
  'i found myself (?:in|on|at|standing in|standing on|walking (?:in|on|through))',
  'i (?:was|were) (?:in|on|at|inside|within|standing in|standing on|walking (?:in|on|through)|floating (?:in|over|above)|sitting (?:in|on))',
  'i (?:saw|see|noticed|beheld|witnessed|observed)',
  'there (?:was|were|appeared)',
  'i (?:came|come|arrived|stepped|walked|went|entered|emerged) (?:in|into|out into|onto|to|through|upon)',
  'it (?:was|looked like|seemed like|felt like|appeared to be)',
  'i (?:was|found myself) (?:taken|brought|led|guided|carried|transported) (?:to|into|through)',
  'in front of me (?:was|were|stood)',
  'below me (?:was|were)',
  'around me (?:was|were)',
  'and then (?:i saw|there was|i was in)',
  'this (?:place|realm|world|space|area|room|field|garden|city|light|being)',
  'a (?:place|realm|world) (?:of|where|that|with)',
];
const introRe = new RegExp(`\\b(?:${INTRO.join('|')})\\b\\s+([^.!?;,]{3,70})`, 'gi');

// Words that mark the fragment as biography/medical rather than otherworld perception.
const REJECT = /\b(hospital|doctor|nurse|surgery|surgeon|ambulance|icu|emergency room|er\b|operating|husband|wife|mom|dad|mother|father|school|college|job|work|car|truck|road trip|church service|book|podcast|youtube|channel|interview|camera|website|facebook|instagram)\b/i;

const STOP = new Set(('a an the my his her their our its this that these those was were is are be been being to of in on at and or but with for from as it he she they i you we me him them us not no so very just really like about into out up down over under there here what which who when where how all some any more most other such only own same than then now also can will would could should did do does had has have am been').split(' '));

const counts = new Map();     // normalized phrase -> {docs:Set, raw:n}
const headCounts = new Map(); // head noun -> docs Set
let n = 0;

const lines = fs.readFileSync(path.join(ROOT, 'transcripts.jsonl'), 'utf8').split('\n');
for (const line of lines) {
  if (!line) continue;
  const r = JSON.parse(line);
  n++;
  const seenDoc = new Set(), seenHead = new Set();
  for (const m of r.text.matchAll(introRe)) {
    let frag = m[1].toLowerCase().replace(/\s+/g, ' ').trim();
    if (REJECT.test(frag)) continue;
    // Trim leading determiners/qualifiers to expose the head noun phrase.
    frag = frag.replace(/^(a|an|the|this|that|these|those|some|kind of|sort of|like|just|really|very|so|all|my|his|her|their|our|its|no|not)\s+/g, '');
    frag = frag.replace(/^(a|an|the|this|that|kind of|sort of|like|just|really|very|so)\s+/g, '');
    const words = frag.split(' ').filter(Boolean);
    if (words.length < 1) continue;
    const phrase = words.slice(0, 4).join(' ');
    if (phrase.length < 3) continue;
    if (!seenDoc.has(phrase)) { seenDoc.add(phrase); counts.set(phrase, (counts.get(phrase) || 0) + 1); }
    // Head noun = first non-stopword token
    const head = words.find(w => !STOP.has(w) && /^[a-z]{3,}$/.test(w));
    if (head && !seenHead.has(head)) { seenHead.add(head); headCounts.set(head, (headCounts.get(head) || 0) + 1); }
  }
  if (n % 1000 === 0) process.stderr.write(`\r${n}   `);
}
process.stderr.write('\n');

const sortDesc = m => [...m.entries()].sort((a, b) => b[1] - a[1]);

fs.writeFileSync(path.join(ROOT, 'mined-heads.txt'),
  sortDesc(headCounts).filter(([, c]) => c >= 15).map(([w, c]) => `${String(c).padStart(5)}  ${((c / n) * 100).toFixed(2).padStart(5)}%  ${w}`).join('\n'));
fs.writeFileSync(path.join(ROOT, 'mined-phrases.txt'),
  sortDesc(counts).filter(([, c]) => c >= 8).map(([w, c]) => `${String(c).padStart(5)}  ${((c / n) * 100).toFixed(2).padStart(5)}%  ${w}`).join('\n'));

console.log(`n=${n} docs`);
console.log(`heads >=15 docs: ${sortDesc(headCounts).filter(([, c]) => c >= 15).length}`);
console.log(`phrases >=8 docs: ${sortDesc(counts).filter(([, c]) => c >= 8).length}`);
console.log('\n## TOP 120 HEAD NOUNS');
for (const [w, c] of sortDesc(headCounts).slice(0, 120)) console.log(String(c).padStart(5), ((c / n) * 100).toFixed(2).padStart(6) + '%', w);
