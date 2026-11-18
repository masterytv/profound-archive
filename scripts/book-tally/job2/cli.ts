/**
 * Plumbing shared by the Job 2 scripts: argument parsing, dependency injection (tests pass
 * mock Supabase / Anthropic clients), run bookkeeping. Logs print ids, counts and token
 * totals only: never transcript text or quotes.
 */
import { execFileSync } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import type Anthropic from '@anthropic-ai/sdk';
import { createAnthropicClient } from '../lib/env';
import { createServiceClient, type Db } from '../lib/supabase';

export class CliError extends Error {}

export interface Deps {
  db?: Db;
  /** Builds the Anthropic client. Only called when a request is actually about to be made. */
  makeClient?: () => Anthropic;
  log?: (line: string) => void;
  now?: () => Date;
  outDir?: string;
  sleep?: (ms: number) => Promise<void>;
}

export interface Ctx {
  /** Lazily created so that argument errors / refusals never touch the database. */
  getDb: () => Db;
  makeClient: () => Anthropic;
  log: (line: string) => void;
  now: () => Date;
  outDir: string;
  sleep: (ms: number) => Promise<void>;
}

export function makeCtx(deps: Deps = {}): Ctx {
  let db = deps.db;
  return {
    getDb: () => (db ??= createServiceClient()),
    makeClient: deps.makeClient ?? (() => createAnthropicClient().client),
    log: deps.log ?? ((l) => console.log(l)),
    now: deps.now ?? (() => new Date()),
    outDir: deps.outDir ?? path.join(__dirname, '..', 'out'),
    sleep: deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
  };
}

export function ensureOutDir(ctx: Ctx): string {
  mkdirSync(ctx.outDir, { recursive: true });
  return ctx.outDir;
}

export type OptDef = { type: 'boolean' | 'string'; help: string };
export type OptValues = Record<string, string | boolean | undefined>;

export function parseCli(argv: string[], options: Record<string, OptDef>): { help: boolean; values: OptValues } {
  const all: Record<string, OptDef> = { help: { type: 'boolean', help: 'show this help' }, ...options };
  try {
    const res = parseArgs({
      args: argv,
      options: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, { type: v.type }])),
      strict: true,
      allowPositionals: false,
    });
    const values = res.values as OptValues;
    return { help: values.help === true, values };
  } catch (e) {
    throw new CliError((e as Error).message);
  }
}

export function helpText(script: string, summary: string, options: Record<string, OptDef>): string {
  const lines = [`${script}: ${summary}`, '', 'Options:'];
  for (const [k, v] of Object.entries(options)) lines.push(`  --${k}${v.type === 'string' ? ' <value>' : ''}  ${v.help}`);
  return lines.join('\n');
}

export const str = (v: string | boolean | undefined): string | undefined => (typeof v === 'string' ? v : undefined);

export function intOpt(v: string | boolean | undefined, name: string): number | undefined {
  if (v === undefined || v === false) return undefined;
  const n = typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isInteger(n)) throw new CliError(`--${name} must be an integer`);
  return n;
}

export function numOpt(v: string | boolean | undefined, name: string): number | undefined {
  if (v === undefined || v === false) return undefined;
  const n = typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) throw new CliError(`--${name} must be a non-negative number`);
  return n;
}

/** True when the module is the process entry point (false under vitest). */
export function isDirectRun(file: string): boolean {
  const argv1 = process.argv[1] ?? '';
  return /\.[cm]?[tj]s$/.test(argv1) && argv1.replace(/\.[cm]?[tj]s$/, '').endsWith(file);
}

/** Loads .env.local / .env from the repo root (values stay in process.env; never printed). */
function loadDotenv(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { config } = require('dotenv') as typeof import('dotenv');
    const root = path.join(__dirname, '..', '..', '..');
    for (const f of ['.env.local', '.env']) config({ path: path.join(root, f), quiet: true });
  } catch {
    /* dotenv optional */
  }
}

export function runCli(main: (argv: string[]) => Promise<void>): void {
  loadDotenv();
  main(process.argv.slice(2)).then(
    () => process.exit(0),
    (e: unknown) => {
      console.error(`error: ${(e as Error).message}`);
      process.exit(e instanceof CliError ? 2 : 1);
    },
  );
}

export function gitSha(): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}
