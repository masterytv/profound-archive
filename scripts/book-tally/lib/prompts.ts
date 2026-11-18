/**
 * Prompt files, rendering and prompt_hash (SPEC "Ground rules").
 *
 * prompt_hash = sha256 over: template file BYTES, a NUL byte, the rendered question
 * list JSON, a NUL byte, the output schema JSON. JSON is serialized with sorted keys
 * so the hash does not depend on key order. A prompt without a question list or
 * schema hashes the JSON text "null" in that slot. Never edit a prompt file in
 * place; add a -v2 file.
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

export const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

export interface PromptFile {
  name: string;
  file: string;
  bytes: Buffer;
  text: string;
}

export function loadPrompt(name: string, dir = PROMPTS_DIR): PromptFile {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error(`invalid prompt name: ${name}`);
  const file = path.join(dir, name.endsWith('.md') ? name : `${name}.md`);
  const bytes = readFileSync(file);
  return { name: name.replace(/\.md$/, ''), file, bytes, text: bytes.toString('utf8') };
}

/** Replaces {{var}} placeholders; throws on a missing variable. Unlisted extras are ignored. */
export function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    if (!(key in vars)) throw new Error(`prompt variable not provided: ${key}`);
    return vars[key];
  });
}

/** JSON.stringify with object keys sorted recursively (arrays keep order). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([, val]) => val !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, val]) => [k, sortKeys(val)]),
    );
  }
  return v;
}

export interface PromptHashInput {
  templateBytes: Buffer | string;
  questionList?: unknown;
  outputSchema?: unknown;
}

export function computePromptHash(input: PromptHashInput): string {
  const h = createHash('sha256');
  h.update(typeof input.templateBytes === 'string' ? Buffer.from(input.templateBytes, 'utf8') : input.templateBytes);
  h.update('\0');
  h.update(stableStringify(input.questionList ?? null));
  h.update('\0');
  h.update(stableStringify(input.outputSchema ?? null));
  return h.digest('hex');
}

/** Row for bt_prompts (insert when first used). */
export function promptRow(p: PromptFile, input: Omit<PromptHashInput, 'templateBytes'>) {
  return {
    prompt_hash: computePromptHash({ templateBytes: p.bytes, ...input }),
    name: p.name,
    template: p.text,
    question_list: input.questionList ?? null,
    output_schema: input.outputSchema ?? null,
  };
}
