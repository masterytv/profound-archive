#!/usr/bin/env node
/**
 * corpus-atlas/batch-digest.mjs — turn per-video analysis records into narrative "batch digests".
 *
 * (Named batch-digest.mjs because scripts/corpus-atlas/digest.mjs is a different tool: a
 * read-only viewer for the question/blog/profile pulls.)
 *
 * Reads the JSONL exports in scratch/corpus-atlas/ (nde_vids, nde_analysis, uap_vids,
 * uap_encounters, uap_video_stats), builds one compact plain-text card per video, groups
 * the cards into deterministic batches, and asks an OpenAI chat model to write a markdown
 * digest per batch (themes, standouts, quotes, tensions, rarities, book-angle sparks).
 * A later merge step folds the digests into a corpus atlas for book ideation.
 *
 * USAGE (Node 22 only reaches the internet with NODE_USE_ENV_PROXY=1 in this environment):
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/batch-digest.mjs --domain nde --dry-run
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/batch-digest.mjs --domain uap --limit 1
 *   NODE_USE_ENV_PROXY=1 node scripts/corpus-atlas/batch-digest.mjs --domain nde
 *
 * Flags:
 *   --domain nde|uap     required
 *   --data <dir>         input dir holding the JSONL files (default scratch/corpus-atlas)
 *   --out <dir>          output root (default research/corpus-atlas/digests)
 *   --batch-size N       cards per request (default 40)
 *   --limit N            only the first N batches (batch numbering is unaffected)
 *   --model <id>         primary model (default gpt-5.6-luna; falls back to gpt-4o-mini)
 *   --concurrency N      parallel requests (default 4)
 *   --force              regenerate batches whose output file already exists
 *   --dry-run            build cards + batches, print stats and cost estimate, write nothing
 *   --print-cards N      (dry-run aid) print the first N cards to stdout
 *   --help
 *
 * Outputs:
 *   <out>/<domain>/batch-NNN.md   one digest per batch (skipped on rerun unless --force)
 *   <out>/usage.jsonl             one line per API call: tokens, model used, est. USD
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
    data: path.join(ROOT, 'scratch/corpus-atlas'),
    out: path.join(ROOT, 'research/corpus-atlas/digests'),
    batchSize: 40,
    model: 'gpt-5.6-luna',
    fallbackModel: 'gpt-4o-mini',
    concurrency: 4,
    timeoutMs: 120_000,
    maxAttempts: 5,          // per model, on 429/5xx/network/timeout
    maxOutputTokens: 4000,   // hard cap; measured ~2,000-2,200 per batch incl. reasoning tokens
    // Sent only to non-gpt-5 models: gpt-5.6-luna rejects any temperature other than the
    // default (HTTP 400, verified 2026-09-08). fixRejectedParam() still covers surprises.
    temperature: 0.6,
    estOutputTokensPerBatch: 2000, // dry-run assumption, from the live nde/uap batch-001 runs
};

// Card size targets (chars). ~4 chars per token: 2,000-2,800 chars is 500-700 tokens.
const CARD_HARD_CAP = 3200;
const CARD_TARGET = 2600;
const CARD_TARGET_MAX = 2800;

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
        data: DEFAULTS.data,
        out: DEFAULTS.out,
        batchSize: DEFAULTS.batchSize,
        limit: Infinity,
        model: DEFAULTS.model,
        concurrency: DEFAULTS.concurrency,
        force: false,
        dryRun: false,
        printCards: 0,
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
            case '--data': opts.data = path.resolve(needVal(i, a)); i++; break;
            case '--out': opts.out = path.resolve(needVal(i, a)); i++; break;
            case '--batch-size': opts.batchSize = parseInt(needVal(i, a), 10); i++; break;
            case '--limit': opts.limit = parseInt(needVal(i, a), 10); i++; break;
            case '--model': opts.model = needVal(i, a); i++; break;
            case '--concurrency': opts.concurrency = parseInt(needVal(i, a), 10); i++; break;
            case '--print-cards': opts.printCards = parseInt(needVal(i, a), 10); i++; break;
            case '--force': opts.force = true; break;
            case '--dry-run': opts.dryRun = true; break;
            case '--help': case '-h': opts.help = true; break;
            default: throw new Error(`unknown flag: ${a}`);
        }
    }
    if (opts.help) return opts;
    if (opts.domain !== 'nde' && opts.domain !== 'uap') throw new Error('--domain must be nde or uap');
    for (const k of ['batchSize', 'concurrency']) {
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
// Small helpers
// ---------------------------------------------------------------------------

const NOT_STATED = new Set(['', 'not stated', 'not_stated', 'none', 'unknown', 'n/a', 'null', 'undefined']);

function isStated(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return !NOT_STATED.has(v.trim().toLowerCase());
    if (Array.isArray(v)) return v.length > 0;
    return true;
}

/** Collapse whitespace and cut to n chars (adds "..." when cut). */
function clip(s, n) {
    if (s === null || s === undefined) return '';
    const t = String(s).replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    return t.slice(0, Math.max(0, n - 3)).trimEnd() + '...';
}

/** JSON columns may arrive as objects (PostgREST) or as strings (some exporters). */
function asJson(v) {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (!t || (t[0] !== '{' && t[0] !== '[')) return null;
    try { return JSON.parse(t); } catch { return null; }
}

function fmtViews(n) {
    const v = Number(n);
    return Number.isFinite(v) && v > 0 ? `${v.toLocaleString('en-US')} views` : 'views n/a';
}

function yearOf(row, ...keys) {
    for (const k of keys) {
        const v = row[k];
        if (v === null || v === undefined || v === '') continue;
        if (typeof v === 'number') return String(v);
        const m = String(v).match(/^(\d{4})/);
        if (m) return m[1];
    }
    return 'year n/a';
}

/** ISO-8601 duration (PT1H14M44S) -> "1h14m"; plain seconds also accepted. */
function fmtDuration(d) {
    if (d === null || d === undefined || d === '') return null;
    if (typeof d === 'number') return `${Math.floor(d / 3600) ? Math.floor(d / 3600) + 'h' : ''}${Math.floor((d % 3600) / 60)}m`;
    const m = String(d).match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
    if (!m) return String(d);
    const days = +(m[1] || 0), h = +(m[2] || 0) + days * 24, min = +(m[3] || 0), s = +(m[4] || 0);
    if (h) return `${h}h${String(min).padStart(2, '0')}m`;
    if (min) return `${min}m${s ? String(s).padStart(2, '0') + 's' : ''}`;
    return `${s}s`;
}

function fmtScore(v, denom) {
    if (v === null || v === undefined || v === '') return 'n/a';
    return denom ? `${v}/${denom}` : String(v);
}

function loadJsonl(file, { required = true } = {}) {
    if (!fs.existsSync(file)) {
        if (required) throw new Error(`missing input file: ${file}`);
        return [];
    }
    const rows = [];
    let bad = 0;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t) continue;
        try { rows.push(JSON.parse(t)); } catch { bad++; }
    }
    if (bad) console.warn(`  warn: ${bad} unparsable line(s) skipped in ${path.basename(file)}`);
    return rows;
}

function compareIds(a, b) {
    // Plain code-unit comparison: deterministic, locale independent.
    return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------------
// NDE cards
// ---------------------------------------------------------------------------

/**
 * Build one NDE card. `level` trims progressively (0 = fullest) so the card lands
 * under the size targets; fitCard() picks the first level that fits.
 */
function renderNdeCard(vid, an, level) {
    const id = vid.videoId;
    // Per-level knobs: quote length, how many elements keep their quote, evidence length, etc.
    const quoteMax = [140, 110, 90, 70][level];
    const quotedElements = [8, 6, 4, 3][level];
    const evidenceMax = [110, 90, 0, 0][level];
    const entityMax = [3, 3, 2, 2][level];
    const entityQuoteMax = [110, 90, 70, 60][level];
    const summaryMax = [1000, 1000, 850, 850][level];
    const includeOptional = level <= 1;

    const lines = [];
    const dur = fmtDuration(vid.duration);
    lines.push(`[nde] ${id} | ${clip(vid.title, 110)} | ${clip(vid.channelName, 50) || 'channel n/a'} | ${yearOf(vid, 'date')} | ${fmtViews(vid.viewCount)}${dur ? ' | ' + dur : ''}`);
    lines.push(`Summary: ${clip(vid.analysis_nde_summary, summaryMax)}`);

    if (an) {
        const trig = isStated(an.trigger_category) ? an.trigger_category : 'n/a';
        const trigDesc = isStated(an.trigger_description) ? ` (${clip(an.trigger_description, 110)})` : '';
        const meta = [
            `Type: ${an.experience_type || 'n/a'}`,
            `Trigger: ${trig}${trigDesc}`,
            `Tone: ${an.overall_tone || 'n/a'}`,
            `Intensity: ${fmtScore(an.intensity_rating, 10)}`,
            `Journey: ${an.journey_nde_type || 'n/a'}`,
            `Greyson: ${fmtScore(an.total_greyson_score, 32)}`,
            `Transformation: ${fmtScore(an.transformation_score)}${isStated(an.transformation_classification) ? ' (' + an.transformation_classification + ')' : ''}`,
        ];
        if (vid.rvnde_total_score !== null && vid.rvnde_total_score !== undefined) {
            meta.push(`Veridical: ${vid.rvnde_total_score}${isStated(vid.rvnde_level) ? ' (' + vid.rvnde_level + ')' : ''}`);
        }
        lines.push(meta.join(' | '));

        // Core elements present, highest confidence first, quote when present.
        const elements = asJson(an.core_elements);
        if (Array.isArray(elements)) {
            const present = elements
                .filter((e) => e && e.present)
                .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
            if (present.length) {
                const parts = present.map((e, idx) => {
                    const conf = Number.isFinite(+e.confidence) ? ` (${e.confidence})` : '';
                    const withQuote = idx < quotedElements;
                    const q = withQuote && isStated(e.quote) ? ` "${clip(e.quote, quoteMax)}"` : '';
                    return `${e.name}${conf}${q}`;
                });
                lines.push(`Elements present (${present.length}/${elements.length}): ${parts.join('; ')}`);
            } else {
                lines.push(`Elements present: none of ${elements.length}`);
            }
        }

        // Journey sequence: cheap and useful ordering signal.
        const seq = asJson(an.journey_sequence);
        if (Array.isArray(seq) && seq.length) {
            const order = [...seq].sort((a, b) => (a.order || 0) - (b.order || 0)).map((s) => s.element).filter(Boolean);
            if (order.length) lines.push(`Journey sequence: ${order.join(' > ')}`);
        }
        if (includeOptional && isStated(an.journey_notes)) lines.push(`Journey notes: ${clip(an.journey_notes, 160)}`);

        // Entities: identity, type, tone, message.
        const ent = asJson(an.entities);
        const encounters = Array.isArray(ent) ? ent : Array.isArray(ent?.encounters) ? ent.encounters : [];
        if (encounters.length) {
            const shown = [...encounters].sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, entityMax);
            const parts = shown.map((e) => {
                const tags = [e.entity_type, e.luminosity, e.emotional_quality, e.communication_method].filter(isStated);
                const look = isStated(e.appearance) && e.appearance !== 'not described' ? `, looks: ${clip(e.appearance, 60)}` : '';
                const msg = isStated(e.message_quote) ? ` says "${clip(e.message_quote, entityQuoteMax)}"`
                    : isStated(e.message_summary) ? `: ${clip(e.message_summary, 90)}` : '';
                return `${clip(e.identity, 40) || 'unnamed'} [${tags.join(', ') || 'no detail'}${look}]${msg}`;
            });
            const more = encounters.length > shown.length ? ` (+${encounters.length - shown.length} more)` : '';
            lines.push(`Entities (${encounters.length}): ${parts.join('; ')}${more}`);
        }

        // Transformation: top 3 domains by score with one-line evidence, plus dominant themes.
        const tb = asJson(an.transformation_breakdown);
        const domains = tb?.domain_analysis && typeof tb.domain_analysis === 'object' ? Object.entries(tb.domain_analysis) : [];
        if (domains.length) {
            const top = domains
                .map(([code, d]) => ({ code, ...(d || {}) }))
                .filter((d) => Number.isFinite(+d.score) && +d.score > 0)
                .sort((a, b) => +b.score - +a.score)
                .slice(0, 3);
            if (top.length) {
                const parts = top.map((d) => {
                    const dir = isStated(d.direction) ? ` ${d.direction}` : '';
                    const ev = evidenceMax && isStated(d.evidence_summary) ? `: ${clip(d.evidence_summary, evidenceMax)}` : '';
                    return `${d.code} ${d.name || ''} ${d.score}${dir}${ev}`;
                });
                lines.push(`Transformation top: ${parts.join('; ')}`);
            }
            const themes = tb?.qualitative_profile?.dominant_themes;
            if (includeOptional && Array.isArray(themes) && themes.length) lines.push(`Change themes: ${clip(themes.join('; '), 140)}`);
            if (level === 0 && isStated(tb?.qualitative_profile?.unique_features)) lines.push(`Unique: ${clip(tb.qualitative_profile.unique_features, 140)}`);
        }

        // Phenomenology: one line on vividness / reality / senses.
        const ph = asJson(an.phenomenology);
        if (ph && typeof ph === 'object') {
            const bits = [];
            if (Number.isFinite(+ph.vividness_rating)) bits.push(`vividness ${ph.vividness_rating}/10`);
            if (isStated(ph.reality_comparison)) bits.push(`felt ${ph.reality_comparison}`);
            const sm = ph.sensory_modalities && typeof ph.sensory_modalities === 'object' ? ph.sensory_modalities : null;
            if (sm) {
                const active = Object.entries(sm).filter(([, v]) => v && v.active).map(([k, v]) => (v.extraordinary ? k + '*' : k));
                if (active.length) bits.push(`senses: ${active.join(', ')}`);
            }
            if (bits.length) lines.push(`Senses: ${bits.join('; ')}`);
            if (level === 0 && isStated(ph.distinguishing_features)) lines.push(`Distinctive: ${clip(ph.distinguishing_features, 140)}`);
        }

        // Content safety flags.
        const cs = asJson(an.content_safety);
        if (cs && typeof cs === 'object') {
            const flags = cs.flags && typeof cs.flags === 'object' ? Object.entries(cs.flags).filter(([, v]) => v === true).map(([k]) => k) : [];
            const warn = isStated(cs.warning_level) && cs.warning_level !== 'none' ? cs.warning_level : null;
            if (flags.length || warn || cs.overall_safe === false) {
                lines.push(`Content flags: ${flags.join(', ') || 'unspecified'}${warn ? ' (warning: ' + warn + ')' : ''}`);
            }
        }
    } else {
        lines.push('Analysis: none on file');
    }

    if (includeOptional && isStated(vid.rvnde_summary_reason)) lines.push(`Veridical note: ${clip(vid.rvnde_summary_reason, 160)}`);
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// UAP cards
// ---------------------------------------------------------------------------

/** Flatten the encounter_context JSON into one compact line (~500 chars max). */
function describeEncounterContext(ctx, max) {
    const c = asJson(ctx);
    if (!c) return typeof ctx === 'string' ? clip(ctx, max) : '';
    if (typeof c !== 'object' || Array.isArray(c)) return clip(JSON.stringify(c), max);
    const bits = [];
    const when = isStated(c.event_date) ? c.event_date : isStated(c.event_year) ? String(c.event_year) : null;
    if (when) bits.push(`when: ${when}${isStated(c.event_time) ? ' ' + c.event_time : ''}`);
    const loc = c.location && typeof c.location === 'object' ? c.location : null;
    if (loc) {
        const place = [loc.description, loc.nearest_city, loc.state_province, loc.country].filter(isStated).map((s) => String(s).replace(/_/g, ' '));
        const extra = [loc.setting, loc.geographic_features].filter(isStated).map((s) => String(s).replace(/_/g, ' '));
        if (place.length) bits.push(`where: ${clip(place.join(', '), 120)}${extra.length ? ' (' + extra.join('; ') + ')' : ''}`);
        if (Array.isArray(loc.nearby_facilities) && loc.nearby_facilities.length) bits.push(`near: ${clip(loc.nearby_facilities.join(', '), 80)}`);
    } else if (typeof c.location === 'string' && isStated(c.location)) {
        bits.push(`where: ${clip(c.location, 120)}`);
    }
    const nw = Array.isArray(c.named_witnesses) ? c.named_witnesses.filter(isStated) : [];
    if (isStated(c.total_witnesses_mentioned) || nw.length) {
        bits.push(`witnesses: ${isStated(c.total_witnesses_mentioned) ? c.total_witnesses_mentioned : nw.length}${nw.length ? ' (' + clip(nw.join(', '), 80) + ')' : ''}`);
    }
    const mil = c.military_context && typeof c.military_context === 'object' ? c.military_context : null;
    if (mil && mil.is_military_witness) {
        const m = [mil.branch, mil.rank, mil.duty_context, mil.base_assignment].filter(isStated).map((s) => String(s).replace(/_/g, ' '));
        bits.push(`military witness${m.length ? ': ' + clip(m.join(', '), 100) : ''}${mil.clearance_mentioned ? ', clearance mentioned' : ''}`);
    }
    if (c.reported_to_authorities === true) bits.push(`reported to authorities${isStated(c.authority_response) ? ' (' + clip(c.authority_response, 80) + ')' : ''}`);
    const media = c.media_coverage && typeof c.media_coverage === 'object' ? c.media_coverage : null;
    if (media) {
        const outlets = [...(media.media_outlets || []), ...(media.documentary_appearances || [])].filter(isStated);
        if (media.was_reported_in_media || outlets.length) bits.push(`media: ${outlets.length ? clip(outlets.join(', '), 80) : 'yes'}`);
    }
    if (Array.isArray(c.connected_cases) && c.connected_cases.length) {
        // Entries are objects like {event_name, date_mentioned, connection_type} or plain strings.
        const names = c.connected_cases
            .map((x) => (typeof x === 'string' ? x : [x?.event_name || x?.name || x?.case_name, x?.date_mentioned].filter(isStated).join(' ')))
            .filter(isStated);
        if (names.length) bits.push(`connected: ${clip(names.join(', '), 90)}`);
    }
    // Any remaining string fields we did not model, so nothing informative is lost.
    const known = new Set(['event_date', 'event_time', 'event_year', 'location', 'named_witnesses', 'total_witnesses_mentioned', 'military_context', 'reported_to_authorities', 'authority_response', 'media_coverage', 'connected_cases']);
    for (const [k, v] of Object.entries(c)) {
        if (!known.has(k) && typeof v === 'string' && isStated(v)) bits.push(`${k.replace(/_/g, ' ')}: ${clip(v, 100)}`);
    }
    return clip(bits.join('; '), max);
}

function renderUapCard(vid, encounters, stats, level) {
    const id = vid.video_id;
    const ctxMax = [500, 380, 260, 160][level];
    const encMax = [3, 3, 2, 2][level];
    const lines = [];
    lines.push(`[uap] ${id} | ${clip(vid.title, 110)} | ${clip(vid.channel_name, 50) || 'channel n/a'} | ${yearOf(vid, 'video_publish_year', 'date')} | ${fmtViews(vid.view_count)}`);
    lines.push(`Summary: ${clip(vid.analysis_uap_summary, 1000)}`);
    const meta = [
        `Content: ${vid.content_type || 'n/a'}`,
        `Track: ${vid.track || 'n/a'}`,
        `Source: ${vid.source_type || 'n/a'}`,
        `Experiencer: ${isStated(vid.experiencer_name) ? clip(vid.experiencer_name, 60) : 'n/a'}`,
        `Encounters: ${vid.encounter_count ?? encounters.length}`,
    ];
    lines.push(meta.join(' | '));

    const shown = encounters.slice(0, encMax);
    shown.forEach((e, i) => {
        const n = Number.isInteger(e.encounter_index) ? e.encounter_index + 1 : i + 1;
        const head = [
            clip(e.encounter_label, 80) || 'unlabeled',
            `Hynek ${isStated(e.hynek_type) ? e.hynek_type : 'n/a'}${isStated(e.vallee_type) ? ', Vallee ' + e.vallee_type : ''}`,
            `evidence ${fmtScore(e.evidence_score)}, contact ${fmtScore(e.contact_depth_score)}, transformation ${fmtScore(e.transformation_score)}`,
        ];
        if (isStated(e.experiencer_name) && e.experiencer_name !== vid.experiencer_name) head.push(`experiencer: ${clip(e.experiencer_name, 50)}`);
        const ctx = describeEncounterContext(e.encounter_context, ctxMax);
        lines.push(`Encounter ${n}: ${head.join(' | ')}${ctx ? ' | ' + ctx : ''}`);
    });
    if (encounters.length > shown.length) lines.push(`(+${encounters.length - shown.length} more encounter(s) not shown)`);

    if (stats) {
        const flagMap = {
            has_craft_observation: 'craft observation',
            has_biologics_claim: 'biologics claim',
            has_crash_retrieval_claim: 'crash retrieval claim',
            has_under_oath_claims: 'under-oath claims',
            has_psi_content: 'psi content',
        };
        const flags = Object.entries(flagMap).filter(([k]) => stats[k] === true).map(([, v]) => v);
        const bits = [`Flags: ${flags.length ? flags.join(', ') : 'none'}`];
        if (isStated(stats.video_tone)) bits.push(`Tone: ${stats.video_tone}`);
        if (isStated(stats.dominant_entity_type)) bits.push(`Dominant entity: ${stats.dominant_entity_type}`);
        if (Number.isFinite(+stats.intelligence_value)) bits.push(`Intel value: ${stats.intelligence_value}`);
        const counts = [
            ['persons', stats.persons_count], ['orgs', stats.organizations_count], ['programs', stats.programs_count],
            ['claims', stats.claims_count], ['locations', stats.locations_count], ['tech', stats.technologies_count],
            ['psi mentions', stats.psi_mentions_count], ['legislative', stats.legislative_events_count], ['secrecy', stats.secrecy_mechanisms_count],
        ].filter(([, v]) => Number.isFinite(+v) && +v > 0).map(([k, v]) => `${k} ${v}`);
        if (counts.length && level <= 1) bits.push(`Counts: ${counts.join(', ')}`);
        lines.push(bits.join(' | '));
    }
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Card assembly
// ---------------------------------------------------------------------------

/**
 * Prefer the fullest level that lands inside the target (<= CARD_TARGET_MAX); otherwise the
 * fullest level under the hard cap; otherwise truncate the leanest level.
 */
function fitCard(render) {
    const rendered = [];
    for (let level = 0; level <= 3; level++) {
        const text = render(level);
        if (text.length <= CARD_TARGET_MAX) return { text, level };
        rendered.push({ text, level });
    }
    const underCap = rendered.find((r) => r.text.length <= CARD_HARD_CAP);
    if (underCap) return underCap;
    // Still too long (a monster summary?): cut on a line boundary, then hard cut.
    const text = rendered[rendered.length - 1].text;
    let cut = text.slice(0, CARD_HARD_CAP - 12);
    const nl = cut.lastIndexOf('\n');
    if (nl > CARD_HARD_CAP * 0.6) cut = cut.slice(0, nl);
    return { text: cut + '\n[truncated]', level: 4 };
}

function buildCards(domain, dataDir) {
    const notes = { skippedNoSummary: 0, missingJoin: 0 };
    const cards = [];
    if (domain === 'nde') {
        const vids = loadJsonl(path.join(dataDir, 'nde_vids.jsonl'));
        const analyses = loadJsonl(path.join(dataDir, 'nde_analysis.jsonl'), { required: false });
        const byId = new Map();
        for (const a of analyses) {
            const k = a.video_id ?? a.videoId;
            if (k && !byId.has(k)) byId.set(k, a);
        }
        const seen = new Set();
        for (const v of vids) {
            const id = v.videoId ?? v.video_id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            if (!isStated(v.analysis_nde_summary)) { notes.skippedNoSummary++; continue; }
            const an = byId.get(id) || null;
            if (!an) notes.missingJoin++;
            const { text, level } = fitCard((lvl) => renderNdeCard({ ...v, videoId: id }, an, lvl));
            cards.push({ id, text, level });
        }
        notes.inputRows = vids.length;
        notes.analysisRows = analyses.length;
    } else {
        const vids = loadJsonl(path.join(dataDir, 'uap_vids.jsonl'));
        const encounters = loadJsonl(path.join(dataDir, 'uap_encounters.jsonl'), { required: false });
        const stats = loadJsonl(path.join(dataDir, 'uap_video_stats.jsonl'), { required: false });
        const encBy = new Map();
        for (const e of encounters) {
            if (!e.video_id) continue;
            if (!encBy.has(e.video_id)) encBy.set(e.video_id, []);
            encBy.get(e.video_id).push(e);
        }
        for (const list of encBy.values()) list.sort((a, b) => (a.encounter_index ?? 0) - (b.encounter_index ?? 0));
        const statsBy = new Map(stats.filter((s) => s.video_id).map((s) => [s.video_id, s]));
        const seen = new Set();
        for (const v of vids) {
            const id = v.video_id ?? v.videoId;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            if (!isStated(v.analysis_uap_summary)) { notes.skippedNoSummary++; continue; }
            const st = statsBy.get(id) || null;
            if (!st) notes.missingJoin++;
            const { text, level } = fitCard((lvl) => renderUapCard({ ...v, video_id: id }, encBy.get(id) || [], st, lvl));
            cards.push({ id, text, level });
        }
        notes.inputRows = vids.length;
        notes.encounterRows = encounters.length;
        notes.statsRows = stats.length;
    }
    cards.sort((a, b) => compareIds(a.id, b.id));
    return { cards, notes };
}

function makeBatches(cards, size) {
    const batches = [];
    for (let i = 0; i < cards.length; i += size) {
        const n = batches.length + 1;
        batches.push({ n, label: String(n).padStart(3, '0'), cards: cards.slice(i, i + size) });
    }
    return batches;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const DOMAIN_NOTES = {
    nde: [
        'Domain: near-death experiences (NDEs) and related experiences (obe, ste, adc) told first-person on YouTube.',
        'Card fields: Greyson is the Greyson NDE Scale total (0 to 32; 7 or more is the conventional NDE threshold). Intensity is 1 to 10. Transformation is the summed after-effects score across ten life-change domains (the card lists the top three domain codes with names). Veridical is the archive\'s evidential-strength rating for verifiable perceptions. Elements present lists the 15 standard NDE elements detected, with a 0-100 confidence and the experiencer\'s own words. A trailing * on a sense means it was described as extraordinary.',
    ].join('\n'),
    uap: [
        'Domain: UAP/UFO encounters, contact experiences, and disclosure testimony on YouTube (tier 1 and 2 videos only).',
        'Card fields: Content, Track and Source describe the video format (first-person experiencer versus researcher, commentary, program disclosure). Hynek types: NL nocturnal light, DD daylight disc, RV radar-visual, CE1 close range, CE2 physical effects, CE3 occupants seen, CE4 abduction or onboard contact, CE5 human-initiated contact. Evidence, contact and transformation are pipeline ratings where higher means more. Vallee is the Vallee classification code when the pipeline assigned one. Flags come from an entity-extraction pass over the transcript.',
    ].join('\n'),
};

function systemPrompt(domain) {
    return [
        'You are a research analyst for Project Profound, a public archive of first-person accounts of near-death experiences and UAP encounters. Each video was transcribed and analyzed by an AI pipeline; you are reading one batch of those analysis cards and writing a batch digest. Digests are later merged into a corpus atlas that an author uses to find chapters, framings and open questions for a book, so precision and traceability matter more than polish.',
        '',
        'Rules:',
        '1. Work only from the cards. Never invent facts, names, numbers, dates or quotes. If a card is ambiguous, say so rather than guessing.',
        '2. Cite video IDs (the 11-character codes in square-bracket headers) for every claim, count, example and quote, so the author can go back to the source. A statement without a video ID is not useful.',
        '3. Quotes: copy verbatim from the cards only, keep them short, and follow each with its video ID. Never paraphrase inside quotation marks and never assemble a quote from two cards.',
        '4. Plain ASCII punctuation only. Do not use em dashes or en dashes; use commas, colons, periods or parentheses instead.',
        '5. Output markdown with exactly the six sections below, in this order, with these exact headings. Put the header line first and nothing after the last section. No preamble, no closing remarks.',
        '6. Length: roughly 600 to 800 words in total (about 700 to 1,000 tokens). Prefer dense bullets over prose.',
        '',
        DOMAIN_NOTES[domain],
        '',
        'Required output format:',
        '',
        `Batch ${domain}-<NNN> | videos: <comma-separated video IDs of every card in the batch>`,
        '',
        '## Themes',
        'Recurring themes in this batch. One bullet per theme: a short theme name, an approximate count out of N (for example "about 12 of 40"), and 1 or 2 example video IDs.',
        '',
        '## Standout accounts',
        '5 to 8 bullets. Each: video ID, title, then one or two sentences on why it stands out and which theme it illustrates.',
        '',
        '## Quotes worth keeping',
        'Verbatim quotes copied from the cards, each in quotation marks followed by its video ID in parentheses. Only quotes that appear word for word on a card.',
        '',
        '## Tensions and contradictions',
        'Where accounts in this batch disagree with each other or with the usual pattern. Cite video IDs on each side of the disagreement.',
        '',
        '## Rare or unusual',
        'Elements, entities, situations or claims that appear only once or twice in this batch, each with its video ID.',
        '',
        '## Book-angle sparks',
        '3 to 5 one-line ideas for chapters, framings or questions this batch suggests, each tied to one or more video IDs.',
    ].join('\n');
}

function userPrompt(domain, batch) {
    const ids = batch.cards.map((c) => c.id);
    return [
        `Batch ${domain}-${batch.label} from the Project Profound ${domain.toUpperCase()} archive. N = ${ids.length} analysis cards follow, separated by lines of dashes.`,
        `Write the digest now. Your first line must be exactly:`,
        `Batch ${domain}-${batch.label} | videos: ${ids.join(', ')}`,
        '',
        '===== CARDS =====',
        '',
        batch.cards.map((c) => c.text).join('\n\n-----\n\n'),
        '',
        '===== END OF CARDS =====',
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

/** One model, with retries on 429/5xx/network/timeout and in-place parameter fixes. */
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

/** Primary model with retries, then one pass on the fallback model (route pattern). */
async function completeDigest(messages, opts, log) {
    try {
        const r = await completeWithModel(opts.model, messages, opts, log);
        return { ...r, requested: opts.model, fallback: false };
    } catch (primaryErr) {
        if (opts.fallbackModel === opts.model) throw primaryErr;
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

function validateDigest(text, domain, label, ids) {
    const problems = [];
    const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
    const headerRe = new RegExp(`^Batch ${domain}-${label} \\| videos:`);
    if (!headerRe.test(firstLine)) problems.push('header line missing or malformed');
    let pos = -1;
    for (const h of SECTION_HEADINGS) {
        const i = text.indexOf('\n' + h, Math.max(pos, 0));
        if (i < 0) problems.push(`missing/out-of-order section: ${h}`);
        else pos = i;
    }
    const extra = (text.match(/^## /gm) || []).length - SECTION_HEADINGS.length;
    if (extra > 0) problems.push(`${extra} extra "## " heading(s)`);
    if (/[–—]/.test(text)) problems.push('contains en/em dash');
    const cited = new Set((text.match(/[A-Za-z0-9_-]{11}/g) || []).filter((t) => ids.includes(t)));
    if (cited.size < Math.min(5, ids.length)) problems.push(`cites only ${cited.size} of ${ids.length} batch IDs`);
    return problems;
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

async function runBatch(domain, batch, opts, totals) {
    const tag = `[${domain}-${batch.label}]`;
    const log = (m) => console.log(`${tag} ${m}`);
    const outFile = path.join(opts.out, domain, `batch-${batch.label}.md`);
    const ids = batch.cards.map((c) => c.id);
    const messages = [
        { role: 'system', content: systemPrompt(domain) },
        { role: 'user', content: userPrompt(domain, batch) },
    ];
    const started = Date.now();
    const r = await completeDigest(messages, opts, log);
    const choice = r.json.choices?.[0];
    const content = (choice?.message?.content || '').trim();
    const usage = r.json.usage || {};
    const modelUsed = r.json.model || r.requested;
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens ?? 0;
    const cost = estimateUsd(modelUsed, promptTokens, completionTokens) ?? estimateUsd(r.requested, promptTokens, completionTokens);
    if (!content) throw new Error(`empty completion from ${modelUsed} (finish_reason=${choice?.finish_reason})`);

    const problems = validateDigest(content, domain, batch.label, ids);
    if (choice?.finish_reason === 'length') problems.push('finish_reason=length (output truncated)');
    writeAtomic(outFile, content.endsWith('\n') ? content : content + '\n');

    const record = {
        ts: new Date().toISOString(), domain, batch: batch.n, file: path.relative(ROOT, outFile),
        videos: ids.length, model_requested: r.requested, model_used: modelUsed, fallback: r.fallback,
        prompt_tokens: promptTokens, completion_tokens: completionTokens, reasoning_tokens: reasoningTokens,
        total_tokens: usage.total_tokens ?? promptTokens + completionTokens, cost_usd: cost,
        cost_is_estimate: true, attempts: r.attempts, param_fixes: r.paramFixes, duration_ms: Date.now() - started,
        finish_reason: choice?.finish_reason ?? null, sections_ok: problems.length === 0,
        problems: problems.length ? problems : undefined, primary_error: r.primaryError,
    };
    fs.mkdirSync(opts.out, { recursive: true });
    fs.appendFileSync(path.join(opts.out, 'usage.jsonl'), JSON.stringify(record) + '\n');

    totals.batches++; totals.prompt += promptTokens; totals.completion += completionTokens; totals.cost += cost ?? 0;
    if (r.fallback) totals.fallbacks++;
    if (problems.length) totals.problems++;
    log(`${modelUsed}${r.fallback ? ' (FALLBACK)' : ''}: ${promptTokens.toLocaleString('en-US')} in / ${completionTokens.toLocaleString('en-US')} out` +
        `${reasoningTokens ? ' (' + reasoningTokens + ' reasoning)' : ''}, $${(cost ?? 0).toFixed(4)}, ${((Date.now() - started) / 1000).toFixed(1)}s` +
        ` -> ${path.relative(ROOT, outFile)} | running total: ${totals.batches} batches, ${(totals.prompt + totals.completion).toLocaleString('en-US')} tokens, $${totals.cost.toFixed(4)}`);
    if (problems.length) log(`WARN digest problems: ${problems.join('; ')}`);
}

async function runPool(items, concurrency, fn) {
    let next = 0;
    const failures = [];
    const worker = async () => {
        while (next < items.length) {
            const item = items[next++];
            try { await fn(item); } catch (err) { failures.push({ item, err }); }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return failures;
}

function printDryRun(domain, cards, batches, notes, opts) {
    const sys = systemPrompt(domain);
    const chars = cards.map((c) => c.text.length);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const avg = chars.length ? sum(chars) / chars.length : 0;
    const overheadPerBatch = sys.length + 400; // system prompt + user framing, roughly
    const inputChars = sum(chars) + batches.length * overheadPerBatch;
    const inputTokens = Math.round(inputChars / 4);
    const outputTokens = batches.length * DEFAULTS.estOutputTokensPerBatch;
    const price = priceFor(opts.model);
    const cost = price ? (inputTokens / 1e6) * price.inputPerM + (outputTokens / 1e6) * price.outputPerM : null;
    const levels = cards.reduce((m, c) => (m[c.level] = (m[c.level] || 0) + 1, m), {});
    console.log(`\n=== DRY RUN: ${domain} ===`);
    console.log(`data dir:          ${opts.data}`);
    console.log(`input rows:        ${notes.inputRows} videos` + (notes.analysisRows != null ? `, ${notes.analysisRows} analysis rows` : '') + (notes.encounterRows != null ? `, ${notes.encounterRows} encounters, ${notes.statsRows} stats rows` : ''));
    console.log(`skipped:           ${notes.skippedNoSummary} without summary; ${notes.missingJoin} cards built without ${domain === 'nde' ? 'analysis' : 'stats'} row`);
    console.log(`cards:             ${cards.length}`);
    console.log(`batches:           ${batches.length} (batch size ${opts.batchSize}; last batch ${batches.length ? batches[batches.length - 1].cards.length : 0} cards)`);
    console.log(`card chars:        avg ${Math.round(avg)}, min ${chars.length ? Math.min(...chars) : 0}, max ${chars.length ? Math.max(...chars) : 0}, target ${CARD_TARGET}, cap ${CARD_HARD_CAP}`);
    console.log(`trim levels:       ${Object.entries(levels).map(([l, n]) => `L${l}=${n}`).join(' ')} (L0 fullest; L4 hard-truncated)`);
    console.log(`est input tokens:  ${inputTokens.toLocaleString('en-US')} total, ~${batches.length ? Math.round(inputTokens / batches.length).toLocaleString('en-US') : 0} per batch (chars/4, includes ~${Math.round(overheadPerBatch / 4)} prompt overhead)`);
    console.log(`est output tokens: ${outputTokens.toLocaleString('en-US')} (${DEFAULTS.estOutputTokensPerBatch} per batch, measured incl. reasoning tokens)`);
    console.log(`est cost:          ${cost == null ? 'unknown model price' : '$' + cost.toFixed(4)} at ${opts.model} ($${price?.inputPerM}/M in, $${price?.outputPerM}/M out)`);
    if (opts.limit !== Infinity) console.log(`--limit ${opts.limit}: would run batch(es) ${batches.slice(0, opts.limit).map((b) => b.label).join(', ')}`);
    if (opts.printCards > 0) {
        for (const c of cards.slice(0, opts.printCards)) console.log(`\n--- card ${c.id} (${c.text.length} chars, level ${c.level}) ---\n${c.text}`);
    }
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
    const { cards, notes } = buildCards(domain, opts.data);
    const batches = makeBatches(cards, opts.batchSize);

    if (opts.dryRun) { printDryRun(domain, cards, batches, notes, opts); return; }

    if (!process.env.OPENAI_API_KEY) { console.error('error: OPENAI_API_KEY is not set'); process.exit(2); }
    if (!cards.length) { console.error('error: no cards built (no input rows with a summary)'); process.exit(1); }

    const selected = batches.slice(0, opts.limit);
    const todo = [], skipped = [];
    for (const b of selected) {
        const f = path.join(opts.out, domain, `batch-${b.label}.md`);
        if (!opts.force && fs.existsSync(f) && fs.statSync(f).size > 0) skipped.push(b.label);
        else todo.push(b);
    }
    console.log(`${domain}: ${cards.length} cards -> ${batches.length} batches; selected ${selected.length}, skipping ${skipped.length} existing, running ${todo.length} on ${opts.model} (fallback ${opts.fallbackModel}), concurrency ${opts.concurrency}`);
    if (notes.skippedNoSummary) console.log(`  (${notes.skippedNoSummary} videos skipped for missing summary)`);
    if (!todo.length) { console.log('nothing to do'); return; }

    const totals = { batches: 0, prompt: 0, completion: 0, cost: 0, fallbacks: 0, problems: 0 };
    const t0 = Date.now();
    const failures = await runPool(todo, opts.concurrency, (b) => runBatch(domain, b, opts, totals));
    for (const f of failures) console.error(`[${domain}-${f.item.label}] FAILED: ${f.err.message}`);

    console.log(`\n=== DONE ${domain}: ${totals.batches} written, ${failures.length} failed, ${skipped.length} skipped; ` +
        `${totals.prompt.toLocaleString('en-US')} prompt + ${totals.completion.toLocaleString('en-US')} completion tokens; est $${totals.cost.toFixed(4)}; ` +
        `${totals.fallbacks} fallback(s), ${totals.problems} with format warnings; ${((Date.now() - t0) / 1000).toFixed(0)}s ===`);
    console.log(`usage log: ${path.relative(ROOT, path.join(opts.out, 'usage.jsonl'))}`);
    if (failures.length) process.exit(1);
}

main().catch((err) => { console.error(`fatal: ${err.stack || err.message}`); process.exit(1); });
