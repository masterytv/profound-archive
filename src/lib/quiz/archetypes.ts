// src/lib/quiz/archetypes.ts
// Single source of truth for quiz questions, scoring, and archetype content.

export type ArchetypeId =
  | "griever"
  | "seeker"
  | "experiencer"
  | "skeptic"
  | "curious"
  | "reexp"
  | "crisis";

export type Frequency = "daily" | "3day" | "weekly" | "monthly";

export interface AnswerOption {
  text: string;
  weights: Partial<Record<ArchetypeId, number>>;
}

export interface Question {
  id: string;
  prompt: string;          // The question text shown to user
  subPrompt?: string;      // Optional emphasis word shown in a different style
  options: AnswerOption[];
}

export interface Archetype {
  id: ArchetypeId;
  label: string;           // "The Griever"
  tagline: string;         // Italic italic one-liner
  icon: string;            // Emoji
  color: string;           // Tailwind accent class prefix e.g. "blue"
  description: string;     // Short result card paragraph
  fullDescription: string; // Longer paragraph for "See all types" page
  ctaLabel: string;        // Link label inside result card
  ctaHref: string;
  crisisNote?: string;     // Only for crisis archetype
}

// ─── Questions ────────────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "What's the",
    subPrompt: "PRIMARY",
    // assembled as: "What's the PRIMARY thing that brought you here today?"
    options: [
      {
        text: "I lost someone I love",
        weights: { griever: 3, crisis: 1 },
      },
      {
        text: "I had an experience I can't fully explain",
        weights: { experiencer: 3 },
      },
      {
        text: "I want to understand what the science actually says",
        weights: { skeptic: 3 },
      },
      {
        text: "I'm on a spiritual path and this fits",
        weights: { seeker: 3 },
      },
      {
        text: "Something I saw online pulled me in",
        weights: { curious: 3 },
      },
      {
        text: "I've been watching every NDE I can find",
        weights: { reexp: 3 },
      },
      {
        text: "I'm going through a very dark time",
        weights: { crisis: 3, griever: 1 },
      },
    ],
  },
  {
    id: "q2",
    prompt: "When you watch an NDE account, what",
    subPrompt: "MOST",
    // "When you watch an NDE account, what MOST matters to you?"
    options: [
      {
        text: "Whether the person's emotions feel real",
        weights: { griever: 2, seeker: 1 },
      },
      {
        text: "Details that couldn't be explained by ordinary perception",
        weights: { skeptic: 3, experiencer: 1 },
      },
      {
        text: "Whether their life changed afterward",
        weights: { seeker: 2, curious: 1 },
      },
      {
        text: "Finding moments I recognise from my own experience",
        weights: { experiencer: 3, reexp: 1 },
      },
      {
        text: "Feeling it — really inhabiting what they felt",
        weights: { reexp: 3 },
      },
      {
        text: "How carefully and credibly it was documented",
        weights: { skeptic: 2, curious: 1 },
      },
      {
        text: "Whether it gives me a reason to hope",
        weights: { griever: 2, crisis: 3 },
      },
    ],
  },
  {
    id: "q3",
    prompt: "Which answer is",
    subPrompt: "CLOSEST",
    // "Which answer is CLOSEST to how you feel about the idea that consciousness continues after death?"
    options: [
      {
        text: "I desperately need it to be true",
        weights: { griever: 2, crisis: 3 },
      },
      {
        text: "I already know — something happened to me",
        weights: { experiencer: 3 },
      },
      {
        text: "I believe it spiritually and these accounts confirm it",
        weights: { seeker: 3 },
      },
      {
        text: "The evidence seems to point that way",
        weights: { skeptic: 2, curious: 1 },
      },
      {
        text: "I'm genuinely open — show me the data",
        weights: { skeptic: 3 },
      },
      {
        text: "The stories themselves are the evidence",
        weights: { reexp: 2, seeker: 1 },
      },
      {
        text: "I try not to think about it",
        weights: { curious: 2 },
      },
    ],
  },
  {
    id: "q4",
    prompt: "What would",
    subPrompt: "MOST",
    // "What would MOST change for you if NDEs were proven real beyond doubt?"
    options: [
      {
        text: "How I'm grieving would transform",
        weights: { griever: 3, crisis: 2 },
      },
      {
        text: "Nothing — I already know",
        weights: { experiencer: 3, reexp: 1 },
      },
      {
        text: "My spiritual framework would be validated",
        weights: { seeker: 3 },
      },
      {
        text: "The scientific establishment would have to rethink a lot",
        weights: { skeptic: 3 },
      },
      {
        text: "I'd share it everywhere — people need to know this",
        weights: { curious: 2, griever: 1 },
      },
      {
        text: "I'd want to relive every account I've ever seen, differently",
        weights: { reexp: 3 },
      },
      {
        text: "I might finally feel less alone in what I experienced",
        weights: { experiencer: 2, crisis: 1 },
      },
    ],
  },
  {
    id: "q5",
    prompt: "What kind of NDE story",
    subPrompt: "MOST",
    // "What kind of NDE story MOST hooks you immediately?"
    options: [
      {
        text: "A parent reconnecting with their child on the other side",
        weights: { griever: 3, crisis: 1 },
      },
      {
        text: "An account where the person witnessed things they couldn't have known",
        weights: { skeptic: 3, experiencer: 1 },
      },
      {
        text: "A profound life review and complete transformation afterward",
        weights: { seeker: 3, curious: 1 },
      },
      {
        text: "One that sounds exactly like what happened to me",
        weights: { experiencer: 3, reexp: 2 },
      },
      {
        text: "Something short, clear, and completely credible",
        weights: { curious: 3 },
      },
      {
        text: "A long, incredibly detailed account I can get lost in",
        weights: { reexp: 3 },
      },
      {
        text: "Anything that says love survives death",
        weights: { griever: 2, crisis: 3 },
      },
    ],
  },
  {
    id: "q6",
    prompt: "How do you",
    subPrompt: "USUALLY",
    // "How do you USUALLY feel after watching an NDE video?"
    options: [
      {
        text: "Comforted — like a weight lifted",
        weights: { griever: 3, crisis: 2 },
      },
      {
        text: "Validated — someone else saw what I saw",
        weights: { experiencer: 3 },
      },
      {
        text: "Inspired — I want to live differently",
        weights: { seeker: 3 },
      },
      {
        text: "Analytical — cross-referencing it against other accounts",
        weights: { skeptic: 3 },
      },
      {
        text: "Hungry for the next one immediately",
        weights: { reexp: 3, curious: 1 },
      },
      {
        text: "Satisfied but curious — one question answered, more opened",
        weights: { curious: 3, seeker: 1 },
      },
      {
        text: "Desperate — wishing they'd said more about what's there",
        weights: { griever: 1, crisis: 3 },
      },
    ],
  },
];

// Build the full question text for display
export function buildQuestionText(q: Question): { before: string; emphasis: string; after: string } {
  const map: Record<string, { before: string; emphasis: string; after: string }> = {
    q1: { before: "What's the ", emphasis: "PRIMARY", after: " thing that brought you here today?" },
    q2: { before: "When you watch an NDE account, what ", emphasis: "MOST", after: " matters to you?" },
    q3: { before: "Which answer is ", emphasis: "CLOSEST", after: " to how you feel about consciousness continuing after death?" },
    q4: { before: "What would ", emphasis: "MOST", after: " change for you if NDEs were proven real beyond doubt?" },
    q5: { before: "What kind of NDE story ", emphasis: "MOST", after: " hooks you immediately?" },
    q6: { before: "How do you ", emphasis: "USUALLY", after: " feel after watching an NDE video?" },
  };
  return map[q.id]!;
}

// ─── Archetypes ───────────────────────────────────────────────────────────────

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  griever: {
    id: "griever",
    label: "The Griever",
    tagline: "You're here because love doesn't end at death.",
    icon: "🕊",
    color: "blue",
    description:
      "You came looking for something the world rarely offers: honest, documented evidence that the person you lost didn't simply stop. You're not grasping at comfort — you're seeking something real. These accounts were gathered for exactly you.",
    fullDescription:
      "You carry a grief that most people around you don't fully understand. You've found your way here because somewhere beneath the loss, there's a question you can't stop asking. These 5,000+ accounts won't replace what's gone — but they may offer what nothing else can: testimony, from thousands of ordinary people, that love continues past the boundary others call death.",
    ctaLabel: "Stories about reunion with loved ones →",
    ctaHref: "/explore/transformation",
  },
  seeker: {
    id: "seeker",
    label: "The Spiritual Seeker",
    tagline: "You already sense something vast. These accounts help you map it.",
    icon: "🌌",
    color: "purple",
    description:
      "You approach NDEs not as proof you need, but as data from a territory you already partially know. You're building a coherent picture of consciousness — and each account adds another coordinate to a map you'll spend your life drawing.",
    fullDescription:
      "You have a framework for meaning — built from years of reading, practice, or simply paying attention. You're not here because you doubt. You're here because these accounts confirm something you've long suspected: that consciousness is larger than the brain, and that the accounts of those who've touched the edge of death are among the most trustworthy data we have.",
    ctaLabel: "Experiences with the highest Transformation scores →",
    ctaHref: "/explore/transformation",
  },
  experiencer: {
    id: "experiencer",
    label: "The Experiencer",
    tagline: "You've been there. You know.",
    icon: "✦",
    color: "amber",
    description:
      "Something happened to you — and you've spent time wondering if you were alone in it. You weren't. These 5,000+ accounts are a mirror for what you saw, felt, or were told. You deserve to be recognised, not explained away.",
    fullDescription:
      "You carry knowledge that's hard to share. The experience itself was real — the question has always been whether anyone else would understand it. Coming here is an act of courage. Every account in this archive is, in some sense, a message from someone who went where you went and came back changed. You are not alone, and you are not unusual. You are part of a documented phenomenon that spans every culture, every era, and every kind of person.",
    ctaLabel: "Accounts that match specific NDE elements →",
    ctaHref: "/explore/veridical",
  },
  skeptic: {
    id: "skeptic",
    label: "The Skeptic / Researcher",
    tagline: "You're not asking for belief. You're asking for evidence.",
    icon: "🔬",
    color: "emerald",
    description:
      "You're drawn to NDEs because the data is genuinely anomalous. Veridical perceptions. Blind patients describing surgical instruments. Children describing relatives they never met. The standard explanations don't hold — and you're right to keep looking.",
    fullDescription:
      "You apply the same critical lens to NDEs that you apply to everything else — and that's exactly right. The archive scores each account on three validated research scales: the Greyson Scale, the NDE Veridical Perception protocol, and the Transformation Scale. You can sort by Evidence Strength and filter by element. The data is there. The anomalies are real. What you do with that is your call.",
    ctaLabel: "Highest Evidence Strength accounts →",
    ctaHref: "/explore/veridical",
  },
  curious: {
    id: "curious",
    label: "The Curious Bystander",
    tagline: "One extraordinary story led you here. Turns out there are thousands.",
    icon: "🪐",
    color: "sky",
    description:
      "You didn't arrive with a specific wound or mission — you arrived because something caught your attention and refused to let go. That instinct was correct. The archive runs very deep.",
    fullDescription:
      "Curiosity is an underrated reason to be here. You're open, you're looking, and you're not yet sure what you're looking for. That's actually a good starting point — it means you'll let the accounts speak before you've decided what they mean. Start with one that surprises you. The search is good.",
    ctaLabel: "Most-watched and highest-rated accounts →",
    ctaHref: "/search3",
  },
  reexp: {
    id: "reexp",
    label: "The Re-Experiencer",
    tagline: "You don't just watch NDEs. You inhabit them.",
    icon: "🔁",
    color: "rose",
    description:
      "For you, the archive is an immersive world. You return because each account is a different doorway into the same territory — and the territory matters to you in ways that are hard to explain to others.",
    fullDescription:
      "You've seen hundreds of these accounts. Maybe thousands. And you still come back. There's something in the territory that keeps drawing you — not just the stories themselves but what they point toward. The most detailed, hour-long accounts. The ones where someone tries to describe the light and runs out of words. You're fluent in a language most people don't speak. This archive was built, in part, for you.",
    ctaLabel: "Longest, most detailed accounts in the archive →",
    ctaHref: "/explore/greyson",
  },
  crisis: {
    id: "crisis",
    label: "The Crisis Visitor",
    tagline: "You came because you need to know if there's a reason to stay.",
    icon: "🌅",
    color: "amber",
    description:
      "We see you. Whatever you're carrying right now — it's real, and it's heavy. These accounts exist as testimony from thousands of people who touched the edge of death and came back changed. Almost none of them wanted to return when they saw what was there. They came back for love. That's for you too.",
    fullDescription:
      "You came here in the dark. That took courage — or maybe just desperation, which is another kind of courage. What these accounts almost universally describe is this: at the boundary, there is no judgment. There is only love, and often the sense of being sent back — because something isn't finished yet. You are not finished yet. The accounts in this archive were gathered, in part, as a message to people exactly where you are.",
    ctaLabel: "Stories about being sent back and life purpose →",
    ctaHref: "/explore/transformation",
    crisisNote:
      "If you're in crisis right now, please reach out. You can call or text 988 (Suicide & Crisis Lifeline) anytime.",
  },
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

export function computeArchetype(answers: AnswerOption[]): ArchetypeId {
  const totals: Record<ArchetypeId, number> = {
    griever: 0, seeker: 0, experiencer: 0,
    skeptic: 0, curious: 0, reexp: 0, crisis: 0,
  };

  for (const answer of answers) {
    for (const [id, pts] of Object.entries(answer.weights) as [ArchetypeId, number][]) {
      totals[id] += pts;
    }
  }

  return (Object.entries(totals) as [ArchetypeId, number][]).reduce(
    (best, [id, pts]) => (pts > totals[best] ? id : best),
    "curious" as ArchetypeId
  );
}
