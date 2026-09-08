#!/usr/bin/env node
/**
 * corpus-atlas/merge-digests.mjs — LEVEL-1 MERGE: fold consecutive batch digests into "section digests".
 *
 * Reads research/corpus-atlas/digests/<domain>/batch-NNN.md (written by batch-digest.mjs, 40
 * videos each), groups them 20 at a time in batch-number order, and asks an OpenAI chat model
 * to consolidate each group into ONE markdown "section digest" with the same six sections
 * (Themes, Standout accounts, Quotes worth keeping, Tensions and contradictions, Rare or
 * unusual, Book-angle sparks). 348 batches become 18 sections (nde 8, uap 10) that the next
 * merge level can read in one pass.
 *
 * USAGE (Node 22 only reaches the internet with NODE_USE_ENV_PROXY=1 in this environment):
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain nde --dry-run
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain uap --limit 1
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/merge-digests.mjs --domain nde
 *
 * Flags:
 *   --domain nde|uap     required
 *   --in <dir>           digest root holding <domain>/batch-NNN.md (default research/corpus-atlas/digests)
 *   --out <dir>          output root (default research/corpus-atlas/merged)
 *   --group-size N       batch digests per section (default 20)
 *   --limit N            only the first N groups (group numbering is unaffected)
 *   --model <id>         primary model (default gpt-5.6-luna; falls back to gpt-4o-mini)
 *   --concurrency N      parallel requests (default 3)
 *   --force              regenerate sections whose output file already exists
 *   --dry-run            list groups, files, estimated input tokens (chars/4) and cost; write nothing
 *   --help
 *
 * Outputs:
 *   <out>/<domain>/section-NN.md   one section digest per group (skipped on rerun unless --force)
 *   <out>/usage.jsonl              one line per API call: tokens, model used, est. USD, seconds, group
 *
 * Needs OPENAI_API_KEY in the environment. No npm dependencies; no database access.
 * Never prints secret values.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const DEFAULTS = {
    in: path.join(ROOT, 'research/corpus-atlas/digests'),
    out: path.join(ROOT, 'research/corpus-atlas/merged'),
    groupSize: 20,
    model: 'gpt-5.6-luna',
    fallbackModel: 'gpt-4o-mini',
    concurrency: 3,
    timeoutMs: 300_000,      // a 30k-token prompt with a 3k-token answer takes 1-3 minutes on Luna
    maxAttempts: 5,          // per model, on 429/5xx/network/timeout
    maxOutputTokens: 8000,   // hard cap; target is 2,500-3,500 visible tokens plus reasoning tokens
    // Sent only to non-gpt-5 models: gpt-5.6-luna rejects any temperature other than the
    // default (HTTP 400). fixRejectedParam() still covers surprises.
    temperature: 0.4,
    estOutputTokensPerGroup: 3500, // dry-run assumption: 2,500-3,500 target plus reasoning tokens
};

// USD per 1M tokens. Mirrors src/lib/ai/pricing.ts (2026-09). Keep in sync by hand.
const MODEL_PRICES = {
    'gpt-5.6-luna': { inputPerM: 0.2, outputPerM: 1.2 },
    'gpt-5-6-luna': { inputPerM: 0.2, outputPerM: 1.2 },
    'gpt-5.6-terra': { inputPerM: 2, outputPerM: 12 },
    'gpt-5-6-terra': { inputPerM: 2, outputPerM: 12 },
    'gpt-5.6-sol': { inputPerM: 5, outputPerM: 30 },
    'gpt-5-6-sol': { inputPerM: 5, outputPerM: 30 },
    'gpt-5-mini': { inputPerM: 0.25, outputPerM: 2 },
    'gpt-5-nano': { inputPerM: 0.05, outputPerM: 0.4 },
    'gpt-4o': { inputPerM: 2.5, outputPerM: 10 },
    'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
};

const SECTION_HEADINGS = [
    '## Themes',
    '## Standout accounts',
    '## Quotes worth keeping',
    '## Tensions and contradictions',
    '## Rare or unusual',
    '## Book-angle sparks',
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const opts = {
        domain: null,
        in: DEFAULTS.in,
        out: DEFAULTS.out,
        groupSize: DEFAULTS.groupSize,
        limit: Infinity,
        model: DEFAULTS.model,
        concurrency: DEFAULTS.concurrency,
        force: false,
        dryRun: false,
        help: false,
    };
    const needVal = (i, name) => {
        const v = argv[i + 1];
        if (v === undefined || v.startsWith('--')) throw new Error(`${name} needs a value`);
        return v;
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        switch (a) {
            case '--domain': opts.domain = needVal(i, a); i++; break;
            case '--in': opts.in = path.resolve(needVal(i, a)); i++; break;
            case '--out': opts.out = path.resolve(needVal(i, a)); i++; break;
            case '--group-size': opts.groupSize = parseInt(needVal(i, a), 10); i++; break;
            case '--limit': opts.limit = parseInt(needVal(i, a), 10); i++; break;
            case '--model': opts.model = needVal(i, a); i++; break;
            case '--concurrency': opts.concurrency = parseInt(needVal(i, a), 10); i++; break;
            case '--force': opts.force = true; break;
            case '--dry-run': opts.dryRun = true; break;
            case '--help': case '-h': opts.help = true; break;
            default: throw new Error(`unknown flag: ${a}`);
        }
    }
    if (opts.help) return opts;
    if (opts.domain !== 'nde' && opts.domain !== 'uap') throw new Error('--domain must be nde or uap');
    for (const k of ['groupSize', 'concurrency']) {
        if (!Number.isInteger(opts[k]) || opts[k] < 1) throw new Error(`--${k} must be a positive integer`);
    }
    if (!(opts.limit > 0)) throw new Error('--limit must be a positive integer');
    return opts;
}

function usageText() {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const m = src.match(/\/\*\*([\s\S]*?)\*\//);
    return m ? m[1].replace(/^ \* ?/gm, '') : 'see file header';
}

// ---------------------------------------------------------------------------
// Input: batch digests -> groups
// ---------------------------------------------------------------------------

const ID_RE = /[A-Za-z0-9_-]{11}/g;

/** Read every <in>/<domain>/batch-NNN.md, sorted by batch number. */
function loadBatches(domain, inDir) {
    const dir = path.join(inDir, domain);
    if (!fs.existsSync(dir)) throw new Error(`digest dir not found: ${dir}`);
    const files = fs.readdirSync(dir)
        .map((f) => ({ f, m: f.match(/^batch-(\d+)\.md$/) }))
        .filter((x) => x.m)
        .map((x) => ({ file: path.join(dir, x.f), n: parseInt(x.m[1], 10), label: x.m[1] }))
        .sort((a, b) => a.n - b.n);
    const batches = [];
    for (const b of files) {
        const text = fs.readFileSync(b.file, 'utf8');
        if (!text.trim()) { console.error(`warning: empty digest skipped: ${path.relative(ROOT, b.file)}`); continue; }
        const firstLine = text.split('\n').find((l) => l.trim().length > 0) || '';
        // "Batch nde-001 | videos: id1, id2, ..." -> every comma-separated token after "videos:"
        const m = firstLine.match(/\|\s*videos:\s*(.*)$/);
        const ids = m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
        if (!ids.length) console.error(`warning: no video IDs found in header of ${path.relative(ROOT, b.file)}`);
        batches.push({ ...b, text, ids });
    }
    return batches;
}

function makeGroups(domain, batches, size) {
    const groups = [];
    for (let i = 0; i < batches.length; i += size) {
        const members = batches.slice(i, i + size);
        const n = groups.length + 1;
        const label = String(n).padStart(2, '0');
        const first = members[0].label, last = members[members.length - 1].label;
        const ids = members.flatMap((b) => b.ids);
        groups.push({
            n, label, domain, members, first, last, ids,
            idSet: new Set(ids),
            videos: ids.length,
            chars: members.reduce((s, b) => s + b.text.length, 0),
            header: `Section ${domain}-${label} | batches: ${first}-${last} | videos: ~${ids.length}`,
        });
    }
    return groups;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const DOMAIN_NOTES = {
    nde: 'Domain: near-death experiences (NDEs) and related experiences (out-of-body, spiritually transformative, after-death communication) told first-person on YouTube. The batch digests mention pipeline scores: Greyson (0 to 32, 7 or more is the conventional NDE threshold), Intensity (1 to 10), Transformation (summed after-effects across ten life domains), Veridical (evidential strength of verifiable perceptions), and the 15 standard NDE elements.',
    uap: 'Domain: UAP/UFO encounters, contact experiences, and disclosure testimony on YouTube (tier 1 and 2 videos). The batch digests mention Hynek types (NL nocturnal light, DD daylight disc, RV radar-visual, CE1 close range, CE2 physical effects, CE3 occupants seen, CE4 abduction or onboard contact, CE5 human-initiated contact), Vallee codes, and pipeline ratings for evidence, contact depth and transformation.',
};

function systemPrompt(group) {
    const { domain, members, videos } = group;
    return [
        `You are a research analyst for Project Profound, a public archive of first-person accounts of near-death experiences and UAP encounters told on YouTube. An AI pipeline has already read the ${domain.toUpperCase()} archive 40 videos at a time and written one "batch digest" per batch. You are now consolidating one group of ${members.length} consecutive batch digests (about ${videos} videos) into ONE "section digest". Section digests are later merged into a corpus atlas that an author uses to find chapters, framings and open questions for a book, so precision, coverage and traceability (video IDs) matter more than polish.`,
        '',
        'Rules:',
        '1. Work only from the batch digests below. Never invent facts, names, numbers, dates, titles or quotes. Do not add anything that is not present in the inputs; if the inputs are ambiguous, say so rather than guessing.',
        '2. Cite video IDs everywhere: every theme, standout, quote, tension, rarity and spark carries one or more video IDs (the 11-character YouTube codes), copied character for character. They are case sensitive and may start with "-" or "_".',
        '3. Quotes: copy VERBATIM from the "Quotes worth keeping" sections of the batch digests, each in double quotation marks followed by its video ID in parentheses. Never paraphrase, never merge two quotes, never invent a quote. If you shorten a quote, cut only at one end and mark the cut with an ellipsis (...).',
        '4. Plain ASCII punctuation only. Do not use em dashes or en dashes; use commas, colons, periods or parentheses instead.',
        '5. Output markdown with exactly the six sections below, in this order, with these exact "## " headings. Put the header line first and nothing after the last section. No preamble, no closing remarks, no extra headings.',
        '6. Length: about 2,500 to 3,500 tokens (roughly 1,800 to 2,600 words). Dense bullets, not prose.',
        '',
        DOMAIN_NOTES[domain],
        '',
        'Required output format:',
        '',
        group.header,
        '',
        '## Themes',
        `Consolidated themes across the whole group. Merge near-duplicate theme names from different batches into one theme (for example "peace and love" and "unconditional love and light" become one theme). One bullet per theme: theme name, an approximate total count across the group (sum the per-batch counts and write it as "approx. N of ${videos}"), then 3 to 5 example video IDs. Order by count, largest first. Aim for 15 to 30 themes.`,
        '',
        '## Standout accounts',
        'The 15 to 20 strongest accounts across the group. One bullet each: video ID, title (as given in the digests), then one or two sentences on why it stands out and which theme it illustrates. Prefer accounts that are unusual, evidential, emotionally powerful, or narratively complete.',
        '',
        '## Quotes worth keeping',
        '25 to 40 of the best quotes, copied verbatim from the batch digests, each in double quotation marks followed by its video ID in parentheses. Prefer quotes that are vivid, specific, or capture a theme in the experiencer\'s own words, and draw them from many different batches.',
        '',
        '## Tensions and contradictions',
        'Consolidated tensions across the group. One bullet each, with video IDs on each side of the disagreement wherever the inputs give them. Merge tensions that recur across batches and say when they recur.',
        '',
        '## Rare or unusual',
        'Deduplicated list of elements, entities, situations or claims that are rare across the group, each with its video ID(s). Do not repeat something that already belongs in Themes.',
        '',
        '## Book-angle sparks',
        'The 10 to 15 best chapter, framing or question ideas, deduplicated across batches, one line each, each tied to one or more video IDs.',
    ].join('\n');
}

function userPrompt(group) {
    const { domain, members } = group;
    const parts = members.map((b) =>
        `----- BATCH ${domain}-${b.label} (${path.relative(ROOT, b.file)}) -----\n\n${b.text.trim()}`);
    return [
        `Section ${domain}-${group.label} of the Project Profound ${domain.toUpperCase()} archive covers batches ${domain}-${group.first} to ${domain}-${group.last}: ${members.length} batch digests, ${group.videos} videos in total. Consolidate them now.`,
        'Your first line must be exactly:',
        group.header,
        '',
        '===== BATCH DIGESTS =====',
        '',
        parts.join('\n\n'),
        '',
        '===== END OF BATCH DIGESTS =====',
    ].join('\n');
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

class ApiError extends Error {
    constructor(message, { status, code, param, type, retryAfterMs, body } = {}) {
        super(message);
        this.status = status; this.code = code; this.param = param; this.type = type;
        this.retryAfterMs = retryAfterMs; this.body = body;
    }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** HTTP 429 with type insufficient_quota (for example code credit_balance_exhausted): the account, not the rate. */
function isQuotaError(err) {
    if (err.status !== 429) return false;
    return err.type === 'insufficient_quota' || /insufficient_quota|credit_balance|no credits/i.test(`${err.code} ${err.message}`);
}

function parseRetryAfter(h) {
    if (!h) return null;
    const s = Number(h);
    if (Number.isFinite(s)) return Math.max(0, s * 1000);
    const t = Date.parse(h);
    return Number.isFinite(t) ? Math.max(0, t - Date.now()) : null;
}

async function postChat(body, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { /* non-JSON body, keep text */ }
        if (!res.ok) {
            const e = json?.error || {};
            throw new ApiError(`HTTP ${res.status}${e.message ? ': ' + e.message : ''}`, {
                status: res.status, code: e.code, param: e.param, type: e.type,
                retryAfterMs: parseRetryAfter(res.headers.get('retry-after')),
                body: text.slice(0, 500),
            });
        }
        if (!json) throw new ApiError('non-JSON 2xx body', { status: res.status, body: text.slice(0, 300) });
        return json;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Some models reject certain parameters (max_tokens vs max_completion_tokens, temperature).
 * Fix the request in place and report the change instead of falling back to another model.
 * Returns true when the body was changed.
 */
function fixRejectedParam(body, err, log) {
    if (err.status !== 400) return false;
    const msg = String(err.message || '');
    const param = err.param || (msg.match(/'([a-z_]+)'/) || [])[1] || (msg.match(/Unsupported parameter: ?([a-z_]+)/i) || [])[1];
    if (param === 'max_tokens' && 'max_tokens' in body) {
        body.max_completion_tokens = body.max_tokens; delete body.max_tokens;
        log(`param fix: max_tokens -> max_completion_tokens (${msg.slice(0, 120)})`);
        return true;
    }
    if (param === 'max_completion_tokens' && 'max_completion_tokens' in body) {
        body.max_tokens = body.max_completion_tokens; delete body.max_completion_tokens;
        log(`param fix: max_completion_tokens -> max_tokens (${msg.slice(0, 120)})`);
        return true;
    }
    if (param === 'temperature' && 'temperature' in body) {
        delete body.temperature;
        log(`param fix: dropped temperature (${msg.slice(0, 120)})`);
        return true;
    }
    if (param && param in body && !['model', 'messages'].includes(param)) {
        delete body[param];
        log(`param fix: dropped ${param} (${msg.slice(0, 120)})`);
        return true;
    }
    return false;
}

/** One model, with retries on 429/5xx/network/timeout (honours Retry-After) and in-place parameter fixes. */
async function completeWithModel(model, messages, opts, log) {
    const body = { model, messages, max_completion_tokens: DEFAULTS.maxOutputTokens };
    if (!/^gpt-5/.test(model)) body.temperature = DEFAULTS.temperature;
    let attempt = 0, paramFixes = 0, lastErr = null;
    while (attempt < opts.maxAttempts) {
        attempt++;
        const started = Date.now();
        try {
            const json = await postChat(body, opts.timeoutMs);
            return { json, attempts: attempt, paramFixes, ms: Date.now() - started };
        } catch (err) {
            lastErr = err;
            const status = err.status;
            if (status === 400 && paramFixes < 3 && fixRejectedParam(body, err, log)) {
                paramFixes++; attempt--; // a fixed request is not a retry
                continue;
            }
            if (isQuotaError(err)) { err.quota = true; throw err; } // billing, not rate limiting: retrying cannot help
            const transient = status === 429 || (status >= 500 && status < 600) || status === undefined; // undefined: network/timeout
            if (!transient) throw err;
            if (attempt >= opts.maxAttempts) break;
            const backoff = Math.min(60_000, 1000 * 2 ** attempt + Math.random() * 500);
            const wait = err.retryAfterMs != null ? Math.max(err.retryAfterMs, 500) : backoff;
            log(`${model} attempt ${attempt} failed (${err.name === 'AbortError' ? 'timeout' : err.message.slice(0, 100)}); retry in ${Math.round(wait / 1000)}s`);
            await sleep(wait);
        }
    }
    throw lastErr;
}

/** Primary model with retries, then one pass on the fallback model. */
async function completeSection(messages, opts, log) {
    try {
        const r = await completeWithModel(opts.model, messages, opts, log);
        return { ...r, requested: opts.model, fallback: false };
    } catch (primaryErr) {
        if (opts.fallbackModel === opts.model || primaryErr.quota) throw primaryErr;
        log(`primary "${opts.model}" failed (${primaryErr.status ?? primaryErr.name}: ${String(primaryErr.message).slice(0, 140)}); falling back to "${opts.fallbackModel}"`);
        const r = await completeWithModel(opts.fallbackModel, messages, opts, log);
        return { ...r, requested: opts.fallbackModel, fallback: true, primaryError: String(primaryErr.message).slice(0, 200) };
    }
}

// ---------------------------------------------------------------------------
// Pricing and validation
// ---------------------------------------------------------------------------

function normalizeModelKey(model) {
    return String(model).replace(/^[a-z0-9-]+\//, '').replace(/-\d{8}$/, '').replace(/\./g, '-');
}

function priceFor(model) {
    return MODEL_PRICES[model] ?? MODEL_PRICES[normalizeModelKey(model)] ?? null;
}

function estimateUsd(model, promptTokens, completionTokens) {
    const p = priceFor(model);
    if (!p) return null;
    return Math.round(((promptTokens / 1e6) * p.inputPerM + (completionTokens / 1e6) * p.outputPerM) * 1e6) / 1e6;
}

/** Straight quotes, collapsed whitespace: the shape used for verbatim-quote matching. */
function normQuote(s) {
    return String(s).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/\s+/g, ' ').trim();
}

function sectionBody(text, heading) {
    const i = text.indexOf('\n' + heading);
    if (i < 0) return '';
    const rest = text.slice(i + heading.length + 1);
    const j = rest.search(/\n## /);
    return j < 0 ? rest : rest.slice(0, j);
}

/**
 * Every quoted string in the output's Quotes section must appear verbatim in the inputs
 * (a trailing/leading ellipsis is allowed and ignored). Returns { total, verified, misses }.
 */
function checkQuotes(text, group) {
    const haystack = normQuote(group.members.map((b) => b.text).join('\n'));
    const quotes = [];
    for (const raw of sectionBody(text, '## Quotes worth keeping').split('\n')) {
        const line = normQuote(raw);
        const m = line.match(/"(.+)"/); // greedy: first opening quote to last closing quote on the bullet line
        if (m) quotes.push(m[1]);
    }
    const misses = [];
    for (const q of quotes) {
        const core = q.replace(/^\.\.\.\s*/, '').replace(/\s*\.\.\.$/, '').trim();
        if (core.length < 8 || !haystack.includes(core)) misses.push(q.slice(0, 80));
    }
    return { total: quotes.length, verified: quotes.length - misses.length, misses };
}

function validateSection(text, group) {
    const problems = [];
    const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
    if (firstLine !== group.header) problems.push(`header line differs from "${group.header}"`);
    let pos = -1;
    for (const h of SECTION_HEADINGS) {
        const i = text.indexOf('\n' + h, Math.max(pos, 0));
        if (i < 0) problems.push(`missing/out-of-order section: ${h}`);
        else pos = i;
    }
    const extra = (text.match(/^## /gm) || []).length - SECTION_HEADINGS.length;
    if (extra > 0) problems.push(`${extra} extra "## " heading(s)`);
    if (/[–—]/.test(text)) problems.push('contains en/em dash');
    const cited = new Set((text.match(ID_RE) || []).filter((t) => group.idSet.has(t)));
    if (cited.size < 40) problems.push(`cites only ${cited.size} of ${group.videos} group IDs`);
    const q = checkQuotes(text, group);
    if (q.total < 25) problems.push(`only ${q.total} quotes (wanted 25-40)`);
    if (q.misses.length) problems.push(`${q.misses.length} of ${q.total} quotes not found verbatim in inputs`);
    return { problems, cited: cited.size, quotes: q };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function writeAtomic(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, text);
    fs.renameSync(tmp, file);
}

function outFileFor(opts, group) {
    return path.join(opts.out, group.domain, `section-${group.label}.md`);
}

async function runGroup(group, opts, totals) {
    const { domain } = group;
    const tag = `[${domain}-${group.label}]`;
    const log = (m) => console.log(`${tag} ${m}`);
    const outFile = outFileFor(opts, group);
    const messages = [
        { role: 'system', content: systemPrompt(group) },
        { role: 'user', content: userPrompt(group) },
    ];
    log(`batches ${group.first}-${group.last}, ${group.videos} videos, ~${Math.round(group.chars / 4).toLocaleString('en-US')} est input tokens; requesting ${opts.model}`);
    const started = Date.now();
    const r = await completeSection(messages, opts, log);
    const choice = r.json.choices?.[0];
    const content = (choice?.message?.content || '').trim();
    const usage = r.json.usage || {};
    const modelUsed = r.json.model || r.requested;
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens ?? 0;
    const cost = estimateUsd(modelUsed, promptTokens, completionTokens) ?? estimateUsd(r.requested, promptTokens, completionTokens);
    if (!content) throw new Error(`empty completion from ${modelUsed} (finish_reason=${choice?.finish_reason})`);

    const v = validateSection(content, group);
    const problems = v.problems;
    if (choice?.finish_reason === 'length') problems.push('finish_reason=length (output truncated)');
    writeAtomic(outFile, content.endsWith('\n') ? content : content + '\n');

    const seconds = Math.round((Date.now() - started) / 100) / 10;
    const record = {
        ts: new Date().toISOString(), domain, group: group.n, section: `${domain}-${group.label}`,
        file: path.relative(ROOT, outFile), batches: `${group.first}-${group.last}`, batch_count: group.members.length,
        videos: group.videos, model_requested: r.requested, model_used: modelUsed, fallback: r.fallback,
        prompt_tokens: promptTokens, completion_tokens: completionTokens, reasoning_tokens: reasoningTokens,
        total_tokens: usage.total_tokens ?? promptTokens + completionTokens, cost_usd: cost, cost_is_estimate: true,
        seconds, attempts: r.attempts, param_fixes: r.paramFixes, finish_reason: choice?.finish_reason ?? null,
        ids_cited: v.cited, quotes_total: v.quotes.total, quotes_verified: v.quotes.verified,
        sections_ok: problems.length === 0, problems: problems.length ? problems : undefined, primary_error: r.primaryError,
    };
    fs.mkdirSync(opts.out, { recursive: true });
    fs.appendFileSync(path.join(opts.out, 'usage.jsonl'), JSON.stringify(record) + '\n');

    totals.groups++; totals.prompt += promptTokens; totals.completion += completionTokens; totals.cost += cost ?? 0;
    if (r.fallback) totals.fallbacks++;
    if (problems.length) totals.problems++;
    log(`${modelUsed}${r.fallback ? ' (FALLBACK)' : ''}: ${promptTokens.toLocaleString('en-US')} in / ${completionTokens.toLocaleString('en-US')} out` +
        `${reasoningTokens ? ' (' + reasoningTokens + ' reasoning)' : ''}, $${(cost ?? 0).toFixed(4)}, ${seconds}s, ${v.cited} IDs cited, ${v.quotes.verified}/${v.quotes.total} quotes verbatim` +
        ` -> ${path.relative(ROOT, outFile)} | running total: ${totals.groups} sections, ${(totals.prompt + totals.completion).toLocaleString('en-US')} tokens, $${totals.cost.toFixed(4)}`);
    if (problems.length) log(`WARN section problems: ${problems.join('; ')}`);
    if (v.quotes.misses.length) log(`WARN unverified quotes: ${v.quotes.misses.map((m) => JSON.stringify(m)).join(' | ')}`);
}

async function runPool(items, concurrency, fn, { stopOn = () => false } = {}) {
    let next = 0, stopped = false;
    const failures = [];
    const worker = async () => {
        while (!stopped && next < items.length) {
            const item = items[next++];
            try { await fn(item); } catch (err) { failures.push({ item, err }); if (stopOn(err)) stopped = true; }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return failures;
}

function printDryRun(domain, batches, groups, opts) {
    const price = priceFor(opts.model);
    let inputTokens = 0;
    console.log(`\n=== DRY RUN: ${domain} ===`);
    console.log(`digest dir:        ${path.relative(ROOT, path.join(opts.in, domain))} (${batches.length} batch digests, ${batches.reduce((s, b) => s + b.ids.length, 0).toLocaleString('en-US')} video IDs in headers)`);
    console.log(`groups:            ${groups.length} (group size ${opts.groupSize}; last group ${groups.length ? groups[groups.length - 1].members.length : 0} batches)`);
    console.log(`output dir:        ${path.relative(ROOT, path.join(opts.out, domain))}`);
    for (const g of groups) {
        const overhead = systemPrompt(g).length + 400 + g.members.length * 80; // system prompt, framing, separators
        const tokens = Math.round((g.chars + overhead) / 4);
        inputTokens += tokens;
        const outFile = outFileFor(opts, g);
        const exists = fs.existsSync(outFile) && fs.statSync(outFile).size > 0;
        const selected = g.n <= opts.limit;
        console.log(`  ${g.header}`);
        console.log(`    files: batch-${g.first}.md .. batch-${g.last}.md (${g.members.length} files, ${g.chars.toLocaleString('en-US')} chars)` +
            ` | est input tokens ${tokens.toLocaleString('en-US')} | ${exists ? (opts.force ? 'exists, --force regenerates' : 'exists, would skip') : 'to write'}${selected ? '' : ' | beyond --limit'}`);
    }
    const selectedGroups = groups.slice(0, opts.limit);
    const outputTokens = groups.length * DEFAULTS.estOutputTokensPerGroup;
    const cost = price ? (inputTokens / 1e6) * price.inputPerM + (outputTokens / 1e6) * price.outputPerM : null;
    console.log(`est input tokens:  ${inputTokens.toLocaleString('en-US')} total across ${groups.length} groups (chars/4), ~${groups.length ? Math.round(inputTokens / groups.length).toLocaleString('en-US') : 0} per group`);
    console.log(`est output tokens: ${outputTokens.toLocaleString('en-US')} (${DEFAULTS.estOutputTokensPerGroup} per group incl. reasoning)`);
    console.log(`est cost:          ${cost == null ? 'unknown model price' : '$' + cost.toFixed(4)} at ${opts.model} ($${price?.inputPerM}/M in, $${price?.outputPerM}/M out) for all ${groups.length} groups`);
    if (opts.limit !== Infinity) console.log(`--limit ${opts.limit}: would run group(s) ${selectedGroups.map((g) => g.label).join(', ')}`);
}

async function main() {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); }
    catch (err) { console.error(`error: ${err.message}\n`); console.error(usageText()); process.exit(2); }
    if (opts.help) { console.log(usageText()); return; }
    opts.fallbackModel = DEFAULTS.fallbackModel;
    opts.timeoutMs = DEFAULTS.timeoutMs;
    opts.maxAttempts = DEFAULTS.maxAttempts;

    const { domain } = opts;
    const batches = loadBatches(domain, opts.in);
    const groups = makeGroups(domain, batches, opts.groupSize);

    if (opts.dryRun) { printDryRun(domain, batches, groups, opts); return; }

    if (!process.env.OPENAI_API_KEY) { console.error('error: OPENAI_API_KEY is not set'); process.exit(2); }
    if (!batches.length) { console.error('error: no batch digests found'); process.exit(1); }

    const selected = groups.slice(0, opts.limit);
    const todo = [], skipped = [];
    for (const g of selected) {
        const f = outFileFor(opts, g);
        if (!opts.force && fs.existsSync(f) && fs.statSync(f).size > 0) skipped.push(g.label);
        else todo.push(g);
    }
    console.log(`${domain}: ${batches.length} batch digests -> ${groups.length} groups of up to ${opts.groupSize}; selected ${selected.length}, skipping ${skipped.length} existing, running ${todo.length} on ${opts.model} (fallback ${opts.fallbackModel}), concurrency ${opts.concurrency}`);
    if (!todo.length) { console.log('nothing to do'); return; }

    const totals = { groups: 0, prompt: 0, completion: 0, cost: 0, fallbacks: 0, problems: 0 };
    const t0 = Date.now();
    const failures = await runPool(todo, opts.concurrency, (g) => runGroup(g, opts, totals), { stopOn: (err) => err.quota });
    for (const f of failures) console.error(`[${domain}-${f.item.label}] FAILED: ${f.err.message}`);
    const quota = failures.some((f) => f.err.quota);
    if (quota) console.error(`\nSTOPPED: the OpenAI account has no credits left (insufficient_quota). Add credits, then rerun the same command; finished sections are skipped automatically.`);

    console.log(`\n=== DONE ${domain}: ${totals.groups} written, ${failures.length} failed, ${skipped.length} skipped; ` +
        `${totals.prompt.toLocaleString('en-US')} prompt + ${totals.completion.toLocaleString('en-US')} completion tokens; est $${totals.cost.toFixed(4)}; ` +
        `${totals.fallbacks} fallback(s), ${totals.problems} with format warnings; ${((Date.now() - t0) / 1000).toFixed(0)}s ===`);
    console.log(`usage log: ${path.relative(ROOT, path.join(opts.out, 'usage.jsonl'))}`);
    if (quota) process.exit(3);
    if (failures.length) process.exit(1);
}

// G. exported for offline checks; main() only runs when this file is the entry point
export { loadBatches, makeGroups, systemPrompt, userPrompt, validateSection, checkQuotes, estimateUsd, SECTION_HEADINGS };

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) main().catch((err) => { console.error(`fatal: ${err.stack || err.message}`); process.exit(1); });
