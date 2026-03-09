/**
 * scripts/seed-questions-v2.ts
 * Inserts all 81 NDE questions into nde_questions with correct column names.
 * Uses supabase-js with the service role key — safe to re-run (skips existing slugs).
 * Usage: npx tsx scripts/seed-questions-v2.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_KEY!.trim()
);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

type Row = {
  slug: string;
  category: string;
  category_label: string;
  consumer_question: string;
  ai_query: string;
  sort_order: number;
  is_active: boolean;
};

type QuestionDef = {
  category: string;
  category_label: string;
  consumer_question: string;
  ai_query: string;
};

const questions: QuestionDef[] = [
  // ── REUNION ──────────────────────────────────────────────────────────
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'Did you meet deceased relatives during your NDE?', ai_query: 'During a near-death experience I encountered deceased relatives who appeared healthy and loving, welcoming me to a peaceful realm beyond death.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'What did it feel like to see people who had died?', ai_query: 'When I saw family members who had previously died, the reunion felt overwhelmingly joyful and real, far more vivid than ordinary life.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'Did deceased loved ones communicate with you?', ai_query: 'Deceased loved ones communicated with me telepathically during my NDE without spoken words, conveying love and reassurance directly into my consciousness.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'Were the deceased people young and healthy during your NDE?', ai_query: 'People I encountered who had died appeared radiant, young, and completely free of illness or suffering during my near-death experience.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'Did you meet anyone unexpected, like someone you did not know had died?', ai_query: 'During my NDE I encountered a person I did not know was deceased, and later confirmed after resuscitation that they had indeed recently died.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'How long did the reunion with deceased people seem to last?', ai_query: 'The reunion with my deceased relatives felt timeless during my near-death experience, as though time did not exist in the same way as in ordinary life.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'Did pets or animals you knew appear during your NDE?', ai_query: 'My beloved pet that had died appeared with me during my near-death experience, healthy and joyful, and seemed to recognize me completely.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'Did deceased relatives tell you to go back to life?', ai_query: 'Deceased relatives urged me to return to my body and my life during my NDE, saying it was not yet my time to stay in the afterlife realm.' },
  { category: 'reunion', category_label: 'Reunion with Loved Ones', consumer_question: 'Did you sense living family members from the other side?', ai_query: 'During my near-death experience I perceived living family members or felt their emotional states as if I could see them from a different plane of existence.' },

  // ── PETS ─────────────────────────────────────────────────────────────
  { category: 'pets', category_label: 'Animals & Pets', consumer_question: 'Did you encounter any deceased pets during your NDE?', ai_query: 'During my NDE I was reunited with a cherished pet dog or cat that had previously died, and it greeted me with the same affection I remembered from life.' },
  { category: 'pets', category_label: 'Animals & Pets', consumer_question: 'Do animals go to the afterlife based on your experience?', ai_query: 'My near-death experience convinced me that animals possess souls and continue to exist in the afterlife, just as they lived and loved on Earth.' },
  { category: 'pets', category_label: 'Animals & Pets', consumer_question: 'Did animals seem different or more evolved in the NDE realm?', ai_query: 'Animals I encountered during my near-death experience appeared spiritually elevated, radiating pure love and understanding without fear or pain.' },
  { category: 'pets', category_label: 'Animals & Pets', consumer_question: 'Were there animals you did not recognize during your NDE?', ai_query: 'During my near-death experience there were unfamiliar animals present in the beautiful realm I visited, peacefully coexisting with humans and other beings.' },
  { category: 'pets', category_label: 'Animals & Pets', consumer_question: 'What role did animals play in your NDE?', ai_query: 'Animals played a comforting and symbolic role in my near-death experience, providing feelings of peace, unconditional love, and connection to the natural world.' },
  { category: 'pets', category_label: 'Animals & Pets', consumer_question: 'Did your deceased pet seem happy in the afterlife?', ai_query: 'My deceased pet appeared completely joyful, free of suffering and illness, and radiantly happy during the afterlife portion of my near-death experience.' },

  // ── CHILDREN ────────────────────────────────────────────────────────
  { category: 'children', category_label: 'Children in NDEs', consumer_question: 'Did you encounter children who had died during your NDE?', ai_query: 'During my near-death experience I encountered children who had died, including infants and young children, who appeared healthy, happy, and cared for.' },
  { category: 'children', category_label: 'Children in NDEs', consumer_question: 'Were children in your NDE the same age as when they died?', ai_query: 'Children I met during my NDE appeared at the same age they were when they died, instantly recognizable to me, though they radiated a timeless peace.' },
  { category: 'children', category_label: 'Children in NDEs', consumer_question: 'Did you encounter an unborn baby or miscarried child during your NDE?', ai_query: 'During my near-death experience I encountered a child that had been miscarried or was never born, now fully formed and at peace in the afterlife realm.' },
  { category: 'children', category_label: 'Children in NDEs', consumer_question: 'How were children treated or cared for in the NDE realm?', ai_query: 'Children in the afterlife realm during my NDE were surrounded by loving beings and protective guides, joyful and completely safe and nurtured.' },
  { category: 'children', category_label: 'Children in NDEs', consumer_question: 'If you had a childhood NDE, how did it affect your development?', ai_query: 'Having a near-death experience as a child profoundly changed how I grew up, giving me a strong sense of purpose and an awareness of spiritual dimensions of life.' },
  { category: 'children', category_label: 'Children in NDEs', consumer_question: 'Were children present in the light or with a divine presence?', ai_query: 'In the presence of the divine light during my NDE, there were children nearby who seemed to be the most naturally connected to the loving energy of that realm.' },

  // ── SUICIDE ──────────────────────────────────────────────────────────
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'Did your NDE occur after a suicide attempt?', ai_query: 'My near-death experience happened after a suicide attempt and completely transformed my perspective on life, death, and my reasons for living.' },
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'How did your NDE after a suicide attempt differ from typical NDEs?', ai_query: 'The near-death experience I had after attempting suicide felt different from what others describe, including feelings of incompleteness and an urgent need to return.' },
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'Did you receive any message about suicide during your NDE?', ai_query: 'During my near-death experience I received a clear message or understanding that taking my own life would be a serious mistake with lasting spiritual consequences.' },
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'Did your NDE cure or reduce your desire to die?', ai_query: 'My near-death experience eliminated my suicidal ideation completely; I returned with a profound appreciation for life and a will to heal and live fully.' },
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'Were there any negative elements in your suicide-related NDE?', ai_query: 'After my suicide attempt the near-death experience I had included disturbing or difficult elements, perhaps a distressing void or sense of unfinished emotional work.' },
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'Did you understand why your life was worth living during your NDE?', ai_query: 'During my near-death experience following a suicide attempt I was shown how precious and purposeful my life was, including how my pain could transform into strength for others.' },
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'Did you encounter those who had died by suicide in your NDE?', ai_query: 'In the afterlife realm I visited during my NDE I met individuals who had ended their own lives, and they appeared to be in a state of reflection and healing.' },
  { category: 'suicide', category_label: 'Suicide & NDEs', consumer_question: 'How did the life review feel during a suicide-related NDE?', ai_query: 'The life review I underwent during my near-death experience after a suicide attempt showed me every impact I had on others and filled me with sorrow and compassion.' },

  // ── SIGNS ────────────────────────────────────────────────────────────
  { category: 'signs', category_label: 'Signs from Beyond', consumer_question: 'Have you received signs from deceased loved ones after your NDE?', ai_query: 'After my near-death experience I began receiving unmistakable signs from deceased relatives, such as meaningful electrical phenomena, symbolic birds, or vivid dreams.' },
  { category: 'signs', category_label: 'Signs from Beyond', consumer_question: 'Do you believe animals can be signs from spirits?', ai_query: 'Since my near-death experience I interpret the unexpected appearance of certain animals as meaningful spiritual signs or messages from deceased loved ones.' },
  { category: 'signs', category_label: 'Signs from Beyond', consumer_question: 'Have you experienced electrical anomalies connected to your NDE?', ai_query: 'Lights flickering, electronics malfunctioning, and unexplained electrical events surrounding my near-death experience or later convinced me of spiritual communication.' },
  { category: 'signs', category_label: 'Signs from Beyond', consumer_question: 'Did you receive messages in dreams from the deceased after your NDE?', ai_query: 'After my near-death experience deceased loved ones appeared in vivid dreams that felt completely real, delivering comforting messages or important guidance.' },
  { category: 'signs', category_label: 'Signs from Beyond', consumer_question: 'Do you sense the presence of deceased loved ones in daily life?', ai_query: 'Since my near-death experience I frequently sense the loving presence of deceased relatives around me at significant moments in daily life.' },
  { category: 'signs', category_label: 'Signs from Beyond', consumer_question: 'Have synchronicities become more common since your NDE?', ai_query: 'After my near-death experience meaningful coincidences and synchronicities multiplied dramatically, as though the universe were actively communicating with me.' },
  { category: 'signs', category_label: 'Signs from Beyond', consumer_question: 'Did a promised sign from your NDE actually appear in real life?', ai_query: 'A deceased relative promised me a specific sign during my NDE, and after I was resuscitated that exact sign appeared in a way that left no room for doubt.' },

  // ── DYING PROCESS ────────────────────────────────────────────────────
  { category: 'dying-process', category_label: 'The Dying Process', consumer_question: 'What did the actual process of dying feel like during your NDE?', ai_query: 'The process of dying during my near-death experience felt like shedding a heavy physical weight, accompanied by a sense of expansion and profound relief.' },
  { category: 'dying-process', category_label: 'The Dying Process', consumer_question: 'Did you experience a tunnel or passageway during your NDE?', ai_query: 'During my near-death experience I traveled through a dark tunnel toward an intensely bright and loving light at the far end, moving with incredible speed.' },
  { category: 'dying-process', category_label: 'The Dying Process', consumer_question: 'Did you feel pain stop when you had your NDE?', ai_query: 'The moment I left my body during my near-death experience all physical pain vanished instantly, replaced by a perfect peace I had never known in life.' },
  { category: 'dying-process', category_label: 'The Dying Process', consumer_question: 'Did you hear sounds as you were dying or during your NDE?', ai_query: 'As I died or was clinically dead during my NDE I heard a buzzing, humming, or beautiful transcendent music that accompanied my departure from physical reality.' },
  { category: 'dying-process', category_label: 'The Dying Process', consumer_question: 'Was there a point of no return during your NDE?', ai_query: 'During my near-death experience I reached a threshold or boundary beyond which I understood I could not return to life, until something caused me to come back.' },
  { category: 'dying-process', category_label: 'The Dying Process', consumer_question: 'Did you experience an out-of-body state as part of your NDE?', ai_query: 'At the start of my near-death experience I floated above my body and observed medical personnel working on my physical form from a vantage point near the ceiling.' },
  { category: 'dying-process', category_label: 'The Dying Process', consumer_question: 'How did returning to your body feel after the NDE?', ai_query: 'Returning to my physical body after my near-death experience felt jarring and constricting, like being forced back into a heavy, painful, and limited cage.' },

  // ── LIFE REVIEW ──────────────────────────────────────────────────────
  { category: 'life-review', category_label: 'The Life Review', consumer_question: 'Did you experience a life review during your NDE?', ai_query: 'During my near-death experience I underwent a complete life review where I relived every significant moment of my life and felt the emotional impact on others.' },
  { category: 'life-review', category_label: 'The Life Review', consumer_question: 'During the life review, did you feel what others felt because of your actions?', ai_query: 'During my NDE life review I experienced the precise emotions, pain, and joy that other people felt as a direct result of my actions and words toward them.' },
  { category: 'life-review', category_label: 'The Life Review', consumer_question: 'Were you judged during the life review in your NDE?', ai_query: 'In my NDE life review I was not judged harshly by any external being; instead I was filled with understanding and gently guided to examine my life with compassion.' },
  { category: 'life-review', category_label: 'The Life Review', consumer_question: 'What surprised you most about your life review during the NDE?', ai_query: 'The most unexpected revelation during my NDE life review was how profoundly small everyday acts of kindness or unkindness rippled through the lives of others.' },
  { category: 'life-review', category_label: 'The Life Review', consumer_question: 'Was the life review in your NDE sequential or simultaneous?', ai_query: 'During my near-death experience the life review happened all at once in a panoramic vision rather than in sequential chronological order, everything present simultaneously.' },
  { category: 'life-review', category_label: 'The Life Review', consumer_question: 'Did the life review change what you value in life after your NDE?', ai_query: 'My NDE life review fundamentally shifted my priorities; I returned valuing compassion, relationships, and love over material achievement or social status.' },
  { category: 'life-review', category_label: 'The Life Review', consumer_question: 'Were forgotten memories restored during your NDE life review?', ai_query: 'During my near-death experience life review I recovered long-forgotten memories from childhood and early life that I had not thought of in decades.' },

  // ── HELL / DISTRESSING ───────────────────────────────────────────────
  { category: 'hell', category_label: 'Distressing NDEs', consumer_question: 'Did you have a distressing or frightening NDE?', ai_query: 'My near-death experience was terrifying rather than peaceful, involving dark voids, threatening presences, or a sense of profound spiritual emptiness and despair.' },
  { category: 'hell', category_label: 'Distressing NDEs', consumer_question: 'Did you visit something like a hellish realm during your NDE?', ai_query: 'During my NDE I entered a dark and terrifying realm where I witnessed suffering souls and felt an absence of love and hope unlike anything in ordinary life.' },
  { category: 'hell', category_label: 'Distressing NDEs', consumer_question: 'Was there a way out of the negative NDE realm you experienced?', ai_query: 'When I found myself in a frightening realm during my near-death experience I discovered I could escape by calling out spiritually, which caused a dramatic shift to light.' },
  { category: 'hell', category_label: 'Distressing NDEs', consumer_question: 'Did a distressing NDE ultimately transform into something positive?', ai_query: 'My initially terrifying near-death experience transformed into a profound encounter with divine love after I surrendered completely to whatever was happening to me.' },
  { category: 'hell', category_label: 'Distressing NDEs', consumer_question: 'Did you feel that hell was permanent during your NDE?', ai_query: 'During the frightening portion of my near-death experience the darkness felt absolute and permanent, as though I might remain there in suffering forever.' },
  { category: 'hell', category_label: 'Distressing NDEs', consumer_question: 'How did a distressing NDE change your spiritual beliefs?', ai_query: 'My distressing near-death experience caused me to take spiritual growth and ethical conduct far more seriously, believing that how I live truly has ultimate consequences.' },

  // ── IDENTITY ─────────────────────────────────────────────────────────
  { category: 'identity', category_label: 'Identity & Self', consumer_question: 'Did you retain your personal identity during the NDE?', ai_query: 'During my near-death experience I remained fully myself with all my memories, personality, and sense of identity intact even though I had left my physical body behind.' },
  { category: 'identity', category_label: 'Identity & Self', consumer_question: 'Did your sense of self expand or diminish during the NDE?', ai_query: 'During my near-death experience my individual sense of self expanded enormously until I felt connected to all of existence while still remaining distinctly myself.' },
  { category: 'identity', category_label: 'Identity & Self', consumer_question: 'Did you feel like a different or better version of yourself during the NDE?', ai_query: 'In my near-death experience I experienced myself as a more complete, loving, and unlimited version of who I am in ordinary life, without fear or ego defenses.' },
  { category: 'identity', category_label: 'Identity & Self', consumer_question: 'Did you understand your life purpose during the NDE?', ai_query: 'During my near-death experience I was shown or intuitively understood the specific purpose my life was meant to serve, which felt completely clear and compelling.' },
  { category: 'identity', category_label: 'Identity & Self', consumer_question: 'Did you experience a sense of being connected to all people?', ai_query: 'My near-death experience revealed an underlying oneness connecting all people, so that distinctions of race, nationality, and religion seemed to dissolve completely.' },
  { category: 'identity', category_label: 'Identity & Self', consumer_question: 'Did you feel like your true self during the NDE?', ai_query: 'During my near-death experience I felt I was finally my authentic true self, freed from social masks and false personality, existing in pure consciousness.' },

  // ── RELIGION ────────────────────────────────────────────────────────
  { category: 'religion', category_label: 'Religion & Spirituality', consumer_question: 'Did your NDE match your prior religious beliefs?', ai_query: 'My near-death experience largely confirmed my pre-existing religious beliefs, though some details were different from what my tradition had taught me to expect.' },
  { category: 'religion', category_label: 'Religion & Spirituality', consumer_question: 'Did your NDE change your religious beliefs or affiliation?', ai_query: 'After my near-death experience I changed my religious beliefs significantly, moving toward a more universal spiritual outlook that transcended any single tradition.' },
  { category: 'religion', category_label: 'Religion & Spirituality', consumer_question: 'Did you encounter a specific religious figure like Jesus or Buddha?', ai_query: 'During my near-death experience I encountered a spiritually significant figure that I identified as Jesus, or another religious figure central to my tradition.' },
  { category: 'religion', category_label: 'Religion & Spirituality', consumer_question: 'Did your NDE suggest that all religions point to the same truth?', ai_query: 'My near-death experience gave me the strong impression that all major world religions are different pathways toward the same ultimate divine reality and unconditional love.' },
  { category: 'religion', category_label: 'Religion & Spirituality', consumer_question: 'Did fear of hell or divine judgment play a role in your NDE?', ai_query: 'Despite having feared divine judgment according to my religious upbringing, my near-death experience revealed only unconditional love and understanding rather than condemnation.' },
  { category: 'religion', category_label: 'Religion & Spirituality', consumer_question: 'Were sacred or religious symbols meaningful in your NDE?', ai_query: 'During my near-death experience I encountered familiar religious symbols or sacred imagery that carried tremendous power and meaning in the realm I visited.' },

  // ── AFTERLIFE DESCRIPTION ────────────────────────────────────────────
  { category: 'afterlife-description', category_label: 'Afterlife Landscape', consumer_question: 'Can you describe the environment you experienced during your NDE?', ai_query: 'The realm I visited during my near-death experience was filled with colors more vivid than any I have seen on Earth, with a landscape of indescribable beauty and peace.' },
  { category: 'afterlife-description', category_label: 'Afterlife Landscape', consumer_question: 'What did the light in your NDE look, feel, or sound like?', ai_query: 'The light I encountered during my near-death experience was not merely visual; it was conscious, loving, and knowing, radiating pure warmth directly into my being.' },
  { category: 'afterlife-description', category_label: 'Afterlife Landscape', consumer_question: 'Was there a city, building, or structure in the NDE realm?', ai_query: 'During my near-death experience I glimpsed or entered magnificent structures, cities of crystalline light, or gardens of extraordinary beauty beyond ordinary description.' },
  { category: 'afterlife-description', category_label: 'Afterlife Landscape', consumer_question: 'Was there music or sound in the afterlife realm of your NDE?', ai_query: 'The afterlife realm I visited during my near-death experience was filled with music of transcendent beauty, perfectly harmonious in a way no earthly music can match.' },
  { category: 'afterlife-description', category_label: 'Afterlife Landscape', consumer_question: 'Did time feel different in the NDE realm?', ai_query: 'During my near-death experience time did not exist in the way it does on Earth; everything happened in an eternal present where past and future were simultaneously accessible.' },
  { category: 'afterlife-description', category_label: 'Afterlife Landscape', consumer_question: 'Did the afterlife realm have a sense of boundlessness or infinity?', ai_query: 'The realm I entered during my near-death experience extended infinitely in all directions, filled with an unbounded loving light that had no edges or limitations whatsoever.' },
  { category: 'afterlife-description', category_label: 'Afterlife Landscape', consumer_question: 'Were there libraries, records, or universal knowledge in your NDE realm?', ai_query: 'During my near-death experience I encountered a place or presence that contained all knowledge and all of history, accessible instantaneously through pure consciousness.' },

  // ── PURPOSE ──────────────────────────────────────────────────────────
  { category: 'purpose', category_label: 'Life Purpose', consumer_question: 'Did your NDE reveal a specific mission or purpose for your life?', ai_query: 'My near-death experience revealed a clear and specific mission I was meant to fulfill in my earthly life, explaining why I was sent back from the threshold of death.' },
  { category: 'purpose', category_label: 'Life Purpose', consumer_question: 'Were you told it was not your time during your NDE?', ai_query: 'During my near-death experience I was told clearly that it was not my time to die and that my life had unfinished work that only I could complete.' },
  { category: 'purpose', category_label: 'Life Purpose', consumer_question: 'Did your NDE give you a sense that life has inherent meaning?', ai_query: 'My near-death experience left me with an unshakeable conviction that life on Earth is profoundly meaningful, every experience part of a larger spiritual curriculum.' },
  { category: 'purpose', category_label: 'Life Purpose', consumer_question: 'Did you choose to come back from death during your NDE?', ai_query: 'During my near-death experience I was given the choice to return to my body or remain in the beautiful realm, and I chose to return for the sake of loved ones.' },
  { category: 'purpose', category_label: 'Life Purpose', consumer_question: 'Did your NDE show you that love is the primary purpose of life?', ai_query: 'My near-death experience made it unmistakably clear that love is the fundamental purpose and measure of a life well lived, more than achievement or success.' },
  { category: 'purpose', category_label: 'Life Purpose', consumer_question: 'Did helping others become essential to you after your NDE?', ai_query: 'After my near-death experience my most powerful drive became serving and helping others, as though this compassionate service was the core reason I had returned to life.' },
];

async function seed() {
  // 1. Get existing slugs
  const { data: existing } = await sb
    .from('nde_questions')
    .select('slug, sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const { data: slugRows } = await sb
    .from('nde_questions')
    .select('slug');
  const existingSlugs = new Set((slugRows ?? []).map(r => r.slug));
  const maxOrder = existing?.[0]?.sort_order ?? 0;

  console.log(`Found ${existingSlugs.size} existing questions. Max sort_order: ${maxOrder}`);

  // 2. Build rows to insert (skip existing slugs)
  let sortOffset = maxOrder;
  const toInsert: Row[] = [];

  for (const q of questions) {
    const slug = slugify(q.consumer_question);
    if (existingSlugs.has(slug)) {
      continue; // already exists
    }
    sortOffset += 10;
    toInsert.push({
      slug,
      category: q.category,
      category_label: q.category_label,
      consumer_question: q.consumer_question,
      ai_query: q.ai_query,
      sort_order: sortOffset,
      is_active: true,
    });
  }

  console.log(`Inserting ${toInsert.length} new questions...`);
  if (toInsert.length === 0) {
    console.log('Nothing to insert — all questions already exist.');
    return;
  }

  // 3. Batch insert in chunks of 20
  const CHUNK = 20;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const batch = toInsert.slice(i, i + CHUNK);
    const { data, error } = await sb
      .from('nde_questions')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`Batch ${Math.floor(i / CHUNK) + 1} error:`, error.message);
      console.error('First failing row:', batch[0]);
    } else {
      inserted += data?.length ?? 0;
      console.log(`  Batch ${Math.floor(i / CHUNK) + 1}: inserted ${data?.length ?? 0} rows`);
    }
  }

  const { count } = await sb
    .from('nde_questions')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅  Done! Inserted ${inserted} new rows. Total: ${count}`);
}

seed().catch(e => { console.error(e); process.exit(1); });
