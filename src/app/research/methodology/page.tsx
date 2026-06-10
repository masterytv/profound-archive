/**
 * Research Methodology Page
 *
 * /research/methodology — Comprehensive academic methodology document
 * describing Project Profound's data acquisition, analysis instruments,
 * computational pipeline, known limitations, and future research plans.
 *
 * Static page (no data fetching). Content is authored inline from
 * methodology/METHODOLOGY.md to preserve full control over styling.
 */

import { serializeJsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  FlaskConical,
  Database,
  Brain,
  Cpu,
  AlertTriangle,
  Wand2,
  Rocket,
  BookOpen,
  GitBranch,
  Layers,
  Target,
  Scale,
  Search,
  FileText,
  Users,
  Compass,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Research Methodology | Project Profound',
  description:
    'A computational framework for the large-scale analysis of first-person accounts of near-death and anomalous experiences. Full methodology documentation covering data acquisition, analytical instruments, pipeline architecture, and known limitations.',
  openGraph: {
    title: 'Research Methodology — Project Profound',
    description:
      'How we analyze thousands of first-person NDE and UAP contact experience testimonies using AI-powered multi-pass analysis pipelines.',
    type: 'article',
  },
};

// ─── Table of Contents ──────────────────────────────────────────────────────

const TOC_SECTIONS = [
  { id: 'genesis', label: 'Genesis' },
  { id: 'abstract', label: 'Abstract' },
  { id: 'philosophical-framing', label: '1. Philosophical Framing' },
  { id: 'data-characteristics', label: '2. Data Characteristics' },
  { id: 'data-acquisition', label: '3. Data Acquisition Pipeline' },
  { id: 'nde-instruments', label: '4. NDE Analysis Instruments' },
  { id: 'uap-instruments', label: '5. UAP Analysis Instruments' },
  { id: 'pipeline-architecture', label: '6. Pipeline Architecture' },
  { id: 'cross-domain', label: '7. Cross-Domain Framework' },
  { id: 'embeddings', label: '8. Embedding & Retrieval' },
  { id: 'prompt-engineering', label: '9. Prompt Engineering' },
  { id: 'limitations', label: '10. Known Limitations' },
  { id: 'ethics', label: '11. Ethical Considerations' },
  { id: 'future', label: '12. Future Directions' },
  { id: 'technical-reference', label: '13. Technical Reference' },
  { id: 'references', label: '14. References' },
];

// ─── Reusable Components ────────────────────────────────────────────────────

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 flex items-center gap-3 mb-4 pt-8 first:pt-0">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
      </div>
      <h2
        className="text-2xl font-bold text-slate-800 dark:text-slate-200"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
      >
        {children}
      </h2>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-8 mb-3"
      style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
    >
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-4">
      {children}
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 my-6">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
        {title}
      </h4>
      {children}
    </div>
  );
}

function CautionBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-violet-50/50 via-transparent to-blue-50/50 dark:from-violet-900/10 dark:to-blue-900/10">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
          <Link
            href="/research/cross-domain"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Research
          </Link>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Research Methodology
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1]"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Project Profound: Methodology Summary
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mt-3 max-w-3xl leading-relaxed">
            A computational framework for the large-scale analysis of first-person accounts
            of near-death and anomalous experiences.
          </p>

        </div>
      </section>

      {/* ── Content Grid ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          {/* Main content */}
          <article className="space-y-2">

            {/* ═══ Genesis ═══ */}
            <section id="genesis" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h2
                  className="text-2xl font-bold text-slate-800 dark:text-slate-200"
                  style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                  Genesis: Why Project Profound Exists
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-amber-50/40 via-white to-violet-50/40 dark:from-amber-900/10 dark:via-slate-900/60 dark:to-violet-900/10 p-6 sm:p-8 mb-8">
                <Prose>
                  <h3
                    className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-0 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                  >
                    The Hard Problem and the Missing Data
                  </h3>
                  <p>
                    Scientists and philosophers often speak of the &quot;hard problem of
                    consciousness&quot; — the question of how a physical, biological brain gives rise to
                    subjective, first-person experience. It is arguably the deepest open question in
                    science. To investigate the physical universe, we possess a magnificent tool: the
                    scientific method. This systematic framework of observation, hypothesis,
                    experimentation, and conclusion has fundamentally transformed human civilization. By
                    producing objective, physically verifiable evidence, science has mastered the material
                    world.
                  </p>
                  <p>
                    Yet by its very design, this method possesses a structural limitation when applied to
                    the interior of human experience. Because it demands that reality be quantifiable,
                    repeatable, and physically measurable, it inherently prioritizes the average, the
                    predictable, and the observable. When human anomalies occur in medicine, psychology,
                    or consciousness research, the analytical machinery smooths them away. Truly
                    extraordinary, inexplicable results are relegated to a case report: a historical file
                    of statistical noise, set aside for the sake of the baseline.
                  </p>
                  <p>
                    And yet the history of science demonstrates that our greatest paradigm shifts are born
                    precisely from the anomalies the baseline tried to suppress. Copernicus tracked the
                    erratic retrograde motion of Mars and concluded that the Earth revolves around the
                    Sun. Van Leeuwenhoek observed inexplicable microscopic anomalies through a homemade
                    lens and revealed that an invisible universe of living organisms exists within and
                    around us. Both were initially ridiculed. Both were vindicated because the anomalies
                    they highlighted turned out to be keys to a deeper truth.
                  </p>

                  <h3
                    className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-8 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                  >
                    A Personal Catalyst
                  </h3>
                  <p>
                    Project Profound began with a direct, personal experience that resisted explanation. It
                    might be described as an awakening — a sudden, overwhelming experience of bliss
                    followed by a state of knowing. It was more vivid and more true than anything I had
                    ever experienced in ordinary waking life. And it was completely unprovable. An anomaly
                    that would never be independently verified by another person.
                  </p>
                  <p>
                    Rather than dismiss it, we began to ask: <em>Has anyone else reported something like
                    this?</em>
                  </p>
                  <p>
                    We discovered near-death experiences — accounts from people who had been clinically
                    dead and returned with vivid, structured narratives of what they perceived during that
                    interval. Some included veridical details: specific, verifiable observations of the
                    physical world that should have been impossible to perceive. First we found dozens of
                    these accounts. Then hundreds. Now thousands. Each one spontaneous, uncoached, and
                    strikingly consistent in its phenomenological architecture.
                  </p>

                  <h3
                    className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-8 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                  >
                    Stories as Empirical Data
                  </h3>
                  <p>
                    We propose that there is an extraordinary repository of human anomalies that modern
                    science has systematically overlooked: <strong>our stories</strong>. Narrative is the
                    oldest technology we possess. It is the framework through which humanity has
                    communicated, learned, healed, and evolved. In medicine, when enough patients describe
                    their story of the same pain, the same progression, the same inexplicable symptom, we
                    investigate further. We listen to them, aggregate them, and search for the signal in
                    the noise.
                  </p>
                  <p>
                    This is why we began to collect and analyze stories of NDEs at computational scale. We
                    found patterns. We found structures. We found recurring phenomenological elements that
                    appeared across cultures, age groups, and medical contexts with a consistency that
                    demanded explanation.
                  </p>
                  <p>
                    Then we discovered similar patterns in an adjacent domain: UAP contact encounters.
                    These accounts are drawn from entirely different populations, cultural contexts, and
                    trigger conditions but exhibited overlapping phenomenological architectures. We
                    wondered: if we analyzed these stories with the same rigor and compared them to our
                    NDE dataset, would we find evidence of shared underlying structures?
                  </p>
                  <p>
                    We did. Our cross-domain analysis reached a preliminary but interesting conclusion:
                    many of the same consciousness phenomena appeared in both NDE and UAP contact accounts
                    (e.g. entity encounters, telepathic communication, time distortion, knowledge
                    downloads, ontological shock) but the emotional tone diverged. NDEs leaned heavily
                    toward love, peace, and cosmic unity, while UAP encounters were more ambivalent,
                    leaning toward awe and fear. The phenomenological overlap was too consistent to be
                    coincidental.
                  </p>

                  <h3
                    className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-8 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                  >
                    Turning the Qualitative into the Quantitative
                  </h3>
                  <p>
                    Historically, analyzing thousands of highly complex, unstructured, first-person
                    narratives was a human impossibility. A researcher could read dozens, perhaps a few
                    hundred accounts, but their own cognitive biases, cultural filters, and memory limits
                    would distort the global patterns. This is where traditional clinical research reaches
                    its ceiling, and where modern computational intelligence begins.
                  </p>
                  <p>
                    Project Profound was founded to bridge this explanatory gap. By deploying a multi-pass
                    pipeline of advanced large language models, we treat subjective narrative as
                    high-dimensional data to be mapped. This allows us to extract validated psychometric
                    features, reconstruct chronological experiential flows, and isolate cross-domain
                    phenomenological invariants at a scale never before attempted in consciousness
                    research.
                  </p>
                  <p>
                    We are eager to collaborate with other independent and institutional researchers to
                    improve these methodologies, expand our domains of inquiry, and contribute to
                    humanity&apos;s understanding of consciousness through the systematic analysis of the
                    stories we tell.
                  </p>
                  <p>
                    The following methodology outlines the technical, computational, and architectural
                    framework we have built to listen to humanity&apos;s most profound stories.
                  </p>
                </Prose>
              </div>
            </section>

            {/* ═══ Abstract ═══ */}
            <SectionHeading id="abstract" icon={BookOpen}>
              Abstract
            </SectionHeading>
            <Prose>
              <p>
                Project Profound is a computational research platform designed to extract, classify, and
                analyze first-person accounts of near-death experiences (NDEs) and unidentified anomalous
                phenomena (UAP) contact experiences from publicly available YouTube video testimony. Unlike
                traditional survey-based NDE research, this project operates on spontaneous, naturalistic
                first-person narratives—video testimony shared by experiencers in their own words, in their
                own time, without researcher intervention.
              </p>
              <p>
                The system employs a multi-pass pipeline of large language model (LLM) analysis to apply
                validated psychometric scales, extract phenomenological features, and generate structured
                datasets at a scale previously infeasible in experiential research.
              </p>
              <p>
                This document describes the data acquisition pipeline, the analytical instruments employed,
                the computational methodology, the known limitations and error characteristics, and the
                research team&apos;s intentions for future validation and scaling.
              </p>
            </Prose>

            {/* ═══ §1: Philosophical Framing ═══ */}
            <SectionHeading id="philosophical-framing" icon={Compass}>
              1. Philosophical Framing
            </SectionHeading>

            <SubHeading>1.1 A Novel Corpus</SubHeading>
            <Prose>
              <p>
                The corpus analyzed by Project Profound is fundamentally different from the datasets used in
                traditional NDE or anomalous experience research. Rather than structured questionnaires
                administered under controlled conditions (e.g., Greyson, 1983; Ring, 1980; van Lommel et al.,
                2001), the source material consists of <strong>first-person video testimony</strong>—voluntarily
                shared accounts recorded in naturalistic settings such as interviews, podcasts, and personal
                testimonials published to YouTube.
              </p>
              <p>This distinction carries significant methodological implications:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>No experimenter demand effects.</strong> The experiencer is not responding to a
                  researcher&apos;s questions or a pre-structured survey instrument. The narrative unfolds
                  according to the experiencer&apos;s own priorities and emotional sequencing.
                </li>
                <li>
                  <strong>Rich phenomenological detail.</strong> Video accounts frequently contain
                  paralinguistic information (hesitation, emotional inflection, self-correction) that is
                  absent from written questionnaire responses. While the current pipeline operates on text
                  transcripts and does not analyze audio or video features, this richness is preserved in
                  the raw data for future multimodal analysis.
                </li>
                <li>
                  <strong>Self-selection bias.</strong> The corpus is composed of individuals who chose to
                  share their experiences publicly. This likely overrepresents dramatic, positive, or
                  culturally validated experiences and underrepresents distressing, fragmentary, or
                  stigmatized accounts. This bias is acknowledged and documented throughout the analysis.
                </li>
                <li>
                  <strong>Uncontrolled provenance.</strong> Unlike clinical samples drawn from cardiac arrest
                  units or ICU populations, the trigger conditions, medical histories, and temporal distances from the experience
                  are self-reported within the narrative and cannot be independently verified.
                </li>
              </ul>
            </Prose>

            <SubHeading>1.2 Consciousness as the Common Variable</SubHeading>
            <Prose>
              <p>
                A foundational insight of Project Profound is that near-death experiences and UAP contact
                experiences, despite their different phenomenological surfaces, share a common substrate:{' '}
                <strong>first-person reports of anomalous states of consciousness</strong>. Both involve
                narrative accounts of perceived reality shifts, entity encounters, information acquisition
                through non-ordinary means, and subsequent psychological transformation.
              </p>
              <p>
                By building parallel analytical frameworks for NDE and UAP contact testimony, the project
                enables cross-domain phenomenological comparison at a scale that has never been attempted.
                The Greyson Scale has its UAP counterpart in the Contact Depth Scale; the NDE Transformation
                Index mirrors the UAP Contact Transformation Index; and the cvNDE (veridical perception)
                scale finds its analog in the UAP Evidence Strength Scale. This symmetry is deliberate and
                is discussed in §7.
              </p>
            </Prose>

            {/* ═══ §2: Data Characteristics ═══ */}
            <SectionHeading id="data-characteristics" icon={Database}>
              2. Data Characteristics and Corpus Design
            </SectionHeading>

            <SubHeading>2.1 Source Selection</SubHeading>
            <Prose>
              <p>
                The NDE corpus is sourced from YouTube channels that primarily or frequently feature
                first-person NDE testimony. Channels are identified through manual curation and are stored
                in a persistent channel registry with enriched metadata including subscriber counts, total
                video counts, and scanning status. As of this writing, the NDE archive contains analysis of
                4,897 videos, and the UAP archive contains 4,151 videos across multiple channels.
              </p>
              <p>
                A channel-level scanner periodically audits enabled channels for new uploads, discovers
                candidate videos, and queues them for intake processing. This scanner architecture ensures
                the corpus grows continuously without manual intervention.
              </p>
            </Prose>

            <SubHeading>2.2 Inclusion and Exclusion Criteria</SubHeading>
            <InfoCard title="NDE Domain">
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <p>
                  <strong className="text-green-600 dark:text-green-400">Included:</strong> First-person
                  accounts of near-death experiences (NDEs), out-of-body experiences (OBEs), shared death
                  experiences (SDEs), after-death communications (ADCs), and spiritually transformative
                  experiences (STEs).
                </p>
                <p>
                  <strong className="text-red-600 dark:text-red-400">Excluded:</strong> Discussions{' '}
                  <em>about</em> NDEs without a first-person account, documentary narration without
                  experiencer testimony, guided meditations, fiction, entertainment content, news reports
                  without experiencer accounts, book reviews, and academic lectures. YouTube Shorts (≤ 180
                  seconds) are also excluded.
                </p>
              </div>
            </InfoCard>

            <InfoCard title="UAP Domain">
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <p>
                  <strong className="text-green-600 dark:text-green-400">Tier 1 (Included):</strong>{' '}
                  First-person encounter testimony, interviews with direct experiencers, detailed retold
                  encounters from credible sources.
                </p>
                <p>
                  <strong className="text-blue-600 dark:text-blue-400">Tier 2 (Included):</strong> Research
                  analysis, investigative journalism, documentary surveys, program disclosure content, and
                  news commentary.
                </p>
                <p>
                  <strong className="text-red-600 dark:text-red-400">Tier 3 (Excluded):</strong>{' '}
                  Entertainment, debunking content, unrelated conspiracy theories, and content with no
                  substantive UAP information.
                </p>
              </div>
            </InfoCard>

            <SubHeading>2.3 Transcript Acquisition</SubHeading>
            <Prose>
              <p>
                For each video, the system attempts to retrieve English-language captions via the YouTube
                subtitle API. Both manual (human-authored) and auto-generated (ASR-produced) captions are
                accepted, with the source type recorded. When captions are unavailable, the video is marked
                as <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">no_captions</code> and
                excluded from analysis. Raw caption segments are processed through a transcript processor
                that concatenates timed segments, applies punctuation restoration, produces a cleaned version
                for embedding, and chunks the transcript into overlapping segments for semantic search and
                RAG applications.
              </p>
            </Prose>

            {/* ═══ §3: Data Acquisition Pipeline ═══ */}
            <SectionHeading id="data-acquisition" icon={GitBranch}>
              3. Data Acquisition Pipeline
            </SectionHeading>
            <Prose>
              <p>
                The intake pipeline is an automated, multi-stage orchestrator that processes a single YouTube
                video from URL to fully analyzed database record. The pipeline is designed as a pure function
                that can be invoked from an admin interface, a scheduled cron job, or a command-line script.
              </p>
            </Prose>

            <SubHeading>3.1 Experience Classification Gate</SubHeading>
            <Prose>
              <p>
                Before running the computationally expensive full analysis suite, a lightweight classification
                pass screens each video transcript to determine whether it contains a genuine first-person
                account of a profound experience. This gate uses OpenAI GPT-4o with a focused prompt,
                examining only the first ~15,000 characters of the transcript at a temperature of 0.1 for
                maximum consistency.
              </p>
              <p>The NDE classifier outputs:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Experience type:</strong> NDE, OBE, SDE, ADC, STE, or none</li>
                <li><strong>Confidence score:</strong> 0–100</li>
                <li>
                  <strong>NDE classification:</strong>{' '}
                  <em>clear_nde</em> (confidence ≥ 70), <em>possible_nde</em> (40–69),{' '}
                  <em>not_nde</em>, or <em>insufficient_info</em> (confidence &lt; 20)
                </li>
                <li>
                  <strong>Experiencer name:</strong> Extracted via prompt rules that distinguish the
                  experiencer from the interviewer, host, or narrator
                </li>
                <li><strong>Justification:</strong> A 1–2 sentence explanation of the classification decision</li>
              </ul>
              <p>
                Videos classified as &quot;not profound&quot; are persisted in the database with their
                classification metadata but are not subjected to further analysis, conserving API resources.
              </p>
            </Prose>

            <SubHeading>3.2 NDE Intake Pipeline</SubHeading>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300 w-12">Step</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Operation</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300 w-24">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-400">
                  {[
                    ['1', 'URL Parsing — Extract YouTube video ID', '< 1s'],
                    ['2', 'Deduplication Check — Query database for existing records', '< 1s'],
                    ['3', 'Metadata Scraping — Video & channel metadata via YouTube Data API', '2–5s'],
                    ['3b', 'Shorts Gate — Reject videos ≤ 180s duration', '< 1s'],
                    ['4', 'Channel Enrichment — Upsert channel metadata if new', '2–5s'],
                    ['5', 'Caption Retrieval — Fetch and validate English captions', '3–10s'],
                    ['6', 'Transcript Processing — Punctuation, cleaning, chunking', '< 1s'],
                    ['7', 'Record Insertion — Upsert initial video record to database', '< 1s'],
                    ['8', 'Experience Classification — Lightweight AI gate (see §3.1)', '2–5s'],
                    ['9', 'Full Analysis Suite — Seven parallel LLM passes (see §4)', '30–90s'],
                    ['10', 'Result Persistence — Save all analysis results', '1–3s'],
                    ['11', 'Embedding Generation — Search and chat vector embeddings', '10–30s'],
                    ['12', 'Experience Fingerprint — 27-dimension similarity vector', '< 1s'],
                    ['13', 'Experiencer Profile Sync — Link to experiencer profile', '1–3s'],
                  ].map(([step, op, dur], i) => (
                    <tr key={step} className={i % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/20'}>
                      <td className="px-3 py-2 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">{step}</td>
                      <td className="px-3 py-2">{op}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{dur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Prose>
              <p>
                Total pipeline execution time for a single video is typically <strong>60–120 seconds</strong>,
                dominated by the parallel LLM analysis calls and sequential embedding insertions.
              </p>
            </Prose>

            <SubHeading>3.3 UAP Intake Pipeline</SubHeading>
            <Prose>
              <p>
                The UAP pipeline follows a structurally similar architecture but with domain-specific differences:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Classification</strong> uses a UAP-specific classifier with chain-of-thought
                  reasoning and few-shot examples to determine tier, track, content type, source type, and
                  experiencer names.
                </li>
                <li>
                  <strong>Tier 3 Gate</strong> replaces the NDE &quot;not profound&quot; gate — out-of-scope
                  content is rejected.
                </li>
                <li>
                  <strong>Encounter Segmentation</strong> — For multi-experiencer videos, an LLM pass
                  segments the transcript into per-encounter blocks, enabling independent analysis of each
                  experiencer&apos;s account within a single video.
                </li>
                <li>
                  <strong>Dual Analysis Suite</strong> — Program intelligence analysis runs on all Tier 1+2
                  videos. Encounter-level phenomenological analysis and CET triad scoring run per encounter
                  segment.
                </li>
                <li>
                  <strong>Name Deduplication</strong> — ASR-induced misspellings of experiencer names are
                  normalized using fuzzy matching and LLM-assisted deduplication.
                </li>
                <li>
                  <strong>Tier Reconciliation</strong> — If encounter segmentation reveals first-person
                  testimony that the classifier missed, the video is automatically promoted from Tier 2 to
                  Tier 1.
                </li>
              </ul>
            </Prose>

            {/* ═══ §4: NDE Analysis Instruments ═══ */}
            <SectionHeading id="nde-instruments" icon={Scale}>
              4. NDE Analysis Instruments
            </SectionHeading>
            <Prose>
              <p>
                Each video that passes the classification gate is subjected to <strong>seven parallel
                analysis passes</strong>, each implemented as an independent LLM call with a domain-specific
                system prompt and structured JSON output schema. All passes use GPT-4o-mini with{' '}
                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  response_format: {'{'}type: &quot;json_object&quot;{'}'}
                </code>{' '}
                at low temperature (0.2) for scoring consistency.
              </p>
            </Prose>

            <SubHeading>4.1 Greyson NDE Scale</SubHeading>
            <Prose>
              <p>
                <strong>Reference:</strong> Greyson, B. (1983). &quot;The Near-Death Experience Scale:
                Construction, Reliability, and Validity.&quot;{' '}
                <em>Journal of Nervous and Mental Disease</em>, 171(6), 369–375.
              </p>
              <p>
                The validated 16-item Greyson NDE Scale is the most widely used instrument in NDE research.
                Our implementation scores each of the 16 items (across 4 subscales: Cognitive, Affective,
                Paranormal, Transcendental) as 0 (not present), 1 (mildly/ambiguously present), or 2
                (definitely present), yielding a total score of 0–32.
              </p>
              <p>
                <strong>Classification thresholds:</strong> Not NDE (0–6), Mild NDE (7–12), Moderate NDE
                (13–20), Deep NDE (21–32).
              </p>
            </Prose>
            <CautionBox>
              <strong>Measurement note:</strong> The traditional Greyson Scale cut-off of ≥ 7 was designed for
              self-administered questionnaires. In our application, features not mentioned in the narrative
              score 0, but their absence does not necessarily mean the experiencer did not have that feature.
              This systematically biases scores downward compared to direct questionnaire administration.
            </CautionBox>

            <SubHeading>4.2 Claimed Veridical NDE Scale (cvNDE)</SubHeading>
            <Prose>
              <p>
                A custom 7-criterion scale (each scored 1–4, total 7–28) evaluating the evidential strength
                of veridical perception claims. Criteria include: medical state severity, perceptual access
                impossibility, specificity and precision, unpredictability, self-reported verification quality,
                verified perception weight, and temporal precedence of perception report.
              </p>
              <p>
                <strong>Scoring levels:</strong> Low (7–12), Moderate (13–17), High (18–22), Exceptional
                (23–28).
              </p>
            </Prose>
            <CautionBox>
              This scale measures the <em>claims</em> of veridical perception as reported in the narrative.
              It does not constitute independent verification. The scale evaluates the <em>structure of the
              claim</em> rather than asserting objective accuracy.
            </CautionBox>

            <SubHeading>4.3 NDE Transformation Index (NDE-TI)</SubHeading>
            <Prose>
              <p>
                A 10-domain scale (each scored 0–5, total 0–50) measuring self-reported transformation:
                Appreciation for Life, Self-Perception &amp; Identity, Compassion &amp; Concern for Others,
                Values &amp; Priorities, Spiritual Awareness, Religious Orientation, Attitude Toward Death,
                Psychic &amp; Expanded Perception, Relationships &amp; Social Dynamics, and Purpose, Meaning
                &amp; Life Direction.
              </p>
              <p>
                Each domain also captures a direction indicator (up, down, mixed, shifted, new), evidence
                summary, and key quote. Aggregate metrics include overall score, transformation breadth
                (0–10), and depth (1.0–5.0).
              </p>
            </Prose>

            <SubHeading>4.4 Core Elements Analysis</SubHeading>
            <Prose>
              <p>
                Extracts the presence/absence of <strong>15 standard NDE phenomenological elements</strong>:{' '}
                out-of-body, tunnel, bright light, deceased relatives, life review, being of light,
                border/boundary, feelings of peace, cosmic unity, time distortion, enhanced senses, telepathy,
                otherworldly realm, knowledge download, and choice to return. Each element is scored with a
                confidence rating (0–100) and supporting transcript quote.
              </p>
              <p>
                Also outputs: experience type, trigger category, overall tone, intensity rating (1–10), and
                content safety flags.
              </p>
            </Prose>

            <SubHeading>4.5 Phenomenology and Entity Encounters</SubHeading>
            <Prose>
              <p>
                Provides fine-grained phenomenological quality assessment (reality comparison, vividness
                rating, 6 sensory modalities, emotional progression, altered cognition) and detailed entity
                encounter documentation (identity, type, appearance, communication method, message content,
                emotional quality).
              </p>
            </Prose>

            <SubHeading>4.6 Journey Flow Sequence</SubHeading>
            <Prose>
              <p>
                Reconstructs the chronological sequence of phenomenological events using a{' '}
                <strong>25-element taxonomy organized across 6 phases</strong>: Initial Transition (4
                elements), Emotional/Sensory States (7), Encounters (5), Realm/Environment (4), Transformative
                Experiences (5), and Return (5). An element synonym normalization layer handles LLM output
                variations.
              </p>
            </Prose>

            <SubHeading>4.7 Factual Summary</SubHeading>
            <Prose>
              <p>
                Generates a concise, objective, 80–150 word summary at a Grade 8 reading level, structured
                as Trigger → Experience → Aftermath. Used for search result cards and accessibility purposes.
              </p>
            </Prose>

            {/* ═══ §5: UAP Instruments ═══ */}
            <SectionHeading id="uap-instruments" icon={Target}>
              5. UAP Contact Experience Analysis Instruments
            </SectionHeading>

            <SubHeading>5.1 Contact Experience Triad (CET)</SubHeading>
            <Prose>
              <p>
                The UAP analysis employs a parallel triad framework designed for cross-domain comparison:
              </p>
            </Prose>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left px-3 py-2.5 font-semibold text-violet-600 dark:text-violet-400">NDE Instrument</th>
                    <th className="text-center px-3 py-2.5"><ChevronRight className="w-4 h-4 text-muted-foreground mx-auto" /></th>
                    <th className="text-left px-3 py-2.5 font-semibold text-green-600 dark:text-green-400">UAP Counterpart</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Measures</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-400">
                  <tr>
                    <td className="px-3 py-2">cvNDE</td>
                    <td className="px-3 py-2 text-center">→</td>
                    <td className="px-3 py-2">UAP-ESS (Evidence Strength)</td>
                    <td className="px-3 py-2">Evidential quality of claims</td>
                  </tr>
                  <tr className="bg-slate-50/30 dark:bg-slate-800/20">
                    <td className="px-3 py-2">Greyson Scale</td>
                    <td className="px-3 py-2 text-center">→</td>
                    <td className="px-3 py-2">UAP-CDS (Contact Depth)</td>
                    <td className="px-3 py-2">Depth/complexity of experience</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">NDE-TI</td>
                    <td className="px-3 py-2 text-center">→</td>
                    <td className="px-3 py-2">UAP-CTI (Transformation)</td>
                    <td className="px-3 py-2">Post-experience transformation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Prose>
              <p>
                The UAP-ESS evaluates evidential quality across 7 criteria (score 7–28). The UAP-CDS measures
                contact depth across 8 dimensions (score 0–32). The UAP-CTI extends the NDE-TI with 12
                domains (score 0–60), adding UAP-specific dimensions like worldview expansion, relationship
                to secrecy/disclosure, and ecological consciousness.
              </p>
              <p>
                UAP channels also receive computed aggregate scores including Intelligence Value, Speaker
                Credibility, Encounter Depth, Impact Score, Archetype Classification, and a 3-letter Channel
                Personality Code.
              </p>
            </Prose>

            {/* ═══ §6: Pipeline Architecture ═══ */}
            <SectionHeading id="pipeline-architecture" icon={Cpu}>
              6. Computational Pipeline Architecture
            </SectionHeading>

            <SubHeading>6.1 Infrastructure</SubHeading>
            <Prose>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Application:</strong> Next.js 14+ (App Router), deployed to Vercel</li>
                <li><strong>Database:</strong> Supabase (PostgreSQL) with pgvector extension</li>
                <li><strong>LLM Provider:</strong> OpenAI API (GPT-4o-mini for analysis; GPT-4o for UAP classification)</li>
                <li><strong>Embedding Model:</strong> OpenAI text-embedding-3-small (1536-dimension vectors)</li>
                <li><strong>Transcript Source:</strong> YouTube subtitle API via third-party caption service</li>
              </ul>
            </Prose>

            <SubHeading>6.2 Parallelism and Error Tolerance</SubHeading>
            <Prose>
              <p>
                All analysis passes execute in parallel using <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Promise.allSettled()</code>,
                meaning that the failure of any single pass does not prevent the others from completing. The
                pipeline records which passes succeeded and which failed, enabling selective re-analysis.
              </p>
            </Prose>

            <SubHeading>6.3 Temperature and Determinism</SubHeading>
            <Prose>
              <p>
                Scoring passes use a temperature of <strong>0.1</strong> for consistency. Element detection
                and phenomenological analysis use <strong>0.2</strong> for nuanced interpretation. Summary
                generation uses <strong>0.3</strong> for natural writing.
              </p>
            </Prose>

            <SubHeading>6.4 Token Management</SubHeading>
            <Prose>
              <p>
                Transcripts are truncated to manage costs: classification gate uses the first 15K characters,
                analysis passes use 50K characters (sufficient for most hour-long videos), summary generation
                uses 30K characters, and full-text embedding uses 8K characters.
              </p>
            </Prose>

            {/* ═══ §7: Cross-Domain ═══ */}
            <SectionHeading id="cross-domain" icon={Layers}>
              7. Cross-Domain Comparative Framework
            </SectionHeading>
            <Prose>
              <p>
                The parallel triad design enables direct research questions: Do NDE and UAP contact
                experiencers report similar phenomenological features? Do these experiences produce similar
                transformations? What is the evidential quality of claims in each domain?
              </p>
            </Prose>

            <SubHeading>7.1 Experience Fingerprint</SubHeading>
            <Prose>
              <p>
                A <strong>27-dimension numerical vector</strong> encodes each NDE: 15 core element
                presence/absence flags (binary), intensity rating (normalized 0–1), emotional tone (3-dim
                one-hot), experience type (5-dim one-hot), and trigger category (3-dim one-hot). These
                fingerprints enable <strong>cosine similarity search</strong> for phenomenologically similar
                experiences via pgvector.
              </p>
            </Prose>

            {/* ═══ §8: Embeddings ═══ */}
            <SectionHeading id="embeddings" icon={Search}>
              8. Embedding and Retrieval Architecture
            </SectionHeading>
            <Prose>
              <p>Each video generates multiple embedding layers:</p>
            </Prose>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Layer</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Chunk Size</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Use Case</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-400">
                  <tr><td className="px-3 py-2">Timestamped search</td><td className="px-3 py-2">~500 tokens</td><td className="px-3 py-2">Semantic search with video timestamp</td></tr>
                  <tr className="bg-slate-50/30 dark:bg-slate-800/20"><td className="px-3 py-2">Chat/RAG chunks</td><td className="px-3 py-2">~1,000 tokens</td><td className="px-3 py-2">AI chatbot retrieval</td></tr>
                  <tr><td className="px-3 py-2">Full text</td><td className="px-3 py-2">8K chars</td><td className="px-3 py-2">Document-level similarity</td></tr>
                  <tr className="bg-slate-50/30 dark:bg-slate-800/20"><td className="px-3 py-2">Experience fingerprint</td><td className="px-3 py-2">27 dimensions</td><td className="px-3 py-2">Phenomenological similarity</td></tr>
                </tbody>
              </table>
            </div>
            <Prose>
              <p>
                The platform includes a conversational AI interface using RAG to ground responses in actual
                experiencer testimony, maintaining fidelity to source material.
              </p>
            </Prose>

            {/* ═══ §9: Prompt Engineering ═══ */}
            <SectionHeading id="prompt-engineering" icon={Wand2}>
              9. Prompt Engineering Methodology
            </SectionHeading>

            <SubHeading>9.1 Iterative Development Process</SubHeading>
            <Prose>
              <p>Each analysis prompt underwent extensive iterative development:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li><strong>Initial design</strong> based on academic literature and validated instruments.</li>
                <li><strong>Manual testing</strong> against a diverse sample of transcripts spanning high-confidence NDEs, ambiguous cases, non-NDE content, and edge cases.</li>
                <li><strong>Model comparison</strong> across multiple LLM providers and sizes. GPT-4o-mini was selected for its balance of accuracy, cost, and structured output reliability.</li>
                <li><strong>Error analysis</strong> — manual review to identify systematic biases (e.g., score inflation, interviewer/experiencer confusion) and prompt revisions to mitigate them.</li>
                <li><strong>Schema refinement</strong> — iterative adjustment to capture the right level of granularity while minimizing hallucination.</li>
              </ol>
            </Prose>

            <SubHeading>9.2 Prompt Design Principles</SubHeading>
            <Prose>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Explicit scoring rubrics</strong> with concrete examples at each score level</li>
                <li><strong>Negative examples</strong> — what does <em>not</em> qualify</li>
                <li><strong>Grounding instructions</strong> — &quot;Score ONLY what is described or clearly implied&quot;</li>
                <li><strong>Calibration notes</strong> — domain-specific expectations to prevent inflation</li>
                <li><strong>Attribution requirements</strong> — evidence summaries and quotes for auditability</li>
              </ul>
            </Prose>

            <SubHeading>9.3 Post-Processing and Normalization</SubHeading>
            <Prose>
              <p>
                LLM outputs undergo post-processing: element synonym normalization (e.g., &quot;darkness&quot;
                → &quot;void_darkness&quot;), score bounds validation, null handling, and deterministic
                timestamp matching for UAP encounter analysis.
              </p>
            </Prose>

            {/* ═══ §10: Limitations ═══ */}
            <SectionHeading id="limitations" icon={AlertTriangle}>
              10. Known Limitations and Error Analysis
            </SectionHeading>

            <SubHeading>10.1 Measurement Validity</SubHeading>
            <CautionBox>
              <strong>The core validity concern</strong> with this methodology is the application of structured
              psychometric instruments to unstructured narrative text via LLM intermediation. Absence of a
              feature in the narrative does not mean non-occurrence—it means non-discussion. This
              systematically biases scores downward. Additionally, articulate, emotionally expressive
              experiencers may receive higher scores than reserved experiencers who had equally profound
              experiences.
            </CautionBox>

            <SubHeading>10.2 LLM Error Characteristics</SubHeading>
            <Prose>
              <p>Through manual review, the following error patterns have been observed:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Slight score inflation</strong> — LLMs assign slightly higher scores than human raters, particularly for emotionally evocative narratives. This bias is consistent and approximately uniform.</li>
                <li><strong>Experiencer/interviewer confusion</strong> — occasionally attributes interviewer statements to the experiencer. Substantially reduced but not eliminated by prompt rules.</li>
                <li><strong>Hallucinated quotes</strong> (&lt; 5% of outputs) — LLM produces paraphrases rather than direct quotes.</li>
                <li><strong>Cultural and linguistic bias</strong> — English-language pipeline may differentially recognize cross-cultural phenomenological features.</li>
              </ul>
            </Prose>

            <SubHeading>10.3 Error Rate Comparison</SubHeading>
            <Prose>
              <p>
                The LLM analysis produces approximately <strong>5–10% higher error rates than human inter-rater
                disagreement</strong> on the Greyson Scale (where human reliability is typically r = 0.9+).
                However, the ability to process thousands of accounts in hours rather than years represents a
                fundamental capability shift for the field.
              </p>
            </Prose>

            <SubHeading>10.4 Corpus Biases</SubHeading>
            <Prose>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Selection bias:</strong> overrepresents English-speaking experiencers comfortable appearing on video.</li>
                <li><strong>Platform bias:</strong> YouTube&apos;s algorithm may preferentially surface certain content types.</li>
                <li><strong>Temporal bias:</strong> videos may be deleted or altered after analysis.</li>
                <li><strong>Channel curation bias:</strong> initial channel selection was performed manually.</li>
              </ul>
            </Prose>

            {/* ═══ §11: Ethics ═══ */}
            <SectionHeading id="ethics" icon={Users}>
              11. Ethical Considerations
            </SectionHeading>
            <Prose>
              <p>
                All analyzed content is publicly available on YouTube. The analysis system is designed with
                explicit respect for experiencer accounts—prompts include instructions to &quot;Be faithful to
                the experiencer&apos;s own words and framing. Do not pathologize, judge, or reinterpret their
                experience.&quot; Content safety flags identify sensitive content for appropriate warnings.
              </p>
              <p>
                This methodology document is published openly. The analysis instruments, prompt structures,
                scoring rubrics, and known limitations are fully documented. We do not claim that LLM-mediated
                analysis is equivalent to human expert assessment—rather, we present it as a complementary
                approach that enables scale at the cost of some precision.
              </p>
            </Prose>

            {/* ═══ §12: Future ═══ */}
            <SectionHeading id="future" icon={Rocket}>
              12. Future Research Directions
            </SectionHeading>

            <SubHeading>12.1 Model Upgrade and Re-Analysis</SubHeading>
            <Prose>
              <p>
                Now that the analytical pipeline is built and validated, the team intends to: (1) re-analyze
                the full corpus with more capable models — the current pipeline uses GPT-4o-mini for cost
                efficiency, and its text and language skills were deemed viable for these tasks; however,
                re-analysis with GPT-4o, Claude 3.5 Sonnet, or Gemini 3.1 Pro (or cutting-edge frontier
                models) would likely improve overall accuracy; (2) implement ensemble scoring to reduce
                model-specific biases.
              </p>
            </Prose>

            <SubHeading>12.2 Corpus Expansion</SubHeading>
            <Prose>
              <p>
                Continue growing the corpus through channel scanning, and extend the pipeline to additional
                experiential domains including: psychedelic experiences (DMT, psilocybin, ayahuasca),
                mystical/contemplative experiences, reincarnation and past-life memory accounts, and
                high-strangeness contact reports.
              </p>
            </Prose>

            <SubHeading>12.3 Validation Studies</SubHeading>
            <Prose>
              <p>
                Planned studies include: human inter-rater reliability comparisons, test-retest reliability
                measurement, and convergent validity against traditional self-administered questionnaires.
              </p>
            </Prose>

            <SubHeading>12.4 Collaborative Research</SubHeading>
            <Prose>
              <p>
                The team seeks established researchers in consciousness studies and related fields who can
                improve analytical instruments, contribute to validation studies, utilize the structured
                dataset for hypothesis testing, and advise on methodological best practices.
              </p>
            </Prose>

            {/* ═══ §13: Technical Reference ═══ */}
            <SectionHeading id="technical-reference" icon={FileText}>
              13. Technical Reference
            </SectionHeading>

            <SubHeading>13.1 Model Specifications</SubHeading>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Pass</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Model</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Temp</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-300">Max Input</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 dark:text-slate-400">
                  {[
                    ['Classification Gate', 'GPT-4o-mini', '0.1', '15K chars'],
                    ['Greyson Scale', 'GPT-4o-mini', '0.1', '50K chars'],
                    ['cvNDE Scale', 'GPT-4o-mini', '0.1', '50K chars'],
                    ['NDE-TI', 'GPT-4o-mini', '0.1', '50K chars'],
                    ['Core Elements', 'GPT-4o-mini', '0.2', '50K chars'],
                    ['Phenomenology/Entities', 'GPT-4o-mini', '0.2', '50K chars'],
                    ['Journey Flow', 'GPT-4o-mini', '0.2', '50K chars'],
                    ['NDE Summary', 'GPT-4o-mini', '0.3', '30K chars'],
                    ['UAP Classification', 'GPT-4o', '0.1', '5K chars'],
                    ['UAP CET Triad', 'GPT-4o-mini', '0.1', '50K chars'],
                    ['Embeddings', 'text-embedding-3-small', 'N/A', '8K tokens'],
                  ].map(([pass, model, temp, input], i) => (
                    <tr key={pass} className={i % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/20'}>
                      <td className="px-3 py-2 font-medium">{pass}</td>
                      <td className="px-3 py-2 font-mono text-xs">{model}</td>
                      <td className="px-3 py-2">{temp}</td>
                      <td className="px-3 py-2">{input}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══ §14: References ═══ */}
            <SectionHeading id="references" icon={BookOpen}>
              14. References
            </SectionHeading>
            <Prose>
              <ul className="space-y-3 list-none pl-0">
                <li>
                  Greyson, B. (1983). The near-death experience scale: Construction, reliability, and
                  validity. <em>Journal of Nervous and Mental Disease</em>, 171(6), 369–375.
                </li>
                <li>
                  Moody, R. A. (1975). <em>Life After Life</em>. Mockingbird Books.
                </li>
                <li>
                  Ring, K. (1980). <em>Life at Death: A Scientific Investigation of the Near-Death
                  Experience</em>. Coward, McCann &amp; Geoghegan.
                </li>
                <li>
                  Ring, K. (1984). <em>Heading Toward Omega: In Search of the Meaning of the Near-Death
                  Experience</em>. William Morrow.
                </li>
                <li>
                  van Lommel, P., van Wees, R., Meyers, A., &amp; Groeneveld, I. (2001). Near-death
                  experience in survivors of cardiac arrest: A prospective study in the Netherlands.{' '}
                  <em>The Lancet</em>, 358(9298), 2039–2045.
                </li>
                <li>
                  Hynek, J. A. (1972). <em>The UFO Experience: A Scientific Inquiry</em>. Henry Regnery
                  Company.
                </li>
              </ul>
            </Prose>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/10">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 p-6">
                <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed">
                  This document was prepared by the Project Profound research team for academic and
                  collaborative use. For questions, collaboration inquiries, or access to structured datasets,{' '}
                  <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
                    contact us
                  </Link>.
                </p>
                <p className="text-xs text-muted-foreground mt-2">Last updated: May 27, 2026</p>
              </div>
            </div>
          </article>

          {/* ── Sticky Table of Contents (desktop) ─────────────────────── */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                On This Page
              </p>
              {TOC_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-xs text-slate-500 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 py-1 transition-colors leading-snug"
                >
                  {s.label}
                </a>
              ))}
              <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/5">
                <Link
                  href="/research/cross-domain"
                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                >
                  <ChevronRight className="w-3 h-3" />
                  Cross-Domain Analysis
                </Link>
                <Link
                  href="/scale/greyson"
                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline mt-2"
                >
                  <ChevronRight className="w-3 h-3" />
                  Greyson Scale
                </Link>
                <Link
                  href="/scale/cvnde"
                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline mt-2"
                >
                  <ChevronRight className="w-3 h-3" />
                  cvNDE Scale
                </Link>
                <Link
                  href="/scale/transformation"
                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline mt-2"
                >
                  <ChevronRight className="w-3 h-3" />
                  NDE-TI Scale
                </Link>
              </div>
            </nav>
          </aside>
        </div>
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'ScholarlyArticle',
            headline:
              'Project Profound: A Computational Framework for the Large-Scale Analysis of First-Person Accounts of Near-Death and Anomalous Experiences',
            description:
              'Methodology documentation covering data acquisition, analytical instruments, pipeline architecture, known limitations, and future research directions for AI-powered analysis of NDE and UAP contact experience testimonies.',
            author: {
              '@type': 'Organization',
              name: 'Project Profound Research Team',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Mastery Television',
              url: 'https://masterytv.com',
            },
            url: 'https://projectprofound.org/research/methodology',
            datePublished: '2026-05-27',
            dateModified: '2026-05-27',
            about: [
              { '@type': 'Thing', name: 'Near-Death Experience' },
              { '@type': 'Thing', name: 'Unidentified Anomalous Phenomena' },
              { '@type': 'Thing', name: 'Computational Phenomenology' },
              { '@type': 'Thing', name: 'Natural Language Processing' },
            ],
          }),
        }}
      />
    </div>
  );
}
