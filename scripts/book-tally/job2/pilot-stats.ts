/** Pilot statistics from Haiku/Sonnet pilot rows and usage. Pure. */
import { addUsage, emptyTotals, requestCost, usageToCounts, type TokenCounts, type UsageLike, type UsageTotals } from '../lib/cost';
import { cohensKappa, confusionMatrix, percentAgreement, wilson, type ConfusionMatrix, type Kappa, type Pair, type Proportion } from '../lib/stats';
import { STANCES, type Stance } from './answers';
import { isFlagged, resolveFinal, type AnswerLite } from './flags';

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

export interface PilotShares {
  videos: number;
  questionsPerVideo: number;
  totalCells: number;
  flaggedCells: number;
  disputedCells: number;
  videosWithFlag: number;
  videosWithDispute: number;
  /** flaggedCells / totalCells and disputedCells / flaggedCells (n beside each is above). */
  flaggedCellShare: number;
  disputeShareOfFlagged: number;
}

/** How often Sonnet disagrees on Haiku cells that were NOT flagged (i.e. would never be rechecked). */
export interface UnflaggedDisagreement {
  overall: Proportion;
  byHaikuStance: Record<Stance, Proportion>;
  /** Unflagged Haiku cells where Sonnet's answer was invalid/missing (excluded from the proportions). */
  sonnetInvalid: number;
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
  unflagged: UnflaggedDisagreement;
  /** Haiku-flagged / disputed cell counts per video (inputs to the cost projection). */
  flaggedByVideo: Map<string, number>;
  disputedByVideo: Map<string, number>;
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
  let flaggedCells = 0, disputedCells = 0, sonnetInvalidUnflagged = 0;
  const unflaggedByStance: Record<Stance, { k: number; n: number }> = {
    yes: { k: 0, n: 0 }, no: { k: 0, n: 0 }, mixed: { k: 0, n: 0 }, not_addressed: { k: 0, n: 0 },
  };
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
    } else if (h.stance) {
      if (s?.valid && s.stance) {
        const c = unflaggedByStance[h.stance];
        c.n++;
        if (s.stance !== h.stance) c.k++;
      } else sonnetInvalidUnflagged++;
    }
  }
  const nV = videos.size;
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
      totalCells: haiku.length,
      flaggedCells,
      disputedCells,
      videosWithFlag: flaggedBy.size,
      videosWithDispute: disputedBy.size,
      flaggedCellShare: haiku.length ? flaggedCells / haiku.length : 0,
      disputeShareOfFlagged: flaggedCells ? disputedCells / flaggedCells : 0,
    },
    unflagged: {
      overall: wilson(Object.values(unflaggedByStance).reduce((a, c) => a + c.k, 0), Object.values(unflaggedByStance).reduce((a, c) => a + c.n, 0)),
      byHaikuStance: Object.fromEntries(STANCES.map((st) => [st, wilson(unflaggedByStance[st].k, unflaggedByStance[st].n)])) as Record<Stance, Proportion>,
      sonnetInvalid: sonnetInvalidUnflagged,
    },
    flaggedByVideo: flaggedBy,
    disputedByVideo: disputedBy,
  };
}

// ---------- usage (per VIDEO, all attempts summed) ----------

export interface RawUsage {
  /** Video id (request key). */
  key: string;
  attempt: number;
  resultType: 'succeeded' | 'errored' | 'canceled' | 'expired';
  stopReason: string | null;
  usage: UsageLike | null;
}

export interface RetryCounts {
  rawResponses: number;
  /** Responses with attempt > 1. */
  retriedAttempts: number;
  truncated: number;
  errored: number;
  expired: number;
  canceled: number;
  videosWithRetry: number;
}

export interface ModelRates {
  videos: number;
  /** Mean per VIDEO over all attempts (input + cache read + cache write). */
  meanPromptTokens: number;
  /** Mean per VIDEO over all attempts; includes thinking tokens. */
  meanOutputTokens: number;
  /** Measured from usage.output_tokens_details.thinking_tokens when every response reports it. */
  meanThinkingTokens: number | null;
  meanVisibleTokens: number | null;
  meanVisiblePerQuestion: number | null;
}

export interface ModelUsage {
  model: string;
  /** Totals over every attempt (what was billed), batch prices. */
  totals: UsageTotals;
  /** Same, if every prompt token were plain input (no cache reads). */
  costNoCacheUsd: number;
  perVideo: Map<string, TokenCounts>;
  retries: RetryCounts;
  rates: ModelRates;
}

const thinkingOf = (u: UsageLike | null): number | null => {
  const t = (u as { output_tokens_details?: { thinking_tokens?: number | null } } | null)?.output_tokens_details?.thinking_tokens;
  return typeof t === 'number' ? t : null;
};

export function usageStats(model: string, raws: readonly RawUsage[], questionsPerRequest: number): ModelUsage {
  const totals = emptyTotals();
  let noCache = 0;
  const perVideo = new Map<string, TokenCounts>();
  const thinking = new Map<string, number>();
  let allReportThinking = true;
  const retries: RetryCounts = { rawResponses: raws.length, retriedAttempts: 0, truncated: 0, errored: 0, expired: 0, canceled: 0, videosWithRetry: 0 };
  const retried = new Set<string>();
  for (const r of raws) {
    if (r.attempt > 1) { retries.retriedAttempts++; retried.add(r.key); }
    if (r.resultType === 'errored') retries.errored++;
    else if (r.resultType === 'expired') retries.expired++;
    else if (r.resultType === 'canceled') retries.canceled++;
    else if (r.stopReason === 'max_tokens') retries.truncated++;
    if (!r.usage) continue;
    addUsage(totals, model, r.usage);
    const c = usageToCounts(r.usage);
    const p = c.inputTokens + (c.cacheReadTokens ?? 0) + (c.cacheWrite5mTokens ?? 0) + (c.cacheWrite1hTokens ?? 0);
    noCache += requestCost(model, { inputTokens: p, outputTokens: c.outputTokens });
    const cur = perVideo.get(r.key) ?? { inputTokens: 0, outputTokens: 0 };
    perVideo.set(r.key, { inputTokens: cur.inputTokens + p, outputTokens: cur.outputTokens + c.outputTokens });
    const th = thinkingOf(r.usage);
    if (th === null) allReportThinking = false;
    else thinking.set(r.key, (thinking.get(r.key) ?? 0) + th);
  }
  retries.videosWithRetry = retried.size;
  const n = perVideo.size;
  const sum = (f: (t: TokenCounts) => number) => [...perVideo.values()].reduce((a, t) => a + f(t), 0);
  const meanOut = n ? sum((t) => t.outputTokens) / n : 0;
  const meanTh = allReportThinking && n ? [...thinking.values()].reduce((a, b) => a + b, 0) / n : null;
  return {
    model, totals, costNoCacheUsd: noCache, perVideo, retries,
    rates: {
      videos: n,
      meanPromptTokens: n ? sum((t) => t.inputTokens) / n : 0,
      meanOutputTokens: meanOut,
      meanThinkingTokens: meanTh,
      meanVisibleTokens: meanTh === null ? null : meanOut - meanTh,
      meanVisiblePerQuestion: meanTh === null ? null : (meanOut - meanTh) / Math.max(1, questionsPerRequest),
    },
  };
}
