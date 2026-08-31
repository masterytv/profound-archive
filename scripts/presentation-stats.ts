/**
 * Presentation Stats — the citable stat sheet for podcasts, media, and the
 * /about/founder "ask thousands of experiencers" questions.
 *
 * Answers, from the live database:
 *   Q1. What percentage of NDErs and UFO/UAP experiencers come back with
 *       healing abilities?
 *   Q2. How many people see Jesus in NDEs vs UAP encounters?
 *   Q3. How common is telepathy in NDErs?
 *   Q4. What percentage of people experience After Death Communication
 *       (mediumship) abilities?
 *   Q5. In what ways were people transformed after NDEs and UAP encounters?
 *       (per-domain NDE-TI vs UAP CTI, plus the shared-domain fingerprint)
 * ...plus canonical archive counts and bonus wow stats (reality comparison,
 * deceased relatives, being census, fear of death, distressing outcomes).
 *
 * READ-ONLY: select queries only — no writes, no RPCs, no migrations.
 * Pages every table read at 1,000 rows ordered by PK (PostgREST caps
 * responses at 1,000 rows; see docs/LEARNINGS.md §8).
 *
 * Usage:  npx tsx scripts/presentation-stats.ts
 * Output: stdout + logs/presentation-stats-YYYY-MM-DD.md
 * Env:    .env.local with NEXT_PUBLIC_SUPABASE_URL and
 *         SUPABASE_SERVICE_ROLE_KEY (falls back to SUPABASE_SERVICE_KEY,
 *         then the anon key — service key recommended: no statement timeout).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const PAGE = 1000;

const HEALING_RE = /\bheal(?:ing|er|ers|ed|s)?\b/i;
const MEDIUMSHIP_RE =
    /\bmedium(?:ship)?\b|spirit communication|communicat\w* with (?:the )?(?:dead|deceased|spirits)|after[- ]?death communication|\bADC\b|messages? from (?:the )?(?:dead|deceased|other side)/i;
const JESUS_RE = /\bjesus\b|\bchrist\b(?!ian)/i;
const TELEPATHY_RE = /\btelepath/i;

// NDE-TI (10 domains) and UAP CTI (12 domains) share 8 domain codes.
const NDE_DOMAINS = ['AL', 'SI', 'CC', 'VP', 'SA', 'RO', 'AD', 'PE', 'RS', 'PD'] as const;
const UAP_DOMAINS = ['AL', 'SI', 'CC', 'VP', 'SA', 'CO', 'EO', 'PE', 'RS', 'PD', 'DA', 'ES'] as const;
const SHARED_DOMAINS = ['AL', 'SI', 'CC', 'VP', 'SA', 'PE', 'RS', 'PD'] as const;

const DOMAIN_NAMES: Record<string, string> = {
    AL: 'Appreciation for Life',
    SI: 'Self-Perception & Identity',
    CC: 'Compassion & Concern for Others',
    VP: 'Values & Priorities',
    SA: 'Spiritual Awareness',
    RO: 'Religious Orientation',
    AD: 'Attitude Toward Death',
    PE: 'Psychic & Expanded Perception',
    RS: 'Relationships & Social Dynamics',
    PD: 'Purpose, Meaning & Life Direction',
    CO: 'Cosmological Orientation',
    EO: 'Existential Orientation',
    DA: 'Disclosure & Advocacy',
    ES: 'Electromagnetic & Somatic Sensitivity',
};

type DomainTally = {
    scored: number; // rows where this domain scored >= 1
    scoreSum: number; // sum of scores among scored rows
    directions: Record<string, number>;
};

function newDomainTally(): DomainTally {
    return { scored: 0, scoreSum: 0, directions: {} };
}

function pct(n: number, d: number): string {
    if (!d) return 'n/a (0 denominator)';
    return `${((n / d) * 100).toFixed(1)}% (${n.toLocaleString()} of ${d.toLocaleString()})`;
}

function bump(map: Record<string, number>, key: string | null | undefined): void {
    const k = (key ?? 'not_stated').toString();
    map[k] = (map[k] ?? 0) + 1;
}

function topEntries(map: Record<string, number>, n = 6): string {
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
        .join(' · ');
}

/** Page through a table, invoking cb per row. Ordered by pk for stable pages. */
async function forEachRow(
    sb: SupabaseClient,
    table: string,
    select: string,
    pk: string,
    filters: ((q: any) => any) | null,
    cb: (row: any) => void,
): Promise<number> {
    let offset = 0;
    let total = 0;
    for (;;) {
        let q: any = sb.from(table).select(select).order(pk, { ascending: true }).range(offset, offset + PAGE - 1);
        if (filters) q = filters(q);
        const { data, error } = await q;
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const row of data) cb(row);
        total += data.length;
        if (data.length < PAGE) break;
        offset += PAGE;
    }
    return total;
}

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL / a Supabase key in .env.local');
        process.exit(1);
    }
    const sb = createClient(url, key);
    const today = new Date().toISOString().slice(0, 10);

    // ── Pass 1: NDE videos — clear-NDE slice + rvNDE veridical scores ──
    const clearIds = new Set<string>();
    let ndeVidsTotal = 0;
    let rvndeScored = 0;
    let rvndeSum = 0;
    const rvndeLevels: Record<string, number> = {};
    ndeVidsTotal = await forEachRow(
        sb, 'nde_vids', 'videoId, isNde, rvnde_total_score, rvnde_level', 'videoId', null,
        (r) => {
            if (r.isNde === 'clear_nde') {
                clearIds.add(r.videoId);
                if (typeof r.rvnde_total_score === 'number' && r.rvnde_total_score > 0) {
                    rvndeScored++;
                    rvndeSum += r.rvnde_total_score;
                    bump(rvndeLevels, r.rvnde_level);
                }
            }
        },
    );

    // ── Pass 2: NDE analysis (clear-NDE slice unless noted) ──
    let analyzedAll = 0; // all nde_analysis rows seen
    let denomClear = 0; // analysis rows on clear-NDE videos
    let denomCore = 0;
    const elementCounts: Record<string, number> = {};
    let denomEntities = 0; // rows with >= 1 entity encounter
    let entityTotal = 0;
    const entityComm: Record<string, number> = {};
    const entityTypes: Record<string, number> = {};
    const entityEmotion: Record<string, number> = {};
    let jesusRowsNde = 0;
    let religiousFigureRows = 0;
    let denomPhenom = 0;
    const realityCounts: Record<string, number> = {};
    let clarityEnhanced = 0;
    let lucidityParadox = 0; // more_real AND enhanced clarity
    let denomTrans = 0;
    const ndeDomains: Record<string, DomainTally> = {};
    for (const d of NDE_DOMAINS) ndeDomains[d] = newDomainTally();
    let psiNde = 0; // PE >= 1 with direction up/new
    let healingNdePE = 0;
    let healingNdeAny = 0;
    let mediumshipNde = 0;
    let transScoreSum = 0;
    let transScored = 0;
    const expTypesAll: Record<string, number> = {}; // across ALL analysis rows
    let distressing = 0;
    let distressingTransSum = 0;
    let distressingTransScored = 0;
    const toneCounts: Record<string, number> = {};

    analyzedAll = await forEachRow(
        sb,
        'nde_analysis',
        'video_id, experience_type, core_elements, entities, phenomenology, transformation_score, transformation_breakdown, journey_nde_type, overall_tone',
        'video_id',
        null,
        (r) => {
            bump(expTypesAll, r.experience_type);
            if (!clearIds.has(r.video_id)) return;
            denomClear++;
            bump(toneCounts, r.overall_tone);
            if (r.journey_nde_type === 'distressing') distressing++;

            const elements = Array.isArray(r.core_elements) ? r.core_elements : null;
            if (elements) {
                denomCore++;
                for (const el of elements) {
                    if (el && el.present === true && el.name) bump(elementCounts, el.name);
                }
            }

            const encounters = Array.isArray(r.entities?.encounters) ? r.entities.encounters : null;
            if (encounters && encounters.length > 0) {
                denomEntities++;
                let sawJesus = false;
                let sawReligious = false;
                for (const e of encounters) {
                    entityTotal++;
                    bump(entityComm, e?.communication_method);
                    bump(entityTypes, e?.entity_type);
                    bump(entityEmotion, e?.emotional_quality);
                    if (typeof e?.identity === 'string' && JESUS_RE.test(e.identity)) sawJesus = true;
                    if (e?.entity_type === 'religious_figure') sawReligious = true;
                }
                if (sawJesus) jesusRowsNde++;
                if (sawReligious) religiousFigureRows++;
            }

            const ph = r.phenomenology;
            if (ph && typeof ph === 'object' && ph.reality_comparison) {
                denomPhenom++;
                bump(realityCounts, ph.reality_comparison);
                const clarity = ph.altered_cognition?.thought_clarity;
                if (clarity === 'enhanced') {
                    clarityEnhanced++;
                    if (ph.reality_comparison === 'more_real') lucidityParadox++;
                }
            }

            const da = r.transformation_breakdown?.domain_analysis;
            if (da && typeof da === 'object') {
                denomTrans++;
                if (typeof r.transformation_score === 'number' && r.transformation_score >= 0) {
                    transScored++;
                    transScoreSum += r.transformation_score;
                    if (r.journey_nde_type === 'distressing') {
                        distressingTransScored++;
                        distressingTransSum += r.transformation_score;
                    }
                }
                let healAny = false;
                let mediumAny = false;
                for (const d of NDE_DOMAINS) {
                    const dom = da[d];
                    if (!dom || typeof dom.score !== 'number' || dom.score < 1) continue;
                    ndeDomains[d].scored++;
                    ndeDomains[d].scoreSum += dom.score;
                    bump(ndeDomains[d].directions, dom.direction);
                    const text = `${dom.evidence_summary ?? ''} ${dom.key_quote ?? ''}`;
                    if (HEALING_RE.test(text)) {
                        healAny = true;
                        if (d === 'PE') healingNdePE = healingNdePE + 1;
                    }
                    if (MEDIUMSHIP_RE.test(text)) mediumAny = true;
                }
                const pe = da.PE;
                if (pe && typeof pe.score === 'number' && pe.score >= 1 && ['up', 'new'].includes(pe.direction)) {
                    psiNde++;
                }
                if (healAny) healingNdeAny++;
                if (mediumAny) mediumshipNde++;
            }
        },
    );

    // ── Pass 3: UAP encounters ──
    let uapRows = 0;
    const uapExperiencers = new Set<string>();
    let uapDenomTrans = 0;
    const uapDomains: Record<string, DomainTally> = {};
    for (const d of UAP_DOMAINS) uapDomains[d] = newDomainTally();
    let psiUap = 0;
    let healingUapAny = 0;
    let uapDenomPhenom = 0;
    let uapDenomEntities = 0;
    let uapEntityTotal = 0;
    const uapEntityComm: Record<string, number> = {};
    const uapEntityTypes: Record<string, number> = {};
    let jesusRowsUap = 0;
    let telepathyRowsUap = 0; // any telepathy signal in the phenomenology payload
    let uapTransScoreSum = 0;
    let uapTransScored = 0;

    uapRows = await forEachRow(
        sb,
        'uap_encounters',
        'id, experiencer_name, phenomenology_breakdown, transformation_score, transformation_breakdown',
        'id',
        null,
        (r) => {
            if (r.experiencer_name) uapExperiencers.add(String(r.experiencer_name).toLowerCase().trim());

            const pb = r.phenomenology_breakdown;
            if (pb && typeof pb === 'object') {
                uapDenomPhenom++;
                const ents = Array.isArray(pb.entities) ? pb.entities : [];
                if (ents.length > 0) {
                    uapDenomEntities++;
                    let sawJesus = false;
                    for (const e of ents) {
                        uapEntityTotal++;
                        bump(uapEntityComm, e?.communication_method);
                        bump(uapEntityTypes, e?.entity_type);
                        if (JESUS_RE.test(JSON.stringify(e))) sawJesus = true;
                    }
                    if (sawJesus) jesusRowsUap++;
                }
                if (TELEPATHY_RE.test(JSON.stringify(pb))) telepathyRowsUap++;
            }

            const da = r.transformation_breakdown?.domain_analysis;
            if (da && typeof da === 'object') {
                uapDenomTrans++;
                if (typeof r.transformation_score === 'number' && r.transformation_score >= 0) {
                    uapTransScored++;
                    uapTransScoreSum += r.transformation_score;
                }
                let healAny = false;
                for (const d of UAP_DOMAINS) {
                    const dom = da[d];
                    if (!dom || typeof dom.score !== 'number' || dom.score < 1) continue;
                    uapDomains[d].scored++;
                    uapDomains[d].scoreSum += dom.score;
                    bump(uapDomains[d].directions, dom.direction);
                    if (HEALING_RE.test(`${dom.evidence_summary ?? ''} ${dom.key_quote ?? ''}`)) healAny = true;
                }
                const pe = da.PE;
                if (pe && typeof pe.score === 'number' && pe.score >= 1 && ['up', 'new'].includes(pe.direction)) {
                    psiUap++;
                }
                if (healAny) healingUapAny++;
            }
        },
    );

    // ── Build the report ──
    const L: string[] = [];
    const add = (s = '') => L.push(s);

    add(`# Project Profound — Presentation Stat Sheet (${today})`);
    add();
    add('Every figure below is computed from the live research database by');
    add('`scripts/presentation-stats.ts`. Percentages carry their numerator and');
    add('denominator; definitions are in the Methods section. Cite nothing that');
    add(`is not on this sheet. Generated: ${new Date().toISOString()}`);
    add();
    add('## Archive scale (canonical counts)');
    add();
    add(`- NDE video library: ${ndeVidsTotal.toLocaleString()} rows; **confirmed clear NDEs: ${clearIds.size.toLocaleString()}**`);
    add(`- Clear-NDE accounts with structured analysis: ${denomClear.toLocaleString()} (of ${analyzedAll.toLocaleString()} analyzed rows overall)`);
    add(`- UAP encounter records: ${uapRows.toLocaleString()}; unique named experiencers: ${uapExperiencers.size.toLocaleString()}`);
    add(`- Experience types across all analyzed accounts: ${topEntries(expTypesAll, 8)}`);
    add();
    add('## Q1 — Healing abilities after the experience');
    add();
    add(`- NDErs with psychic/expanded-perception aftereffects (PE domain ≥1, direction up/new): ${pct(psiNde, denomTrans)}`);
    add(`- NDErs whose transformation evidence mentions healing (any domain): ${pct(healingNdeAny, denomTrans)}`);
    add(`- …specifically in the PE domain: ${pct(healingNdePE, denomTrans)}`);
    add(`- UAP experiencers with PE aftereffects (CTI PE ≥1, up/new): ${pct(psiUap, uapDenomTrans)}`);
    add(`- UAP encounters whose transformation evidence mentions healing: ${pct(healingUapAny, uapDenomTrans)}`);
    add();
    add('## Q2 — Jesus in NDEs vs UAP encounters');
    add();
    add(`- Clear-NDE accounts naming Jesus/Christ among encountered beings: ${pct(jesusRowsNde, denomEntities)} of accounts with being encounters`);
    add(`- Clear-NDE accounts encountering a religious figure (any): ${pct(religiousFigureRows, denomEntities)}`);
    add(`- UAP encounters whose entity descriptions mention Jesus/Christ: ${pct(jesusRowsUap, uapDenomEntities)} of encounters with described entities`);
    add();
    add('## Q3 — Telepathy in NDErs (and UAP experiencers)');
    add();
    add(`- Clear-NDE accounts with the telepathy core element ("communication without words"): ${pct(elementCounts['telepathy'] ?? 0, denomCore)}`);
    add(`- Being encounters communicating telepathically: ${pct(entityComm['telepathy'] ?? 0, entityTotal)} of all described beings`);
    add(`- NDE entity communication methods: ${topEntries(entityComm)}`);
    add(`- UAP encounters with any telepathy signal in the phenomenology record: ${pct(telepathyRowsUap, uapDenomPhenom)}`);
    add(`- UAP entity communication methods: ${topEntries(uapEntityComm)}`);
    add();
    add('## Q4 — After Death Communication / mediumship abilities');
    add();
    add(`- Clear-NDE accounts whose aftereffect evidence mentions mediumship or communicating with the deceased: ${pct(mediumshipNde, denomTrans)}`);
    add(`- ADC-type accounts in the wider archive (experience_type = adc, all analyzed rows): ${(expTypesAll['adc'] ?? 0).toLocaleString()}`);
    add();
    add('## Q5 — In what ways were people transformed?');
    add();
    add(`NDE (NDE-TI, ${denomTrans.toLocaleString()} scored accounts; mean overall score ${transScored ? (transScoreSum / transScored).toFixed(1) : 'n/a'}/50):`);
    add();
    add('| Domain | Affected (score ≥1) | Mean score | Top directions |');
    add('|---|---|---|---|');
    for (const d of NDE_DOMAINS) {
        const t = ndeDomains[d];
        add(`| ${d} — ${DOMAIN_NAMES[d]} | ${pct(t.scored, denomTrans)} | ${t.scored ? (t.scoreSum / t.scored).toFixed(1) : '—'}/5 | ${topEntries(t.directions, 3)} |`);
    }
    add();
    add(`UAP (CTI, ${uapDenomTrans.toLocaleString()} scored encounters; mean overall score ${uapTransScored ? (uapTransScoreSum / uapTransScored).toFixed(1) : 'n/a'}):`);
    add();
    add('| Domain | Affected (score ≥1) | Mean score | Top directions |');
    add('|---|---|---|---|');
    for (const d of UAP_DOMAINS) {
        const t = uapDomains[d];
        add(`| ${d} — ${DOMAIN_NAMES[d]} | ${pct(t.scored, uapDenomTrans)} | ${t.scored ? (t.scoreSum / t.scored).toFixed(1) : '—'}/5 | ${topEntries(t.directions, 3)} |`);
    }
    add();
    add('The shared-domain fingerprint (same instrument codes, two phenomena):');
    add();
    add('| Domain | NDE affected | UAP affected |');
    add('|---|---|---|');
    for (const d of SHARED_DOMAINS) {
        add(`| ${d} — ${DOMAIN_NAMES[d]} | ${pct(ndeDomains[d].scored, denomTrans)} | ${pct(uapDomains[d].scored, uapDenomTrans)} |`);
    }
    add();
    add('## Bonus wow stats (NDE, clear-NDE slice)');
    add();
    add(`- "More real than real": ${pct(realityCounts['more_real'] ?? 0, denomPhenom)}; reality comparison: ${topEntries(realityCounts)}`);
    add(`- Enhanced thought clarity during the experience: ${pct(clarityEnhanced, denomPhenom)}; the lucidity paradox (more real AND clearer thinking): ${pct(lucidityParadox, denomPhenom)}`);
    add(`- Greeted by deceased relatives (core element): ${pct(elementCounts['deceased_relatives'] ?? 0, denomCore)}`);
    add(`- Knowledge download (core element): ${pct(elementCounts['knowledge_download'] ?? 0, denomCore)}`);
    add(`- Being census — types: ${topEntries(entityTypes)}`);
    add(`- Being census — emotional quality: ${topEntries(entityEmotion)}`);
    add(`- Attitude Toward Death shifted (AD ≥1): ${pct(ndeDomains['AD'].scored, denomTrans)}`);
    add(`- Purpose & Life Direction shifted (PD ≥1): ${pct(ndeDomains['PD'].scored, denomTrans)}`);
    add(`- Distressing experiences: ${pct(distressing, denomClear)}; their mean transformation score: ${distressingTransScored ? (distressingTransSum / distressingTransScored).toFixed(1) : 'n/a'}/50 (vs ${transScored ? (transScoreSum / transScored).toFixed(1) : 'n/a'} overall)`);
    add(`- Overall tone: ${topEntries(toneCounts)}`);
    add(`- Veridical (rvNDE) scored accounts: ${rvndeScored.toLocaleString()} (mean score ${rvndeScored ? (rvndeSum / rvndeScored).toFixed(1) : 'n/a'}); levels: ${topEntries(rvndeLevels)}`);
    add();
    add('## Methods & definitions');
    add();
    add(`- NDE slice = videos with isNde = 'clear_nde' (${clearIds.size.toLocaleString()}); each stat's denominator is the subset with that analysis present.`);
    add('- "Affected" in a transformation domain = score ≥1 of 5 on the NDE-TI / UAP CTI instrument for that domain.');
    add(`- Psychic aftereffects = PE domain ≥1 with direction "up" or "new". Healing mention = /${HEALING_RE.source}/i over domain evidence + key quotes. Mediumship mention = regex over the same text (see script for pattern).`);
    add('- Jesus census (NDE) matches the entity identity field only; UAP matches anywhere in the entity record. "christ" excludes "christian".');
    add('- UAP telepathy signal = telepathy as an entity communication method or the word telepath* anywhere in the phenomenology record.');
    add('- AI-scored corpus: instruments and prompts are published in src/lib/ai/. These are testimony statistics, not clinical measurements.');

    const report = L.join('\n');
    console.log(report);
    const outDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `presentation-stats-${today}.md`);
    fs.writeFileSync(outPath, report);
    console.log(`\n[saved] ${outPath}`);
}

main().catch((err) => {
    console.error('presentation-stats failed:', err);
    process.exit(1);
});
