import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Telescope, Search, Cpu, ArrowRight } from "lucide-react";
import { fetchHomepageStats, fetchOverlapHighlights, fetchLatestPosts } from "./data";
import { ConsciousnessStats } from "./ConsciousnessStats";
import { CrossDomainPreview } from "./CrossDomainPreview";
import { ForResearchers, ForExplorers } from "./SectionCards";
import { LatestResearch } from "./LatestResearch";
import { InlineNewsletterCTA } from "@/components/InlineNewsletterCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Consciousness Research Platform | Project Profound",
  description: "Exploring the boundaries of human experience through AI-powered analysis of 7,000+ NDE and UAP firsthand testimonies. Cross-domain phenomenology, validated research scales, and transparent methodology.",
  openGraph: {
    title: "Project Profound — Consciousness Research Platform",
    description: "AI-powered analysis of Near-Death and UAP contact experiences. 7,000+ testimonies. Cross-domain discoveries.",
    type: "website",
  },
};

export default async function HomeNewPage() {
  const [stats, highlights, posts] = await Promise.all([
    fetchHomepageStats(),
    fetchOverlapHighlights(),
    fetchLatestPosts(6),
  ]);

  const totalVideos = stats.ndeVideos + stats.uapVideos;

  return (
    <div className="min-h-screen bg-background">
      {/* Section 1: Hero */}
      <div className="relative overflow-hidden consciousness-hero-gradient">
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle, #8b5cf6 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        <div className="relative container mx-auto px-4 pt-20 pb-12 max-w-5xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-6 leading-[1.1]">
            The Next Frontier in<br />
            <span className="bg-gradient-to-r from-violet-500 to-emerald-500 bg-clip-text text-transparent">Consciousness</span><br />
            Research
          </h1>
          <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg md:text-xl mb-10 leading-relaxed">
            Exploring the boundaries of human experience through AI-powered analysis of {totalVideos.toLocaleString()}+ firsthand testimonies spanning near-death experiences and UAP contact encounters.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors shadow-lg shadow-violet-600/20"
            >
              <Brain className="w-5 h-5" /> Explore Near-Death Experiences
            </Link>
            <Link 
              href="/uap"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Telescope className="w-5 h-5" /> Explore UAP Encounters
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-sm">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-slate-900 dark:text-slate-100">{stats.ndeVideos.toLocaleString()}+</span>
              <span className="text-slate-600 dark:text-slate-400">NDE Accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <Telescope className="w-5 h-5 text-green-500" />
              <span className="font-bold text-slate-900 dark:text-slate-100">{stats.uapVideos.toLocaleString()}+</span>
              <span className="text-slate-600 dark:text-slate-400">UAP Videos</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-violet-500" />
              <span className="font-bold text-slate-900 dark:text-slate-100">AI-Powered</span>
              <span className="text-slate-600 dark:text-slate-400">Analysis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Dual Path */}
      <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
        <h2 
          className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          Two Domains, One Question
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mt-4">
          What happens when consciousness encounters the extraordinary? We&apos;re analyzing thousands of testimonies to find out.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 md:p-8 hover:shadow-lg transition-shadow border-l-2 border-l-violet-500/50">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 mb-6">
              <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 
              className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Near-Death Experiences
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              5,000+ first-person accounts scored on three validated research scales
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-violet-500 mt-0.5">•</span>
                Veridical Perception — verified out-of-body evidence
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-violet-500 mt-0.5">•</span>
                Greyson NDE Scale — standardized depth measurement
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-violet-500 mt-0.5">•</span>
                Transformation Index — lasting life changes
              </li>
            </ul>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              Begin Exploring
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6 md:p-8 hover:shadow-lg transition-shadow border-l-2 border-l-green-500/50">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100 dark:bg-green-900/30 mb-6">
              <Telescope className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 
              className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              UAP Contact Encounters
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              2,000+ videos analyzed across 22 research dimensions
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-green-500 mt-0.5">•</span>
                Evidence Strength — multi-factor credibility scoring
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-green-500 mt-0.5">•</span>
                Contact Depth — entity interaction taxonomy
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-green-500 mt-0.5">•</span>
                Phenomenology — sensory, consciousness, and physical effects
              </li>
            </ul>
            <Link 
              href="/uap"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
            >
              Begin Exploring
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Section 3: CrossDomainPreview */}
      <div className="container mx-auto px-4 max-w-5xl">
        <CrossDomainPreview highlights={highlights} />
      </div>

      {/* Section 4: ConsciousnessStats */}
      <ConsciousnessStats stats={[
        { label: "Total Testimonies", value: stats.ndeVideos + stats.uapVideos, suffix: "+", icon: <Search className="w-5 h-5 text-violet-500" /> },
        { label: "Experiencer Profiles", value: stats.experiencerProfiles + stats.contacteeProfiles, suffix: "+", icon: <Brain className="w-5 h-5 text-blue-500" /> },
        { label: "Analysis Dimensions", value: 22, suffix: "", icon: <Cpu className="w-5 h-5 text-emerald-500" /> },
        { label: "Overlapping Phenomena", value: 10, suffix: "", icon: <Telescope className="w-5 h-5 text-amber-500" /> },
      ]} />

      {/* Section 5: ForResearchers */}
      <div className="container mx-auto px-4 max-w-5xl">
        <ForResearchers />
      </div>

      {/* Section 5.5: LatestResearch */}
      {posts.length > 0 && (
        <div className="container mx-auto px-4 max-w-5xl">
          <LatestResearch posts={posts} />
        </div>
      )}

      {/* Section 6: ForExplorers */}
      <div className="container mx-auto px-4 max-w-5xl">
        <ForExplorers />
      </div>

      {/* Section 7: Bottom CTA */}
      <div className="consciousness-hero-gradient py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 
            className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Ready to explore the <em className="bg-gradient-to-r from-violet-500 to-emerald-500 bg-clip-text text-transparent not-italic">evidence</em>?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
            Join researchers and explorers investigating the boundaries of human consciousness through data.
          </p>
          
          <Link 
            href="/search3"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors shadow-lg shadow-violet-600/20"
          >
            Start Exploring
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10 max-w-3xl mx-auto">
            <InlineNewsletterCTA domain="nde" />
            <InlineNewsletterCTA domain="uap" />
          </div>
        </div>
      </div>
    </div>
  );
}
