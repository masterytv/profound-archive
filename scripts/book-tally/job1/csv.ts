/** RFC 4180 CSV writer/reader (quotes, embedded commas/newlines/quotes, CRLF, BOM). */

const FORMULA_START = /^[=+@\t\r]|^-(?!\d)/;

export interface ToCsvOptions {
  /**
   * Prefix cells that a spreadsheet would evaluate as formulas (=, +, @, leading -) with a
   * single quote. Review sheets are opened in Excel/Sheets; transcript-derived text must
   * not execute. Default true. Import never reads those text columns.
   */
  neutralizeFormulas?: boolean;
}

function cell(v: unknown, neutralize: boolean): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'string' ? v : String(v);
  if (neutralize && typeof v === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>, opts: ToCsvOptions = {}): string {
  const neutralize = opts.neutralizeFormulas ?? true;
  const lines = [headers.map((h) => cell(h, false)).join(',')];
  for (const r of rows) lines.push(headers.map((h) => cell(r[h], neutralize)).join(','));
  return lines.join('\r\n') + '\r\n';
}

/** Parses CSV text into rows of strings. Throws on an unterminated quoted field. */
export function parseCsvRows(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let any = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') { inQuotes = true; any = true; }
    else if (c === ',') { row.push(field); field = ''; any = true; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      if (any || field !== '' || row.length) { row.push(field); rows.push(row); }
      row = []; field = ''; any = false;
    } else { field += c; any = true; }
  }
  if (inQuotes) throw new Error('CSV: unterminated quoted field');
  if (any || field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export function parseCsv(text: string): ParsedCsv {
  const raw = parseCsvRows(text);
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = raw[0].map((h) => h.trim());
  const dup = headers.find((h, i) => headers.indexOf(h) !== i);
  if (dup) throw new Error(`CSV: duplicate column "${dup}"`);
  const rows = raw.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
  return { headers, rows };
}
