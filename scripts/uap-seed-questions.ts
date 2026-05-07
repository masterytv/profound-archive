/**
 * uap-seed-questions.ts
 *
 * Seeds the `uap_questions` table with the curated UAP question bank.
 * Each row has a consumer_question (display text) and an ai_query
 * (HyDE passage in first-person UAP experiencer style for semantic search).
 *
 * Usage (from repo root):
 *   npx tsx scripts/uap-seed-questions.ts
 *
 * Requires:  NEXT_PUBLIC_SUPABASE_URL  and  SUPABASE_SERVICE_ROLE_KEY
 *            in .env.local (or environment).
 *
 * Idempotent: uses upsert on the unique slug column.
 *
 * Copy-Modify from: scripts/seed-nde-questions.ts
 * Domain mapping: NDE → UAP, nde_questions → uap_questions
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ────────────────────────────────────────────────────────────────
// Question bank — 8 categories, ~40 questions
// Sourced from UAP-ESS, UAP-CDS, and UAP-CTI rubric themes
// ────────────────────────────────────────────────────────────────

interface QuestionInput {
  category:       string;
  category_label: string;
  subcategory?:   string;
  question:       string;   // becomes consumer_question
  ai_query:       string;   // HyDE passage in first-person UAP experiencer voice
}

const QUESTIONS: QuestionInput[] = [
  // ── 1. Evidence & Credibility ─────────────────────────────────
  {
    category: 'evidence', category_label: 'Evidence & Credibility',
    question: 'What makes a UAP sighting credible, and how do investigators evaluate the evidence?',
    ai_query: 'I was a military pilot when I saw it. My WSO saw it too, and it showed up on radar and FLIR at the same time. I filed an official report that night because I knew no one would believe me without documentation.',
  },
  {
    category: 'evidence', category_label: 'Evidence & Credibility',
    question: 'Why do some UAP witnesses risk their careers to come forward?',
    ai_query: 'I was told not to talk about what I saw. My commanding officer made it clear my career was on the line. But I had multiple witnesses and radar data, and I felt a responsibility to report it accurately no matter the consequences.',
  },
  {
    category: 'evidence', category_label: 'Evidence & Credibility',
    question: 'How do investigators distinguish genuine UAP encounters from misidentified aircraft or natural phenomena?',
    ai_query: 'The object I tracked had no visible propulsion, made no sound, and accelerated from a hover to beyond Mach 5 in under a second. It descended from 80,000 feet to sea level in seconds. No known aircraft can do that. I checked every conventional explanation.',
  },
  {
    category: 'evidence', category_label: 'Evidence & Credibility',
    question: 'What is the strongest physical evidence that UAP encounters leave behind?',
    ai_query: 'After the object departed, we found circular impressions in the ground where it had hovered. The soil was compacted and slightly radioactive. The compass was still spinning twenty minutes later. My truck would not start for hours.',
  },
  {
    category: 'evidence', category_label: 'Evidence & Credibility',
    question: 'Are there cases where multiple independent witnesses saw the same UAP event?',
    ai_query: 'What convinced me was that the police dispatcher received calls from fourteen different people across three towns, all describing the same triangular craft within the same fifteen-minute window. None of them knew each other.',
  },

  // ── 2. Contact & Entities ─────────────────────────────────────
  {
    category: 'contact', category_label: 'Contact & Entities',
    question: 'What do people actually experience during a close encounter with a UAP?',
    ai_query: 'The craft was right above my car. My radio died. I felt paralyzed but not afraid. A light came down and I felt a warmth wash over me. I could see a structured object with geometric patterns on the underside, completely silent, maybe fifty feet across.',
  },
  {
    category: 'contact', category_label: 'Contact & Entities',
    question: 'Do UAP experiencers describe encountering non-human entities, and what do they look like?',
    ai_query: 'I saw beings inside the craft. They were shorter than me, with large dark eyes and smooth gray skin. One of them turned and looked directly at me. I felt its awareness lock onto mine. It communicated without words, like thoughts appearing in my mind.',
  },
  {
    category: 'contact', category_label: 'Contact & Entities',
    question: 'Can contact with UAP beings happen through dreams, meditation, or altered states of consciousness?',
    ai_query: 'I was meditating when I suddenly felt a presence. My awareness expanded and I found myself in a space that felt more real than waking life. A being appeared, not physically, but as a vivid presence. It conveyed information directly into my consciousness.',
  },
  {
    category: 'contact', category_label: 'Contact & Entities',
    question: 'What is telepathic communication, and how do contactees describe receiving information from non-human intelligence?',
    ai_query: 'The communication was not verbal. Concepts and images appeared fully formed in my mind. It was like downloading a file, not hearing words. The information was complex and detailed, and I understood it instantly even though it would take hours to explain in English.',
  },
  {
    category: 'contact', category_label: 'Contact & Entities',
    question: 'Are abduction experiences real, or could they be explained by sleep paralysis or false memory?',
    ai_query: 'I was wide awake, driving home from work, when the missing time began. Two hours I cannot account for. When I came to, I was thirty miles from where I had been, and there were marks on my body that were not there before. This was not a dream.',
  },

  // ── 3. Government & Disclosure ────────────────────────────────
  {
    category: 'disclosure', category_label: 'Government & Disclosure',
    question: 'What has the U.S. government officially confirmed about UAPs?',
    ai_query: 'The Department of Defense acknowledged in 2020 that the UAP videos released were authentic and depicted objects that remain unidentified. AARO was established to investigate these encounters. Congressional hearings have included testimony from military pilots and intelligence officials.',
  },
  {
    category: 'disclosure', category_label: 'Government & Disclosure',
    question: 'Why are governments around the world beginning to take UAPs seriously?',
    ai_query: 'After decades of dismissal, multiple governments started establishing official UAP investigation programs. The turning point was military encounters with objects demonstrating technology far beyond known human capability, observed on multiple sensor systems simultaneously.',
  },
  {
    category: 'disclosure', category_label: 'Government & Disclosure',
    question: 'What are whistleblowers saying about secret government UAP programs?',
    ai_query: 'A senior intelligence official testified under oath that the government possesses retrieved materials of non-human origin and has been running classified programs to reverse-engineer recovered technology. He said oversight has been deliberately circumvented for decades.',
  },
  {
    category: 'disclosure', category_label: 'Government & Disclosure',
    question: 'Is there evidence that governments have recovered non-human craft or materials?',
    ai_query: 'Multiple credible whistleblowers have stated that crash retrieval programs exist. The materials described have unusual isotopic ratios and compositions not found in nature on Earth. Several defense contractors have been named as custodians of these materials.',
  },
  {
    category: 'disclosure', category_label: 'Government & Disclosure',
    question: 'Why would governments cover up evidence of non-human intelligence?',
    ai_query: 'I was told the information was classified because the technology involved could destabilize the global power structure. The energy implications alone would disrupt entire industries. And the existential implications of confirming non-human intelligence were considered too destabilizing for public release.',
  },

  // ── 4. Consciousness & Transformation ─────────────────────────
  {
    category: 'transformation', category_label: 'Consciousness & Transformation',
    question: 'How does a UAP encounter change people psychologically and spiritually?',
    ai_query: 'After my encounter, everything changed. I lost interest in material success. I felt connected to something vast and purposeful. My relationships shifted because I could not pretend the experience had not happened. Some people thought I had lost my mind, but I had never been more clear.',
  },
  {
    category: 'transformation', category_label: 'Consciousness & Transformation',
    question: 'Do UAP experiencers develop enhanced psychic abilities or intuition after their encounter?',
    ai_query: 'After the sighting, I started having premonitions that came true. I could sense people\'s emotions before they spoke. Synchronicities happened constantly. None of this had ever occurred before the encounter. I went from a complete skeptic to someone experiencing things I cannot explain.',
  },
  {
    category: 'transformation', category_label: 'Consciousness & Transformation',
    question: 'Is there a connection between UAP contact experiences and near-death experiences?',
    ai_query: 'What happened to me during the encounter was almost identical to what NDE experiencers describe: the light, the presence of an intelligence, the sense of unconditional love, the life review, the expanded consciousness. The overlap is too specific to be coincidental.',
  },
  {
    category: 'transformation', category_label: 'Consciousness & Transformation',
    question: 'Can a UAP encounter cause PTSD, relationship breakdown, or negative psychological effects?',
    ai_query: 'I could not sleep for months. I was hypervigilant, scanning the sky every night. My marriage ended because my spouse thought I was delusional. I lost friends. I struggled with what I experienced because no one around me could understand it or take it seriously.',
  },
  {
    category: 'transformation', category_label: 'Consciousness & Transformation',
    question: 'Do UAP contact experiences suggest that consciousness is more than just brain activity?',
    ai_query: 'During the encounter, my consciousness seemed to expand beyond my body. I perceived information I could not have known through physical senses alone. The experience convinced me that awareness is not produced by the brain but is something the brain filters and receives.',
  },

  // ── 5. Physical Effects ───────────────────────────────────────
  {
    category: 'physical-effects', category_label: 'Physical & Electromagnetic Effects',
    question: 'What physical symptoms do people report after a UAP encounter?',
    ai_query: 'After the encounter, I had sunburn-like marks on my face and hands even though it was nighttime. My eyes were irritated for days. A doctor documented elevated white blood cell counts. The marks faded after two weeks, but my sensitivity to electronics has persisted.',
  },
  {
    category: 'physical-effects', category_label: 'Physical & Electromagnetic Effects',
    question: 'Why do electronics malfunction during and after UAP encounters?',
    ai_query: 'My car engine died and the dashboard lights went out when the object was directly overhead. My phone would not turn on. After the object left, everything worked again except my watch, which never ran accurately after that night. Street lights go out when I walk under them now.',
  },
  {
    category: 'physical-effects', category_label: 'Physical & Electromagnetic Effects',
    question: 'Has missing time ever been scientifically documented or verified?',
    ai_query: 'We left the gas station at 9:15 PM. The drive should have taken forty minutes. We arrived home at 1:30 AM with no explanation. The car had extra miles on the odometer that could not be accounted for by any route we know. Both of us had the same gap in our memory.',
  },

  // ── 6. Patterns & Typology ────────────────────────────────────
  {
    category: 'patterns', category_label: 'Patterns & Classification',
    question: 'What are the different types of UAP encounters, from distant sightings to close contact?',
    ai_query: 'Hynek classified encounters by proximity: CE1 is seeing an object within 500 feet, CE2 involves physical effects on the environment, CE3 includes observing entities, CE4 involves abduction or transportation, and CE5 describes initiated contact through meditation or intention.',
  },
  {
    category: 'patterns', category_label: 'Patterns & Classification',
    question: 'Do UAP encounters follow predictable patterns, or is every case unique?',
    ai_query: 'Across thousands of reports, certain elements repeat with striking consistency: the triangular formations, the silent operation, the electromagnetic interference, the telepathic communication, the missing time, and the profound transformation afterward. The pattern is too consistent to dismiss.',
  },
  {
    category: 'patterns', category_label: 'Patterns & Classification',
    question: 'Why do some families seem to have multiple generations of UAP contact?',
    ai_query: 'My grandmother saw them. My mother saw them. Now I see them. Three generations, same type of being, same telepathic communication, same marks on the body afterward. Whatever is happening, it seems to follow family lines. Researchers call us generational contactees.',
  },
  {
    category: 'patterns', category_label: 'Patterns & Classification',
    question: 'Are mass sightings more credible than individual reports, and what are the most famous cases?',
    ai_query: 'In March 1997, thousands of people across Arizona saw the same V-shaped formation of lights. From different cities, different angles, all describing the same massive silent craft. The governor saw it too, although he did not admit it publicly until years later.',
  },

  // ── 7. Science & Research ─────────────────────────────────────
  {
    category: 'science', category_label: 'Science & Research',
    question: 'What is the current state of scientific research into UAPs?',
    ai_query: 'NASA established a UAP study team. Harvard launched the Galileo Project to develop sensor networks. Peer-reviewed papers are being published on metamaterial analysis. The scientific community is slowly moving from ridicule to rigorous investigation.',
  },
  {
    category: 'science', category_label: 'Science & Research',
    question: 'Could the technology described in UAP encounters be explained by known physics?',
    ai_query: 'The observed capabilities violate multiple known physical constraints: instantaneous acceleration without inertia, trans-medium travel between air and water without transition, no visible propulsion or control surfaces, and speeds exceeding Mach 20 within the atmosphere. No known technology can replicate this.',
  },
  {
    category: 'science', category_label: 'Science & Research',
    question: 'What are metamaterials, and how do they relate to recovered UAP debris?',
    ai_query: 'The material recovered had alternating layers of bismuth and magnesium-zinc alloy at micrometer thickness. The isotopic ratios were unlike anything produced naturally on Earth or in any known industrial process. Researchers believe this layered structure may interact with electromagnetic fields in ways we do not yet understand.',
  },
  {
    category: 'science', category_label: 'Science & Research',
    question: 'Are UAPs a national security concern, and how are militaries responding?',
    ai_query: 'These objects were entering restricted military airspace daily. They outperformed our best fighter jets by orders of magnitude. We could detect them on radar but could not intercept or identify them. The national security implications are obvious and deeply concerning.',
  },

  // ── 8. Stigma & Society ───────────────────────────────────────
  {
    category: 'stigma', category_label: 'Stigma & Society',
    question: 'Why is there such a strong social stigma around reporting UAP encounters?',
    ai_query: 'When I reported what I saw, my colleagues laughed. My supervisor suggested I see a psychiatrist. I was a decorated officer with twenty years of service, and in one conversation my credibility was destroyed. That is why most people stay silent.',
  },
  {
    category: 'stigma', category_label: 'Stigma & Society',
    question: 'How would confirmed contact with non-human intelligence change society?',
    ai_query: 'If the public fully understood what is happening, every institution would be affected. Religion, science, energy, defense, philosophy. The question is not whether non-human intelligence exists but how humanity adapts to that knowledge without tearing itself apart.',
  },
  {
    category: 'stigma', category_label: 'Stigma & Society',
    question: 'What support exists for people who have had UAP encounters and are struggling to process them?',
    ai_query: 'After my experience, I felt completely alone. No therapist understood. My family thought I was unwell. Eventually I found a community of experiencers, and for the first time I could talk about what happened without being judged. That community saved me.',
  },
  {
    category: 'stigma', category_label: 'Stigma & Society',
    question: 'Are children and young people reporting UAP encounters, and how should we respond?',
    ai_query: 'My daughter was seven when she started talking about the beings who visit her at night. She described them calmly and consistently, with details she could not have learned from media. We chose to listen rather than dismiss, and her descriptions matched accounts from adults decades older.',
  },
  {
    category: 'stigma', category_label: 'Stigma & Society',
    question: 'What happens when entire communities witness a UAP event together?',
    ai_query: 'The whole school saw it. Over sixty children described the same craft landing in the field and the same beings emerging. They drew the same pictures independently. Teachers corroborated parts of the account. Thirty years later, the witnesses maintain their stories have not changed.',
  },
];

// ────────────────────────────────────────────────────────────────
// Transform + seed runner
// ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function seed() {
  // Build rows with auto-generated slug, sort_order, and field mapping
  const rows = QUESTIONS.map((q, index) => ({
    consumer_question: q.question,
    slug:              slugify(q.question),
    ai_query:          q.ai_query,
    category:          q.category,
    category_label:    q.category_label,
    subcategory:       q.subcategory ?? null,
    sort_order:        index + 1,
    is_active:         true,
    needs_refresh:     true,
  }));

  console.log(`🛸  Seeding ${rows.length} questions into uap_questions…`);

  // Upsert in batches of 20 to avoid payload limits
  const BATCH = 20;
  let totalUpserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    const { data, error } = await supabase
      .from('uap_questions')
      .upsert(batch, {
        onConflict:       'slug',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(`❌  Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message);
      process.exit(1);
    }

    totalUpserted += data?.length ?? 0;
    console.log(`   ✅  Batch ${Math.floor(i / BATCH) + 1}: ${data?.length} rows upserted`);
  }

  console.log(`\n✨  Done! ${totalUpserted} UAP questions seeded successfully.`);
  console.log('   Categories:', [...new Set(QUESTIONS.map(q => q.category))].join(', '));
}

seed().catch(err => {
  console.error('❌  Seed script failed:', err);
  process.exit(1);
});
