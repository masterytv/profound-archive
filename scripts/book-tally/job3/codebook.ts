/**
 * Job 3: codebook coding. Loads the approved codebook (codebook/codebook-v1.json), checks its shape,
 * and renders the prompt and schema sent with every request. Pure apart from reading the files.
 *
 * Every video gets ONE request. It lists the facts (f0..f6) and every codebook item, and the model
 * answers each one: addressed or not, then yes/no/mixed (a "yn" item) or 1-3 listed answers (an
 * "mc" item), always with a verbatim quote. See codebook/codebook-v1.md.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { computePromptHash, loadPrompt, promptRow, renderPrompt, PROMPTS_DIR, type PromptFile } from '../lib/prompts';
import type { JsonSchema } from '../job1/schema';

export const CODEBOOK_DIR = path.join(__dirname, '..', 'codebook');
export const CODEBOOK_VERSION = 'codebook-v1';
export const PROMPT_NAME = 'codebook-v1';
/** The answer code every multiple-choice item accepts in addition to its own list. */
export const OTHER = 'other';

export type ItemType = 'yn' | 'mc';

export interface Choice { code: string; label: string }

export interface Subgroup {
  /** A fact key, e.g. "f0" or "f2". */
  fact: string;
  /** For a multiple-choice fact (f0): the choice that defines the subgroup. */
  choice?: string;
}

export interface CodeItem {
  /** "q38", "q2a", "f0", ... */
  key: string;
  type: ItemType;
  /** What the model is asked. */
  ask: string;
  yes_means?: string | null;
  no_means?: string | null;
  mixed_means?: string | null;
  choices?: Choice[];
  /** Questions only. */
  question_id?: number;
  question?: string;
  part?: string | null;
  subgroup?: Subgroup;
  first_run_addressed?: number;
}

export interface Codebook {
  version: string;
  approved: string;
  max_choices: number;
  counts_as_answer: string;
  facts: CodeItem[];
  items: CodeItem[];
  /** Merged question keys, e.g. { q24: "q22" }. */
  merged: Record<string, string>;
}

const KEY_RE = /^(q[0-9]{1,3}[a-z]?|f[0-9])$/;
const CODE_RE = /^[a-z0-9_]{1,40}$/;

/** Throws a clear error for any shape problem, so a broken codebook can never be sent. */
export function checkCodebook(cb: Codebook): Codebook {
  const problems: string[] = [];
  if (cb.version !== CODEBOOK_VERSION) problems.push(`version is ${cb.version}, expected ${CODEBOOK_VERSION}`);
  if (!(cb.max_choices >= 1 && cb.max_choices <= 5)) problems.push('max_choices must be 1..5');
  const keys = new Set<string>();
  const all = [...(cb.facts ?? []), ...(cb.items ?? [])];
  for (const it of all) {
    const at = `item ${it.key}`;
    if (!KEY_RE.test(it.key ?? '')) problems.push(`${at}: bad key`);
    if (keys.has(it.key)) problems.push(`${at}: duplicate key`);
    keys.add(it.key);
    if (it.type !== 'yn' && it.type !== 'mc') problems.push(`${at}: type must be yn or mc`);
    if (!it.ask?.trim()) problems.push(`${at}: empty ask`);
    if (it.type === 'yn' && !it.yes_means?.trim()) problems.push(`${at}: yn item without yes_means`);
    if (it.type === 'mc') {
      const codes = new Set<string>();
      if (!it.choices?.length) problems.push(`${at}: mc item without choices`);
      for (const c of it.choices ?? []) {
        if (!CODE_RE.test(c.code)) problems.push(`${at}: bad choice code ${c.code}`);
        if (c.code === OTHER) problems.push(`${at}: "${OTHER}" is implicit and must not be listed`);
        if (codes.has(c.code)) problems.push(`${at}: duplicate choice ${c.code}`);
        codes.add(c.code);
        if (!c.label?.trim()) problems.push(`${at}: empty label for ${c.code}`);
      }
    } else if (it.choices?.length) problems.push(`${at}: yn item with choices`);
    if (it.key.startsWith('q') && !Number.isInteger(it.question_id)) problems.push(`${at}: question item without question_id`);
    if (it.key.startsWith('f') && it.question_id !== undefined) problems.push(`${at}: fact with question_id`);
  }
  const facts = new Map((cb.facts ?? []).map((f) => [f.key, f]));
  for (const it of cb.items ?? []) {
    if (!it.subgroup) continue;
    const f = facts.get(it.subgroup.fact);
    if (!f) problems.push(`item ${it.key}: subgroup fact ${it.subgroup.fact} does not exist`);
    else if (f.type === 'mc' && !f.choices?.some((c) => c.code === it.subgroup!.choice)) problems.push(`item ${it.key}: subgroup choice ${it.subgroup.choice} is not a choice of ${f.key}`);
    else if (f.type === 'yn' && it.subgroup.choice !== undefined) problems.push(`item ${it.key}: a yes/no fact takes no subgroup choice`);
  }
  for (const [from, to] of Object.entries(cb.merged ?? {})) {
    if (keys.has(from)) problems.push(`merged ${from} is still coded`);
    if (!keys.has(to)) problems.push(`merged ${from} points at missing ${to}`);
  }
  if (problems.length) throw new Error(`codebook ${cb.version} is not valid:\n- ${problems.join('\n- ')}`);
  return cb;
}

export function loadCodebook(dir = CODEBOOK_DIR): Codebook {
  return checkCodebook(JSON.parse(readFileSync(path.join(dir, `${CODEBOOK_VERSION}.json`), 'utf8')) as Codebook);
}

/** Facts first (they set the scene), then the items in codebook order. */
export function allItems(cb: Codebook): CodeItem[] {
  return [...cb.facts, ...cb.items];
}

/** The wire form of one item in the prompt. Stable key order (JSON.stringify of a literal). */
export function renderItem(it: CodeItem): Record<string, unknown> {
  if (it.type === 'yn') {
    return {
      key: it.key, type: 'yes_no', ask: it.ask, yes_means: it.yes_means,
      ...(it.no_means ? { no_means: it.no_means } : {}),
      ...(it.mixed_means ? { mixed_means: it.mixed_means } : {}),
    };
  }
  const choices: Record<string, string> = {};
  for (const c of it.choices!) choices[c.code] = c.label;
  choices[OTHER] = 'Other (describe it in other_text)';
  return { key: it.key, type: 'multiple_choice', ask: it.ask, choices };
}

export function renderItemsJson(cb: Codebook): string {
  return allItems(cb).map((it) => JSON.stringify(renderItem(it))).join('\n');
}

export interface CodebookPrompt {
  codebook: Codebook;
  prompt: PromptFile;
  /** The full system prompt with the item list filled in. */
  system: string;
  schema: JsonSchema;
  /** sha256 over the template bytes, the rendered item list and the output schema. */
  promptHash: string;
  /** bt_prompts row (inserted the first time the prompt is used). */
  row: ReturnType<typeof promptRow>;
}

export function loadCodebookPrompt(promptsDir = PROMPTS_DIR, codebookDir = CODEBOOK_DIR): CodebookPrompt {
  const codebook = loadCodebook(codebookDir);
  const prompt = loadPrompt(PROMPT_NAME, promptsDir);
  const schema = JSON.parse(readFileSync(path.join(promptsDir, `${PROMPT_NAME}.schema.json`), 'utf8')) as JsonSchema;
  const items = allItems(codebook).map(renderItem);
  const system = renderPrompt(prompt.text, { ITEMS_JSON: renderItemsJson(codebook), MAX_CHOICES: String(codebook.max_choices) });
  const hashInput = { questionList: { max_choices: codebook.max_choices, items }, outputSchema: schema };
  return {
    codebook, prompt, system, schema,
    promptHash: computePromptHash({ templateBytes: prompt.bytes, ...hashInput }),
    row: promptRow(prompt, hashInput),
  };
}
