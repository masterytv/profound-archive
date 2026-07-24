export const meta = {
  name: 'afterlife-map-discovery',
  description: 'Discover the collective geography of the afterlife from 6,176 NDE transcripts',
  phases: [
    { title: 'Discover', detail: 'One researcher per region of the afterlife' },
    { title: 'Crosscheck', detail: 'Find places the region researchers missed' },
  ],
};

const REPO = '/Users/thomaswood/Documents/Antigravity/ProjectProfound/profound-archive';
const SCRIPTS = REPO + '/execution/afterlife-map';
const CWD = REPO + '/scratch/afterlife';   // working data dir (gitignored, regenerable)

const TOOLING = `
You are a research cartographer working on a corpus of **6,176 first-person Near-Death Experience
accounts** (full interview transcripts) held at ${CWD}.

## Your tools (run with Bash, always cd to ${CWD} first)

    cd ${CWD}
    node ../execution/afterlife-map/snip.mjs count "<js-regex>"                 # doc frequency + % across cvNDE strata
    node ../execution/afterlife-map/snip.mjs show  "<js-regex>" [k] [--cv N]    # k random matched snippets with context
    node ../execution/afterlife-map/snip.mjs doc   "<videoId>"                  # one full transcript
    node ../execution/afterlife-map/snip.mjs sample [k] [--cv N]                # k random full transcripts (deep reading)

Reference files in that directory (read them):
  - mined-heads.txt     : every head-noun harvested from place-introducing constructions across
                          ALL 6,176 transcripts, with doc counts. This is the corpus's own vocabulary.
  - mined-phrases.txt   : same, but multi-word phrases.
  - structured-report.txt: prevalence of the 15 coarse NDE elements + the journey transition graph.

## cvNDE
Each account carries a cvNDE score (7-28) rating the evidential strength of its veridical-perception
claims. Higher = better evidenced. Use \`--cv 18\` to restrict to the strongly-evidenced accounts and
compare: does this place appear MORE or LESS often among the best-evidenced accounts? Report that.

## CRITICAL METHOD RULES
1. **Never invent a percentage.** Percentages come from \`snip.mjs count\` only. If you state a
   number, it must be one the tool printed.
2. **The transcripts are whole interviews**, containing biography, medical history, and interviewer
   chatter. A bare noun match is NOT evidence — "building" matches "the pressure was building",
   "school" usually means childhood. Always eyeball \`show\` output before trusting a pattern, and
   design your regex to require otherworld context.
3. **Quotes must be copied verbatim** from \`snip.mjs show\` output, with the exact videoId shown on
   the \`--- <videoId>\` line. Quotes are machine-verified against the corpus afterwards; a quote that
   does not appear verbatim in that document invalidates your whole submission. Copy carefully, and
   keep each quote under 200 characters.
4. Use the experiencers' OWN language for names and descriptions. Do not impose theology they did
   not use. If different people describe the same thing with different words (a tunnel vs a
   passageway vs a dark shaft vs a river current), that is ONE place with several ALIASES — capturing
   that synonymy is the single most valuable thing you can do.
5. Distinguish a PLACE (somewhere you are) from a BEING (someone you meet) from a PROCESS
   (something that happens to you). Tag accordingly.

## MANDATORY FINAL STEP — write your result to disk
Before you return, use the Write tool to save your complete result object as JSON to:
    ${CWD}/found/<YOUR_LABEL>.json
(create the \`found\` directory first with \`mkdir -p ${CWD}/found\`). It must be the identical
object you return. The downstream measurement pipeline reads these files, not your return value.
`;

const PLACE_SCHEMA = {
  type: 'object',
  required: ['places'],
  properties: {
    places: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'category', 'description', 'aliases', 'regex', 'quotes', 'journey_position', 'measured'],
        properties: {
          id: { type: 'string', description: 'kebab-case stable id' },
          name: { type: 'string', description: "primary name in experiencers' language" },
          category: { type: 'string', enum: ['threshold', 'realm', 'structure', 'landscape', 'boundary', 'process', 'being', 'state'] },
          parent: { type: ['string', 'null'], description: 'id of the containing region, or null' },
          description: { type: 'string', description: '2-4 sentences describing it as experiencers describe it' },
          aliases: {
            type: 'array',
            description: 'other names for the SAME thing, especially cultural/religious variants',
            items: {
              type: 'object',
              required: ['term'],
              properties: {
                term: { type: 'string' },
                tradition: { type: ['string', 'null'], description: 'e.g. Christian, Buddhist, Hindu, Muslim, secular, Indigenous, none' },
                note: { type: ['string', 'null'] },
              },
            },
          },
          sensory: { type: 'array', items: { type: 'string' }, description: 'distinctive perceptual details reported (colours, sounds, textures, light quality)' },
          regex: { type: 'string', description: 'JS regex source (no slashes/flags) that detects this place, context-constrained to avoid biographical false positives' },
          negative_regex: { type: ['string', 'null'], description: 'JS regex source marking likely false positives, or null' },
          measured: {
            type: 'object',
            description: 'EXACT output of snip.mjs count for your regex',
            required: ['all_pct', 'all_docs', 'cv18_pct'],
            properties: {
              all_pct: { type: 'number' }, all_docs: { type: 'number' },
              cv13_pct: { type: 'number' }, cv18_pct: { type: 'number' }, cv23_pct: { type: 'number' },
            },
          },
          precision_estimate: { type: ['number', 'null'], description: 'of the snippets you eyeballed, fraction that genuinely described this place during the NDE (0-1)' },
          precision_sample_n: { type: ['number', 'null'], description: 'how many snippets you actually read to judge precision' },
          quotes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['videoId', 'text'],
              properties: { videoId: { type: 'string' }, text: { type: 'string' }, cvnde: { type: ['number', 'null'] } },
            },
          },
          journey_position: { type: 'number', description: '0=at the body, 1=return to body; where this sits in the arc' },
          notes: { type: ['string', 'null'], description: 'variation, disagreement, cultural patterning, caveats' },
        },
      },
    },
  },
};

const REGIONS = [
  {
    key: 'threshold',
    brief: `THE LEAVING AND THE PASSAGE. Everything between the body and the other world:
      leaving the body and observing the room; the darkness/void; the tunnel and all its variants
      (tunnel, passageway, shaft, cylinder, vortex, spiral, chute, culvert, wormhole, being sucked,
      travelling at speed through blackness, a corridor, a portal, a doorway); movement WITHOUT a
      tunnel (floating, rising, instant translocation, being carried); the sensation of travelling
      toward a distant light; sounds heard in transit (whooshing, buzzing, roaring, music, wind).
      Also: those who report NO tunnel at all — how common is that?`,
  },
  {
    key: 'light',
    brief: `THE LIGHT AND THE PRESENCE IN IT. The light itself as a place and as an entity: brighter
      than the sun but not hurting the eyes; a light that is alive, that loves, that knows you;
      merging with it. The identity given to the being in/of the light across traditions — God,
      Jesus, Christ, the Source, the Creator, Buddha, Krishna, Allah, the Universe, Love itself, an
      unnamed presence, "I just knew who it was". Quantify how often the being is named vs unnamed,
      and how the naming tracks the experiencer's own religion. Also the qualities: unconditional
      love, total acceptance, being fully known and not judged.`,
  },
  {
    key: 'landscape',
    brief: `THE LIVING COUNTRY. Natural scenery of the other world: meadows, fields, rolling hills,
      valleys, mountains; grass (especially grass that is ALIVE, aware, glowing, springs back,
      responds to footsteps); flowers that sing or glow or turn toward you; trees, forests, orchards;
      rivers, streams, lakes, oceans, waterfalls, fountains, pools; skies without a sun; colours
      that do not exist here / colours never seen before / thousands of shades; the quality of the
      light on the landscape; scent and air; whether everything is made of light or is solid.`,
  },
  {
    key: 'structures',
    brief: `THE BUILT WORLD. Anything constructed: the city (city of light, golden city, crystal city,
      streets of gold, spires, domes); buildings, halls, mansions, "many rooms"; the library / hall of
      records / room of books / akashic records; schools, classrooms, universities, places of learning;
      temples, churches, cathedrals, chapels; a throne room; gardens as designed spaces; waiting rooms
      and reception areas; gates and gateways; walls, fences, bridges, roads, paths, stairs; music halls
      and choirs; nurseries or places where children/babies are; healing rooms or places of repair.`,
  },
  {
    key: 'life-review',
    brief: `THE LIFE REVIEW AND WHERE IT HAPPENS. The review itself and its staging: screens, monitors,
      a movie, a film, a slideshow, panoramic 360 vision, a bubble, a hologram, a book (the book of
      life / the record); reliving events; experiencing your actions FROM THE OTHER PERSON'S POINT OF
      VIEW (this is a signature detail — measure it); the presence of a reviewer/council/elders/a
      being who watches with you; the absence of judgement vs the presence of judgement; who does the
      judging (often the experiencer judges themselves); what is measured (love, kindness, small acts);
      speed and simultaneity. Also: knowledge downloads, being shown the future, answers to everything.`,
  },
  {
    key: 'rubicon',
    brief: `THE POINT OF NO RETURN. The boundary that, once crossed, prevents return. Its forms: a
      fence, a wall, a line, a river or stream to cross, a bridge, a gate, a door, a hedge, a field's
      edge, a mist, an invisible barrier, a change in the ground. The explicit rule stated to the
      experiencer ("if you cross this you cannot go back"); who states it; the decision moment; being
      told "it is not your time"; being sent, pushed, or choosing. Also the DECISION itself and what
      makes people return (children, unfinished task, a promise). Measure how often the boundary is
      an object vs an unspoken knowing.`,
  },
  {
    key: 'distressing',
    brief: `THE DARK PLACES. Distressing and hellish experiences: hell as named; a pit, an abyss, a
      chasm; darkness that is not peaceful; a void of isolation; heat, fire, burning, sulphur; cold;
      screams, wailing, gnashing; being pulled or grabbed by hands; clawed, shadowy, or demonic
      beings; a grey place, a place of the lost, people wandering, purgatory, an in-between; being
      trapped, stuck, or unable to move; a place of nothingness/annihilation; being rescued from it
      (calling out, prayer, a light arriving). Measure prevalence honestly — this is under-reported
      and important. Distinguish hellish REALMS from hellish BEINGS from a hellish EMOTIONAL state.`,
  },
  {
    key: 'beings-return',
    brief: `THE INHABITANTS AND THE WAY BACK. Who is met: deceased relatives (and the surprise of
      meeting someone not known to be dead — a veridical signature, measure it); grandparents;
      deceased children and babies; pets and animals; friends; angels (winged or not); guides,
      guardians, teachers, elders, a council; groups of beings, robed figures; light beings without
      form; strangers who are known to you; how they appear (age, health restored, robes, luminosity);
      how they communicate (telepathy vs speech). Then THE RETURN: the manner of coming back (snapped,
      slammed, sucked, falling, floating down, waking), the pain of re-entry, the grief at being sent
      back, and how often people did NOT want to return.`,
  },
];

phase('Discover');

const found = await parallel(REGIONS.map(r => () => agent(
  `${TOOLING.replace('<YOUR_LABEL>', `region-${r.key}`)}

## YOUR ASSIGNED REGION: ${r.key}   (your label is \`region-${r.key}\`)

${r.brief}

## What to do

1. Read mined-heads.txt and mined-phrases.txt (grep them for your region's vocabulary) and read
   structured-report.txt. These already summarise all 6,176 transcripts.
2. Use \`snip.mjs show\` extensively to read how people ACTUALLY word these things. Read at least
   60-100 snippets across your region before you settle on names and aliases. Look for the words you
   did NOT expect — the corpus's own vocabulary matters more than the vocabulary in this brief.
3. Also run \`snip.mjs sample 4 --cv 20\` and read a few strongly-evidenced accounts end-to-end, so
   you understand how these elements sit inside a whole narrative rather than as isolated keywords.
4. For every distinct place/feature you can defend, build a context-constrained regex, run
   \`snip.mjs count\` on it, and record the EXACT numbers it prints.
5. Judge precision honestly: for each place, read ~20 random matched snippets and record what
   fraction really describe that thing occurring during the experience. Put that in
   precision_estimate with precision_sample_n. Low precision is fine to report — it will be
   corrected downstream — but a dishonest estimate corrupts the map.
6. Prefer FEWER, well-evidenced places with rich alias lists over many thin ones. But DO include
   genuinely rare, vivid specifics (a golden road, grass that is alive, a particular scent) when the
   corpus supports them — rare-but-real detail is a goal of this map, and \`count\` will show them
   honestly as rare.

Return 8-20 places for your region.`,
  { label: `discover:${r.key}`, phase: 'Discover', schema: PLACE_SCHEMA }
)));

const all = found.filter(Boolean).flatMap(f => f.places || []);
log(`Region researchers returned ${all.length} candidate places`);

// ── Crosscheck: what did the region briefs fail to ask about? ────────────────
phase('Crosscheck');

const inventory = all.map(p => `${p.id} (${p.name})`).join(', ');

const gaps = await parallel([
  `Your job is to find what the other researchers MISSED. They were each given a themed brief, so
   they were primed to find what they were told to look for. You are not.

   Already catalogued: ${inventory}

   Read mined-heads.txt and mined-phrases.txt in full and hunt for recurring concrete nouns and
   phrases that are NOT represented in the list above. Then verify each candidate with
   \`snip.mjs show\` and \`snip.mjs count\`. Focus on places, objects, and features of the
   other world that no one thought to ask about.`,
  `Your job is to catalogue the UNNAMED and the INEFFABLE. Experiencers constantly describe places
   they cannot name: "a place", "somewhere", "this space", "I don't know what to call it", "there
   are no words", "nothing like anything here". Search for that language directly and find out what
   is actually being described in those passages.

   Already catalogued: ${inventory}

   Also look for: places described only by their FEELING (a place of total peace, a place of
   knowing), places described by structure but not name, and the recurring insistence that language
   fails. Quantify how often experiencers say language fails them.`,
  `Your job is CULTURAL AND DEMOGRAPHIC VARIATION. Across this corpus, the same destination gets
   different names depending on who is arriving. Find and quantify these mappings — Jesus vs Buddha
   vs Krishna vs an unnamed being of light; heaven vs the Summerland vs the Source vs "home";
   a tunnel vs a river vs a road vs a staircase.

   Already catalogued: ${inventory}

   Report each as a place whose \`aliases\` carry the tradition labels, with counts for each variant
   from \`snip.mjs count\`. Also check whether atheists/agnostics/non-religious experiencers report
   structurally different places or only differently-named ones — search for accounts where people
   state they had no belief beforehand. This alias-mapping is the single most important output of
   the whole project, so be thorough and quantify everything.`,
  `Your job is THE RETURN HOME and the sense of RECOGNITION. A recurring and under-studied report is
   that the other world is not strange but familiar — "I was home", "I remembered", "I had been
   there before", "this is where I came from", the reluctance to come back, and the grief of
   re-entry. Separately: the sense of the earthly life as the dream and that place as the real one
   ("more real than real").

   Already catalogued: ${inventory}

   Quantify the "more real than this" claim and the "home/remembering" claim precisely — they are
   central to the map's meaning. Return them as places/states with hard counts.`,
].map((p, i) => () => agent(
  `${TOOLING.replace('<YOUR_LABEL>', `crosscheck-${i}`)}\n\n## YOUR ASSIGNMENT (your label is \`crosscheck-${i}\`)\n\n${p}\n\nReturn 5-15 entries.`,
  { label: `crosscheck-${i}`, phase: 'Crosscheck', schema: PLACE_SCHEMA })));

const extra = gaps.filter(Boolean).flatMap(g => g.places || []);
log(`Crosscheck returned ${extra.length} additional places`);

// Deliberately compact: the full definitions live in found/*.json on disk.
return {
  total: all.length + extra.length,
  regionCounts: Object.fromEntries(REGIONS.map((r, i) => [r.key, (found[i]?.places || []).length])),
  crosscheckCounts: gaps.map(g => (g?.places || []).length),
  ids: [...all, ...extra].map(p => p.id),
};
