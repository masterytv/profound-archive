/**
 * Presentation stats pipeline — computes the citable archive stat sheet
 * (the /about/founder "ask thousands of experiencers" questions plus the
 * transformation fingerprint) from the live database.
 *
 * Consumers:
 *  - scripts/presentation-stats.ts       CLI: print/save markdown, --publish
 *  - scripts/weekly-maintenance.ts       step 4: weekly cache refresh (Oracle)
 *  - src/app/research/stats/page.tsx     renders the cached JSON
 *
 * Storage: viz_graph_cache row viz_id = 'presentation-stats' (no schema
 * change — same generic cache the viz pipelines use).
 *
 * READ-ONLY against source tables; the only write is the cache upsert in
 * refreshPresentationStats(). All reads paged at 1,000 rows ordered by PK
 * (PostgREST response cap — docs/LEARNINGS.md §8).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const PRESENTATION_STATS_VIZ_ID = 'presentation-stats';

const PAGE = 1000;

const HEALING_RE = /\bheal(?:ing|er|ers|ed|s)?\b/i;
const MEDIUMSHIP_RE =
    /\bmedium(?:ship)?\b|spirit communication|communicat\w* with (?:the )?(?:dead|deceased|spirits)|after[- ]?death communication|\bADC\b|messages? from (?:the )?(?:dead|deceased|other side)/i;
const JESUS_RE = /\bjesus\b|\bchrist\b(?!ian)/i;
const TELEPATHY_RE = /\btelepath/i;

export const NDE_DOMAINS = ['AL', 'SI', 'CC', 'VP', 'SA', 'RO', 'AD', 'PE', 'RS', 'PD'] as const;
export const UAP_DOMAINS = ['AL', 'SI', 'CC', 'VP', 'SA', 'CO', 'EO', 'PE', 'RS', 'PD', 'DA', 'ES'] as const;
export const SHARED_DOMAINS = ['AL', 'SI', 'CC', 'VP', 'SA', 'PE', 'RS', 'PD'] as const;

export const DOMAIN_NAMES: Record<string, string> = {
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

export type Frac = { n: number; d: number };

export type DomainStat = {
    code: string;
    name: string;
    affected: Frac;
    mean: number | null; // mean score among affected rows, 0-5
    directions: Record<string, number>;
};

export type PresentationStats = {
    generated_at: string;
    archive: {
        nde_rows: number;
        clear_nde: number;
        analyzed_clear: number;
        analyzed_all: number;
        uap_encounters: number;
        uap_experiencers: number;
        experience_types: Record<string, number>;
    };
    healing: { nde_psi: Frac; nde_healing_any: Frac; nde_healing_pe: Frac; uap_psi: Frac; uap_healing: Frac };
    jesus: { nde_jesus: Frac; nde_religious: Frac; uap_jesus: Frac };
    telepathy: {
        nde_element: Frac;
        nde_beings: Frac;
        nde_comm: Record<string, number>;
        uap_signal: Frac;
        uap_comm: Record<string, number>;
    };
    adc: { mediumship: Frac; adc_accounts: number };
    transformation: {
        nde: { denom: number; mean: number | null; max: number; domains: DomainStat[] };
        uap: { denom: number; mean: number | null; max: number; domains: DomainStat[] };
        shared_codes: string[];
    };
    bonus: {
        more_real: Frac;
        reality: Record<string, number>;
        clarity: Frac;
        lucidity: Frac;
        deceased: Frac;
        download: Frac;
        entity_types: Record<string, number>;
        entity_emotion: Record<string, number>;
        distressing: Frac;
        distressing_mean: number | null;
        tone: Record<string, number>;
        rvnde: { scored: number; mean: number | null; levels: Record<string, number> };
    };
};

// ── formatting helpers (shared by the CLI markdown and the site page) ──

export function fmtPct(f: Frac): string {
    if (!f.d) return 'n/a';
    const p = (f.n / f.d) * 100;
    if (f.n > 0 && p < 0.1) return '<0.1%';
    return `${p.toFixed(1)}%`;
}

export function fmtFrac(f: Frac): string {
    if (!f.d) return 'n/a (0 denominator)';
    return `${fmtPct(f)} (${f.n.toLocaleString()} of ${f.d.toLocaleString()})`;
}

export function topEntries(map: Record<string, number>, n = 6): string {
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
        .join(' · ');
}

type DomainTally = { scored: number; scoreSum: number; directions: Record<string, number> };

function newTally(): DomainTally {
    return { scored: 0, scoreSum: 0, directions: {} };
}

function bump(map: Record<string, number>, key: string | null | undefined): void {
    // Normalize so "not stated" and "not_stated" tally together.
    const k = (key ?? 'not_stated').toString().trim().toLowerCase().replace(/\s+/g, '_') || 'not_stated';
    map[k] = (map[k] ?? 0) + 1;
}

function toDomainStats(codes: readonly string[], tallies: Record<string, DomainTally>, denom: number): DomainStat[] {
    return codes.map((code) => {
        const t = tallies[code];
        return {
            code,
            name: DOMAIN_NAMES[code],
            affected: { n: t.scored, d: denom },
            mean: t.scored ? Number((t.scoreSum / t.scored).toFixed(1)) : null,
            directions: t.directions,
        };
    });
}

/** Page through a table invoking cb per row; ordered by pk for stable pages. */
async function forEachRow(
    sb: SupabaseClient,
    table: string,
    select: string,
    pk: string,
    cb: (row: any) => void,
): Promise<number> {
    let offset = 0;
    let total = 0;
    for (;;) {
        const { data, error } = await sb
            .from(table)
            .select(select)
            .order(pk, { ascending: true })
            .range(offset, offset + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const row of data) cb(row);
        total += data.length;
        if (data.length < PAGE) break;
        offset += PAGE;
    }
    return total;
}

export async function computePresentationStats(sb: SupabaseClient): Promise<PresentationStats> {
    // ── Pass 1: NDE videos — clear-NDE slice + rvNDE ──
    const clearIds = new Set<string>();
    let rvndeScored = 0;
    let rvndeSum = 0;
    const rvndeLevels: Record<string, number> = {};
    const ndeVidsTotal = await forEachRow(
        sb, 'nde_vids', 'videoId, isNde, rvnde_total_score, rvnde_level', 'videoId',
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
    let denomClear = 0;
    let denomCore = 0;
    const elementCounts: Record<string, number> = {};
    let denomEntities = 0;
    let entityTotal = 0;
    const entityComm: Record<string, number> = {};
    const entityTypes: Record<string, number> = {};
    const entityEmotion: Record<string, number> = {};
    let jesusRowsNde = 0;
    let religiousFigureRows = 0;
    let denomPhenom = 0;
    const realityCounts: Record<string, number> = {};
    let clarityEnhanced = 0;
    let lucidityParadox = 0;
    let denomTrans = 0;
    const ndeDomains: Record<string, DomainTally> = {};
    for (const d of NDE_DOMAINS) ndeDomains[d] = newTally();
    let psiNde = 0;
    let healingNdePE = 0;
    let healingNdeAny = 0;
    let mediumshipNde = 0;
    let transScoreSum = 0;
    let transScored = 0;
    const expTypesAll: Record<string, number> = {};
    let distressing = 0;
    let distressingTransSum = 0;
    let distressingTransScored = 0;
    const toneCounts: Record<string, number> = {};

    const analyzedAll = await forEachRow(
        sb,
        'nde_analysis',
        'video_id, experience_type, core_elements, entities, phenomenology, transformation_score, transformation_breakdown, journey_nde_type, overall_tone',
        'video_id',
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
                if (ph.altered_cognition?.thought_clarity === 'enhanced') {
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
                        if (d === 'PE') healingNdePE++;
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
    const uapExperiencers = new Set<string>();
    let uapDenomTrans = 0;
    const uapDomains: Record<string, DomainTally> = {};
    for (const d of UAP_DOMAINS) uapDomains[d] = newTally();
    let psiUap = 0;
    let healingUapAny = 0;
    let uapDenomPhenom = 0;
    let uapDenomEntities = 0;
    const uapEntityComm: Record<string, number> = {};
    let jesusRowsUap = 0;
    let telepathyRowsUap = 0;
    let uapTransScoreSum = 0;
    let uapTransScored = 0;

    const uapRows = await forEachRow(
        sb,
        'uap_encounters',
        'id, experiencer_name, phenomenology_breakdown, transformation_score, transformation_breakdown',
        'id',
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
                        bump(uapEntityComm, e?.communication_method);
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

    return {
        generated_at: new Date().toISOString(),
        archive: {
            nde_rows: ndeVidsTotal,
            clear_nde: clearIds.size,
            analyzed_clear: denomClear,
            analyzed_all: analyzedAll,
            uap_encounters: uapRows,
            uap_experiencers: uapExperiencers.size,
            experience_types: expTypesAll,
        },
        healing: {
            nde_psi: { n: psiNde, d: denomTrans },
            nde_healing_any: { n: healingNdeAny, d: denomTrans },
            nde_healing_pe: { n: healingNdePE, d: denomTrans },
            uap_psi: { n: psiUap, d: uapDenomTrans },
            uap_healing: { n: healingUapAny, d: uapDenomTrans },
        },
        jesus: {
            nde_jesus: { n: jesusRowsNde, d: denomEntities },
            nde_religious: { n: religiousFigureRows, d: denomEntities },
            uap_jesus: { n: jesusRowsUap, d: uapDenomEntities },
        },
        telepathy: {
            nde_element: { n: elementCounts['telepathy'] ?? 0, d: denomCore },
            nde_beings: { n: entityComm['telepathy'] ?? 0, d: entityTotal },
            nde_comm: entityComm,
            uap_signal: { n: telepathyRowsUap, d: uapDenomPhenom },
            uap_comm: uapEntityComm,
        },
        adc: {
            mediumship: { n: mediumshipNde, d: denomTrans },
            adc_accounts: expTypesAll['adc'] ?? 0,
        },
        transformation: {
            nde: {
                denom: denomTrans,
                mean: transScored ? Number((transScoreSum / transScored).toFixed(1)) : null,
                max: 50,
                domains: toDomainStats(NDE_DOMAINS, ndeDomains, denomTrans),
            },
            uap: {
                denom: uapDenomTrans,
                mean: uapTransScored ? Number((uapTransScoreSum / uapTransScored).toFixed(1)) : null,
                max: 60,
                domains: toDomainStats(UAP_DOMAINS, uapDomains, uapDenomTrans),
            },
            shared_codes: [...SHARED_DOMAINS],
        },
        bonus: {
            more_real: { n: realityCounts['more_real'] ?? 0, d: denomPhenom },
            reality: realityCounts,
            clarity: { n: clarityEnhanced, d: denomPhenom },
            lucidity: { n: lucidityParadox, d: denomPhenom },
            deceased: { n: elementCounts['deceased_relatives'] ?? 0, d: denomCore },
            download: { n: elementCounts['knowledge_download'] ?? 0, d: denomCore },
            entity_types: entityTypes,
            entity_emotion: entityEmotion,
            distressing: { n: distressing, d: denomClear },
            distressing_mean: distressingTransScored
                ? Number((distressingTransSum / distressingTransScored).toFixed(1))
                : null,
            tone: toneCounts,
            rvnde: {
                scored: rvndeScored,
                mean: rvndeScored ? Number((rvndeSum / rvndeScored).toFixed(1)) : null,
                levels: rvndeLevels,
            },
        },
    };
}

export function renderMarkdown(s: PresentationStats): string {
    const L: string[] = [];
    const add = (line = '') => L.push(line);
    const day = s.generated_at.slice(0, 10);

    add(`# Project Profound — Presentation Stat Sheet (${day})`);
    add();
    add('Every figure below is computed from the live research database.');
    add('Percentages carry their numerator and denominator; definitions are in');
    add(`the Methods section. Cite nothing that is not on this sheet. Generated: ${s.generated_at}`);
    add();
    add('## Archive scale (canonical counts)');
    add();
    add(`- NDE video library: ${s.archive.nde_rows.toLocaleString()} rows; **confirmed clear NDEs: ${s.archive.clear_nde.toLocaleString()}**`);
    add(`- Clear-NDE accounts with structured analysis: ${s.archive.analyzed_clear.toLocaleString()} (of ${s.archive.analyzed_all.toLocaleString()} analyzed rows overall)`);
    add(`- UAP encounter records: ${s.archive.uap_encounters.toLocaleString()}; unique named experiencers: ${s.archive.uap_experiencers.toLocaleString()}`);
    add(`- Experience types across all analyzed accounts: ${topEntries(s.archive.experience_types, 8)}`);
    add();
    add('## Q1 — Healing abilities after the experience');
    add();
    add(`- NDErs with psychic/expanded-perception aftereffects (PE domain ≥1, direction up/new): ${fmtFrac(s.healing.nde_psi)}`);
    add(`- NDErs whose transformation evidence mentions healing (any domain): ${fmtFrac(s.healing.nde_healing_any)}`);
    add(`- …specifically in the PE domain: ${fmtFrac(s.healing.nde_healing_pe)}`);
    add(`- UAP experiencers with PE aftereffects (CTI PE ≥1, up/new): ${fmtFrac(s.healing.uap_psi)}`);
    add(`- UAP encounters whose transformation evidence mentions healing: ${fmtFrac(s.healing.uap_healing)}`);
    add();
    add('## Q2 — Jesus in NDEs vs UAP encounters');
    add();
    add(`- Clear-NDE accounts naming Jesus/Christ among encountered beings: ${fmtFrac(s.jesus.nde_jesus)} of accounts with being encounters`);
    add(`- Clear-NDE accounts encountering a religious figure (any): ${fmtFrac(s.jesus.nde_religious)}`);
    add(`- UAP encounters whose entity descriptions mention Jesus/Christ: ${fmtFrac(s.jesus.uap_jesus)} of encounters with described entities`);
    add();
    add('## Q3 — Telepathy in NDErs (and UAP experiencers)');
    add();
    add(`- Clear-NDE accounts with the telepathy core element ("communication without words"): ${fmtFrac(s.telepathy.nde_element)}`);
    add(`- Being encounters communicating telepathically: ${fmtFrac(s.telepathy.nde_beings)} of all described beings`);
    add(`- NDE entity communication methods: ${topEntries(s.telepathy.nde_comm)}`);
    add(`- UAP encounters with any telepathy signal in the phenomenology record: ${fmtFrac(s.telepathy.uap_signal)}`);
    add(`- UAP entity communication methods: ${topEntries(s.telepathy.uap_comm)}`);
    add();
    add('## Q4 — After Death Communication / mediumship abilities');
    add();
    add(`- Clear-NDE accounts whose aftereffect evidence mentions mediumship or communicating with the deceased: ${fmtFrac(s.adc.mediumship)}`);
    add(`- ADC-type accounts in the wider archive (experience_type = adc, all analyzed rows): ${s.adc.adc_accounts.toLocaleString()}`);
    add();
    add('## Q5 — In what ways were people transformed?');
    add();
    add(`NDE (NDE-TI, ${s.transformation.nde.denom.toLocaleString()} scored accounts; mean overall score ${s.transformation.nde.mean ?? 'n/a'}/${s.transformation.nde.max}):`);
    add();
    add('| Domain | Affected (score ≥1) | Mean score | Top directions |');
    add('|---|---|---|---|');
    for (const d of s.transformation.nde.domains) {
        add(`| ${d.code} — ${d.name} | ${fmtFrac(d.affected)} | ${d.mean ?? '—'}/5 | ${topEntries(d.directions, 3)} |`);
    }
    add();
    add(`UAP (CTI, ${s.transformation.uap.denom.toLocaleString()} scored encounters; mean overall score ${s.transformation.uap.mean ?? 'n/a'}/${s.transformation.uap.max}):`);
    add();
    add('| Domain | Affected (score ≥1) | Mean score | Top directions |');
    add('|---|---|---|---|');
    for (const d of s.transformation.uap.domains) {
        add(`| ${d.code} — ${d.name} | ${fmtFrac(d.affected)} | ${d.mean ?? '—'}/5 | ${topEntries(d.directions, 3)} |`);
    }
    add();
    add('The shared-domain fingerprint (same instrument codes, two phenomena):');
    add();
    add('| Domain | NDE affected | UAP affected |');
    add('|---|---|---|');
    const uapByCode = new Map(s.transformation.uap.domains.map((d) => [d.code, d]));
    for (const d of s.transformation.nde.domains) {
        if (!s.transformation.shared_codes.includes(d.code)) continue;
        const u = uapByCode.get(d.code);
        add(`| ${d.code} — ${d.name} | ${fmtFrac(d.affected)} | ${u ? fmtFrac(u.affected) : 'n/a'} |`);
    }
    add();
    add('## Bonus wow stats (NDE, clear-NDE slice)');
    add();
    add(`- "More real than real": ${fmtFrac(s.bonus.more_real)}; reality comparison: ${topEntries(s.bonus.reality)}`);
    add(`- Enhanced thought clarity during the experience: ${fmtFrac(s.bonus.clarity)}; the lucidity paradox (more real AND clearer thinking): ${fmtFrac(s.bonus.lucidity)}`);
    add(`- Greeted by deceased relatives (core element): ${fmtFrac(s.bonus.deceased)}`);
    add(`- Knowledge download (core element): ${fmtFrac(s.bonus.download)}`);
    add(`- Being census — types: ${topEntries(s.bonus.entity_types)}`);
    add(`- Being census — emotional quality: ${topEntries(s.bonus.entity_emotion)}`);
    add(`- Distressing experiences: ${fmtFrac(s.bonus.distressing)}; their mean transformation score: ${s.bonus.distressing_mean ?? 'n/a'}/50 (vs ${s.transformation.nde.mean ?? 'n/a'} overall)`);
    add(`- Overall tone: ${topEntries(s.bonus.tone)}`);
    add(`- Veridical (rvNDE) scored accounts: ${s.bonus.rvnde.scored.toLocaleString()} (mean score ${s.bonus.rvnde.mean ?? 'n/a'}); levels: ${topEntries(s.bonus.rvnde.levels)}`);
    add();
    add('## Methods & definitions');
    add();
    add(`- NDE slice = videos with isNde = 'clear_nde' (${s.archive.clear_nde.toLocaleString()}); each stat's denominator is the subset with that analysis present.`);
    add('- "Affected" in a transformation domain = score ≥1 of 5 on the NDE-TI / UAP CTI instrument for that domain. NDE-TI overall score is 0–50 (10 domains); UAP CTI overall score is 0–60 (12 domains).');
    add('- Psychic aftereffects = PE domain ≥1 with direction "up" or "new". Healing mention = /heal(ing|er|ers|ed|s)?/i over scored-domain evidence + key quotes. Mediumship mention = regex over the same text (see src/lib/pipeline/presentation-stats.ts).');
    add('- Jesus census (NDE) matches the entity identity field only; UAP matches anywhere in the entity record. "christ" excludes "christian".');
    add('- UAP telepathy signal = telepathy as an entity communication method or the word telepath* anywhere in the phenomenology record.');
    add('- AI-scored corpus: instruments and prompts are published in src/lib/ai/. These are testimony statistics, not clinical measurements.');

    return L.join('\n');
}

/** Read the cached stats (site page + CLI). Returns null when never published. */
export async function readPresentationStatsCache(sb: SupabaseClient): Promise<PresentationStats | null> {
    const { data, error } = await sb
        .from('viz_graph_cache')
        .select('graph_json, updated_at')
        .eq('viz_id', PRESENTATION_STATS_VIZ_ID)
        .maybeSingle();
    if (error || !data?.graph_json) return null;
    return data.graph_json as PresentationStats;
}

/** Compute and upsert into viz_graph_cache. The weekly-maintenance step. */
export async function refreshPresentationStats(sb: SupabaseClient) {
    const stats = await computePresentationStats(sb);
    const { error } = await sb.from('viz_graph_cache').upsert({
        viz_id: PRESENTATION_STATS_VIZ_ID,
        graph_json: stats,
        updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`upsert(${PRESENTATION_STATS_VIZ_ID}): ${error.message}`);
    return {
        clear_nde: stats.archive.clear_nde,
        uap_encounters: stats.archive.uap_encounters,
        generated_at: stats.generated_at,
    };
}
