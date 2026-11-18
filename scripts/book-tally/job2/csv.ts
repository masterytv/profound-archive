/** Small RFC 4180 CSV writer/reader (quoted fields, embedded newlines, BOM, CRLF). */

/**
 * Cells starting with = + - @ (or tab/CR) would be evaluated as formulas by spreadsheet
 * apps; prefix them with an apostrophe. Applied only to free-text columns.
 */
export function neutralizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' && !Number.isFinite(v) ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<Record<string, unknown>>): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(','));
  return lines.join('\n') + '\n';
}

/** Returns rows as arrays of strings. */
export function parseCsvRows(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  let sawAny = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
      continue;
    }
    if (c === '"') { inQ = true; sawAny = true; }
    else if (c === ',') { row.push(cur); cur = ''; sawAny = true; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      if (sawAny || cur !== '') { row.push(cur); rows.push(row); }
      row = []; cur = ''; sawAny = false;
    } else { cur += c; sawAny = true; }
  }
  if (inQ) throw new Error('csv: unterminated quoted field');
  if (sawAny || cur !== '') { row.push(cur); rows.push(row); }
  return rows;
}

/** Parses with a header row into records keyed by header name. */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
