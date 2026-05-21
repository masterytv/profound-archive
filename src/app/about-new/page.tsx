import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Brain, Telescope, Sparkles, Search, MessageCircle,
  Cpu, ChevronRight, BookOpen, Users, Shield,
  Heart, Globe, Lightbulb, Scale, Handshake, ExternalLink,
} from "lucide-react";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "About | Project Profound",
  description:
    "Project Profound explores the boundaries of consciousness through AI-powered analysis of 7,000+ near-death experience and UAP contact testimonies. Rigorous methodology, transparent data, compassionate inquiry.",
  openGraph: {
    title: "About Project Profound",
    description:
      "AI-powered consciousness research across near-death experiences and UAP contact encounters. 7,000+ testimonies. Cross-domain discoveries.",
    type: "website",
  },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const RESEARCH_DOMAINS = [
  {
    icon: Brain,
    color: "violet",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-l-violet-500/50",
    title: "Near-Death Experiences",
    stat: "5,000+",
    statLabel: "first-person accounts",
    description:
      "Every testimony is scored on three validated research scales: the Greyson NDE Scale (depth), Veridical Perception (out-of-body evidence), and Transformation Index (lasting life changes). Full transcripts, AI summaries, and structured analysis are available for each account.",
    link: "/",
    linkText: "Explore NDE Archive",
  },
  {
    icon: Telescope,
    color: "green",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
    borderColor: "border-l-green-500/50",
    title: "UAP Contact Encounters",
    stat: "2,000+",
    statLabel: "video testimonies",
    description:
      "UAP contact and encounter videos are analyzed across 22 research dimensions, including entity taxonomy, evidence strength scoring, phenomenological classification, and a six-factor credibility framework. Every experiencer receives a structured profile.",
    link: "/uap",
    linkText: "Explore UAP Archive",
  },
];

const PLATFORM_FEATURES = [
  {
    icon: Search,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "Semantic Search",
    description:
      "Find testimonies by meaning, not just keywords. Ask a question in plain language and our AI retrieves the most relevant accounts across thousands of transcripts.",
  },
  {
    icon: MessageCircle,
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    title: "AI Research Assistants",
    description:
      "Conversational AI grounded in real testimony data. Ask questions, explore patterns, and get answers sourced from the full corpus, not general web knowledge.",
  },
  {
    icon: Sparkles,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Cross-Domain Analysis",
    description:
      "Our original contribution: mapping phenomenological overlaps between NDE and UAP contact experiences. Entity encounters, telepathic communication, time distortion, and ontological shock appear in both.",
  },
  {
    icon: Cpu,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Transparent Methodology",
    description:
      "Every score, classification, and analysis is documented and reproducible. We publish our scales, rubrics, and AI prompts so researchers can evaluate and build on our work.",
  },
];

const VALUES = [
  {
    icon: Scale,
    title: "Scientific Curiosity",
    description: "Rigorous, transparent, and evolving methodologies guided by both qualitative and quantitative research.",
  },
  {
    icon: Heart,
    title: "Compassionate Inquiry",
    description: "Every testimony represents a human being. We approach each story with empathy, humility, and respect.",
  },
  {
    icon: Globe,
    title: "Spiritual Inclusivity",
    description: "We honor all religions, philosophies, and belief systems, acknowledging the sacred and symbolic in all paths.",
  },
  {
    icon: Users,
    title: "Unity in Diversity",
    description: "We celebrate cultural differences as essential parts of a shared, interconnected whole.",
  },
  {
    icon: Lightbulb,
    title: "Lived Experience as Data",
    description: "Subjective personal insight is a valid and meaningful source of knowledge, not just a footnote to laboratory work.",
  },
  {
    icon: Shield,
    title: "Courage & Integrity",
    description: "We explore the unknown with boldness, speak truthfully about what the data shows, and act ethically in all we do.",
  },
  {
    icon: BookOpen,
    title: "Accessibility & Equity",
    description: "Our findings and tools are available to all, regardless of language, background, or education level.",
  },
  {
    icon: Handshake,
    title: "Collaboration Over Competition",
    description: "We seek to work with universities, experiencers, researchers, and technologists, not in isolation.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AboutNewPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden consciousness-hero-gradient border-b border-slate-200/60 dark:border-white/10">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle, #8b5cf6 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        <div className="relative container mx-auto px-4 py-20 md:py-28 max-w-4xl text-center">
          <div className="px-6 py-3 rounded-2xl bg-white dark:bg-white/10 shadow-lg inline-flex items-center justify-center mx-auto mb-8 border border-slate-200/60 dark:border-white/10">
            <Image src="/logo-new-dark.png" alt="Project Profound" width={200} height={47} className="h-10 w-auto dark:hidden" priority />
            <Image src="/logo-new-light.png" alt="Project Profound" width={200} height={47} className="h-10 w-auto hidden dark:block" priority />
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-[1.1]"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Understanding Consciousness<br />
            Through <em className="bg-gradient-to-r from-violet-500 to-emerald-500 bg-clip-text text-transparent not-italic">Evidence</em>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Project Profound is an independent research platform applying AI to the
            largest open archive of near-death experience and UAP contact testimonies
            ever assembled. We don&apos;t have all the answers. We have 7,000+ first-person
            accounts and the tools to ask better questions.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-5xl">
        {/* ── The Thesis ─────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-2">
              Our Thesis
            </div>
            <h2
              className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-6"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              What if the most profound human experiences share a common architecture?
            </h2>
            <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                Across cultures, centuries, and continents, people report strikingly similar
                experiences at the boundary of ordinary consciousness: encounters with
                non-human intelligence, telepathic communication, time distortion,
                knowledge downloads, and lasting ontological shifts.
              </p>
              <p>
                These patterns appear in near-death experiences. They appear in UAP contact
                encounters. They appear in mystical and meditative states. The overlap is
                too consistent to ignore, and too complex to study without computational tools.
              </p>
              <p>
                Project Profound exists to map this terrain. We collect first-person testimonies,
                apply structured AI analysis, and publish everything transparently so
                that researchers, experiencers, and curious minds can explore the data
                themselves.
              </p>
            </div>
          </div>
        </section>

        {/* ── Two Research Domains ────────────────────────────────────────── */}
        <section className="py-16 md:py-20 border-t border-slate-200/60 dark:border-white/10">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">
            Research Domains
          </div>
          <h2
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Two Archives, One Question
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl">
            Each domain has its own analysis pipeline, scoring frameworks, and research methodology, 
            designed independently but built to reveal cross-domain patterns.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {RESEARCH_DOMAINS.map((domain) => {
              const Icon = domain.icon;
              return (
                <div
                  key={domain.title}
                  className={`rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 md:p-8 border-l-2 ${domain.borderColor}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${domain.iconBg} mb-5`}>
                    <Icon className={`w-6 h-6 ${domain.iconColor}`} />
                  </div>
                  <h3
                    className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-1"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                  >
                    {domain.title}
                  </h3>
                  <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-4">
                    {domain.stat} {domain.statLabel}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                    {domain.description}
                  </p>
                  <Link
                    href={domain.link}
                    className={`inline-flex items-center gap-1.5 text-sm font-medium ${domain.iconColor} hover:underline transition-colors`}
                  >
                    {domain.linkText}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Platform Features ───────────────────────────────────────────── */}
        <section className="py-16 md:py-20 border-t border-slate-200/60 dark:border-white/10">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">
            What We Built
          </div>
          <h2
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Research Tools, Not Just a Database
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl">
            Every tool is designed to make the data explorable, not just accessible.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PLATFORM_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${feature.iconBg} mb-4`}>
                    <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Mission & Vision ────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 border-t border-slate-200/60 dark:border-white/10">
          <div className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-2">
            Why We Do This
          </div>
          <h2
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Mission & Vision
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
              <h3
                className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                Our Mission
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Project Profound exists to expand human understanding of consciousness
                by applying AI to the world&apos;s largest open archive of profound experience
                testimonies. We serve researchers, experiencers, and anyone curious about
                what happens at the edges of ordinary awareness.
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                We use scientifically grounded methods and ethically guided AI to uncover
                universal patterns, emotional truths, and phenomenological insights across
                cultures, languages, and belief systems.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8">
              <h3
                className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                Our Vision
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                We envision a world where profound experiences inspire curiosity instead
                of dismissal, where people of all backgrounds can access compassionate,
                evidence-based resources to reflect on what it means to be conscious.
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                By democratizing access to testimony, analysis, and research tools, we help
                individuals and communities find meaning, connection, and a deeper understanding
                of the human experience.
              </p>
            </div>
          </div>
        </section>

        {/* ── Values ──────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 border-t border-slate-200/60 dark:border-white/10">
          <h2
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Our Values
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-1">
                      {value.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── The Team ────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20 border-t border-slate-200/60 dark:border-white/10">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">
            Behind the Project
          </div>
          <h2
            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-6"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            A Small Team with a Big Question
          </h2>
          <div className="max-w-3xl space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              Project Profound is an independent, self-funded research initiative. We are
              not affiliated with any government, religious organization, or academic
              institution. Our work is driven by curiosity, not ideology.
            </p>
            <p>
              The platform is built and maintained by a small team of engineers, researchers,
              and designers who believe that the most important questions about consciousness
              deserve better tools than we currently have. We use AI not to replace human
              judgment, but to help us see patterns across thousands of testimonies that
              would be impossible to identify manually.
            </p>
            <p>
              If you share our curiosity, whether you&apos;re a researcher, an experiencer,
              or just someone who wonders, we&apos;d love to hear from you.
            </p>
          </div>
        </section>

        {/* ── Contribute CTA ─────────────────────────────────────────── */}
        <section className="py-16 md:py-20 border-t border-slate-200/60 dark:border-white/10">
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-gradient-to-br from-violet-50/50 to-emerald-50/50 dark:from-violet-900/10 dark:to-emerald-900/10 p-8 md:p-12 text-center">
            <h2
              className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-3"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Support This Research
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
              Project Profound is independently funded. Your contribution helps us
              maintain the archive, expand our analysis pipeline, and keep everything
              free and open for researchers and experiencers worldwide.
            </p>
            <a
              href="https://www.gofundme.com/f/project-profound"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
            >
              Contribute
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* ── Contact ─────────────────────────────────────────────────────── */}
        <section id="contact" className="py-16 md:py-20 border-t border-slate-200/60 dark:border-white/10">
          <div className="text-center mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-3"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Get In Touch
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Whether you&apos;re a researcher, experiencer, journalist, or curious mind,
              we&apos;d love to hear from you.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ContactForm />
          </div>
        </section>
      </div>
    </div>
  );
}
