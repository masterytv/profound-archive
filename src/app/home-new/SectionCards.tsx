import Link from "next/link";
import { Brain, Telescope, ArrowRight, FlaskConical } from "lucide-react";

export function ForResearchers() {
  return (
    <div className="py-16 md:py-20">
      <div className="text-xs font-bold uppercase tracking-widest text-violet-500">
        FOR RESEARCHERS
      </div>
      <h2 
        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mt-2"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
      >
        Dive Into the Data
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mt-2">
        Rigorous methodology, validated scales, and transparent analysis frameworks
      </p>

      {/* Cross-Domain — bridges both domains, gets its own featured card */}
      <Link href="/research/cross-domain" className="group block rounded-2xl border border-slate-200/60 dark:border-white/10 bg-gradient-to-r from-violet-50/50 via-white to-green-50/50 dark:from-violet-900/10 dark:via-white/[0.02] dark:to-green-900/10 p-5 mt-8 hover:shadow-lg border-l-4 border-l-transparent hover:border-l-violet-500 transition-all" style={{ borderImage: 'linear-gradient(to bottom, #8b5cf6, #10b981) 1', borderImageSlice: 1 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-green-100 dark:from-violet-900/30 dark:to-green-900/30 flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Cross-Domain Comparison
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Data-driven phenomenological overlap analysis bridging NDE and UAP testimonies — the core of our research thesis
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 shrink-0 hidden sm:block">
            NDE ↔ UAP
          </span>
        </div>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* NDE Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/30">
              <Brain className="text-violet-600 dark:text-violet-400 w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Near-Death Experiences</span>
          </div>
          
          <div className="space-y-3">
            <Link href="/explore/veridical" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-violet-300/60 dark:hover:border-violet-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                Research Scales
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Three validated scales: Veridical Perception, Greyson NDE Scale, and Transformation Index
              </p>
            </Link>

            <Link href="/search3" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-violet-300/60 dark:hover:border-violet-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                NDE Search
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Keyword and AI-powered semantic search across 5,000+ first-person accounts
              </p>
            </Link>

            <Link href="/blog" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-violet-300/60 dark:hover:border-violet-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                NDE Blog
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Research-backed articles exploring what near-death experiences reveal
              </p>
            </Link>
          </div>
        </div>

        {/* UAP Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30">
              <Telescope className="text-green-600 dark:text-green-400 w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">UAP Contact Encounters</span>
          </div>

          <div className="space-y-3">
            <Link href="/uap/methodology" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                UAP Methodology
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Classification framework, evidence scoring, and entity taxonomy documentation
              </p>
            </Link>

            <Link href="/uap/methodology/credibility" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                Credibility Framework
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Six-factor rubric for evaluating witness credibility and testimony strength
              </p>
            </Link>

            <Link href="/uap/video-explore" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                Data Explorer
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Filter 2,000+ videos across 22 analysis dimensions with interactive controls
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ForExplorers() {
  return (
    <div className="py-16 md:py-20">
      <div className="text-xs font-bold uppercase tracking-widest text-emerald-500">
        FOR EXPLORERS
      </div>
      <h2 
        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mt-2"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
      >
        Begin Your Journey
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mt-2">
        Search, chat, and discover patterns across thousands of firsthand accounts
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* NDE Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/30">
              <Brain className="text-violet-600 dark:text-violet-400 w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Near-Death Experiences</span>
          </div>
          
          <div className="space-y-3">
            <Link href="/experiencer" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-violet-300/60 dark:hover:border-violet-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                Browse Experiencers
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Meet the people behind the accounts, profiled with research-backed scores
              </p>
            </Link>

            <Link href="/chat" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-violet-300/60 dark:hover:border-violet-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                AI Chat
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Ask questions grounded in 5,000+ analyzed NDE testimonies
              </p>
            </Link>

            <Link href="/channels" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-violet-300/60 dark:hover:border-violet-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                NDE Channels
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Discover YouTube channels sharing first-person NDE accounts
              </p>
            </Link>
          </div>
        </div>

        {/* UAP Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30">
              <Telescope className="text-green-600 dark:text-green-400 w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">UAP Contact Encounters</span>
          </div>

          <div className="space-y-3">
            <Link href="/uap/experiencer" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                UAP Encounters
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Contactee profiles with evidence scores, entity taxonomy, and linked video appearances
              </p>
            </Link>

            <Link href="/uap/chat" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                AI Research Assistant
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Conversational search grounded in UAP video transcripts and analysis data
              </p>
            </Link>

            <Link href="/uap/intelligence" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                Intelligence Dashboard
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Live analytics, daily discovery facts, and corpus-wide pattern detection
              </p>
            </Link>

            <Link href="/uap/channels" className="group block rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:shadow-md hover:border-green-300/60 dark:hover:border-green-500/30 transition-all">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                UAP Channels
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all inline-block ml-1" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Curated channels covering encounters, government programs, and disclosure
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
