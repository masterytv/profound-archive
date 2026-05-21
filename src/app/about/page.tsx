"use client"

import {
  Brain, Telescope, Search, MessageCircle, Cpu, ChevronRight,
  Link2, Heart, Users, BookOpen, FlaskConical, Lightbulb,
  ArrowRight, Shield, Globe, Zap, HandHeart, GraduationCap,
  Layers, Eye
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, type FormEvent } from "react"

export default function AboutPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          message: formData.message,
        }),
      })

      if (res.ok) {
        setSubmitStatus("success")
        setFormData({ fullName: "", email: "", message: "" })
      } else {
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("[contact] submission error:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const sectionHeading = "text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3"
  const sectionSub = "text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
  const card = "bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/10 p-6 md:p-8 hover:shadow-lg transition-all duration-300"
  const fontSerif = { fontFamily: "'Crimson Pro', Georgia, serif" }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden consciousness-hero-gradient border-b border-slate-200/60 dark:border-white/10">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle, #8b5cf6 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        <div className="relative container mx-auto px-4 py-20 md:py-28 max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-4">About Project Profound</p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight"
            style={fontSerif}
          >
            Helping Humanity Grasp the{" "}
            <em className="bg-gradient-to-r from-violet-500 to-emerald-500 bg-clip-text text-transparent not-italic">
              Extraordinary
            </em>{" "}
            Through Data and Compassion
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Something is happening. Across cultures, decades, and domains, people are reporting
            profound first-person experiences that challenge our understanding of consciousness.
            We&apos;re building the tools to analyze them with rigor, transparency, and compassion.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl">

        {/* ── Why This Matters ── */}
        <section className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>Why This Matters — Right Now</h2>
          </div>

          <div className={`${card} max-w-4xl mx-auto`}>
            <div className="prose prose-lg max-w-none text-slate-600 dark:text-slate-300 space-y-5 leading-relaxed">
              <p>
                There is a shift underway. A growing body of testimony is converging on a startling
                possibility: that consciousness may be more fundamental than we thought, and that our
                materialist framework may be incomplete.
              </p>
              <p>
                This isn&apos;t fringe. Congressional hearings are discussing non-human intelligence. Peer-reviewed
                research on NDEs has documented verified perception during clinical death. Millions of people
                have had experiences they cannot explain within the current paradigm.
              </p>
              <p>
                This isn&apos;t religion. For centuries believers and leaders have pontificated about the unseen
                world with the command, &quot;you just have to have faith.&quot; But now, there is evidence that
                may give even the most skeptical a new view of reality itself.
              </p>
              <p>
                For some, this new awareness brings wonder. For others, it brings <strong>uncertainty</strong>,{" "}
                <strong>ontological shock</strong>, or genuine mental health instability. The ground beneath
                our collective worldview is shifting, and most people don&apos;t have the resources to make
                sense of it.
              </p>
              <p className="text-slate-800 dark:text-slate-100 font-medium">
                Project Profound exists to bridge that gap — providing both the <em>research and data</em> to
                help us understand, and the <em>compassion and connection</em> to help us cope.
              </p>
            </div>
          </div>
        </section>

        {/* ── What We Do ── */}
        <section className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>What We Do</h2>
            <p className={sectionSub}>
              We focus on analyzing <strong>first-person, direct experiences</strong>. These are accounts
              from real people describing what they saw, felt, and understood. This is the hardest
              data to work with, and the most important.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className={card}>
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-5">
                <Search className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2" style={fontSerif}>
                Collect &amp; Organize
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                We ingest thousands of video testimonies from YouTube then transcribe, classify, and structure
                them into searchable, analyzable archives. Every account is preserved with full context.
              </p>
            </div>

            <div className={card}>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5">
                <Cpu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2" style={fontSerif}>
                Analyze with AI
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Our AI models score each testimony on validated research scales — from the Greyson NDE Scale
                to UAP credibility matrices. We extract entities, themes, patterns, and anomalies
                that would take human researchers decades to catalog.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-3">
                AI allows us to do something humans could never do. We&apos;re able to analyze millions of
                words from tens of thousands of conversations to find unseen patterns. We can validate
                human intuition about consciousness with real, validated data.
              </p>
            </div>

            <div className={card}>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5">
                <Link2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2" style={fontSerif}>
                Discover Connections
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Our cross-domain analysis reveals startling overlaps between NDEs and UAP encounters:
                beings of light, time distortion, telepathic communication, life reviews, and a
                pervading sense of unconditional love and interconnection.
              </p>
            </div>
          </div>
        </section>

        {/* ── Two Domains ── */}
        <section className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>Two Domains Analyzed</h2>
            <p className={sectionSub}>
              We&apos;ve started with two of the most well-documented categories of anomalous experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* NDE Card */}
            <div className={`${card} border-l-[3px] border-l-violet-500/60`}>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100" style={fontSerif}>
                    Near-Death Experiences
                  </h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">
                    5,000+ accounts analyzed
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                First-person testimonies from people who were clinically dead or near death, transcribed
                and scored on three validated research scales: the <strong>Greyson NDE Scale</strong> (experience depth),{" "}
                <strong>Veridical Perception</strong> (evidence of out-of-body perception), and the{" "}
                <strong>Transformation Index</strong> (lasting life impact).
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Every account has a searchable transcript, AI-generated summary, experiencer profile,
                and detailed score breakdown making this one of the most comprehensive NDE research
                tools available anywhere.
              </p>
              <Link href="/nde" className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                Explore NDE Research <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* UAP Card */}
            <div className={`${card} border-l-[3px] border-l-emerald-500/60`}>
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Telescope className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100" style={fontSerif}>
                    UFO/UAP Contact Encounters
                  </h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                    2,000+ videos analyzed
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                First-person accounts and research discussions about unidentified anomalous phenomena,
                analyzed across <strong>22 research dimensions</strong> — including evidence strength,
                contact depth taxonomy, entity classification, and phenomenological effects.
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Our UAP section includes intelligence dashboards, person/event/organization directories,
                program profiles, channel engagement analytics, and a dedicated AI research assistant
                trained on the full corpus.
              </p>
              <Link href="/uap" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                Explore UAP Research <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Cross-Domain Discovery */}
          <div className={`${card} mt-6 border-t-[3px] border-t-amber-400/60`}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Link2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100" style={fontSerif}>
                  Cross-Domain Discovery
                </h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                  10+ overlapping phenomena identified
                </span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              When we analyze NDEs and UAP encounters side by side, striking patterns emerge.
              There are statistically significant overlaps surfaced by AI analysis across thousands
              of independent testimonies:
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-5">
              {[
                "Beings of light / luminous entities",
                "Time distortion & non-linearity",
                "Telepathic communication",
                "Life reviews & information downloads",
                "Boundary/threshold encounters",
                "Unconditional love & unity",
                "Enhanced perception & clarity",
                "Reluctance to return / re-entry trauma",
                "Lasting worldview transformation",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link href="/research/cross-domain" className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                Explore Cross-Domain Research <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── What's Coming Next ── */}
        <section className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>Where We&apos;re Going</h2>
            <p className={sectionSub}>
              NDEs and UAP encounters are just the beginning. The same methodology can be applied
              to any domain of first-person extraordinary experience.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: <FlaskConical className="w-5 h-5 text-purple-600" />, bg: "bg-purple-100 dark:bg-purple-900/30", title: "Psychedelic Experiences", desc: "DMT, ayahuasca, psilocybin — first-person reports of entity contact, ego dissolution, and cosmic unity" },
              { icon: <Eye className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100 dark:bg-blue-900/30", title: "Out-of-Body Experiences", desc: "Spontaneous and induced OBEs — verified perception, astral travel, and consciousness separation" },
              { icon: <Zap className="w-5 h-5 text-amber-600" />, bg: "bg-amber-100 dark:bg-amber-900/30", title: "Spiritually Transformative Events", desc: "Kundalini awakenings, mystical experiences, and sudden spiritual openings" },
              { icon: <Layers className="w-5 h-5 text-teal-600" />, bg: "bg-teal-100 dark:bg-teal-900/30", title: "Psi Phenomena", desc: "Telepathy, precognition, remote viewing, and other psi experiences with documented evidence" },
              { icon: <Globe className="w-5 h-5 text-rose-600" />, bg: "bg-rose-100 dark:bg-rose-900/30", title: "After-Death Communication", desc: "Reports of contact with deceased loved ones — deathbed visions, shared death experiences, and ADCs" },
              { icon: <GraduationCap className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-100 dark:bg-indigo-900/30", title: "Academic Integration", desc: "Partnering with universities and research institutions to validate AI-generated scores against clinical data" },
            ].map((item) => (
              <div key={item.title} className={`${card} flex items-start gap-4`}>
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Who This Is For ── */}
        <section className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>Who This Is For</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className={card}>
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-5">
                <Heart className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={fontSerif}>
                For You
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Whether you&apos;ve had a profound experience yourself, lost someone you love, or simply
                wonder what lies beyond — this platform is built for you. Explore the data. Chat with
                our compassionate AI. Find comfort in the patterns that thousands of people have
                reported independently.
              </p>
            </div>

            <div className={card}>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={fontSerif}>
                For Creators
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                If you run a YouTube channel sharing NDE, UAP, or consciousness-related content, we
                want to work with you. We analyze and amplify your content, connect your audience to
                deeper research, and provide tools that turn individual stories into part of a larger
                dataset advancing human understanding.
              </p>
            </div>

            <div className={card}>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3" style={fontSerif}>
                For Researchers
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Academics, clinicians, and independent researchers — we offer access to one of the
                largest structured datasets of first-person extraordinary experiences. Full-text search,
                validated scoring, entity extraction, and cross-domain analysis are all available as
                research tools. We want to collaborate.
              </p>
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>Our Values</h2>
          </div>

          <div className={`${card} max-w-4xl mx-auto`}>
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-7">
              {[
                { icon: <FlaskConical className="w-4 h-4 text-blue-600" />, title: "Scientific Rigor", desc: "Transparent methodology, validated scales, reproducible analysis. We show our work." },
                { icon: <HandHeart className="w-4 h-4 text-rose-600" />, title: "Compassionate Inquiry", desc: "Every testimony represents a person. We approach each story with empathy and respect." },
                { icon: <Shield className="w-4 h-4 text-emerald-600" />, title: "Intellectual Honesty", desc: "We don't know the answers. We present the data and let you draw your own conclusions." },
                { icon: <Globe className="w-4 h-4 text-violet-600" />, title: "Spiritual Inclusivity", desc: "All traditions, philosophies, and belief systems are welcome. The data transcends dogma." },
                { icon: <Lightbulb className="w-4 h-4 text-amber-600" />, title: "Open Access", desc: "Knowledge about consciousness belongs to everyone. Our tools are free and our methodology is documented." },
                { icon: <Users className="w-4 h-4 text-teal-600" />, title: "Collaboration Over Competition", desc: "We partner with creators, researchers, experiencers, and institutions. Together we go further." },
              ].map((v) => (
                <div key={v.title} className="flex items-start gap-3">
                  <div className="mt-0.5">{v.icon}</div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-1">{v.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Support Us ── */}
        <section className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>We Need Your Support</h2>
            <p className={sectionSub}>
              Project Profound is built by a small team with a big mission. Your financial support
              directly accelerates our work.
            </p>
          </div>

          <div className={`${card} max-w-4xl mx-auto border-t-[3px] border-t-emerald-400/60`}>
            <div className="grid sm:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4" style={fontSerif}>What Your Support Enables</h3>
                <ul className="space-y-3">
                  {[
                    "Run full AI re-analysis across all 7,000+ testimonies as models improve",
                    "Expand into psychedelics, OBEs, STEs, and other experience domains",
                    "Support academic research partnerships and clinical validation studies",
                    "Improve our compassionate AI tools for experiencers and their families",
                    "Build multilingual support to make this research accessible worldwide",
                    "Keep the platform free and open-access for everyone",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                      <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4" style={fontSerif}>The AI Advantage</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  As AI models improve we can re-run our entire analysis pipeline
                  with more accurate, more nuanced models. Every dollar invested today compounds: the same
                  dataset analyzed by a better model yields deeper insights without collecting a single
                  new testimony.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  We can do many things better, and many more things entirely. But we need the resources to
                  do it. This is a once-in-a-generation opportunity to apply cutting-edge technology to
                  humanity&apos;s oldest questions.
                </p>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-slate-100 dark:border-white/10">
              <a
                href="https://www.gofundme.com/f/project-profound"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Heart className="w-5 h-5" />
                Support the Mission
              </a>
              <p className="text-xs text-slate-400 mt-3">
                All contributions go directly to compute, AI model access, and research partnerships.
              </p>
            </div>
          </div>
        </section>

        {/* ── Get Involved ── */}
        <section id="connect" className="py-16 md:py-20 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className={sectionHeading} style={fontSerif}>Get Involved</h2>
            <p className={sectionSub}>
              We&apos;re looking for feedback, collaboration, and community. Whether you&apos;re a researcher,
              a creator, an experiencer, or simply someone who cares — we&apos;d love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
            {[
              { icon: <MessageCircle className="w-5 h-5 text-blue-600" />, bg: "bg-blue-100 dark:bg-blue-900/30", title: "Share Feedback", desc: "Tell us what's working, what's not, and what you want to see next." },
              { icon: <Users className="w-5 h-5 text-violet-600" />, bg: "bg-violet-100 dark:bg-violet-900/30", title: "Collaborate", desc: "Researchers, institutions, and content creators — let's work together." },
              { icon: <Telescope className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-100 dark:bg-emerald-900/30", title: "Suggest Channels", desc: "Know a YouTube channel with great NDE or UAP testimonies? Let us know." },
              { icon: <Heart className="w-5 h-5 text-rose-600" />, bg: "bg-rose-100 dark:bg-rose-900/30", title: "Share Your Story", desc: "If you've had a profound experience and want it to be part of the research, reach out." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-0.5">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="max-w-2xl mx-auto">
            <div className={card}>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center" style={fontSerif}>
                Send Us a Message
              </h3>
              {isClient && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text" id="fullName" required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email" id="email" required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Your Message</label>
                    <textarea
                      id="message" required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Feedback, collaboration ideas, channel suggestions, or anything else..."
                      rows={5}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit" disabled={isSubmitting}
                    className="w-full py-3 bg-slate-900 dark:bg-blue-600 text-white font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                  {submitStatus === "success" && (
                    <p className="text-emerald-600 dark:text-emerald-400 text-center text-sm font-medium">Thank you! Your message has been sent successfully.</p>
                  )}
                  {submitStatus === "error" && (
                    <p className="text-red-600 dark:text-red-400 text-center text-sm font-medium">Sorry, there was an error sending your message. Please try again.</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
