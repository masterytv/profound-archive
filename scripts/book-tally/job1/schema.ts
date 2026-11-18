/**
 * Minimal JSON-schema validator for the model-output schemas in prompts/*.schema.json.
 * Supported keywords: type (string or list), enum, properties, required,
 * additionalProperties (boolean), items, minLength, maxLength. Anything else in a
 * schema is rejected loudly so that a schema cannot silently go unchecked.
 */
export type JsonSchema = Record<string, unknown>;

const SUPPORTED = new Set([
  'type', 'enum', 'properties', 'required', 'additionalProperties', 'items', 'minLength', 'maxLength',
  '$schema', 'title', 'description',
]);

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function typeMatches(v: unknown, t: string): boolean {
  const actual = typeOf(v);
  return actual === t || (t === 'number' && actual === 'integer');
}

export function validateAgainstSchema(value: unknown, schema: JsonSchema, path = '$'): string[] {
  const errors: string[] = [];
  for (const k of Object.keys(schema)) {
    if (!SUPPORTED.has(k)) throw new Error(`schema keyword not supported by validator: ${k}`);
  }
  const types = schema.type === undefined ? null : Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
  if (types && !types.some((t) => typeMatches(value, t))) {
    errors.push(`${path}: expected ${types.join('|')}, got ${typeOf(value)}`);
    return errors;
  }
  if (schema.enum && !(schema.enum as unknown[]).includes(value)) errors.push(`${path}: not one of the allowed values`);
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`);
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) errors.push(`${path}: longer than ${schema.maxLength}`);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, JsonSchema>;
    for (const r of (schema.required ?? []) as string[]) if (!(r in obj)) errors.push(`${path}: missing required "${r}"`);
    for (const [k, v] of Object.entries(obj)) {
      if (k in props) errors.push(...validateAgainstSchema(v, props[k], `${path}.${k}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property "${k}"`);
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) => errors.push(...validateAgainstSchema(v, schema.items as JsonSchema, `${path}[${i}]`)));
  }
  return errors;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Strict: the text must be exactly one JSON document that satisfies the schema. */
export function parseModelJson<T>(text: string, schema: JsonSchema): Parsed<T> {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not valid JSON' };
  }
  const errs = validateAgainstSchema(v, schema);
  return errs.length ? { ok: false, error: errs.slice(0, 5).join('; ') } : { ok: true, value: v as T };
}
