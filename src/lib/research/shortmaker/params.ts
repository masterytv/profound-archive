/**
 * Query-string parsing for the Short Maker research API. Everything arrives as strings;
 * these schemas turn them into typed, bounded values and reject anything unexpected.
 */
import { z } from 'zod';
import { CORE_ELEMENT_KEYS, ENTITY_TYPES, SAFETY_FLAGS } from './types';

const csv = z
    .string()
    .optional()
    .transform((v) =>
        v
            ? v
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : [],
    );

const bool = (fallback: boolean) =>
    z
        .enum(['true', 'false', '1', '0'])
        .optional()
        .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const num = (min: number, max: number) =>
    z
        .string()
        .optional()
        .transform((v, ctx) => {
            if (v === undefined || v === '') return null;
            const n = Number(v);
            if (!Number.isFinite(n) || n < min || n > max) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `must be a number from ${min} to ${max}` });
                return z.NEVER;
            }
            return n;
        });

const knownList = (allowed: readonly string[], name: string) =>
    csv.superRefine((list, ctx) => {
        const bad = list.filter((x) => !allowed.includes(x));
        if (bad.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `unknown ${name}: ${bad.join(', ')}` });
    });

/** Filters shared by search and counts. */
const filterFields = {
    experience_type: csv,
    trigger: csv,
    tone: csv,
    element: knownList(CORE_ELEMENT_KEYS, 'element'),
    min_veridical: num(0, 1000),
    min_intensity: num(1, 10),
    named_only: bool(true),
    exclude_flags: knownList(SAFETY_FLAGS, 'flag'),
    include_possible: bool(false),
};

export const SearchParamsSchema = z.object({
    q: z.string().trim().min(3, 'q must be at least 3 characters').max(300, 'q must be at most 300 characters'),
    mode: z.enum(['semantic', 'keyword', 'hybrid']).default('hybrid'),
    limit: num(1, 25).transform((n) => n ?? 10),
    min_similarity: num(0, 1).transform((n) => n ?? 0.45),
    sort: z.enum(['relevance', 'views']).default('relevance'),
    ...filterFields,
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export type CaseFilters = Pick<
    SearchParams,
    | 'experience_type'
    | 'trigger'
    | 'tone'
    | 'element'
    | 'min_veridical'
    | 'min_intensity'
    | 'named_only'
    | 'exclude_flags'
    | 'include_possible'
>;

export const CaseParamsSchema = z.object({
    include: csv.superRefine((list, ctx) => {
        const bad = list.filter((x) => !['journey', 'transcript', 'encounters'].includes(x));
        if (bad.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `unknown include: ${bad.join(', ')}` });
    }),
});

export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export const CountsParamsSchema = z
    .object({
        element: z.string().optional(),
        entity_type: z.string().optional(),
        phrase: z.string().trim().min(2).max(100).optional(),
        include_possible: bool(false),
    })
    .superRefine((p, ctx) => {
        const given = [p.element, p.entity_type, p.phrase].filter((x) => x !== undefined);
        if (given.length !== 1) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'give exactly one of element, entity_type, phrase' });
        }
        if (p.element !== undefined && !CORE_ELEMENT_KEYS.includes(p.element)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `unknown element: ${p.element}` });
        }
        if (p.entity_type !== undefined && !(ENTITY_TYPES as readonly string[]).includes(p.entity_type)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `unknown entity_type: ${p.entity_type}` });
        }
    });

export type CountsParams = z.infer<typeof CountsParamsSchema>;

/** URLSearchParams → plain object of first values, for zod. */
export function paramsObject(searchParams: URLSearchParams): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of searchParams) if (!(k in out)) out[k] = v;
    return out;
}

export function formatIssues(error: z.ZodError): string {
    return error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)).join('; ');
}
