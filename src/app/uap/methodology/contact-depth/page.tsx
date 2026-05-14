/**
 * UAP Contact Depth Scale (CDS) Methodology
 *
 * /uap/methodology/contact-depth — Details the 16-item, 4-category rubric for
 * measuring phenomenological depth of UAP contact experiences.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Layers, ArrowLeft, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Depth Scale (CDS) | UAP Methodology | Project Profound",
  description:
    "The UAP Contact Depth Scale measures the phenomenological depth of UAP contact experiences across 16 items in 4 categories (Observation, Entity Interaction, Consciousness Alteration, Transcendent Elements) each scored 0–2 for a total range of 0–32.",
  openGraph: {
    title: "UAP Contact Depth Scale (CDS) | Project Profound",
    description:
      "16-item rubric measuring phenomenological depth of UAP contact. Score range 0–32. Parallel to the Greyson NDE Scale.",
  },
};

// ─── Data ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    name: "Observation & Physical Encounter",
    code: "CD-1",
    description: "Whether something anomalous was perceived, what form it took, how close it was, and whether it left physical traces.",
    items: [
      { code: "CD-1a", name: "Anomalous Perception", question: "Did the witness perceive something anomalous?", anchors: ["No anomalous perception described", "Vague or uncertain impression", "Clear anomalous perception — specific object, entity, or event described"] },
      { code: "CD-1b", name: "Structured Form", question: "Was a distinct structured form observed?", anchors: ["No distinct form — only vague feelings or intuitions", "Partial form — basic shape but lacking detail", "Structured form — craft with geometry, entity with features, or geometric patterns"] },
      { code: "CD-1c", name: "Proximity", question: "How close was the encounter?", anchors: ["Distant or no spatial proximity", "Moderate proximity — overhead, within a few hundred feet", "Intimate proximity — face-to-face, physical touch, inside craft/environment"] },
      { code: "CD-1d", name: "Physical Effects", question: "Were there physical effects on the witness or environment?", anchors: ["No physical effects described", "Subjective sensations — tingling, heat, vibration, paralysis", "Observable or persistent effects — marks, equipment malfunction, ground traces, missing time"] },
    ],
  },
  {
    name: "Entity Interaction",
    code: "CD-2",
    description: "Whether a non-human intelligence was perceived and the depth of interaction.",
    items: [
      { code: "CD-2a", name: "Entity Perceived", question: "Was a non-human entity or intelligence perceived?", anchors: ["No entity perceived — only objects or phenomena", "Ambiguous — felt presence, sensed intelligence, vague dream figure", "Clear entity — described with features, apparent agency, identifiable source"] },
      { code: "CD-2b", name: "Bilateral Awareness", question: "Did the entity appear to acknowledge the witness?", anchors: ["Entity did not appear to notice the witness", "Entity seemed to orient toward or respond to witness", "Entity directly addressed, approached, or demonstrably responded to witness"] },
      { code: "CD-2c", name: "Communication", question: "Was information exchanged?", anchors: ["No communication of any kind", "Ambiguous — vague impressions, unclear transmission", "Explicit communication — specific messages, information download, detailed visual imagery"] },
      { code: "CD-2d", name: "Transportation / Immersion", question: "Was the witness taken somewhere or immersed in an environment?", anchors: ["Witness remained in their normal environment", "Partial displacement — different perspective, partial vision of another place", "Full immersion — aboard craft, different realm, immersive environment"] },
    ],
  },
  {
    name: "Consciousness Alteration",
    code: "CD-3",
    description: "How the witness's state of consciousness was affected during the encounter.",
    items: [
      { code: "CD-3a", name: "Altered State", question: "Was the witness's consciousness altered?", anchors: ["Normal waking consciousness throughout", "Mildly altered — heightened awareness, time distortion, focused attention", "Significantly altered — trance, dissociation, OBE, complete shift in perceptual reality"] },
      { code: "CD-3b", name: "Telepathic / Non-verbal Contact", question: "Was non-verbal or telepathic communication experienced?", anchors: ["No telepathic or non-verbal contact", "Possible telepathy — felt understanding, vague knowing", "Clear telepathy — specific thoughts received, bilateral mental communication"] },
      { code: "CD-3c", name: "Time Anomaly", question: "Were there anomalies in time perception?", anchors: ["Normal time perception", "Mild distortion — time seemed faster or slower", "Significant anomaly — missing time, time slip, simultaneous perception of past/future"] },
      { code: "CD-3d", name: "Expanded Awareness", question: "Was there an expanded or non-ordinary perception?", anchors: ["Normal perceptual range", "Mildly expanded — heightened senses, seeing energy, unusual clarity", "Significantly expanded — panoramic vision, cosmic awareness, perceiving multiple dimensions simultaneously"] },
    ],
  },
  {
    name: "Transcendent Elements",
    code: "CD-4",
    description: "Whether the experience included transcendent, numinous, or reality-shifting elements.",
    items: [
      { code: "CD-4a", name: "Ontological Shock", question: "Did the experience fundamentally challenge the witness's understanding of reality?", anchors: ["No paradigm challenge described", "Mild surprise or confusion about what was experienced", "Profound ontological shock — fundamental questioning of reality, deep existential impact"] },
      { code: "CD-4b", name: "Numinous Quality", question: "Did the experience have a sacred, awe-inspiring, or deeply meaningful quality?", anchors: ["No numinous quality described", "Mildly awe-inspiring or meaningful", "Profoundly sacred, numinous, or awe-inspiring — described as the most significant experience of their life"] },
      { code: "CD-4c", name: "Emotional Overwhelm", question: "Was there intense emotional response during or after the encounter?", anchors: ["No significant emotional response described", "Moderate emotional response — fear, wonder, excitement, unease", "Intense emotional overwhelm — terror, ecstasy, profound peace, complete emotional transformation"] },
      { code: "CD-4d", name: "Pattern / Recurrence", question: "Is this part of a larger pattern of experiences?", anchors: ["Isolated, single event", "Some indication of related experiences or prior anomalous events", "Clear pattern — recurring contact, lifelong experiencer, multiple encounters across years"] },
    ],
  },
];

const SCORE_LEVELS = [
  { range: "0–6", level: "Minimal Depth", color: "text-muted-foreground" },
  { range: "7–13", level: "Moderate Depth", color: "text-amber-700 dark:text-amber-400" },
  { range: "14–21", level: "Deep Contact", color: "text-blue-700 dark:text-blue-400" },
  { range: "22–32", level: "Profound Contact", color: "text-blue-700 dark:text-blue-400" },
];

const MODALITY_TAGS = [
  { tag: "physical_sighting", desc: "Visual observation of object/craft/entity in waking state, from a distance" },
  { tag: "close_encounter", desc: "Physical proximity to object/entity in waking state (within ~500 ft)" },
  { tag: "dream_vision", desc: "Contact occurring in dream, hypnagogic/hypnopompic state, or spontaneous vision" },
  { tag: "meditation_ce5", desc: "Contact initiated through meditation, CE5 protocol, or intentional practice" },
  { tag: "abduction", desc: "Involuntary transportation, examination, or immersive experience" },
  { tag: "ongoing_contact", desc: "Repeated/sustained contact pattern over time (may include multiple modalities)" },
  { tag: "ambiguous", desc: "Modality unclear from the account" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ContactDepthPage() {
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

          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 mb-6">
            <Layers className="w-3.5 h-3.5" />
            UAP-CDS
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-serif tracking-tight text-foreground mb-4">
            Contact Depth Scale
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            16 items across 4 categories measuring phenomenological depth of UAP contact experiences.
            Score range 0–32. Structurally parallel to the Greyson NDE Scale.
          </p>
        </div>
      </section>

      {/* Purpose */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-4">Purpose</h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            The UAP Contact Depth Scale answers: <strong className="text-foreground">&quot;What happened?&quot;</strong> — not
            &quot;is it true?&quot; (ESS) or &quot;how did it change you?&quot; (CTI). It is deliberately <strong className="text-foreground">modality-agnostic</strong> — scoring the depth of the reported experience regardless of whether contact occurred physically, in a dream, during meditation, or through an ambiguous altered state.
          </p>
          <p>
            A vivid bilateral dream contact can score <strong className="text-foreground">higher</strong> than a distant physical sighting. This is intentional — the CDS measures <em>depth of the experience as reported</em>, not physical proximity.
          </p>
        </div>
      </section>

      {/* Modality Tags */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-4">Contact Modality Tags</h2>
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <p className="text-sm text-muted-foreground mb-4">Non-scoring metadata for analytical filtering. A single encounter may span multiple modalities.</p>
          <div className="flex flex-wrap gap-2">
            {MODALITY_TAGS.map((t) => (
              <span key={t.tag} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40" title={t.desc}>
                {t.tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* The 16 Items */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold font-serif mb-6">The 16 Items</h2>
        <p className="text-sm text-muted-foreground mb-6">Each item scored: <strong className="text-foreground">0</strong> = Not present, <strong className="text-foreground">1</strong> = Mildly/ambiguously present, <strong className="text-foreground">2</strong> = Definitely present</p>

        <div className="space-y-8">
          {CATEGORIES.map((cat) => (
            <div key={cat.code}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">{cat.code}</span>
                <h3 className="text-lg font-semibold font-serif text-foreground">{cat.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{cat.description}</p>

              <div className="space-y-4">
                {cat.items.map((item) => (
                  <div key={item.code} className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{item.code}</span>
                      <h4 className="font-semibold font-serif text-foreground">{item.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground italic mb-3">{item.question}</p>
                    <div className="space-y-1.5">
                      {item.anchors.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-400 shrink-0 mt-0.5">
                            {i}
                          </span>
                          <span className="text-muted-foreground">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Score Interpretation */}
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
          Design Decisions
        </h2>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 p-6 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">Modality-agnostic by design:</strong> Dream and meditation contacts are scored identically to physical sightings. This captures depth of experience regardless of physical reality.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">Not a truth detector:</strong> A high CDS score means the experience was phenomenologically rich and deep, not that it actually occurred as described.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
            <span><strong className="text-foreground">Video as unit of analysis:</strong> If a speaker describes multiple encounters, items are scored based on whether that feature appeared anywhere across all described experiences.</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/uap/methodology/evidence-strength" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border">
            ← Evidence Strength Scale
          </Link>
          <Link href="/uap/methodology/transformation" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors border border-border">
            Transformation Index →
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UAP Contact Depth Scale (CDS)",
            description: "16-item rubric measuring phenomenological depth of UAP contact experiences. Score range 0–32.",
            url: "https://projectprofound.org/uap/methodology/contact-depth",
            isPartOf: { "@type": "WebSite", name: "Project Profound", url: "https://projectprofound.org" },
          }),
        }}
      />
    </main>
  );
}
