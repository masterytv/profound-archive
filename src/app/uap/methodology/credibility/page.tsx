/**
 * UAP Credibility Score Methodology
 *
 * /uap/methodology/credibility — Explains how the AI-generated credibility
 * score is calculated, its rubric, strengths, and limitations.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Brain,
  Scale,
  Users,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Credibility Score Methodology | UAP Research | Project Profound",
  description:
    "How Project Profound calculates the AI-generated credibility score for persons of interest in UAP research, including the rubric, process, strengths, and limitations.",
  openGraph: {
    title: "UAP Credibility Score Methodology | Project Profound",
    description:
      "Understanding the 0-100 credibility score applied to persons of interest in UAP video analysis.",
    type: "website",
  },
};

// ─── Rubric Data ────────────────────────────────────────────────────────────

const RUBRIC_FACTORS = [
  {
    factor: "Clearance Level Held",
    points: 20,
    description:
      "The person held or holds a documented security clearance (e.g., TS/SCI, Q clearance, SAP access). Higher clearance levels indicate access to classified UAP-related programs.",
    examples: ["Top Secret / SCI", "SAP-level access", "Q clearance (DOE)"],
  },
  {
    factor: "Sworn Testimony",
    points: 20,
    description:
      "The person has testified under oath, such as before a congressional committee, in a court of law, or in a signed affidavit. Perjury penalties make sworn statements carry more weight than informal interviews.",
    examples: [
      "Congressional hearing testimony",
      "ICIG formal complaint",
      "Signed affidavit or deposition",
    ],
  },
  {
    factor: "Career Sacrifice / Whistleblower Risk",
    points: 15,
    description:
      "The person faced or risked significant professional consequences for coming forward, including termination, loss of clearance, legal threats, or social ostracism.",
    examples: [
      "Lost security clearance",
      "Forced retirement",
      "NDA violation risk",
      "Harassment or intimidation reported",
    ],
  },
  {
    factor: "Corroborating Witnesses",
    points: 15,
    description:
      "Other named individuals independently confirm or corroborate the person's claims. The AI checks whether the transcript mentions additional witnesses supporting the account.",
    examples: [
      "Named colleagues confirming the account",
      "Multiple military witnesses to the same event",
      "Independent civilian corroboration",
    ],
  },
  {
    factor: "Documented Evidence",
    points: 15,
    description:
      "The person's claims are backed by physical documentation: FOIA releases, official reports, radar data, photographs, or other verifiable records referenced in the transcript.",
    examples: [
      "FOIA-released documents",
      "Radar or sensor data",
      "Official government reports",
      "Published photographs or video",
    ],
  },
  {
    factor: "Peer Review / Academic Credentials",
    points: 15,
    description:
      "The person holds relevant academic credentials (PhD, professorship) or their work has been published in peer-reviewed journals, indicating methodological rigor.",
    examples: [
      "PhD in relevant field",
      "Peer-reviewed publications",
      "Academic appointment",
      "Professional scientific credentials",
    ],
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CredibilityMethodologyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-12 relative">
          <Link
            href="/uap/methodology"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Full Methodology
          </Link>

          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6">
            <Shield className="w-3.5 h-3.5" />
            Credibility Scoring
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
            Credibility Score Methodology
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Understanding the &quot;Cred&quot; badge shown on person profiles, how it is calculated,
            and what it does and does not tell you.
          </p>
        </div>
      </section>

      {/* What It Is */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-emerald-400" />
          What Is the Credibility Score?
        </h2>
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            The <strong className="text-foreground">Credibility Score</strong> is a{" "}
            <strong className="text-foreground">0-100 composite metric</strong> assigned to each person
            mentioned in UAP video analysis. It is generated by AI (GPT-4o-mini) during the Program
            Intelligence extraction pipeline, based on verifiable indicators present in the video
            transcript.
          </p>
          <p>
            The score is <strong className="text-foreground">not</strong> a judgment of whether someone
            is telling the truth. It measures the{" "}
            <strong className="text-foreground">density of verifiable credibility indicators</strong>{" "}
            found in the source material, such as security clearances held, sworn testimony given,
            documented evidence cited, or career risks taken.
          </p>
          <p>
            When a person appears across multiple videos, their individual per-video credibility
            scores are averaged into an{" "}
            <strong className="text-foreground">avg_credibility_score</strong> displayed on the Persons
            of Interest directory.
          </p>
        </div>
      </section>

      {/* The Rubric */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          Scoring Rubric
        </h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          The AI evaluates six factors. Each factor has a maximum point value. The AI sums all
          applicable factors to produce a score from 0 to 100.
        </p>

        <div className="space-y-4">
          {RUBRIC_FACTORS.map((f) => (
            <div
              key={f.factor}
              className="bg-white/5 rounded-xl border border-white/10 p-5 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">{f.factor}</h3>
                <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  +{f.points} pts
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{f.description}</p>
              <div className="flex flex-wrap gap-2">
                {f.examples.map((ex) => (
                  <span
                    key={ex}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-slate-500 border border-white/5"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Score visualization */}
        <div className="mt-8 bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="font-semibold text-foreground mb-4">Score Interpretation</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-20 text-right text-sm font-mono font-bold text-emerald-400">
                70-100
              </span>
              <div className="flex-1 h-3 rounded-full bg-emerald-500/20 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-full bg-emerald-500/40 rounded-full" />
              </div>
              <span className="text-sm text-muted-foreground w-48">
                High — multiple strong indicators
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-right text-sm font-mono font-bold text-amber-400">
                40-69
              </span>
              <div className="flex-1 h-3 rounded-full bg-amber-500/20 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-[70%] bg-amber-500/40 rounded-full" />
              </div>
              <span className="text-sm text-muted-foreground w-48">
                Moderate — some verifiable factors
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-20 text-right text-sm font-mono font-bold text-red-400">
                0-39
              </span>
              <div className="flex-1 h-3 rounded-full bg-red-500/20 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-[40%] bg-red-500/40 rounded-full" />
              </div>
              <span className="text-sm text-muted-foreground w-48">
                Low — limited verifiable indicators
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It's Calculated */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-pink-400" />
          How It&apos;s Calculated
        </h2>
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 text-muted-foreground leading-relaxed text-sm">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                1
              </span>
              <div>
                <strong className="text-foreground">Video Analysis</strong> — When a Tier 2 (Program/Research)
                video is processed through our pipeline, the transcript is sent to GPT-4o-mini in three
                parallel passes. Pass 1 (Network Mapping) extracts every named person mentioned.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                2
              </span>
              <div>
                <strong className="text-foreground">Per-Person Scoring</strong> — For each named person,
                the AI identifies which of the six rubric factors are supported by evidence in the transcript.
                It produces a list of <code className="text-emerald-300 bg-white/5 px-1 rounded text-xs">credibility_indicators</code> (verifiable
                facts) and sums the corresponding point values.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                3
              </span>
              <div>
                <strong className="text-foreground">Entity Resolution</strong> — Person mentions are fuzzy-matched
                across all videos into canonical profiles (handling aliases like &quot;David Grusch&quot; /
                &quot;Grusch&quot; / &quot;David Charles Grusch&quot;). This uses Levenshtein distance, variant rules,
                and LLM verification for ambiguous cases.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                4
              </span>
              <div>
                <strong className="text-foreground">Averaging</strong> — The canonical person profile&apos;s
                displayed score is the <strong className="text-foreground">average</strong> of all per-video
                credibility scores across every video in which they appear. A person mentioned in 5 videos
                will have 5 individual scores averaged together.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strengths */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Strengths
        </h2>
        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Consistent application</strong> — Every person is evaluated
              against the same six-factor rubric. No human bias, favoritism, or reputation effects
              influence the score.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Evidence-anchored</strong> — The rubric is grounded in
              verifiable, objective facts (clearances, sworn testimony, documentation), not subjective
              assessments of &quot;trustworthiness.&quot;
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Multi-source averaging</strong> — Scores improve with
              more data. A person mentioned across many videos has a more robust average than someone
              appearing in a single interview.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Transparent rubric</strong> — The exact factors and point
              values are published here. Researchers can independently assess whether the AI&apos;s
              scoring aligns with their own reading of the source material.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Scalable</strong> — The same analysis has been applied
              uniformly across hundreds of videos, something no human team could achieve with the same
              consistency.
            </span>
          </div>
        </div>
      </section>

      {/* Weaknesses */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-400" />
          Limitations &amp; Weaknesses
        </h2>
        <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Transcript-dependent</strong> — The AI can only score
              indicators mentioned in the video transcript. If a person holds a TS/SCI clearance but
              the video never states this, it will not be counted. Background knowledge is intentionally
              excluded to prevent hallucination.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Not a truth detector</strong> — A high credibility score
              means the person has many verifiable indicators of institutional credibility. It does not
              mean their claims are true. Someone can be highly credentialed and still make inaccurate
              statements.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">AI interpretation errors</strong> — GPT-4o-mini may
              occasionally misattribute indicators (e.g., confusing a journalist&apos;s report about
              sworn testimony with the journalist themselves having testified under oath).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Institutional bias in rubric design</strong> — The
              rubric inherently favors people with government/military backgrounds (clearances,
              congressional testimony). Civilian researchers, journalists, or experiencers without
              institutional affiliations will score lower even if their claims are well-supported
              by other forms of evidence.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">Video selection bias</strong> — The score reflects what
              channels in our corpus say about a person. If the corpus is skewed toward channels that
              favor certain figures, those figures may have inflated or deflated scores.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <span>
              <strong className="text-foreground">No cross-verification</strong> — The AI does not
              independently verify whether a claimed credential is real. If a transcript says
              &quot;he held a TS/SCI clearance,&quot; the AI takes that at face value.
            </span>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-4 py-10 pb-20">
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Explore Persons of Interest</h3>
            <p className="text-sm text-muted-foreground">
              See the credibility scores in context alongside video appearances, roles, and
              extracted claims.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/uap/persons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              <Users className="w-4 h-4" />
              Browse Persons
            </Link>
            <Link
              href="/uap/methodology"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border"
            >
              Full Methodology
            </Link>
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UAP Credibility Score Methodology",
            description:
              "How Project Profound calculates the AI-generated credibility score for persons of interest in UAP research.",
            url: "https://projectprofound.org/uap/methodology/credibility",
            isPartOf: {
              "@type": "WebSite",
              name: "Project Profound",
              url: "https://projectprofound.org",
            },
          }),
        }}
      />
    </main>
  );
}
