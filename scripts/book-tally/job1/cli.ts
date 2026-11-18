/**
 * Shared plumbing for the Job 1 scripts: argument parsing, dependency injection (so
 * tests can pass a mock Supabase / Anthropic client), run bookkeeping in bt_runs.
 *
 * Logs print ids, counts and token totals only: never transcript text or names.
 */
import { execFileSync } from 'child_process';
import { parseArgs } from 'util';
import type Anthropic from '@anthropic-ai/sdk';
import { createAnthropicClient } from '../lib/env';
import { btInsert, btUpdateRun, createServiceClient, type Db } from '../lib/supabase';

export class CliError extends Error {}

export interface Deps {
  db?: Db;
  /** Builds the Anthropic client. Only called when a request is actually about to be made. */
  makeClient?: () => Anthropic;
  log?: (line: string) => void;
  now?: () => Date;
  /** Output directory for review CSVs (default scripts/book-tally/out). */
  outDir?: string;
  sleep?: (ms: number) => Promise<void>;
}

export interface Ctx {
  db: Db;
  makeClient: () => Anthropic;
  log: (line: string) => void;
  now: () => Date;
  outDir: string;
  sleep?: (ms: number) => Promise<void>;
}

export function makeCtx(deps: Deps = {}): Ctx {
  let db: Db | undefined = deps.db;
  return {
    // Lazy: --help and argument errors must work without Supabase credentials.
    get db(): Db {
      return (db ??= createServiceClient());
    },
    makeClient: deps.makeClient ?? (() => createAnthropicClient().client),
    log: deps.log ?? ((l) => console.log(l)),
    now: deps.now ?? (() => new Date()),
    outDir: deps.outDir ?? `${__dirname}/../out`,
    sleep: deps.sleep,
  };
}

export type OptDef = { type: 'boolean' | 'string'; help: string };

export interface Parsed {
  help: boolean;
  values: Record<string, string | boolean | undefined>;
}

export function parseCli(argv: string[], options: Record<string, OptDef>): Parsed {
  const all: Record<string, OptDef> = { help: { type: 'boolean', help: 'show this help' }, ...options };
  let res;
  try {
    res = parseArgs({
      args: argv,
      options: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, { type: v.type }])),
      strict: true,
      allowPositionals: false,
    });
  } catch (e) {
    throw new CliError((e as Error).message);
  }
  return { help: res.values.help === true, values: res.values as Parsed['values'] };
}

export function helpText(script: string, summary: string, options: Record<string, OptDef>): string {
  const all: Record<string, OptDef> = { ...options, help: { type: 'boolean', help: 'show this help' } };
  const width = Math.max(...Object.entries(all).map(([k, v]) => k.length + (v.type === 'string' ? 8 : 0))) + 4;
  const lines = Object.entries(all).map(([k, v]) => {
    const flag = `--${k}${v.type === 'string' ? ' <value>' : ''}`;
    return `  ${flag.padEnd(width)}${v.help}`;
  });
  return [`${script}`, '', summary, '', 'Options:', ...lines, ''].join('\n');
}

export function str(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

export function intOpt(v: string | boolean | undefined, name: string): number | undefined {
  const s = str(v);
  if (s === undefined) return undefined;
  if (!/^\d+$/.test(s)) throw new CliError(`--${name} must be a non-negative integer`);
  return Number(s);
}

/** A positive USD amount (e.g. --budget-usd 12.50). */
export function usdOpt(v: string | boolean | undefined, name: string): number | undefined {
  const s = str(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  if (!/^\d+(\.\d+)?$/.test(s) || !(n > 0)) throw new CliError(`--${name} must be a positive number of USD`);
  return n;
}

/** True when the module is the process entry point (works under ts-node / tsx, false under vitest). */
export function isDirectRun(file: string): boolean {
  const argv1 = process.argv[1] ?? '';
  return /\.[cm]?[tj]s$/.test(argv1) && argv1.replace(/\.[cm]?[tj]s$/, '').endsWith(file);
}

export function runCli(main: (argv: string[]) => Promise<void>): void {
  main(process.argv.slice(2)).then(
    () => process.exit(0),
    (e: unknown) => {
      console.error(`error: ${(e as Error).message}`);
      process.exit(e instanceof CliError ? 2 : 1);
    },
  );
}

// ---- run bookkeeping -----------------------------------------------------------

export function newRunId(prefix: string, now: Date): string {
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const id = `${prefix}-${ts}`;
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(id)) throw new Error(`bad run id ${id}`);
  return id;
}

export function gitSha(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export interface RunRow {
  id: string;
  job: string;
  pass: string | null;
  model: string;
  effort: string | null;
  status: string;
  params: Record<string, unknown>;
  estimate: Record<string, unknown> | null;
  batch_ids: string[];
}

export interface StartRun {
  id: string;
  job: 'pair_judge' | 'name_extract' | 'other';
  pass?: 'haiku' | 'sonnet' | null;
  model?: string;
  effort?: string | null;
  params: Record<string, unknown>;
  script: string;
  status?: 'estimated' | 'collecting';
  estimate?: Record<string, unknown> | null;
}

/** Inserts the bt_runs row. Scripts that call no model use model "none" and status 'collecting' until finished. */
export async function startRun(db: Db, r: StartRun): Promise<string> {
  await btInsert(db, 'bt_runs', {
    id: r.id,
    job: r.job,
    pass: r.pass ?? null,
    model: r.model ?? 'none',
    effort: r.effort ?? null,
    status: r.status ?? 'collecting',
    params: r.params,
    estimate: r.estimate ?? null,
    script: r.script,
    git_sha: gitSha(),
  });
  return r.id;
}

export async function finishRun(db: Db, id: string, status: 'completed' | 'failed', usage?: Record<string, unknown>, now = new Date()): Promise<void> {
  await btUpdateRun(db, id, { status, finished_at: now.toISOString(), ...(usage ? { actual_usage: usage } : {}) });
}

export async function getRun(db: Db, id: string): Promise<RunRow | null> {
  const { data, error } = await db.from('bt_runs').select('*').eq('id', id);
  if (error) throw new Error(`read bt_runs failed: ${error.message}`);
  const row = (data as unknown as RunRow[] | null)?.[0];
  return row ?? null;
}

/** Tolerate a not-yet-migrated schema in read-only (dry-run) paths. */
export function isMissingTable(e: unknown): boolean {
  const m = (e as Error)?.message ?? '';
  return /Could not find the table|does not exist|PGRST205|42P01/.test(m);
}

/** Runs a read that may hit a missing bt_* table (dry-run before the migration is applied). */
export async function readOrEmpty<T>(fn: () => Promise<T[]>, onMissing: () => void): Promise<T[]> {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable(e)) {
      onMissing();
      return [];
    }
    throw e;
  }
}
