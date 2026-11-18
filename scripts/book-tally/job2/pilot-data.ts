/** Loads the latest completed pilot (both models) from the database. Read-only. */
import { MODELS } from '../lib/cost';
import { selectAll, type Db } from '../lib/supabase';
import { fetchStanceRuns, fetchUsages, type RunRow } from './db';
import { DEFAULT_OUTPUT_ASSUMPTION, type OutputAssumption } from './estimate';
import { pilotStats, usageStats, type ModelUsage, type PilotAnswer, type PilotStats } from './pilot-stats';
import type { PassKind } from './requests';

export interface PilotData {
  group: string;
  haikuRun: RunRow;
  sonnetRun: RunRow;
  stats: PilotStats;
  usage: { haiku: ModelUsage; sonnet: ModelUsage };
}

async function answersOf(db: Db, runId: string): Promise<PilotAnswer[]> {
  return selectAll<PilotAnswer & { id: number }>(db, 'bt_stance_answers', 'id, video_id, question_id, valid, stance, confidence, quote_verified, error', {
    orderBy: 'id', filter: (q) => q.eq('run_id', runId).eq('pass', 'pilot'),
  });
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
  const [ha, sa, hu, su] = await Promise.all([
    answersOf(db, haikuRun.id), answersOf(db, sonnetRun.id), fetchUsages(db, haikuRun.id), fetchUsages(db, sonnetRun.id),
  ]);
  const stats = pilotStats(ha, sa);
  const q = Math.max(1, stats.questions);
  return {
    group: g, haikuRun, sonnetRun, stats,
    usage: {
      haiku: usageStats(MODELS.haiku, hu.map((u) => u.usage ?? {}), q),
      sonnet: usageStats(MODELS.sonnet, su.map((u) => u.usage ?? {}), q),
    },
  };
}

/** Output-token assumption from pilot actuals when a pilot exists, else the documented default. */
export function assumptionFrom(pilot: PilotData | null, kind: PassKind): OutputAssumption {
  if (!pilot) return DEFAULT_OUTPUT_ASSUMPTION;
  const h = pilot.usage.haiku.rates, s = pilot.usage.sonnet.rates;
  return {
    perRequest: Math.round(kind === 'pilot' ? Math.max(h.meanOutputTokens, s.meanOutputTokens) : h.meanOutputTokens),
    perQuestion: Math.round(s.meanOutputPerQuestion),
    source: `pilot actuals (${pilot.group}): Haiku mean ${Math.round(h.meanOutputTokens)} output tokens per request, Sonnet ${Math.round(s.meanOutputPerQuestion)} per answer (Opus assumed equal to Sonnet)`,
  };
}
