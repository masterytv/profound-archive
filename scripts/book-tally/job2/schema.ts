/**
 * Minimal JSON-schema validator for the subset the prompt schemas use:
 * type (string or array, incl. integer/null), enum, properties, required,
 * additionalProperties:false, items, minimum, maximum. Unknown keywords are ignored.
 * Returns human-readable error strings (empty array = valid); never throws.
 */
export type JsonSchema = Record<string, unknown>;

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v; // string | boolean | object | undefined
}

function typeMatches(want: string, v: unknown): boolean {
  const t = typeOf(v);
  if (want === 'number') return t === 'number' || t === 'integer';
  return want === t;
}

export function validateSchema(schema: JsonSchema, value: unknown, path = '$'): string[] {
  const errors: string[] = [];
  const type = schema.type;
  if (type !== undefined) {
    const wanted = Array.isArray(type) ? (type as string[]) : [type as string];
    if (!wanted.some((w) => typeMatches(w, value))) {
      errors.push(`${path}: expected ${wanted.join('|')}, got ${typeOf(value)}`);
      return errors;
    }
  }
  if (Array.isArray(schema.enum) && !(schema.enum as unknown[]).includes(value)) {
    errors.push(`${path}: not one of the allowed values`);
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${path}: below minimum`);
    if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${path}: above maximum`);
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const props = (schema.properties ?? {}) as Record<string, JsonSchema>;
    for (const req of (schema.required ?? []) as string[]) {
      if (!(req in obj)) errors.push(`${path}.${req}: required property missing`);
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k in props) errors.push(...validateSchema(props[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) errors.push(`${path}.${k}: unexpected property`);
    }
  }
  if (Array.isArray(value) && schema.items && typeof schema.items === 'object') {
    value.forEach((v, i) => errors.push(...validateSchema(schema.items as JsonSchema, v, `${path}[${i}]`)));
  }
  return errors;
}
