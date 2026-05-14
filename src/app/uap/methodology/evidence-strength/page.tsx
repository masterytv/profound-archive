/**
 * UAP Evidence Strength Scale (ESS) Methodology
 *
 * /uap/methodology/evidence-strength — Details the 7-criterion rubric for
 * evaluating the evidential strength of UAP encounter claims.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Evidence Strength Scale (ESS) | UAP Methodology | Project Profound",
  description:
    "The UAP Evidence Strength Scale evaluates encounter claims across 7 criteria (witness credibility, perceptual clarity, specificity, corroboration, unpredictability, physical effects, temporal precedence) each scored 1–4 for a total range of 7–28.",
  openGraph: {
    title: "UAP Evidence Strength Scale (ESS) | Project Profound",
    description:
      "7-criterion rubric for evaluating evidential strength of UAP encounter claims. Score range 7–28.",
  },
};

// ─── Data ───────────────────────────────────────────────────────────────────

const CRITERIA = [
  {
    id: 1,
    name: "Witness Credibility Context",
    question: "What is the credibility context of the primary witness?",
    guidance:
      "Professional training in observation, official duty context, and multiple independent witnesses all increase credibility weight. Hostile witnesses (skeptics, people whose careers could be damaged) rate higher.",
    anchors: [
      { score: 1, text: "Anonymous or unverifiable source; no professional context given" },
      { score: 2, text: "Named individual with general background; single untrained civilian witness; or small group of dependent/related witnesses" },
      { score: 3, text: "Trained observer (pilot, military, law enforcement, scientist) OR multiple independent witnesses (2–9)" },
      { score: 4, text: "Official capacity witness (on-duty military, radar operator, flight crew with instrument readings) OR large group (10+) with independent reports" },
    ],
  },
  {
    id: 2,
    name: "Perceptual Clarity",
    question: "How clear and detailed was the observation itself?",
    guidance:
      "Duration, distance, and conditions all matter. Multiple sensory channels (visual + auditory + physical sensation) indicate a richer perceptual event.",
    anchors: [
      { score: 1, text: "Vague, ambiguous, or fleeting — flash of light, peripheral glimpse, fragmentary dream" },
      { score: 2, text: "Moderate clarity — distinct shape or behavior noted but limited detail; brief observation (seconds)" },
      { score: 3, text: "Clear observation — structured object or entity with specific features, sustained viewing (minutes), good conditions" },
      { score: 4, text: "Exceptional clarity — prolonged, close-range observation with multiple sensory channels; or hyper-lucid non-physical encounter with detailed content" },
    ],
  },
  {
    id: 3,
    name: "Specificity of Details",
    question: "How specific and potentially verifiable are the reported details?",
    guidance:
      "Numbers, exact times, GPS coordinates, and proper names rate highest. Details that would be impossible to fabricate without investigation score 4.",
    anchors: [
      { score: 1, text: "General impressions only — \"bright light\", \"something in the sky\", \"I felt a presence\"" },
      { score: 2, text: "Some specifics — color, approximate size, general location, time of day, basic shape" },
      { score: 3, text: "Precise details — exact time, specific location, detailed physical descriptions, quoted communications" },
      { score: 4, text: "Highly precise, unique details — exact measurements, names of unknown personnel, information later confirmed independently" },
    ],
  },
  {
    id: 4,
    name: "Corroboration",
    question: "Is the account supported by other witnesses or independent evidence?",
    guidance:
      "Independent corroboration — especially from strangers or instruments — dramatically reduces the probability of fabrication or misidentification. Often the strongest single indicator.",
    anchors: [
      { score: 1, text: "Single witness, no supporting evidence of any kind" },
      { score: 2, text: "Single witness with circumstantial support — consistent with other reports in the area/timeframe" },
      { score: 3, text: "Multiple independent witnesses OR single instrumental record (photo, radar, video, audio)" },
      { score: 4, text: "Multiple independent witnesses AND instrumental/physical evidence; OR official investigation confirming anomalous nature" },
    ],
  },
  {
    id: 5,
    name: "Unpredictability",
    question: "Could the experience have been anticipated, sought, or fabricated?",
    guidance:
      "Encounters that contradict the witness's worldview or occur during unrelated professional duty carry the greatest evidential weight. CE5 sessions, skywatches = expected context.",
    anchors: [
      { score: 1, text: "Expected context — at a skywatch, CE5 meditation, known hotspot, or actively seeking contact" },
      { score: 2, text: "Somewhat expected — outdoors at night, interest in the topic but not actively seeking" },
      { score: 3, text: "Unexpected — during routine activity, no prior interest in UAP, or skeptic/agnostic" },
      { score: 4, text: "Highly unexpected — during professional duty, hostile witness whose experience contradicts prior beliefs, career damaged by reporting" },
    ],
  },
  {
    id: 6,
    name: "Physical Effects",
    question: "Were there measurable physical effects on the witness or environment?",
    guidance:
      "Observable effects that others could confirm rate higher than subjective feelings. Effects documented by third parties (medical records, equipment readings) rate highest.",
    anchors: [
      { score: 1, text: "No physical effects reported or mentioned" },
      { score: 2, text: "Subjective physiological effects only — tingling, heat, nausea, headache, temporary paralysis" },
      { score: 3, text: "Observable effects (burns, rashes, hair loss) OR environmental effects (vehicle/electronics interference, ground markings)" },
      { score: 4, text: "Documented/medical effects (medical records, lab results) OR measurable environmental evidence (radiation readings, calibrated instruments)" },
    ],
  },
  {
    id: 7,
    name: "Temporal Precedence",
    question: "When was the experience first reported relative to public knowledge and potential contamination?",
    guidance:
      "An account documented or told to others BEFORE the witness was exposed to similar stories carries much greater evidential weight. Official reports provide timestamped documentation.",
    anchors: [
      { score: 1, text: "No information about when first reported; reported long after the fact; or only after consuming significant UAP media" },
      { score: 2, text: "Reported within weeks or months; could have been influenced by media or social context" },
      { score: 3, text: "Reported to others shortly after (within hours/days) and before exposure to similar accounts; or filed an organizational report" },
      { score: 4, text: "Documented contemporaneously — written report filed same day, told multiple witnesses immediately, or official filing with timestamp" },
    ],
  },
];

const SCORE_LEVELS = [
  { range: "7–12", level: "Low Evidential Strength", color: "text-red-700 dark:text-red-400" },
  { range: "13–17", level: "Moderate Evidential Strength", color: "text-amber-700 dark:text-amber-400" },
  { range: "18–22", level: "High Evidential Strength", color: "text-emerald-700 dark:text-emerald-400" },
  { range: "23–28", level: "Exceptional Evidential Strength", color: "text-emerald-700 dark:text-emerald-400" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function EvidenceStrengthPage() {
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

          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 mb-6">
            <Shield className="w-3.5 h-3.5" />
            UAP-ESS
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-serif tracking-tight text-foreground mb-4">
            Evidence Strength Scale
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            7 criteria evaluating the evidential strength of UAP encounter claims.
            Score range 7–28. NDE parallel: cvNDE (Claimed Veridical Perception Scale).
          </p>
        </div>
      </section>

      {/* Purpose */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-4">Purpose</h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            The UAP Evidence Strength Scale evaluates the <strong className="text-foreground">evidential strength</strong> of encounter claims within first-person accounts or detailed reports.
            It accepts the account as presented — evaluating the <strong className="text-foreground">quality of claims</strong>, not investigating truth.
          </p>
          <p>
            An encounter claim carries greater evidential strength when the witness has credibility context, the observation was clear and sustained,
            details are specific, the account is corroborated, the experience was unexpected, physical effects were documented, and the report preceded potential contamination.
          </p>
        </div>
      </section>

      {/* The 7 Criteria */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-6">The 7 Criteria</h2>
        <div className="space-y-6">
          {CRITERIA.map((c) => (
            <div key={c.id} className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-lg hover:border-green-200 dark:hover:border-green-800 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  {c.id}
                </span>
                <h3 className="font-semibold font-serif text-foreground text-lg">{c.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground italic mb-3">{c.question}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{c.guidance}</p>
              <div className="space-y-2">
                {c.anchors.map((a) => (
                  <div key={a.score} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/40 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-400 shrink-0 mt-0.5">
                      {a.score}
                    </span>
                    <span className="text-muted-foreground">{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring Levels */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-4">Score Interpretation</h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="space-y-3">
            {SCORE_LEVELS.map((s) => (
              <div key={s.range} className="flex items-center gap-4">
                <span className={`w-20 text-right text-sm font-mono font-bold ${s.color}`}>{s.range}</span>
                <span className="text-sm text-muted-foreground">{s.level}</span>
              </div>
            ))}
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
            <span><strong className="text-foreground">Modality bias:</strong> Physical sighting accounts naturally score higher on Corroboration and Physical Effects than dream/meditation contacts. This is intentional — the scale measures EVIDENCE, not DEPTH (see CDS).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">No independent verification:</strong> All claims are assessed from the account as presented. The ESS cannot confirm whether events actually occurred as described.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">AI knowledge contamination:</strong> The model may recognize famous cases from training data. The transcript-only constraint mitigates this but cannot eliminate it entirely.</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/uap/methodology/contact-depth"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border"
          >
            Contact Depth Scale →
          </Link>
          <Link
            href="/uap/methodology/transformation"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border"
          >
            Transformation Index →
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
            name: "UAP Evidence Strength Scale (ESS)",
            description: "7-criterion rubric evaluating evidential strength of UAP encounter claims. Score range 7–28.",
            url: "https://projectprofound.org/uap/methodology/evidence-strength",
            isPartOf: { "@type": "WebSite", name: "Project Profound", url: "https://projectprofound.org" },
          }),
        }}
      />
    </main>
  );
}
