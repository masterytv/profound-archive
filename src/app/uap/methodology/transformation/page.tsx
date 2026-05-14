/**
 * UAP Contact Transformation Index (CTI) Methodology
 *
 * /uap/methodology/transformation — Details the 12-domain rubric for
 * assessing aftereffects and life changes following UAP contact.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Zap, ArrowLeft, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Transformation Index (CTI) | UAP Methodology | Project Profound",
  description:
    "The UAP Contact Transformation Index measures self-reported aftereffects and life changes across 12 domains (8 shared with NDE-TI + 2 adapted + 2 UAP-specific) each scored 0–5 for a total range of 0–60.",
  openGraph: {
    title: "UAP Contact Transformation Index (CTI) | Project Profound",
    description:
      "12-domain rubric measuring life changes after UAP contact. Score range 0–60. Cross-comparable with NDE-TI.",
  },
};

// ─── Data ───────────────────────────────────────────────────────────────────

const SCORING_ANCHORS = [
  { score: 0, label: "Not Addressed", desc: "This area of transformation is not discussed in the account" },
  { score: 1, label: "Briefly Noted", desc: "A passing mention or slight implication of change" },
  { score: 2, label: "Mild Change", desc: "A noticeable shift is described, with limited detail" },
  { score: 3, label: "Moderate Change", desc: "A clear, meaningful transformation described with specific examples" },
  { score: 4, label: "Significant Change", desc: "A major, life-altering transformation described in detail" },
  { score: 5, label: "Profound Transformation", desc: "A dramatic, fundamental change; central to the account" },
];

const SHARED_DOMAINS = [
  { code: "AL", name: "Appreciation for Life", desc: "Changes in gratitude, wonder, savoring ordinary moments, awareness of beauty", direction: "↑", mapping: "Direct" },
  { code: "SI", name: "Self-Perception & Identity", desc: "Changes in self-acceptance, self-worth, inner peace, personality traits, sense of being a different person", direction: "↑", mapping: "Direct" },
  { code: "CC", name: "Compassion & Concern for Others", desc: "Changes in empathy, desire to help/serve, tolerance, unconditional love", direction: "↑", mapping: "Direct" },
  { code: "VP", name: "Values & Priorities", desc: "Changes in materialism, status-seeking, authenticity, what the person considers most important", direction: "↓ materialism, ↑ simplicity", mapping: "Direct" },
  { code: "SA", name: "Spiritual Awareness", desc: "Changes in connection to the divine, universal consciousness, spiritual practices", direction: "↑", mapping: "Direct" },
  { code: "PE", name: "Psychic & Expanded Perception", desc: "Emergence or increase of intuition, precognition, telepathy, healing abilities, synchronicities", direction: "↑", mapping: "Direct" },
  { code: "RS", name: "Relationships & Social Dynamics", desc: "Changes in partnerships, friendships, feelings of alienation, need for deep connection", direction: "Mixed", mapping: "Direct" },
  { code: "PD", name: "Purpose, Meaning & Life Direction", desc: "Changes in life purpose, mission, career path, thirst for knowledge", direction: "↑", mapping: "Direct" },
];

const ADAPTED_DOMAINS = [
  { code: "CO", name: "Cosmological Orientation", desc: "Changes in understanding of reality, NHI, multiverse concepts, humanity's place in the cosmos", direction: "Mixed", nde: "Religious Orientation (RO)", mapping: "Adapted" },
  { code: "EO", name: "Existential Orientation", desc: "Changes in relationship with mortality, existential anxiety, belief in continuity of consciousness", direction: "Mixed", nde: "Attitude Toward Death (AD)", mapping: "Adapted" },
];

const UAP_DOMAINS = [
  { code: "DA", name: "Disclosure & Advocacy", desc: "Compulsion to share publicly, activism, whistleblowing, felt duty to inform others or contribute to disclosure", direction: "↑" },
  { code: "ES", name: "Electromagnetic & Somatic Sensitivity", desc: "New sensitivity to electronics, EM fields, watches stopping, health changes, energy sensations, healing abilities", direction: "New / Mixed" },
];

const SCORE_LEVELS = [
  { range: "0", level: "No Transformation Discussed", color: "text-muted-foreground" },
  { range: "1–12", level: "Minimal Transformation", color: "text-muted-foreground" },
  { range: "13–24", level: "Moderate Transformation", color: "text-amber-700 dark:text-amber-400" },
  { range: "25–36", level: "Significant Transformation", color: "text-rose-700 dark:text-rose-400" },
  { range: "37–48", level: "Major Transformation", color: "text-rose-700 dark:text-rose-400" },
  { range: "49–60", level: "Comprehensive Profound Transformation", color: "text-rose-700 dark:text-rose-400" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TransformationPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-border/60"
        style={{ background: 'linear-gradient(135deg, var(--domain-accent-light, #DCFCE7)08, var(--background) 40%, var(--domain-accent-light, #DCFCE7)04)' }}
      >
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-12 relative">
          <Link
            href="/uap/methodology"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--domain-accent)] transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Full Methodology
          </Link>

          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 mb-6">
            <Zap className="w-3.5 h-3.5" />
            UAP-CTI
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-serif tracking-tight text-foreground mb-4">
            Contact Transformation Index
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            12 life-change domains measuring aftereffects of UAP contact. Score range 0–60.
            8 domains shared with NDE-TI for direct cross-domain comparison.
          </p>
        </div>
      </section>

      {/* Purpose */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-4">Purpose</h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            The CTI answers: <strong className="text-foreground">&quot;How did it change you?&quot;</strong> — not
            &quot;is it true?&quot; (ESS) or &quot;what happened?&quot; (CDS). It measures <strong className="text-foreground">attributed transformation</strong> across 12 life domains.
          </p>
          <p>
            <strong className="text-foreground">Destruction is transformation.</strong> UAP contact frequently produces negative outcomes — PTSD, relationship destruction, career loss. A complete psychological breakdown represents a Profound Transformation (4–5, direction = down). The scale measures <em>change</em>, not improvement.
          </p>
        </div>
      </section>

      {/* Scoring Scale */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-4">Per-Domain Scoring (0–5)</h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="space-y-2">
            {SCORING_ANCHORS.map((a) => (
              <div key={a.score} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-center text-xs font-bold text-rose-700 dark:text-rose-400 shrink-0 mt-0.5">
                  {a.score}
                </span>
                <div>
                  <strong className="text-foreground">{a.label}</strong>
                  <span className="text-muted-foreground"> — {a.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shared Domains */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-2">Shared Domains (1:1 with NDE-TI)</h2>
        <p className="text-sm text-muted-foreground mb-6">8 domains with identical definitions. Scores can be compared directly across domains.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {SHARED_DOMAINS.map((d) => (
            <div key={d.code} className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">{d.code}</span>
                <h3 className="font-semibold font-serif text-foreground text-sm">{d.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{d.desc}</p>
              <div className="flex gap-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200/60 dark:border-green-800/40">
                  Direction: {d.direction}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                  {d.mapping} mapping
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Adapted Domains */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-2">Adapted Domains</h2>
        <p className="text-sm text-muted-foreground mb-6">2 domains broadened from NDE-TI equivalents. Included in Comparable Score with caveats.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {ADAPTED_DOMAINS.map((d) => (
            <div key={d.code} className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">{d.code}</span>
                <h3 className="font-semibold font-serif text-foreground text-sm">{d.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{d.desc}</p>
              <p className="text-xs text-muted-foreground/70 italic mb-2">NDE-TI equivalent: {d.nde}</p>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                {d.mapping} — comparisons carry caveats
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* UAP-Specific Domains */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-2">UAP-Specific Domains</h2>
        <p className="text-sm text-muted-foreground mb-6">2 domains unique to UAP contact. No NDE-TI equivalent. NOT included in the Comparable Score.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {UAP_DOMAINS.map((d) => (
            <div key={d.code} className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-border/60 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">{d.code}</span>
                <h3 className="font-semibold font-serif text-foreground text-sm">{d.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{d.desc}</p>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
                UAP-specific — no NDE equivalent
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Score Interpretation */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-4">Score Interpretation (Full Score 0–60)</h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="space-y-3">
            {SCORE_LEVELS.map((s) => (
              <div key={s.range} className="flex items-center gap-4">
                <span className={`w-20 text-right text-sm font-mono font-bold ${s.color}`}>{s.range}</span>
                <span className="text-sm text-muted-foreground">{s.level}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/60 text-sm text-muted-foreground">
            <strong className="text-foreground">Comparable Score (0–50):</strong> Uses only the 10 mappable domains for direct comparison with NDE-TI. Same thresholds apply.
          </div>
        </div>
      </section>

      {/* Limitations */}
      <section className="max-w-4xl mx-auto px-4 py-10 pb-20">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Limitations
        </h2>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">Aftereffect reporting bias:</strong> Videos often focus on the encounter itself. Low/zero scores mean transformation wasn&apos;t discussed, not that it didn&apos;t occur.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">Self-attribution bias:</strong> Witnesses may attribute life changes to the UAP experience that would have occurred anyway. The scale measures attributed transformation, not verified causation.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">Negativity gap:</strong> Positive transformations are more socially rewarded and more likely to be described. Negative outcomes may be underreported.</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/uap/methodology/contact-depth" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border">
            ← Contact Depth Scale
          </Link>
          <Link href="/uap/methodology/credibility" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border">
            Credibility Scoring →
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UAP Contact Transformation Index (CTI)",
            description: "12-domain rubric measuring life changes after UAP contact. Score range 0–60. Cross-comparable with NDE-TI.",
            url: "https://projectprofound.org/uap/methodology/transformation",
            isPartOf: { "@type": "WebSite", name: "Project Profound", url: "https://projectprofound.org" },
          }),
        }}
      />
    </main>
  );
}
