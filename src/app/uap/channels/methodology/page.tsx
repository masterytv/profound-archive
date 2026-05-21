import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, FlaskConical, Shield, Zap, Brain } from "lucide-react";

export const metadata: Metadata = {
  title: "Channel Analytics Methodology — UAP Archive | Project Profound",
  description:
    "How we calculate Intelligence Value, Speaker Credibility, Encounter Depth, and Impact scores for UAP channels. Full methodology and scoring breakdown.",
};

export default function ChannelMethodologyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 py-3">
            <Link
              href="/uap"
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              UAP
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href="/uap/channels"
              className="hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              Channels
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Methodology</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-4xl py-10">
        <h1
          className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-3"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          How We Analyze Channels
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-2xl">
          Every channel in the Project Profound archive receives a set of computed scores
          derived from our AI analysis pipeline. These scores help users understand a
          channel&apos;s strengths, focus areas, and how it compares to other channels in the
          archive. Here&apos;s exactly how each metric is calculated.
        </p>

        {/* ─── The Four Axes ─── */}
        <section className="mb-12">
          <h2
            className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            The Four Axes
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Every channel is measured on four dimensions, grouped into two categories:
          </p>

          {/* Category headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Research Elements */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  Research Elements
                </h3>
              </div>

              {/* Intelligence */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Intelligence Value
                  </h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>What it measures:</strong> How analytically deep and information-rich is
                  this channel&apos;s content?
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>How we calculate it:</strong> Every video in our archive receives an
                  Intelligence Value score (0–30) from our AI analysis pipeline. This score
                  factors in claims density, specific programs and events mentioned, evidence
                  quality, and overall analytical depth. A channel&apos;s Intelligence Value is
                  the average of all its videos&apos; scores, normalized to a 0–100 scale.
                </p>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-3 text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                  <strong>High intelligence</strong> = content that names specific programs,
                  references documents, cites dates and locations, and connects events into
                  analytical frameworks.
                </div>
              </div>

              {/* Credibility */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Speaker / Source Credibility
                  </h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>What it measures:</strong> How credible and well-sourced are the speakers
                  and sources featured in this channel&apos;s content?
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>How we calculate it:</strong> A weighted composite of three signals:
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 ml-4 mb-3 list-disc">
                  <li>
                    <strong>Source Diversity (40%)</strong> — How many unique persons of interest
                    appear across the channel&apos;s videos. More diverse sourcing indicates
                    broader investigative reach.
                  </li>
                  <li>
                    <strong>Evidence Quality (40%)</strong> — Average evidence score from our
                    encounter analysis. Channels featuring content with stronger verifiable
                    evidence score higher.
                  </li>
                  <li>
                    <strong>Program Depth (20%)</strong> — Average number of specific government
                    programs mentioned per video. Channels discussing named programs (e.g., AAWSAP,
                    AATIP, Project Blue Book) tend to have more substantive sourcing.
                  </li>
                </ul>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-3 text-xs text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                  <strong>High credibility</strong> = diverse expert sources, strong evidence
                  backing, and references to specific documented programs.
                </div>
              </div>
            </div>

            {/* Encounter Elements */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-200 dark:border-blue-800">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Encounter Elements
                </h3>
              </div>

              {/* Depth */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Encounter Depth
                  </h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>What it measures:</strong> How deep and detailed are the contact
                  experiences featured in this channel&apos;s content?
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>How we calculate it:</strong> For every encounter we identify in a
                  video, our AI pipeline scores it on a Contact Depth Scale (0–32) that evaluates
                  four categories: observational detail, entity interaction, transcendent
                  elements, and consciousness alteration. A channel&apos;s Encounter Depth is the
                  average score across all its encounters, normalized to 0–100.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                  <strong>High depth</strong> = encounters featuring detailed entity descriptions,
                  direct interaction, consciousness shifts, and multi-sensory observation.
                  Research-focused channels with few first-person accounts will score lower here.
                </div>
              </div>

              {/* Impact */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Impact
                  </h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>What it measures:</strong> How profoundly did the encounters featured in
                  this channel transform the experiencers&apos; lives?
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  <strong>How we calculate it:</strong> Our AI pipeline scores each encounter on a
                  Transformation Scale (0–60) across multiple life domains: worldview, spirituality,
                  relationships, career, psychological wellbeing, and more. A channel&apos;s Impact
                  score is the average transformation score across all its encounters, normalized
                  to 0–100.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                  <strong>High impact</strong> = encounters that dramatically changed the
                  experiencer&apos;s beliefs, relationships, career, or sense of self. News-focused
                  channels will score lower here.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Encounter vs Research Score ─── */}
        <section className="mb-12">
          <h2
            className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Encounter Score vs Research Score
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            To make it easy to see a channel&apos;s focus at a glance, we combine the four axes
            into two composite scores:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4">
              <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">
                Encounter Score
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                Average of Encounter Depth + Impact, then divided by the average channel&apos;s
                Encounter Score to produce a ratio. A score of <strong>2.0×</strong> means this
                channel has twice the encounter content of the average channel. A score of{" "}
                <strong>0.5×</strong> means half the average.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-4">
              <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                Research Score
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                Average of Intelligence Value + Speaker Credibility, then divided by the average
                channel&apos;s Research Score to produce a ratio. A score of{" "}
                <strong>1.8×</strong> means this channel has nearly double the research depth of
                the average channel.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <strong>Why this matters:</strong> An encounter-heavy channel like &quot;Experiencer
            Interviews&quot; might score 3.2× on Encounter and 0.9× on Research — making it
            instantly obvious that this channel&apos;s strength is first-person accounts. A
            research channel like &quot;National Geographic&quot; might score 0.4× on Encounter
            and 1.3× on Research — clearly an analytical, investigation-focused channel.
          </p>
        </section>

        {/* ─── The Diamond Chart ─── */}
        <section className="mb-12">
          <h2
            className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Reading the Channel Focus Chart
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            The diamond-shaped chart on each channel page displays all four axes simultaneously.
            The chart is divided vertically:
          </p>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 ml-4 list-disc mb-4">
            <li>
              <strong className="text-blue-600 dark:text-blue-400">Left side</strong> = Encounter
              Elements (Impact + Depth). The shape extends further left on channels with strong
              encounter content.
            </li>
            <li>
              <strong className="text-emerald-600 dark:text-emerald-400">Right side</strong> =
              Research Elements (Intelligence + Credibility). The shape extends further right on
              channels with strong research content.
            </li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            A balanced channel will have a symmetrical shape. An encounter-focused channel will
            lean heavily left. A research-focused channel will lean right. At a glance, you can
            see what kind of content a channel produces.
          </p>
        </section>

        {/* ─── Rankings ─── */}
        <section className="mb-12">
          <h2
            className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Archive Rankings
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Every channel page includes a rankings box comparing it to all other channels in the
            archive. Here&apos;s what each metric means:
          </p>
          <div className="space-y-3">
            {[
              {
                title: "Archive Rank",
                desc: "Ranked by number of videos in our archive. Top 5 channels get a green badge, Top 10 get blue, Top 25 get bronze.",
              },
              {
                title: "Views Rank",
                desc: "Ranked by total view count across all archived videos.",
              },
              {
                title: "Engagement",
                desc: "Average comments-to-views ratio, shown as a multiple of the archive average. '2.3×' means this channel generates 2.3 times the comments relative to views compared to the typical channel.",
              },
              {
                title: "Publishing Pace",
                desc: "How frequently the channel publishes, calculated as videos per month. Categorized as daily, weekly, bi-weekly, monthly, or sporadic.",
              },
              {
                title: "Views per Video",
                desc: "Average views per archived video, shown alongside a comparison to the archive average.",
              },
            ].map((m) => (
              <div
                key={m.title}
                className="rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 p-3"
              >
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {m.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Channel Universe Map ─── */}
        <section className="mb-12">
          <h2
            className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            The Channel Universe Map
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            The scatter plot on each channel page (and on the{" "}
            <Link
              href="/uap/channels/universe"
              className="text-green-600 dark:text-green-400 hover:underline"
            >
              full universe map
            </Link>
            ) plots every channel in the archive on two dimensions:
          </p>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 ml-4 list-disc mb-4">
            <li>
              <strong>X-axis: Speaker Credibility</strong> — how well-sourced is the channel
            </li>
            <li>
              <strong>Y-axis: Intelligence Value</strong> — how analytically deep is the content
            </li>
            <li>
              <strong>Dot size</strong> — reflects subscriber count (larger = more subscribers)
            </li>
          </ul>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The map is divided into four quadrants by median lines: The Scholars (high intel, lower
            sourcing), The Authorities (high intel, high cred), The Explorers (narrative-focused),
            and The Broadcasters (wide sourcing, accessible format).
          </p>
        </section>

        {/* ─── Guest Prominence Index ─── */}
        <section className="mb-12">
          <h2
            className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Guest Prominence Index (GPI)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            The Guest Quality Over Time chart on each channel page tracks the caliber of guests
            and persons of interest featured on that channel year by year. It uses a composite
            metric called the <strong>Guest Prominence Index (GPI)</strong>.
          </p>

          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
            How GPI is Calculated
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            For each year, we identify every person of interest who appeared in the channel&apos;s
            videos that year. Each person contributes two signals:
          </p>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 ml-4 list-disc mb-4">
            <li>
              <strong>Credibility Score (60% weight)</strong> — Each person of interest in our archive
              has an <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">avg_credibility_score</code>{" "}
              (0–85) computed from the evidence quality and sourcing standards of videos they appear in.
              This is normalized to a 0–100 scale. When credibility data is available, it receives
              60% weight in the GPI calculation.
            </li>
            <li>
              <strong>Cross-Archive Mentions (40% weight)</strong> — How many total videos across the
              <em> entire archive</em> mention this person (the{" "}
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">total_mentions</code>{" "}
              field). This is normalized using a logarithmic scale to prevent outliers like frequently
              discussed figures from dominating. Higher mentions indicate a more prominent figure in
              the UAP discourse. When credibility data is available, this receives 40% weight.
            </li>
          </ul>

          <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200/60 dark:border-white/10 mb-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Formula
            </h4>
            <div className="font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p>normalized_cred = (avg_credibility_score / 85) × 100</p>
              <p>normalized_mentions = (ln(avg_mentions + 1) / ln(max_mentions + 1)) × 100</p>
              <p className="pt-2 font-bold">
                GPI = normalized_cred × 0.6 + normalized_mentions × 0.4
              </p>
              <p className="text-slate-400 dark:text-slate-500 pt-1">
                (If no credibility data exists for that year&apos;s guests: GPI = normalized_mentions)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-4">
              <h4 className="text-sm font-bold text-green-700 dark:text-green-300 mb-2">
                Rising GPI
              </h4>
              <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                The channel is increasingly featuring well-known, credible figures in the UAP field.
                This often correlates with the channel building legitimacy and industry connections
                over time.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4">
              <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2">
                Declining GPI
              </h4>
              <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                The channel may be shifting toward lesser-known guests or new voices. This isn&apos;t
                inherently negative — it could indicate the channel is platforming emerging
                experiencers not yet widely discussed elsewhere.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Data Sources ─── */}
        <section className="mb-12">
          <h2
            className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Data Sources & Transparency
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            All scores are computed by our AI analysis pipeline. Each video in the archive is
            analyzed for content type, entities mentioned, encounter details, evidence quality,
            and more. Channel-level scores are aggregated from individual video analyses.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Scores are refreshed regularly as new videos are added and analyzed. Because
            these are AI-generated assessments, they should be treated as analytical tools
            rather than definitive judgments. We continuously refine our analysis methodology.
          </p>
        </section>

        <div className="text-center py-6 border-t border-slate-200 dark:border-slate-800">
          <Link
            href="/uap/channels"
            className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
          >
            ← Back to All Channels
          </Link>
        </div>
      </div>
    </div>
  );
}
