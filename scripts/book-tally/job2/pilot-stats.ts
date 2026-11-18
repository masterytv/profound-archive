/** Pilot statistics from Haiku/Sonnet pilot rows and usage. Pure. */
import { addUsage, emptyTotals, requestCost, usageToCounts, type UsageLike, type UsageTotals } from '../lib/cost';
import { cohensKappa, confusionMatrix, percentAgreement, type ConfusionMatrix, type Kappa, type Pair } from '../lib/stats';
import { STANCES, type Stance } from './answers';
import { isFlagged, resolveFinal, type AnswerLite } from './flags';
import type { PilotModelRates, PilotShares } from './estimate';

export interface PilotAnswer {
  video_id: string;
  question_id: number;
  valid: boolean;
  stance: Stance | null;
  confidence: number | null;
  quote_verified: boolean;
  error: string | null;
}

const toLite = (a: PilotAnswer): AnswerLite => ({
  valid: a.valid, stance: a.stance, confidence: a.confidence, quote: null, quoteVerified: a.quote_verified,
});

const INVALID_LITE: AnswerLite = { valid: false, stance: null, confidence: null, quote: null, quoteVerified: false };

export interface ModelAnswerStats {
  cells: number;
  invalid: number;
  invalidRate: number | null;
  /** valid answers with stance != not_addressed. */
  claims: number;
  unverified: number;
  quoteFailureRate: number | null;
  errors: Record<string, number>;
}

export function modelAnswerStats(rows: readonly PilotAnswer[]): ModelAnswerStats {
  const errors: Record<string, number> = {};
  let invalid = 0, claims = 0, unverified = 0;
  for (const r of rows) {
    if (!r.valid) invalid++;
    else if (r.stance !== 'not_addressed') {
      claims++;
      if (!r.quote_verified) unverified++;
    }
    if (r.error) errors[r.error] = (errors[r.error] ?? 0) + 1;
  }
  return {
    cells: rows.length, invalid, invalidRate: rows.length ? invalid / rows.length : null,
    claims, unverified, quoteFailureRate: claims ? unverified / claims : null, errors,
  };
}

export interface AgreementStats {
  n: number;
  agreement: number | null;
  kappa4: Kappa;
  kappaAddressed: Kappa;
}

const ADDRESSED_LABELS = ['addressed', 'not_addressed'] as const;
const toBinary = (s: Stance): string => (s === 'not_addressed' ? 'not_addressed' : 'addressed');

export function agreement(pairs: ReadonlyArray<Pair<Stance>>): AgreementStats {
  return {
    n: pairs.length,
    agreement: percentAgreement(pairs),
    kappa4: cohensKappa(pairs, STANCES),
    kappaAddressed: cohensKappa(pairs.map(([a, b]) => [toBinary(a), toBinary(b)] as const), ADDRESSED_LABELS),
  };
}

export interface PilotStats {
  videos: number;
  questions: number;
  /** cells where both models returned a valid answer. */
  pairs: Array<Pair<Stance>>;
  pairedCells: number;
  excludedInvalidCells: number;
  overall: AgreementStats;
  confusion: ConfusionMatrix;
  perQuestion: Array<AgreementStats & { question_id: number }>;
  haiku: ModelAnswerStats;
  sonnet: ModelAnswerStats;
  shares: PilotShares;
}

export function pilotStats(haiku: readonly PilotAnswer[], sonnet: readonly PilotAnswer[]): PilotStats {
  const key = (r: { video_id: string; question_id: number }) => `${r.video_id}\u0000${r.question_id}`;
  const sMap = new Map(sonnet.map((r) => [key(r), r]));
  const pairs: Array<Pair<Stance>> = [];
  const perQ = new Map<number, Array<Pair<Stance>>>();
  let excluded = 0;
  const videos = new Set<string>();
  const questions = new Set<number>();
  // per-video flagged / disputed counts (Haiku = first reader, Sonnet = recheck proxy)
  const flaggedBy = new Map<string, number>();
  const disputedBy = new Map<string, number>();
  let flaggedCells = 0, disputedCells = 0;
  for (const h of haiku) {
    videos.add(h.video_id);
    questions.add(h.question_id);
    const s = sMap.get(key(h));
    if (h.valid && h.stance && s?.valid && s.stance) {
      const p: Pair<Stance> = [h.stance, s.stance];
      pairs.push(p);
      (perQ.get(h.question_id) ?? perQ.set(h.question_id, []).get(h.question_id)!).push(p);
    } else excluded++;
    const hl = toLite(h);
    if (isFlagged(hl)) {
      flaggedCells++;
      flaggedBy.set(h.video_id, (flaggedBy.get(h.video_id) ?? 0) + 1);
      if (resolveFinal(hl, s ? toLite(s) : INVALID_LITE).status === 'pending_arbiter') {
        disputedCells++;
        disputedBy.set(h.video_id, (disputedBy.get(h.video_id) ?? 0) + 1);
      }
    }
  }
  const nV = videos.size;
  const mean = (m: Map<string, number>) => (m.size ? [...m.values()].reduce((a, b) => a + b, 0) / m.size : 0);
  return {
    videos: nV,
    questions: questions.size,
    pairs,
    pairedCells: pairs.length,
    excludedInvalidCells: excluded,
    overall: agreement(pairs),
    confusion: confusionMatrix(pairs, STANCES),
    perQuestion: [...questions].sort((a, b) => a - b).map((q) => ({ question_id: q, ...agreement(perQ.get(q) ?? []) })),
    haiku: modelAnswerStats(haiku),
    sonnet: modelAnswerStats(sonnet),
    shares: {
      videos: nV,
      questionsPerVideo: questions.size,
      shareVideosWithFlag: nV ? flaggedBy.size / nV : 0,
      meanFlaggedPerFlaggedVideo: mean(flaggedBy),
      shareVideosWithDispute: nV ? disputedBy.size / nV : 0,
      meanDisputedPerDisputedVideo: mean(disputedBy),
      flaggedCellShare: haiku.length ? flaggedCells / haiku.length : 0,
      disputeShareOfFlagged: flaggedCells ? disputedCells / flaggedCells : 0,
    },
  };
}

// ---------- usage ----------

export interface ModelUsage {
  model: string;
  totals: UsageTotals;
  /** Cost if every prompt token were plain input (no cache reads), for projections. */
  costNoCacheUsd: number;
  rates: PilotModelRates;
}

export function usageStats(model: string, usages: readonly UsageLike[], questionsPerRequest: number): ModelUsage {
  const totals = emptyTotals();
  let prompt = 0, out = 0, noCache = 0;
  for (const u of usages) {
    addUsage(totals, model, u);
    const c = usageToCounts(u);
    const p = c.inputTokens + (c.cacheReadTokens ?? 0) + (c.cacheWrite5mTokens ?? 0) + (c.cacheWrite1hTokens ?? 0);
    prompt += p;
    out += c.outputTokens;
    noCache += requestCost(model, { inputTokens: p, outputTokens: c.outputTokens });
  }
  const n = usages.length || 1;
  return {
    model, totals, costNoCacheUsd: noCache,
    rates: {
      requests: usages.length,
      meanPromptTokens: prompt / n,
      meanOutputTokens: out / n,
      meanOutputPerQuestion: out / n / Math.max(1, questionsPerRequest),
    },
  };
}
