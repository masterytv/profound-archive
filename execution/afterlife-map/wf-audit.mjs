export const meta = {
  name: 'afterlife-map-audit',
  description: 'Blind precision audit of every discovered place, then a skeptical review pass',
  phases: [
    { title: 'Audit', detail: 'Judge sampled passages for each place' },
    { title: 'Challenge', detail: 'Adversarial review of the resulting map' },
  ],
};

const REPO = '/Users/thomaswood/Documents/Antigravity/ProjectProfound/profound-archive';
const SCRIPTS = REPO + '/execution/afterlife-map';
const CWD = REPO + '/scratch/afterlife';   // working data dir (gitignored, regenerable)
const NBATCH = args?.batches ?? 14;
const BATCHES = Array.from({ length: NBATCH }, (_, i) => i);

const AUDIT_SCHEMA = {
  type: 'object',
  required: ['audits'],
  properties: {
    audits: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'judged', 'true_positives', 'precision', 'verdict'],
        properties: {
          id: { type: 'string' },
          judged: { type: 'number', description: 'how many passages you actually read' },
          true_positives: { type: 'number', description: 'how many genuinely described this place, perceived during the experience' },
          precision: { type: 'number', description: 'true_positives / judged, 0-1' },
          verdict: { type: 'string', enum: ['solid', 'needs_narrowing', 'reject'] },
          failure_modes: { type: 'array', items: { type: 'string' }, description: 'what the false positives actually were' },
          suggested_regex: { type: ['string', 'null'], description: 'a tighter regex if verdict is needs_narrowing, else null' },
          best_quote: {
            type: ['object', 'null'],
            properties: { doc: { type: 'string' }, text: { type: 'string' } },
            description: 'the single clearest verbatim passage from this packet, copied exactly, under 200 chars',
          },
        },
      },
    },
  },
};

phase('Audit');

const audited = await parallel(BATCHES.map((i) => () => agent(
  `You are auditing a research dataset built from 6,176 near-death-experience interview transcripts.

Someone proposed that a regular expression identifies accounts describing a particular place in the
afterlife. Your job is to find out whether that is true, by reading the passages it actually matched.

## Finding your packets
Run this to get YOUR assigned list of packet ids (you are auditor #${i} of ${NBATCH}):

    cd ${CWD} && node -e "const m=require('./audit-manifest.json'); const B=Math.ceil(m.length/${NBATCH}); console.log(m.slice(${i}*B,(${i}+1)*B).map(x=>x.id).join('\\n'))"

For each id printed, read \`${CWD}/audit/<id>.txt\` with the Read tool. Each packet contains up to 24
randomly sampled passages that the regex matched, with the claim being tested at the top.
Audit EVERY packet in your list — do not stop early.

## For each packet, judge every passage against this test
Count a passage as a TRUE POSITIVE only if it describes the named place/feature **as something
perceived during the near-death experience itself**.

Count it as a FALSE POSITIVE if it is any of:
  - biography or ordinary life ("I went to school", "the pressure was building", "my children")
  - the medical/hospital setting rather than the other world
  - metaphor or figure of speech ("what the hell", "a world of difference", "in heaven's name")
  - the interviewer talking, a book plug, or channel boilerplate
  - the experiencer describing someone ELSE's NDE, or speculating about what happens generally
  - a different place that merely shares a word

Be strict. This audit exists to stop the map overstating itself. A precision of 0.4 reported
honestly is far more valuable than a precision of 0.9 reported generously.

## Output
For each packet return: how many passages you read, how many were true positives, the resulting
precision, a verdict, and what the false positives actually were. If the regex is nearly right but
catches one recurring kind of junk, propose a tighter \`suggested_regex\` (JS regex source, no flags).
Use verdict "reject" only when precision is so low the place cannot be measured this way at all.

Also pick the single clearest passage in each packet as \`best_quote\`, copied VERBATIM (under 200
characters) with its doc id — these become the quotes shown on the finished map.

## MANDATORY FINAL STEP
Before returning, \`mkdir -p ${CWD}/audit-out\` and use the Write tool to save your complete result
object as JSON to \`${CWD}/audit-out/${i}.json\`. The build pipeline reads those files.`,
  { label: `audit:${i}`, phase: 'Audit', schema: AUDIT_SCHEMA },
)));

const flat = audited.filter(Boolean).flatMap(a => a.audits || []);
log(`Audited ${flat.length} places`);

phase('Challenge');

const summary = flat.map(a => `${a.id}: precision=${a.precision.toFixed(2)} verdict=${a.verdict}`).join('\n');

const challenges = await parallel([
  `You are the skeptic on this project. Below are precision-audit results for every place on a
   "map of the afterlife" built from NDE transcripts:

${summary}

   Identify the entries whose numbers should NOT be trusted even after correction, and say why.
   Look especially for: places whose regex can only ever measure the WORD rather than the
   EXPERIENCE; places where the corpus itself is biased (e.g. an interviewer who always asks about
   tunnels will inflate tunnels); places that are really the same thing counted twice under
   different ids; and places whose prevalence is an artifact of how NDE interviews are conducted
   rather than of what people experienced. Use ${CWD}/snip.mjs to check anything you doubt.`,

  `You are the methodologist. This project reports, for each place in an afterlife map, a
   "confidence" = the estimated share of near-death experiencers who report it.

   Audit results:
${summary}

   Write a blunt assessment of what these numbers can and cannot support. Specifically address:
   (1) the denominator problem — these are people who chose to be interviewed on YouTube about an
   NDE, not a random sample of near-death survivors; (2) under-reporting — an experiencer not
   mentioning a garden is not evidence they saw no garden, and transcripts are of finite length;
   (3) what the cvNDE stratification does and does not control for; (4) whether prevalence rising or
   falling with cvNDE means anything. Propose the exact wording of a short methods note that should
   appear on the page so a reader is not misled. Be concrete and quotable.`,
].map((p, i) => () => agent(p, { label: `challenge:${i}`, phase: 'Challenge' })));

return {
  audited: flat.length,
  rejected: flat.filter(a => a.verdict === 'reject').map(a => a.id),
  needsNarrowing: flat.filter(a => a.verdict === 'needs_narrowing').map(a => a.id),
  meanPrecision: +(flat.reduce((s, a) => s + a.precision, 0) / Math.max(1, flat.length)).toFixed(3),
  skeptic: challenges[0],
  methods: challenges[1],
};
