import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Layers,
  Brain,
  Scale,
  Search,
  Eye,
  AlertTriangle,
  FileText,
  ArrowRight,
  Microscope,
  Zap,
  Users,
  BarChart3,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "UAP Research Methodology | Project Profound",
  description:
    "Our rigorous, transparent methodology for analyzing UAP encounter testimonies — including AI-assisted phenomenological extraction, the UAP-CET Triad, Hynek & Vallée classification, and credibility scoring.",
  openGraph: {
    title: "UAP Research Methodology | Project Profound",
    description:
      "Transparent methodology for analyzing 5,000+ UAP encounter testimonies using AI-assisted phenomenological extraction and standardized scoring scales.",
  },
};

// ─── Scales Data ────────────────────────────────────────────────────────────

const HYNEK_SCALE = [
  { code: "NL", name: "Nocturnal Light", desc: "Anomalous light in the night sky" },
  { code: "DD", name: "Daylight Disc", desc: "Structured object seen in daylight" },
  { code: "RV", name: "Radar-Visual", desc: "Confirmed by both radar and eyewitness" },
  { code: "CE1", name: "Close Encounter, 1st Kind", desc: "Within 500 feet, no interaction" },
  { code: "CE2", name: "Close Encounter, 2nd Kind", desc: "Physical effects on environment or witness" },
  { code: "CE3", name: "Close Encounter, 3rd Kind", desc: "Entity observed" },
  { code: "CE4", name: "Close Encounter, 4th Kind", desc: "Abduction or direct contact" },
  { code: "CE5", name: "Close Encounter, 5th Kind", desc: "Human-initiated bilateral contact" },
];

const VALLEE_CATEGORIES = [
  { code: "AN", name: "Anomaly", desc: "Anomalous phenomena without lasting effects" },
  { code: "FB", name: "Fly-by", desc: "Object traversing the sky in a linear path" },
  { code: "MA", name: "Maneuver", desc: "Object exhibiting unusual flight characteristics" },
  { code: "HV", name: "Hover", desc: "Object remains stationary for observable period" },
];

const CET_DIMENSIONS = [
  {
    code: "ESS",
    name: "Evidence Strength Scale",
    range: "7–28",
    desc: "7 criteria (witness credibility, perceptual clarity, specificity, corroboration, unpredictability, physical effects, temporal precedence) each scored 1–4.",
    icon: Shield,
    color: "emerald",
    href: "/uap/methodology/evidence-strength",
  },
  {
    code: "CDS",
    name: "Contact Depth Scale",
    range: "0–32",
    desc: "16 items across 4 categories (Observation, Entity Interaction, Consciousness Alteration, Transcendent Elements) each scored 0–2.",
    icon: Layers,
    color: "blue",
    href: "/uap/methodology/contact-depth",
  },
  {
    code: "CTI",
    name: "Contact Transformation Index",
    range: "0–60",
    desc: "12 life-change domains (8 shared with NDE-TI + 2 adapted + 2 UAP-specific) each scored 0–5. Cross-comparable with NDE transformation scores.",
    icon: Zap,
    color: "rose",
    href: "/uap/methodology/transformation",
  },
];

const PIPELINE_STEPS = [
  { step: "1", title: "Transcript Extraction", desc: "YouTube captions are extracted, cleaned, and punctuated using AI-assisted restoration." },
  { step: "2", title: "Classification", desc: "Videos are classified by tier (Tier 1: Encounter, Tier 2: Program/Research) and track (encounter, program, debunk, ambiguous)." },
  { step: "3", title: "Contactee Resolution", desc: "Named experiencers are extracted, normalized, and linked to canonical profiles with deduplication." },
  { step: "4", title: "Phenomenology Extraction", desc: "AI extracts structured data: Hynek/Vallée classification, entity descriptions, physical effects, consciousness phenomena, evidence types." },
  { step: "5", title: "UAP-CET Scoring", desc: "Three independent AI passes score Evidence Strength, Contact Depth, and Transformation Index using calibrated rubrics." },
  { step: "6", title: "Program Intelligence", desc: "Tier 2 content undergoes claims extraction, identifying people, programs, technologies, and institutional assertions." },
  { step: "7", title: "Event Matching", desc: "Timeline events are fuzzy-matched against canonical UAP events (Roswell, Phoenix Lights, etc.) for cross-video intelligence discovery." },
  { step: "8", title: "Embedding & Indexing", desc: "Transcripts are chunked into passages, embedded via OpenAI text-embedding-3-small, and stored for semantic search." },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-border/60"
        style={{ background: 'linear-gradient(135deg, var(--domain-accent-light, #DCFCE7)08, var(--background) 40%, var(--domain-accent-light, #DCFCE7)04)' }}
      >
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 relative">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 mb-6">
            <Microscope className="w-3.5 h-3.5" />
            Research Methodology
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight text-foreground mb-4">
            How We Analyze UAP Encounters
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            Project Profound applies a rigorous, transparent methodology to the analysis of UAP encounter testimonies.
            Every video in our corpus undergoes the same standardized pipeline — ensuring comparability, reproducibility,
            and academic credibility across thousands of accounts.
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-[var(--domain-accent)]" />
          Overview
        </h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Our UAP vertical analyzes publicly available YouTube testimonies — first-person encounter accounts,
            researcher presentations, congressional hearings, and documentary content — using a structured AI-assisted pipeline.
          </p>
          <p>
            We do <strong className="text-foreground">not</strong> evaluate the truth or falsity of any claim. Our role is to
            <strong className="text-foreground"> systematically extract, classify, and quantify</strong> the phenomenological content
            of each testimony using standardized scales, enabling cross-case comparison at a scale no human research team could achieve alone.
          </p>
          <p>
            The corpus target is <strong className="text-foreground">5,000+ videos</strong> across 100+ channels, with every account receiving
            identical analytical treatment regardless of the researcher&apos;s prior assessment of credibility.
          </p>
        </div>
      </section>

      {/* Classification */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-[var(--domain-accent)]" />
          Classification System
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Tier */}
          <div className="bg-card rounded-2xl border border-border/60 p-6">
            <h3 className="text-sm font-semibold font-serif text-[var(--domain-accent)] uppercase tracking-wider mb-3">Tiers</h3>
            <dl className="space-y-3">
              <div>
                <dt className="font-medium text-foreground">Tier 1 — Encounter</dt>
                <dd className="text-sm text-muted-foreground">First-person or reported testimonies of direct UAP/NHI encounters. Full phenomenology + CET scoring.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Tier 2 — Program / Research</dt>
                <dd className="text-sm text-muted-foreground">Expert analysis, whistleblower testimony, congressional hearings, program disclosures. Claims extraction + program intelligence.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Tier 3 — Excluded</dt>
                <dd className="text-sm text-muted-foreground">Music, compilations, pure entertainment, or off-topic content. Not analyzed.</dd>
              </div>
            </dl>
          </div>
          {/* Track */}
          <div className="bg-card rounded-2xl border border-border/60 p-6">
            <h3 className="text-sm font-semibold font-serif text-[var(--domain-accent)] uppercase tracking-wider mb-3">Tracks</h3>
            <dl className="space-y-3">
              <div>
                <dt className="font-medium text-foreground">Encounter</dt>
                <dd className="text-sm text-muted-foreground">Contains a specific contact event (sighting, abduction, CE5, etc.)</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Program</dt>
                <dd className="text-sm text-muted-foreground">Discusses government programs, institutional actions, or policy.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Debunk / Ambiguous</dt>
                <dd className="text-sm text-muted-foreground">Skeptical analysis or content where classification is unclear.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Hynek & Vallée */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-[var(--domain-accent)]" />
          Hynek &amp; Vallée Classification
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Every Tier 1 encounter is classified using the widely-recognized Hynek Close Encounter system and Vallée event categories.
          These are applied by AI with calibrated rubrics, not subjective human judgment.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-card rounded-2xl border border-border/60 p-5">
            <h3 className="text-sm font-semibold font-serif text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Hynek Scale</h3>
            <div className="space-y-2">
              {HYNEK_SCALE.map((h) => (
                <div key={h.code} className="flex items-start gap-2">
                  <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded shrink-0">{h.code}</span>
                  <div>
                    <span className="text-sm text-foreground">{h.name}</span>
                    <span className="text-xs text-muted-foreground/70 ml-1.5">— {h.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-5">
            <h3 className="text-sm font-semibold font-serif text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3">Vallée Categories</h3>
            <div className="space-y-2">
              {VALLEE_CATEGORIES.map((v) => (
                <div key={v.code} className="flex items-start gap-2">
                  <span className="text-xs font-mono bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded shrink-0">{v.code}</span>
                  <div>
                    <span className="text-sm text-foreground">{v.name}</span>
                    <span className="text-xs text-muted-foreground/70 ml-1.5">— {v.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UAP-CET Triad */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--domain-accent)]" />
          UAP-CET Triad
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          The Contact Experience Triad (CET) is our proprietary three-dimensional scoring system, designed to mirror the
          NDE triad (cvNDE, Greyson Scale, NDE-TI) for cross-domain comparison.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {CET_DIMENSIONS.map((dim) => {
            const Icon = dim.icon;
            const colorMap: Record<string, { badge: string; bg: string }> = {
              emerald: {
                badge: "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800",
                bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
              },
              blue: {
                badge: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800",
                bg: "bg-blue-50/50 dark:bg-blue-950/20",
              },
              rose: {
                badge: "text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800",
                bg: "bg-rose-50/50 dark:bg-rose-950/20",
              },
            };
            const colors = colorMap[dim.color] ?? colorMap.emerald;
            return (
              <Link key={dim.code} href={dim.href} className={`rounded-2xl border border-border/60 p-5 ${colors.bg} group hover:shadow-lg hover:border-green-200 dark:hover:border-green-800 transition-all duration-300 block`}>
                <div className={`inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-lg border mb-3 ${colors.badge}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {dim.code}
                </div>
                <h3 className="font-semibold font-serif text-foreground mb-1">{dim.name}</h3>
                <p className="text-xs text-muted-foreground/70 mb-2">Range: {dim.range}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{dim.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--domain-accent)] group-hover:gap-2 transition-all">
                  View full scale <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Phenomenology Extraction */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-[var(--domain-accent)]" />
          Phenomenology Extraction
        </h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Each Tier 1 video undergoes deep phenomenological extraction — a structured AI analysis that identifies
            and categorizes the specific phenomena described in the testimony:
          </p>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Entities</strong> — type, appearance, behavior, communication mode</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Physical Effects</strong> — radiation, EM interference, physiological symptoms</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Consciousness</strong> — altered states, telepathy, time distortion, OBE</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Technology</strong> — craft descriptions, propulsion, materials</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Evidence Types</strong> — photographic, radar, physical trace, medical</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Recurrence</strong> — single event, recurring pattern, lifelong contact</span>
            </div>
          </div>
        </div>
      </section>

      {/* Program Intelligence */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--domain-accent)]" />
          Program Intelligence (Tier 2)
        </h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Tier 2 content (researcher presentations, congressional hearings, whistleblower accounts) undergoes a different
            analysis focused on extracting verifiable claims about programs, people, and institutions:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-[var(--domain-accent)] mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Claims Extraction</strong> — Specific assertions with attribution, evidence level, and domain classification</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-[var(--domain-accent)] mt-0.5 shrink-0" />
              <span><strong className="text-foreground">People &amp; Organizations</strong> — Named individuals, their roles, affiliations, and credibility context</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-[var(--domain-accent)] mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Programs &amp; Technologies</strong> — Named programs, budgets, technologies, and institutional connections</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-[var(--domain-accent)] mt-0.5 shrink-0" />
              <span><strong className="text-foreground">Timeline Events</strong> — Key dates, events, and milestones referenced in the content</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Pipeline */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-6 flex items-center gap-2">
          <Search className="w-5 h-5 text-[var(--domain-accent)]" />
          Analysis Pipeline
        </h2>
        <div className="space-y-3">
          {PIPELINE_STEPS.map((step) => (
            <div key={step.step} className="flex gap-4 items-start bg-card rounded-2xl border border-border/60 p-4 hover:shadow-lg hover:border-green-200 dark:hover:border-green-800 transition-all duration-300">
              <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center justify-center text-sm font-bold text-green-700 dark:text-green-400 shrink-0">
                {step.step}
              </div>
              <div>
                <h3 className="font-semibold font-serif text-foreground text-sm">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Credibility Scores */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-[var(--domain-accent)]" />
          Credibility Scoring
        </h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Beyond encounter-level analysis, Project Profound also scores the <strong className="text-foreground">source credibility</strong> of every
            YouTube channel in the corpus. This assessment evaluates the channel&apos;s production quality, research rigor,
            engagement practices, and transparency to produce a comprehensive Credibility Score.
          </p>
          <p>
            Credibility scoring helps researchers distinguish high-quality, well-sourced channels from sensationalized
            or low-effort content — enabling <strong className="text-foreground">weighted analysis</strong> where higher-credibility sources
            carry greater analytical weight in aggregate findings.
          </p>
          <Link
            href="/uap/methodology/credibility"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--domain-accent)] hover:underline"
          >
            View our full credibility scoring rubric <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Limitations & Transparency */}
      <section className="max-w-4xl mx-auto px-4 py-12 pb-24">
        <h2 className="text-2xl font-bold font-serif mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Limitations &amp; Transparency
        </h2>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">AI Model:</strong> Analysis is performed by GPT-4o-mini with calibrated prompts. Results are deterministic but not infallible — AI may misinterpret ambiguous testimony.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Source Material:</strong> We analyze only publicly available YouTube content. Private interviews, classified documents, and paywalled material are not included.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">No Truth Claims:</strong> Our scoring measures the <em>phenomenological content</em> of a testimony, not its veracity. A high Evidence Strength score means the account <em>contains</em> strong evidential elements, not that it is true.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Caption Quality:</strong> YouTube auto-captions vary in accuracy. We apply AI-assisted punctuation restoration, but transcription errors may propagate into analysis.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Selection Bias:</strong> Our channel corpus skews toward English-language, UFO/UAP-focused YouTube channels. This does not represent the global population of UAP experiences.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
              <span><strong className="text-foreground">Verification:</strong> All raw scores, extracted data, and source videos are accessible through the platform for independent verification by researchers.</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/uap/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            Search the Corpus
          </Link>
          <Link
            href="/uap/intelligence"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border"
          >
            <BarChart3 className="w-4 h-4" />
            View Intelligence Dashboard
          </Link>
          <Link
            href="/uap/experiencer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border"
          >
            <Users className="w-4 h-4" />
            Browse Experiencers
          </Link>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UAP Research Methodology",
            description: "Rigorous, transparent methodology for analyzing UAP encounter testimonies using AI-assisted phenomenological extraction and standardized scoring scales.",
            url: "https://projectprofound.org/uap/methodology",
            isPartOf: { "@type": "WebSite", name: "Project Profound", url: "https://projectprofound.org" },
            about: [
              { "@type": "Thing", name: "UAP Analysis" },
              { "@type": "Thing", name: "Phenomenology" },
              { "@type": "Thing", name: "Hynek Classification" },
            ],
          }),
        }}
      />
    </main>
  );
}
