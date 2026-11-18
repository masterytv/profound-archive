/**
 * Job 1, step 3: candidate duplicate pairs among profiles and named:* persons. No API calls.
 *
 * Rules (lib/names.candidatePairRule, SPEC step 3): same last name AND (first names
 * nickname-equivalent OR Jaro-Winkler(first) >= 0.85 OR one is an initial of the other);
 * OR same canonical first name AND JW(last) >= 0.90; OR first/last swapped.
 * Persons are experiencer_profiles plus `named:` persons built from unlinked NDE videos
 * (a named person whose name equals a profile's exact name is excluded: link matching
 * handles it). Writes bt_merge_candidates (rule + features, incl. the exact judge input).
 * --dry-run is read-only and prints counts only.
 */
import { btInsert, selectAll } from '../lib/supabase';
import { finishRun, helpText, isDirectRun, makeCtx, newRunId, parseCli, readOrEmpty, runCli, startRun, type Deps, type OptDef } from './cli';
import { loadWorld } from './data';
import { buildPersons, countByRule, findCandidatePairs, type PairCandidate } from './logic';

const SCRIPT = 'job1/find-pairs.ts';
const OPTIONS: Record<string, OptDef> = {
  'dry-run': { type: 'boolean', help: 'read-only: print counts per rule, write nothing' },
};

const pairId = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

export async function main(argv: string[], deps: Deps = {}): Promise<void> {
  const parsed = parseCli(argv, OPTIONS);
  const ctx = makeCtx(deps);
  if (parsed.help) return ctx.log(helpText(SCRIPT, 'Finds candidate duplicate pairs (no API calls).', OPTIONS));
  const dry = parsed.values['dry-run'] === true;
  const { db, log } = ctx;

  const world = await loadWorld(db);
  const { persons, skippedNoFirstLast } = buildPersons(world);
  const pairs = findCandidatePairs(persons);
  const rules = countByRule(pairs);
  const kinds: Record<string, number> = {};
  for (const p of pairs) {
    const k = `${p.key_a.split(':')[0]}-${p.key_b.split(':')[0]}`;
    kinds[k] = (kinds[k] ?? 0) + 1;
  }

  const existing = await readOrEmpty(
    () => selectAll<{ id: number; key_a: string; key_b: string }>(db, 'bt_merge_candidates', 'id, key_a, key_b', { orderBy: 'id' }),
    () => log('note: bt_merge_candidates not found (migration not applied); treating as empty'),
  );
  const have = new Set(existing.map((c) => pairId(c.key_a, c.key_b)));
  const fresh = pairs.filter((p) => !have.has(pairId(p.key_a, p.key_b)));

  log(`persons: ${persons.filter((p) => p.kind === 'profile').length} profiles + ${persons.filter((p) => p.kind === 'named').length} named; skipped (name lacks first+last token): ${skippedNoFirstLast}`);
  log(`candidate pairs: ${pairs.length}`);
  for (const [r, n] of Object.entries(rules)) log(`  rule ${r}: ${n}`);
  log(`  by person kind: ${JSON.stringify(kinds)}`);
  log(`already in bt_merge_candidates: ${pairs.length - fresh.length}; to insert: ${fresh.length}`);
  if (dry) return log('dry-run: nothing written');

  const runId = newRunId('j1p', ctx.now());
  await startRun(db, { id: runId, job: 'other', params: { script: 'find-pairs', rules, kinds, candidates: pairs.length }, script: SCRIPT });
  try {
    const n = await insertCandidates(db, fresh, runId);
    log(`inserted ${n} candidates`);
    await finishRun(db, runId, 'completed', undefined, ctx.now());
    log(`run ${runId} completed`);
  } catch (e) {
    await finishRun(db, runId, 'failed', undefined, ctx.now()).catch(() => undefined);
    throw e;
  }
}

/**
 * Inserts in chunks. The table's CHECK (key_a < key_b) uses the database collation, which can
 * order keys with spaces differently from JS; if a chunk is rejected for that reason only,
 * its rows are inserted one by one, swapping the pair when needed. Pairs are unordered
 * everywhere downstream, so the swap loses nothing.
 */
export async function insertCandidates(db: Parameters<typeof btInsert>[0], fresh: PairCandidate[], runId: string, chunk = 200): Promise<number> {
  let n = 0;
  for (let i = 0; i < fresh.length; i += chunk) {
    const part = fresh.slice(i, i + chunk).map((p) => ({ key_a: p.key_a, key_b: p.key_b, rule: p.rule, features: p.features, run_id: runId }));
    try {
      await btInsert(db, 'bt_merge_candidates', part, { chunkSize: chunk });
      n += part.length;
    } catch (e) {
      if (!/bt_merge_candidates_ordered/.test((e as Error).message)) throw e;
      for (const row of part) {
        try {
          await btInsert(db, 'bt_merge_candidates', row);
        } catch (e2) {
          if (!/bt_merge_candidates_ordered/.test((e2 as Error).message)) throw e2;
          await btInsert(db, 'bt_merge_candidates', { ...row, key_a: row.key_b, key_b: row.key_a });
        }
        n++;
      }
    }
  }
  return n;
}

if (isDirectRun('find-pairs')) runCli(main);
