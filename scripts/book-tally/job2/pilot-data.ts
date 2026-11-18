/** Loads the latest completed pilot (both models) from the database. Read-only. */
import { parseCustomId } from '../lib/batch';
import { MODELS } from '../lib/cost';
import { selectAllKeyset, type Db } from '../lib/supabase';
import { fetchRawSummaries, fetchStanceRuns, type RunRow } from './db';
import { DEFAULT_OUTPUT_ASSUMPTION, type OutputAssumption } from './estimate';
import { pilotStats, usageStats, type ModelUsage, type PilotAnswer, type PilotStats, type RawUsage } from './pilot-stats';
import type { PassKind } from './requests';

export interface PilotData {
  group: string;
  haikuRun: RunRow;
  sonnetRun: RunRow;
  stats: PilotStats;
  usage: { haiku: ModelUsage; sonnet: ModelUsage };
}

async function answersOf(db: Db, runId: string): Promise<PilotAnswer[]> {
  return selectAllKeyset<PilotAnswer & { id: number } & Record<string, unknown>>(
    db, 'bt_stance_answers', 'id, video_id, question_id, valid, stance, confidence, quote_verified, error', 'id',
    (q) => q.eq('run_id', runId).eq('pass', 'pilot'),
  );
}

async function usageOf(db: Db, run: RunRow, questions: number): Promise<ModelUsage> {
  const raws: RawUsage[] = (await fetchRawSummaries(db, run.id)).map((r) => {
    const p = parseCustomId(r.custom_id, run.id);
    return { key: p.key, attempt: p.attempt, resultType: r.result_type, stopReason: r.stop_reason, usage: r.usage };
  });
  return usageStats(run.model, raws, questions);
}

/** Latest pilot group whose haiku and sonnet runs are both completed (or the named group). */
export async function loadPilot(db: Db, group?: string): Promise<PilotData | null> {
  const runs = (await fetchStanceRuns(db)).filter((r) => r.params?.mode === 'pilot' && r.status === 'completed');
  const groups = new Map<string, RunRow[]>();
  for (const r of runs) (groups.get(r.params.group) ?? groups.set(r.params.group, []).get(r.params.group)!).push(r);
  const candidates = [...groups.entries()].filter(([g, rs]) => (!group || g === group) && rs.some((r) => r.model === MODELS.haiku) && rs.some((r) => r.model === MODELS.sonnet));
  if (candidates.length === 0) return null;
  const [g, rs] = candidates[candidates.length - 1];
  const haikuRun = rs.find((r) => r.model === MODELS.haiku)!;
  const sonnetRun = rs.find((r) => r.model === MODELS.sonnet)!;
  const [ha, sa] = await Promise.all([answersOf(db, haikuRun.id), answersOf(db, sonnetRun.id)]);
  const stats = pilotStats(ha, sa);
  const q = Math.max(1, stats.questions);
  const [hu, su] = await Promise.all([usageOf(db, haikuRun, q), usageOf(db, sonnetRun, q)]);
  return { group: g, haikuRun, sonnetRun, stats, usage: { haiku: hu, sonnet: su } };
}

/**
 * Output-token assumption: pilot actuals (per video, all attempts, thinking included) replace
 * the defaults. Thinking allowance and visible tokens per question are taken from
 * usage.output_tokens_details when reported; otherwise the default allowance is kept and the
 * source line says so. Opus has no pilot, so it keeps its own default allowance.
 */
export function assumptionFrom(pilot: PilotData | null, _kind: PassKind): OutputAssumption {
  void _kind;
  if (!pilot) return DEFAULT_OUTPUT_ASSUMPTION;
  const h = pilot.usage.haiku.rates, s = pilot.usage.sonnet.rates;
  const d = DEFAULT_OUTPUT_ASSUMPTION;
  const measured = h.meanThinkingTokens !== null && s.meanThinkingTokens !== null;
  return {
    thinkingAllowance: {
      ...d.thinkingAllowance,
      ...(h.meanThinkingTokens !== null ? { haiku: Math.round(h.meanThinkingTokens) } : {}),
      ...(s.meanThinkingTokens !== null ? { sonnet: Math.round(s.meanThinkingTokens) } : {}),
    },
    visiblePerQuestion: {
      ...d.visiblePerQuestion,
      ...(h.meanVisiblePerQuestion !== null ? { pilot: Math.round(h.meanVisiblePerQuestion), first: Math.round(h.meanVisiblePerQuestion) } : {}),
      // flagged cells are claim-heavy: never below the default
      ...(s.meanVisiblePerQuestion !== null ? { recheck: Math.max(d.visiblePerQuestion.recheck, Math.round(s.meanVisiblePerQuestion)), arbiter: Math.max(d.visiblePerQuestion.arbiter, Math.round(s.meanVisiblePerQuestion)) } : {}),
    },
    perVideoOverride: { haiku: h.meanOutputTokens, sonnet: s.meanOutputTokens },
    source: `pilot actuals (${pilot.group}, per video, all attempts): mean output ${Math.round(h.meanOutputTokens)} (Haiku) / ${Math.round(s.meanOutputTokens)} (Sonnet) tokens incl. thinking; ` +
      (measured ? 'thinking measured from usage.output_tokens_details' : 'thinking not reported by usage, default allowance kept') + '; Opus uses its default allowance',
  };
}
