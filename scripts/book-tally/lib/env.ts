/**
 * Environment access for the book-tally pipeline.
 *
 * Secrets are read by NAME and never logged. Helpers that must report where a
 * credential came from return the variable NAME only, never the value.
 * An API client is only built (and the key only required) when asked for.
 */
import Anthropic from '@anthropic-ai/sdk';

/** Explicit base URL: never inherit ANTHROPIC_BASE_URL from the environment. */
export const ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

/** Key variable names, in priority order. CLAUDE_API is this environment's alias. */
export const ANTHROPIC_KEY_ENV_NAMES = ['ANTHROPIC_API_KEY', 'CLAUDE_API'] as const;

export type Env = Record<string, string | undefined>;

/** Treats unset and empty/whitespace-only as missing. */
export function readEnv(name: string, env: Env = process.env): string | undefined {
  const v = env[name];
  return v !== undefined && v.trim() !== '' ? v : undefined;
}

export function requireEnv(name: string, env: Env = process.env): string {
  const v = readEnv(name, env);
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export interface NamedSecret {
  value: string;
  /** The variable NAME the value was read from (safe to log). */
  envName: string;
}

/** First of `names` that is set. Throws a clear error naming all candidates if none is. */
export function readFirstEnv(names: readonly string[], what: string, env: Env = process.env): NamedSecret {
  for (const name of names) {
    const value = readEnv(name, env);
    if (value) return { value, envName: name };
  }
  throw new Error(`Missing ${what}: set one of ${names.join(' or ')} in the environment`);
}

export function getAnthropicKey(env: Env = process.env): NamedSecret {
  return readFirstEnv(ANTHROPIC_KEY_ENV_NAMES, 'Anthropic API key', env);
}

export interface AnthropicHandle {
  client: Anthropic;
  /** Which env variable NAME supplied the key (never the value). */
  keyEnvName: string;
}

/** Builds the SDK client. Only call this when an API request is actually about to be made. */
export function createAnthropicClient(env: Env = process.env): AnthropicHandle {
  const { value, envName } = getAnthropicKey(env);
  return {
    client: new Anthropic({ apiKey: value, baseURL: ANTHROPIC_BASE_URL }),
    keyEnvName: envName,
  };
}

export interface SupabaseConfig {
  url: string;
  serviceKey: string;
  /** Variable NAME that supplied the service key. */
  keyEnvName: string;
}

export function getSupabaseConfig(env: Env = process.env): SupabaseConfig {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL', env);
  const key = readFirstEnv(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'], 'Supabase service key', env);
  return { url, serviceKey: key.value, keyEnvName: key.envName };
}
