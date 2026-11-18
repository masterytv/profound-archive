/**
 * Merge conflicts: a connected component of persons joined by effective `merge` decisions
 * (auto or human, latest decision per candidate wins, 'revert' = undecided) that also
 * contains both keys of a candidate whose effective decision is `keep_separate`. Because
 * bt_person_canonical merges transitively, A~B and B~C would silently put A and C in one
 * person even if a human said A and C are different people. These must be resolved by a
 * human; export-review lists them as `merge_conflict` rows and job2's rollup refuses to
 * tally while any exist.
 */
import { selectAll, type Db } from '../lib/supabase';

export interface CandidateKeys { id: number; key_a: string; key_b: string }
export interface DecisionLite { id: number; candidate_id: number; decision: string; decided_by: string }

export interface MergeConflict {
  /** Smallest key of the component (the canonical key bt_person_canonical would use). */
  component: string;
  keys: string[];
  /** Candidates whose effective decision is merge and that connect the component. */
  mergeEdges: number[];
  /** keep_separate candidates whose two keys are in the same component. */
  conflicting: number[];
}

/** Effective decision per candidate: latest row by id, 'revert' means none. */
export function effectiveDecisions(decisions: DecisionLite[]): Map<number, DecisionLite> {
  const latest = new Map<number, DecisionLite>();
  for (const d of [...decisions].sort((a, b) => a.id - b.id)) latest.set(d.candidate_id, d);
  for (const [k, d] of latest) if (d.decision === 'revert') latest.delete(k);
  return latest;
}

export function computeMergeConflicts(cands: CandidateKeys[], decisions: DecisionLite[]): MergeConflict[] {
  const eff = effectiveDecisions(decisions);
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while ((parent.get(r) ?? r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  };
  const edges: CandidateKeys[] = [];
  const inGraph = new Set<string>();
  for (const c of cands) {
    if (eff.get(c.id)?.decision === 'merge') { union(c.key_a, c.key_b); edges.push(c); inGraph.add(c.key_a); inGraph.add(c.key_b); }
  }
  const byRoot = new Map<string, { keys: Set<string>; edges: number[]; conflicting: number[] }>();
  const slot = (root: string) => byRoot.get(root) ?? byRoot.set(root, { keys: new Set(), edges: [], conflicting: [] }).get(root)!;
  for (const c of edges) {
    const s = slot(find(c.key_a));
    s.keys.add(c.key_a);
    s.keys.add(c.key_b);
    s.edges.push(c.id);
  }
  for (const c of cands) {
    if (eff.get(c.id)?.decision !== 'keep_separate') continue;
    if (!inGraph.has(c.key_a) || !inGraph.has(c.key_b)) continue;
    if (find(c.key_a) === find(c.key_b)) slot(find(c.key_a)).conflicting.push(c.id);
  }
  const out: MergeConflict[] = [];
  for (const s of byRoot.values()) {
    if (s.conflicting.length === 0) continue;
    const keys = [...s.keys].sort();
    out.push({ component: keys[0], keys, mergeEdges: s.edges.sort((a, b) => a - b), conflicting: s.conflicting.sort((a, b) => a - b) });
  }
  return out.sort((a, b) => (a.component < b.component ? -1 : 1));
}

/** Reads bt_merge_candidates / bt_merge_decisions (read-only) and returns every merge conflict. job2's rollup calls this. */
export async function findMergeConflicts(db: Db): Promise<MergeConflict[]> {
  const cands = await selectAll<CandidateKeys>(db, 'bt_merge_candidates', 'id, key_a, key_b', { orderBy: 'id' });
  const decisions = await selectAll<DecisionLite>(db, 'bt_merge_decisions', 'id, candidate_id, decision, decided_by', { orderBy: 'id' });
  return computeMergeConflicts(cands, decisions);
}
