/**
 * Prompt rendering and request construction for the stance passes. Pure: no DB, no API.
 *
 *  - system prompt = rendered template (questions inlined); the user message is the transcript.
 *  - prompt_hash covers template bytes + the rendered QUESTION list (id, category, question)
 *    + output schema. For the arbiter the readers' answers are request DATA (they contain
 *    transcript quotes) and are deliberately not part of the hashed/stored prompt.
 *  - cache_control is set only where the system prompt is shared across requests (first and
 *    pilot passes). Recheck/arbiter system prompts are unique per video, so caching them
 *    could only add the 25% write surcharge.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { MODELS, type ModelFamily } from '../lib/cost';
import { buildParams, type Effort, type RequestParams } from '../lib/batch';
import { loadPrompt, promptRow, renderPrompt, type PromptFile } from '../lib/prompts';
import { PROMPTS_DIR } from '../lib/prompts';
import type { QuestionRow } from '../lib/supabase';
import type { DisputeEntry } from './flags';
import type { JsonSchema } from './schema';

export type PassKind = 'pilot' | 'first' | 'recheck' | 'arbiter';

export interface PromptQuestion { question_id: number; category: string | null; question: string }

export function toPromptQuestions(rows: readonly QuestionRow[]): PromptQuestion[] {
  return [...rows]
    .sort((a, b) => a.id - b.id)
    .map((r) => ({
      question_id: r.id,
      category: r.category,
      question: wordingOf(r),
    }));
}

/** The prompt wording of a question: its consumer_question. A blank one is an error, never silently replaced. */
export function wordingOf(r: Pick<QuestionRow, 'id' | 'consumer_question'>): string {
  const w = (r.consumer_question ?? '').trim();
  if (w === '') throw new Error(`nde_questions id ${r.id} is active but has a blank consumer_question; fix the question bank before building prompts`);
  return w;
}

/** One JSON object per line inside a JSON array: stable and readable. */
export function renderQuestionsJson(qs: readonly PromptQuestion[]): string {
  return '[\n' + qs.map((q) => '  ' + JSON.stringify(q)).join(',\n') + '\n]';
}

export function renderDisputesJson(ds: readonly DisputeEntry[]): string {
  return '[\n' + ds.map((d) => '  ' + JSON.stringify(d)).join(',\n') + '\n]';
}

export interface StancePrompts {
  first: { file: PromptFile; schema: JsonSchema };
  arbiter: { file: PromptFile; schema: JsonSchema };
}

export function loadStancePrompts(dir = PROMPTS_DIR): StancePrompts {
  const schemaOf = (name: string) => JSON.parse(readFileSync(path.join(dir, `${name}.schema.json`), 'utf8')) as JsonSchema;
  return {
    first: { file: loadPrompt('stance-v1', dir), schema: schemaOf('stance-v1') },
    arbiter: { file: loadPrompt('stance-arbiter-v1', dir), schema: schemaOf('stance-arbiter-v1') },
  };
}

export interface Rendered {
  system: string;
  schema: JsonSchema;
  /** Row for bt_prompts (carries prompt_hash). */
  row: ReturnType<typeof promptRow>;
  promptHash: string;
}

/** first / pilot / recheck: same template, different question list. */
export function renderStancePrompt(p: StancePrompts, questions: readonly PromptQuestion[]): Rendered {
  const system = renderPrompt(p.first.file.text, { QUESTIONS_JSON: renderQuestionsJson(questions) });
  const row = promptRow(p.first.file, { questionList: questions, outputSchema: p.first.schema });
  return { system, schema: p.first.schema, row, promptHash: row.prompt_hash };
}

export function renderArbiterPrompt(
  p: StancePrompts,
  questions: readonly PromptQuestion[],
  disputes: readonly DisputeEntry[],
): Rendered {
  const system = renderPrompt(p.arbiter.file.text, { DISPUTES_JSON: renderDisputesJson(disputes) });
  const row = promptRow(p.arbiter.file, { questionList: questions, outputSchema: p.arbiter.schema });
  return { system, schema: p.arbiter.schema, row, promptHash: row.prompt_hash };
}

export const DEFAULT_EFFORT: Record<ModelFamily, Effort> = { haiku: 'medium', sonnet: 'medium', opus: 'high' };
export const DEFAULT_MAX_TOKENS = 16_000;

export function userMessage(transcriptText: string): string {
  return `Transcript:\n\n${transcriptText}`;
}

export interface StanceParamsInput {
  family: ModelFamily;
  effort: Effort;
  maxTokens: number;
  rendered: Rendered;
  transcriptText: string;
  /** true only when the system prompt is shared by many requests. */
  cacheSystem: boolean;
}

export function buildStanceParams(i: StanceParamsInput): RequestParams {
  return buildParams({
    model: MODELS[i.family],
    system: i.rendered.system,
    user: userMessage(i.transcriptText),
    maxTokens: i.maxTokens,
    effort: i.effort,
    schema: i.rendered.schema,
    cacheSystem: i.cacheSystem,
  });
}

/** Which model family and cache policy each pass uses. */
export const PASS_ROLE: Record<PassKind, { families: ModelFamily[]; cacheSystem: boolean }> = {
  pilot: { families: ['haiku', 'sonnet'], cacheSystem: true },
  first: { families: ['haiku'], cacheSystem: true },
  recheck: { families: ['sonnet'], cacheSystem: false },
  arbiter: { families: ['opus'], cacheSystem: false },
};
