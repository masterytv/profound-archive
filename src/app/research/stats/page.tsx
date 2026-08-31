import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { BarChart3, Clock, FlaskConical, Mic } from "lucide-react";
import {
    fmtFrac,
    fmtPct,
    readPresentationStatsCache,
    topEntries,
    type DomainStat,
    type PresentationStats,
} from "@/lib/pipeline/presentation-stats";

// Serves the weekly-refreshed cache; ISR keeps page renders cheap.
export const revalidate = 3600;

export const metadata: Metadata = {
    title: "Archive Statistics | Project Profound",
    description:
        "Live statistics from the Project Profound archive: healing and psychic aftereffects, who experiencers meet, telepathy rates, and how people are transformed after NDEs and UAP encounters — every figure with its numerator, denominator, and method.",
};

const fontSerif = { fontFamily: "'Crimson Pro', Georgia, serif" };

const card =
    "bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/10 p-6 md:p-8";

const sectionHeading =
    "text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4";

const tableWrap = "overflow-x-auto rounded-xl border border-slate-200/60 dark:border-white/10";
const table = "w-full text-sm text-left";
const th =
    "px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/[0.04] whitespace-nowrap";
const td = "px-4 py-3 text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-white/10";

async function loadStats(): Promise<PresentationStats | null> {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return null;
        const sb = createClient(url, key, { auth: { persistSession: false } });
        return await readPresentationStatsCache(sb);
    } catch {
        return null;
    }
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 py-2.5 border-t first:border-t-0 border-slate-200/60 dark:border-white/10">
            <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed sm:pr-6">{label}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{value}</span>
        </div>
    );
}

function DomainTable({ title, domains, denom }: { title: string; domains: DomainStat[]; denom: number }) {
    return (
        <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{title}</p>
            <div className={tableWrap}>
                <table className={table}>
                    <thead>
                        <tr>
                            <th className={th}>Domain</th>
                            <th className={th}>Affected (score ≥1)</th>
                            <th className={th}>Mean score</th>
                            <th className={th}>Top directions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {domains.map((d) => (
                            <tr key={d.code}>
                                <td className={td}>
                                    <span className="font-medium text-slate-800 dark:text-slate-100">{d.code}</span> — {d.name}
                                </td>
                                <td className={td}>{fmtFrac(d.affected)}</td>
                                <td className={td}>{d.mean ?? "—"}/5</td>
                                <td className={td}>{topEntries(d.directions, 3)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Denominator: {denom.toLocaleString()} accounts with transformation scoring.
            </p>
        </div>
    );
}

export default async function ArchiveStatsPage() {
    const s = await loadStats();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ── Hero ── */}
            <section className="relative overflow-hidden consciousness-hero-gradient border-b border-slate-200/60 dark:border-white/10">
                <div className="relative container mx-auto px-4 py-16 md:py-20 max-w-4xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-4">
                        Research
                    </p>
                    <h1
                        className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-5 leading-tight"
                        style={fontSerif}
                    >
                        Archive Statistics
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                        What thousands of first-person NDE and UAP testimonies say — every figure computed
                        from the live research database, with its numerator, denominator, and method.
                    </p>
                    {s && (
                        <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Clock className="w-4 h-4" /> Last updated {s.generated_at.slice(0, 10)} · refreshed weekly
                        </p>
                    )}
                </div>
            </section>

            <div className="container mx-auto px-4 max-w-4xl py-12 md:py-16 space-y-12 md:space-y-16">
                {!s ? (
                    <div className={`${card} text-center`}>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={fontSerif}>
                            The stat sheet is being prepared
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                            Statistics are recomputed from the full archive on a weekly schedule and will
                            appear here after the next refresh. In the meantime, explore the{" "}
                            <Link href="/research/methodology" className="text-violet-600 dark:text-violet-400 underline underline-offset-2">
                                methodology
                            </Link>{" "}
                            or{" "}
                            <Link href="/search3" className="text-violet-600 dark:text-violet-400 underline underline-offset-2">
                                search the archive
                            </Link>
                            .
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── Canonical counts ── */}
                        <section>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { value: s.archive.clear_nde.toLocaleString(), label: "Confirmed NDE accounts", note: "Greyson-screened" },
                                    { value: s.archive.uap_encounters.toLocaleString(), label: "UAP encounter records", note: `${s.archive.uap_experiencers.toLocaleString()} named experiencers` },
                                    { value: s.archive.analyzed_clear.toLocaleString(), label: "NDEs fully analyzed", note: "Structured instruments" },
                                    { value: s.archive.nde_rows.toLocaleString(), label: "NDE videos archived", note: "Total library rows" },
                                ].map((t) => (
                                    <div key={t.label} className={`${card} !p-5 text-center`}>
                                        <p
                                            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-500 to-emerald-500 bg-clip-text text-transparent"
                                            style={fontSerif}
                                        >
                                            {t.value}
                                        </p>
                                        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t.label}</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.note}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ── Healing & psychic aftereffects ── */}
                        <section>
                            <h2 className={sectionHeading} style={fontSerif}>
                                Healing &amp; Psychic Aftereffects
                            </h2>
                            <div className={card}>
                                <StatRow label="NDErs who report psychic or expanded perception after the experience (PE domain ≥1, direction up or new)" value={fmtFrac(s.healing.nde_psi)} />
                                <StatRow label="NDErs whose transformation evidence mentions healing (any life domain)" value={fmtFrac(s.healing.nde_healing_any)} />
                                <StatRow label="UAP experiencers with psychic/expanded-perception aftereffects" value={fmtFrac(s.healing.uap_psi)} />
                                <StatRow label="UAP encounters whose transformation evidence mentions healing" value={fmtFrac(s.healing.uap_healing)} />
                                <StatRow label="NDErs whose aftereffect evidence mentions mediumship or communicating with the deceased" value={fmtFrac(s.adc.mediumship)} />
                            </div>
                        </section>

                        {/* ── Who experiencers meet ── */}
                        <section>
                            <h2 className={sectionHeading} style={fontSerif}>
                                Who Experiencers Meet
                            </h2>
                            <div className={card}>
                                <StatRow label="NDE accounts greeted by deceased loved ones (core element)" value={fmtFrac(s.bonus.deceased)} />
                                <StatRow label="NDE accounts naming Jesus/Christ among encountered beings" value={fmtFrac(s.jesus.nde_jesus)} />
                                <StatRow label="NDE accounts encountering a religious figure of any kind" value={fmtFrac(s.jesus.nde_religious)} />
                                <StatRow label="UAP encounters whose entity descriptions mention Jesus/Christ" value={fmtFrac(s.jesus.uap_jesus)} />
                                <StatRow label="Being census — most common types" value={topEntries(s.bonus.entity_types, 4)} />
                                <StatRow label="Being census — emotional quality" value={topEntries(s.bonus.entity_emotion, 4)} />
                            </div>
                        </section>

                        {/* ── Telepathy ── */}
                        <section>
                            <h2 className={sectionHeading} style={fontSerif}>
                                Telepathy — The Native Language
                            </h2>
                            <div className={card}>
                                <StatRow label="NDE accounts describing communication without words (core element)" value={fmtFrac(s.telepathy.nde_element)} />
                                <StatRow label="Described beings in NDEs who communicate telepathically" value={fmtFrac(s.telepathy.nde_beings)} />
                                <StatRow label="UAP encounters with a telepathy signal in the phenomenology record" value={fmtFrac(s.telepathy.uap_signal)} />
                                <StatRow label="How NDE beings communicate" value={topEntries(s.telepathy.nde_comm, 4)} />
                                <StatRow label="How UAP entities communicate" value={topEntries(s.telepathy.uap_comm, 4)} />
                            </div>
                        </section>

                        {/* ── Transformation ── */}
                        <section>
                            <h2 className={sectionHeading} style={fontSerif}>
                                How People Are Transformed
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed max-w-3xl">
                                Every analyzed account is scored on a transformation instrument — the NDE-TI
                                (10 life domains, overall 0–{s.transformation.nde.max}) for NDEs and the CTI
                                (12 domains, overall 0–{s.transformation.uap.max}) for UAP encounters. Mean
                                overall scores: NDE {s.transformation.nde.mean ?? "n/a"}/{s.transformation.nde.max},
                                UAP {s.transformation.uap.mean ?? "n/a"}/{s.transformation.uap.max}.
                            </p>
                            <div className="space-y-8">
                                <DomainTable
                                    title={`NDE transformation by domain (NDE-TI)`}
                                    domains={s.transformation.nde.domains}
                                    denom={s.transformation.nde.denom}
                                />
                                <DomainTable
                                    title={`UAP transformation by domain (CTI)`}
                                    domains={s.transformation.uap.domains}
                                    denom={s.transformation.uap.denom}
                                />
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                                        The shared-domain fingerprint — same instrument codes, two phenomena
                                    </p>
                                    <div className={tableWrap}>
                                        <table className={table}>
                                            <thead>
                                                <tr>
                                                    <th className={th}>Domain</th>
                                                    <th className={th}>NDE affected</th>
                                                    <th className={th}>UAP affected</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {s.transformation.nde.domains
                                                    .filter((d) => s.transformation.shared_codes.includes(d.code))
                                                    .map((d) => {
                                                        const u = s.transformation.uap.domains.find((x) => x.code === d.code);
                                                        return (
                                                            <tr key={d.code}>
                                                                <td className={td}>
                                                                    <span className="font-medium text-slate-800 dark:text-slate-100">{d.code}</span> — {d.name}
                                                                </td>
                                                                <td className={td}>{fmtPct(d.affected)}</td>
                                                                <td className={td}>{u ? fmtPct(u.affected) : "n/a"}</td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ── The experience itself ── */}
                        <section>
                            <h2 className={sectionHeading} style={fontSerif}>
                                The Experience Itself
                            </h2>
                            <div className={card}>
                                <StatRow label={'NDErs describing the experience as "more real than real"'} value={fmtFrac(s.bonus.more_real)} />
                                <StatRow label="Enhanced thought clarity during clinical crisis" value={fmtFrac(s.bonus.clarity)} />
                                <StatRow label="The lucidity paradox — more real AND clearer thinking while the brain is failing" value={fmtFrac(s.bonus.lucidity)} />
                                <StatRow label="Received knowledge they didn't have before (knowledge download)" value={fmtFrac(s.bonus.download)} />
                                <StatRow label="Distressing experiences" value={fmtFrac(s.bonus.distressing)} />
                                <StatRow label="Mean transformation score after distressing experiences (vs overall)" value={`${s.bonus.distressing_mean ?? "n/a"}/50 vs ${s.transformation.nde.mean ?? "n/a"}/50`} />
                                <StatRow label="Accounts scored for veridical perception (rvNDE)" value={`${s.bonus.rvnde.scored.toLocaleString()} · ${topEntries(s.bonus.rvnde.levels, 2)}`} />
                            </div>
                        </section>

                        {/* ── Methods ── */}
                        <section>
                            <h2 className={sectionHeading} style={fontSerif}>
                                Methods
                            </h2>
                            <div className={`${card} text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3`}>
                                <p>
                                    The NDE slice counts only videos confirmed as clear NDEs
                                    ({s.archive.clear_nde.toLocaleString()}); each statistic&apos;s denominator is
                                    the subset with that analysis present. &quot;Affected&quot; in a
                                    transformation domain means a score of at least 1 of 5 on the published
                                    instrument. Psychic aftereffects require the Psychic &amp; Expanded
                                    Perception domain scored ≥1 with direction &quot;up&quot; or &quot;new&quot;.
                                    Healing and mediumship figures match language in scored-domain evidence and
                                    quotes. The Jesus census matches the entity identity field for NDEs and the
                                    entity record for UAP encounters.
                                </p>
                                <p>
                                    This is an AI-scored corpus of public first-person testimony — statistics
                                    about what experiencers report, not clinical measurements. Instruments and
                                    prompts are published in the open repository; the full methodology is
                                    documented on the{" "}
                                    <Link href="/research/methodology" className="text-violet-600 dark:text-violet-400 underline underline-offset-2">
                                        methodology page
                                    </Link>
                                    .
                                </p>
                            </div>
                        </section>

                        {/* ── CTA ── */}
                        <section>
                            <div className={`${card} text-center`}>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={fontSerif}>
                                    Want a statistic we haven&apos;t published?
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6">
                                    Podcasters, journalists, and researchers can request audience-specific
                                    calculations from the archive — typically turned around within days.
                                </p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <Link
                                        href="/about#connect"
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        <Mic className="w-4 h-4" /> Request a statistic
                                    </Link>
                                    <Link
                                        href="/about/founder"
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <BarChart3 className="w-4 h-4 text-violet-500" /> About the founder
                                    </Link>
                                    <Link
                                        href="/research/methodology"
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <FlaskConical className="w-4 h-4 text-violet-500" /> Methodology
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
