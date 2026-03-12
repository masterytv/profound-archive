// src/lib/quiz/archetypes.ts
// Single source of truth for NDE Compass questions, scoring, and archetype content.
// Redesigned: 5 archetypes, 4 questions, 5 answers each, destination-framed display labels.

export type ArchetypeId =
  | "griever"
  | "seeker"
  | "experiencer"
  | "skeptic"
  | "curious";

// Legacy IDs kept for graceful email fallback. Not scored, not displayed.
export type LegacyArchetypeId = "reexp" | "crisis";

export type Frequency = "daily" | "3day" | "weekly" | "monthly";

export interface AnswerOption {
  text: string;
  weights: Partial<Record<ArchetypeId, number>>;
}

export interface Question {
  id: string;
  prompt: string;  // Full question text — no emphasis words, plain conversational
  options: AnswerOption[];
}

export interface Archetype {
  id: ArchetypeId;
  label: string;            // "The Griever" — internal/email label
  destinationLabel: string; // "The Healing Path" — display label on result page
  tagline: string;
  icon: string;
  color: string;
  description: string;
  fullDescription: string;
  ctaLabel: string;
  ctaHref: string;
}

// ─── Questions ────────────────────────────────────────────────────────────────
// 4 scored questions × 5 answers each. Each answer maps to exactly one archetype.
// Q5 is a write-in (no scoring) — handled in QuizClient, not here.

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    prompt: "What brought you to Project Profound?",
    options: [
      {
        text: "I miss someone deeply and I want to know they're okay.",
        weights: { griever: 4 },
      },
      {
        text: "A personal experience I'm still trying to understand",
        weights: { experiencer: 4 },
      },
      {
        text: "I'm drawn to the evidence and want to find more of it",
        weights: { skeptic: 4 },
      },
      {
        text: "This resonates with my spiritual life",
        weights: { seeker: 4 },
      },
      {
        text: "I'm just genuinely curious and open",
        weights: { curious: 4 },
      },
    ],
  },
  {
    id: "q2",
    prompt: "What matters most to you in an NDE account?",
    options: [
      {
        text: "The emotional truth — whether the person's grief, joy, or love feels real",
        weights: { griever: 4 },
      },
      {
        text: "Specific, verifiable details that couldn't be fabricated",
        weights: { skeptic: 4 },
      },
      {
        text: "The transformation — how they lived differently afterward",
        weights: { seeker: 4 },
      },
      {
        text: "Recognition — details that match my own experience",
        weights: { experiencer: 4 },
      },
      {
        text: "Shareability — something others will relate to that I can share",
        weights: { curious: 4 },
      },
    ],
  },
  {
    id: "q3",
    prompt: "Which of these feels the most true to you?",
    options: [
      {
        text: "I want to know there is something more than the physical world",
        weights: { griever: 4 },
      },
      {
        text: "I already know there is something more — I've been there",
        weights: { experiencer: 4 },
      },
      {
        text: "The evidence will tell me if there is something more than the physical world",
        weights: { skeptic: 4 },
      },
      {
        text: "I know there is something more. NDEs deepen what I already know.",
        weights: { seeker: 4 },
      },
      {
        text: "I'm genuinely open and I don't know what I'll find",
        weights: { curious: 4 },
      },
    ],
  },
  {
    id: "q4",
    prompt: "Which of these kinds of accounts do you most want to find?",
    options: [
      {
        text: "One where someone describes meeting a person they lost",
        weights: { griever: 4 },
      },
      {
        text: "One where the person witnessed something they couldn't have known",
        weights: { skeptic: 4 },
      },
      {
        text: "One that completely changed how someone lived their life afterward",
        weights: { seeker: 4 },
      },
      {
        text: "One that mirrors what happened to me",
        weights: { experiencer: 4 },
      },
      {
        text: "One that's clear, well-told, and easy to share with someone skeptical",
        weights: { curious: 4 },
      },
    ],
  },
];

// ─── Archetypes ───────────────────────────────────────────────────────────────

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  griever: {
    id: "griever",
    label: "The Griever",
    destinationLabel: "The Healing Path",
    tagline: "You're here to find the peace you deserve.",
    icon: "🕊",
    color: "blue",
    description:
      "You may have come looking for something the world rarely offers: honest, documented accounts that the person you lost didn't simply stop. You're not grasping at comfort. You're seeking something real. We'll email you NDE videos where people reconnect with the ones they love.",
    fullDescription:
      "You carry a grief that most people around you don't fully understand. You've found your way here because somewhere beneath the loss, there's a question you can't stop asking. These 5,000+ accounts won't replace what's gone — but they may offer what nothing else can: testimony, from thousands of ordinary people, that love continues past the boundary others call death.",
    ctaLabel: "Find accounts on the Healing Path →",
    ctaHref: "/explore/transformation",
  },
  seeker: {
    id: "seeker",
    label: "The Spiritual Seeker",
    destinationLabel: "The Map of Meaning",
    tagline: "You already sense something vast. These accounts help you add to your map of it.",
    icon: "🌌",
    color: "purple",
    description:
      "You likely approach NDEs not as proof you need, but as spiritual data from a territory you already partially know. You're building a coherent picture of consciousness and the afterlife. Each account adds another coordinate to a map you'll spend your life drawing. We'll send you NDE videos that explore the vastness of infinite love and answer the big questions.",
    fullDescription:
      "You have a framework for meaning — built from years of reading, practice, or simply paying attention. You're not here because you doubt. You're here because these accounts confirm something you've long suspected: that consciousness is larger than the brain, and that the accounts of those who've touched the edge of death are among the most trustworthy data we have.",
    ctaLabel: "Find accounts on the Map of Meaning →",
    ctaHref: "/explore/transformation",
  },
  experiencer: {
    id: "experiencer",
    label: "The Experiencer",
    destinationLabel: "The Mirror",
    tagline: "You've been there. You know.",
    icon: "✦",
    color: "amber",
    description:
      "You likely had an experience and you want to connect in some way to others who have also. You may have wondered if you were alone in it. You weren't. These 5,000+ accounts are a mirror for what you saw, felt, or know deeply to be true. You deserve to be acknowledged, not explained away. We'll send you videos from first-person experiencers that you can relate to.",
    fullDescription:
      "You carry knowledge that's hard to share. The experience itself was real — the question has always been whether anyone else would understand it. Coming here is an act of courage. Every account in this archive is, in some sense, a message from someone who went where you went and came back changed. You are not alone, and you are not unusual. You are part of a documented phenomenon that spans every culture, every era, and every kind of person.",
    ctaLabel: "Find accounts that mirror your experience →",
    ctaHref: "/explore/veridical",
  },
  skeptic: {
    id: "skeptic",
    label: "The Skeptic / Researcher",
    destinationLabel: "The Evidence Trail",
    tagline: "You're not asking for belief. You're interested in the evidence.",
    icon: "🔬",
    color: "emerald",
    description:
      "You may be drawn to NDEs because the data is genuinely anomalous. People perceive events they couldn't have seen, but were later verified to be true. Academics call this Veridical Perception. Blind patients describing surgical instruments. Children describing relatives they never met. The standard explanations don't hold — and you're fascinated by exploring these kinds of NDEs. We'll send you videos with high levels of veridical perception — the evidence that there is something beyond the physical world.",
    fullDescription:
      "You apply the same critical lens to NDEs that you apply to everything else — and that's exactly right. The archive scores each account on three validated research scales: the Greyson Scale, the NDE Veridical Perception protocol, and the Transformation Scale. You can sort by Evidence Strength and filter by element. The data is there. The anomalies are real. What you do with that is your call.",
    ctaLabel: "Follow the Evidence Trail →",
    ctaHref: "/explore/veridical",
  },
  curious: {
    id: "curious",
    label: "The Curious Bystander",
    destinationLabel: "The Open Door",
    tagline: "Curiosity led you here. You're open to exploring and sharing.",
    icon: "🪐",
    color: "sky",
    description:
      "You probably didn't arrive with a specific wound or mission. Something caught your attention and refused to let go. That instinct was correct. The archive runs very deep. We'll show you NDE videos that pique your curiosity and sense of exploration.",
    fullDescription:
      "Curiosity is an underrated reason to be here. You're open, you're looking, and you're not yet sure what you're looking for. That's actually a good starting point — it means you'll let the accounts speak before you've decided what they mean. Start with one that surprises you. The search is good.",
    ctaLabel: "Step through the Open Door →",
    ctaHref: "/search3",
  },
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

// Tie-breaking priority: more emotionally vulnerable archetypes win ties.
// This ensures a person who split evenly between grief and curiosity
// gets routed to grief content — the safer and more relevant outcome.
const TIE_PRIORITY: ArchetypeId[] = [
  "griever",
  "seeker",
  "experiencer",
  "skeptic",
  "curious",
];

export function computeArchetype(answers: AnswerOption[]): ArchetypeId {
  const totals: Record<ArchetypeId, number> = {
    griever: 0,
    seeker: 0,
    experiencer: 0,
    skeptic: 0,
    curious: 0,
  };

  for (const answer of answers) {
    for (const [id, pts] of Object.entries(answer.weights) as [ArchetypeId, number][]) {
      if (id in totals) totals[id] += pts;
    }
  }

  const maxScore = Math.max(...Object.values(totals));

  // Among tied leaders, use TIE_PRIORITY order (most vulnerable first)
  return TIE_PRIORITY.find(id => totals[id] === maxScore) ?? "curious";
}

// Graceful fallback for legacy archetype IDs that may still exist in quiz_leads
// (reexp → curious, crisis → griever). Used by email send logic only.
export function resolveArchetypeId(raw: string): ArchetypeId {
  if (raw in ARCHETYPES) return raw as ArchetypeId;
  if (raw === "reexp") return "curious";
  if (raw === "crisis") return "griever";
  return "curious";
}
