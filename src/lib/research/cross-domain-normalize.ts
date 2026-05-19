/**
 * Cross-Domain Phenomenology Label Normalization
 *
 * Both the NDE and UAP analysis pipelines use LLM-generated labels for
 * emotions and communication methods. These labels are semantically
 * equivalent but lexically different (e.g. NDE "frightening" vs UAP "fear").
 *
 * This module maps the long tail of free-form labels into a curated set
 * of canonical categories so cross-domain comparisons surface real overlaps
 * instead of hiding them behind vocabulary differences.
 */

// ─── Emotion Normalization ──────────────────────────────────────────────────

const EMOTION_MAP: Record<string, string> = {
  // Fear cluster
  fear: 'fear',
  frightening: 'fear',
  fearful: 'fear',
  terror: 'fear',
  terrified: 'fear',
  dread: 'fear',
  horror: 'fear',
  panic: 'fear',
  alarm: 'fear',
  paranoia: 'fear',

  // Love cluster
  loving: 'love',
  love: 'love',
  'unconditional love': 'love',
  'overwhelming love': 'love',
  'overwhelmingly loving': 'love',
  'all-encompassing love': 'love',
  fondness: 'love',

  // Peace cluster
  peaceful: 'peace',
  peace: 'peace',
  calm: 'peace',
  calming: 'peace',
  serene: 'peace',
  soothing: 'peace',
  content: 'peace',
  safety: 'peace',
  comfort: 'peace',
  comforting: 'peace',

  // Joy cluster
  joyful: 'joy',
  joy: 'joy',
  happy: 'joy',
  happiness: 'joy',
  elation: 'joy',
  euphoria: 'joy',
  exhilaration: 'joy',
  delighted: 'joy',
  playful: 'joy',
  thrill: 'joy',

  // Awe / Wonder cluster
  awe: 'awe',
  'awe-inspiring': 'awe',
  wonder: 'awe',
  wonderment: 'awe',
  amazement: 'awe',
  astonishment: 'awe',
  mystical: 'awe',
  mystification: 'awe',
  transcendence: 'awe',
  profoundness: 'awe',
  'profound_connection': 'awe',

  // Curiosity cluster
  curiosity: 'curiosity',
  curious: 'curiosity',
  fascination: 'curiosity',
  intrigue: 'curiosity',
  intrigued: 'curiosity',

  // Concern / Anxiety cluster
  concern: 'anxiety',
  concerned: 'anxiety',
  anxiety: 'anxiety',
  anxious: 'anxiety',
  worried: 'anxiety',
  worry: 'anxiety',
  unease: 'anxiety',

  // Neutral
  neutral: 'neutral',

  // Sadness cluster
  sad: 'sadness',
  sadness: 'sadness',
  sorrowful: 'sadness',
  grief: 'sadness',
  heartbroken: 'sadness',
  longing: 'sadness',
  homesickness: 'sadness',
  nostalgia: 'sadness',
  nostalgic: 'sadness',

  // Authority cluster
  authoritative: 'authority',
  stern: 'authority',
  serious: 'authority',
  urgent: 'authority',
  urgency: 'authority',
  powerful: 'authority',
  determination: 'authority',
  determined: 'authority',
  conviction: 'authority',

  // Compassion / Support cluster
  supportive: 'compassion',
  compassionate: 'compassion',
  compassion: 'compassion',
  caring: 'compassion',
  nurturing: 'compassion',
  empathetic: 'compassion',
  gentle: 'compassion',
  tender: 'compassion',
  reassuring: 'compassion',
  welcoming: 'compassion',
  protective: 'compassion',

  // Shock / Confusion cluster
  shock: 'shock',
  confusion: 'shock',
  confused: 'shock',
  disbelief: 'shock',
  bewilderment: 'shock',
  disorientation: 'shock',
  'stunned_silence': 'shock',
  bafflement: 'shock',

  // Distress cluster
  desperate: 'distress',
  distress: 'distress',
  distressed: 'distress',
  overwhelm: 'distress',
  overwhelmed: 'distress',
  helplessness: 'distress',
  vulnerability: 'distress',
  trauma: 'distress',

  // Inspiration cluster
  inspirational: 'inspiration',
  inspiring: 'inspiration',
  uplifting: 'inspiration',
  uplifted: 'inspiration',
  enlightenment: 'inspiration',
  awakening: 'inspiration',
  transformation: 'inspiration',
  transformative: 'inspiration',
  empowerment: 'inspiration',
  empowered: 'inspiration',

  // Hope cluster
  hope: 'hope',
  hopeful: 'hope',
  acceptance: 'hope',
  trust: 'hope',
  trusting: 'hope',
  belief: 'hope',

  // Gratitude cluster
  gratitude: 'gratitude',
  grateful: 'gratitude',
  reverent: 'gratitude',
  humility: 'gratitude',
  humbling: 'gratitude',

  // Mixed / Other
  mixed: 'mixed',
  excited: 'excitement',
  excitement: 'excitement',
  surprise: 'excitement',
  anticipation: 'excitement',

  // Connection cluster
  connection: 'connection',
  connectedness: 'connection',
  familiar: 'connection',
  familiarity: 'connection',

  // Negative misc
  angry: 'anger',
  anger: 'anger',
  agitated: 'anger',
  annoyance: 'anger',
  frustration: 'anger',
  hostile: 'anger',
  deceptive: 'anger',
  betrayal: 'anger',
  violation: 'anger',
  tormenting: 'anger',

  // Not stated / skip
  not_stated: '__skip__',
};

// ─── Communication Method Normalization ─────────────────────────────────────

const COMM_MAP: Record<string, string> = {
  // Telepathy cluster — many NDE labels are variants of telepathy
  telepathy: 'telepathy',
  thought: 'telepathy',
  thoughts: 'telepathy',
  mental: 'telepathy',
  'mind talk': 'telepathy',
  'thought transference': 'telepathy',
  'thought exchange': 'telepathy',
  'thought-feeling transference': 'telepathy',
  'thought talk': 'telepathy',
  'thought to thought': 'telepathy',
  'thought wave': 'telepathy',
  'thought and pictures': 'telepathy',
  'thoughts audible': 'telepathy',
  'direct thought': 'telepathy',
  'telepathy and verbal': 'telepathy',
  conceptual: 'telepathy',
  intuitive: 'telepathy',
  intuition: 'telepathy',
  'inner knowing': 'telepathy',
  'understanding and knowing': 'telepathy',
  intellectual: 'telepathy',
  'intellectual sharing': 'telepathy',

  // Verbal cluster
  verbal: 'verbal',
  auditory: 'verbal',
  audible: 'verbal',
  'internal voice': 'verbal',
  'inner voice': 'verbal',
  whispering: 'verbal',
  screaming: 'verbal',
  screams: 'verbal',
  chanting: 'verbal',
  singing: 'verbal',
  discussion: 'verbal',
  'verbal and mental': 'verbal',
  'verbal and telepathy': 'verbal',
  'unison voice': 'verbal',

  // Presence cluster
  presence_only: 'presence',
  'collective presence': 'presence',
  'mutual acknowledgment': 'presence',
  recognition: 'presence',

  // Emotional / Energetic cluster
  emotional: 'emotional',
  feeling: 'emotional',
  'heart-to-heart': 'emotional',
  'soul_to_soul': 'emotional',
  'soul-to-soul communication': 'emotional',
  'energy transfer': 'emotional',

  // Visual / Non-verbal cluster
  gesture: 'gesture',
  'eye contact': 'gesture',
  'non-verbal': 'gesture',
  non_verbal: 'gesture',
  'non-linguistic': 'gesture',
  nonlinguistic: 'gesture',
  non_physical: 'gesture',
  'non-verbal joy and laughter': 'gesture',

  // Vision / Download cluster
  vision: 'vision',
  visions: 'vision',
  visual: 'vision',
  dream: 'vision',
  download: 'vision',
  'downloading information': 'vision',
  'non-linguistic data download': 'vision',
  perception: 'vision',
  guidance: 'vision',

  // Other
  vibrational: 'vibrational',
  vibration: 'vibrational',
  'light communication': 'vibrational',
  'pulses of light': 'vibrational',
  olfactory: 'other',
  technological: 'technological',
  various: 'other',
  'various signs': 'other',
  'various signs and messages': 'other',
};

// ─── Exported Functions ─────────────────────────────────────────────────────

/**
 * Map a raw emotion label to a canonical category.
 * Returns '__skip__' for labels that should be excluded (e.g. not_stated).
 * Unknown labels pass through lowercased.
 */
export function normalizeEmotion(raw: string): string {
  const key = raw.toLowerCase().trim();
  return EMOTION_MAP[key] ?? key;
}

/**
 * Map a raw communication method to a canonical category.
 * Unknown labels pass through lowercased.
 */
export function normalizeCommMethod(raw: string): string {
  const key = raw.toLowerCase().trim();
  return COMM_MAP[key] ?? key;
}

/**
 * Increment a count in a Map using a normalized key.
 * Skips entries that normalize to '__skip__'.
 */
export function incrementNormalized(
  map: Map<string, number>,
  raw: string,
  normalizeFn: (s: string) => string,
): void {
  const canonical = normalizeFn(raw);
  if (canonical === '__skip__') return;
  map.set(canonical, (map.get(canonical) || 0) + 1);
}
