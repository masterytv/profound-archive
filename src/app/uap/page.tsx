import { serializeJsonLd } from '@/lib/json-ld';
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Search,
  MessageSquare,
  Telescope,
  BarChart3,
  Radio,
  Users,
  LayoutGrid,
  Tv,
  Globe,
  Calendar,
  Building2,
  Shield,
  Link2,
  Heart,
  BookOpen,
  UserPlus,
  TrendingUp,
  Brain,
  ChevronRight,
  Database,
  ArrowRight
} from "lucide-react";
import { InlineNewsletterCTA } from "@/components/InlineNewsletterCTA";

export const metadata: Metadata = {
  title: "UFO & UAP Encounters — AI-Powered Analysis | Project Profound",
  description:
    "Explore first-person UFO and UAP contact accounts, government disclosure analysis, and investigative research. AI-powered evidence scoring, semantic search, and researcher chat across 500+ analyzed encounters.",
  openGraph: {
    title: "UFO & UAP Encounters — AI-Powered Analysis | Project Profound",
    description:
      "Explore first-person UFO and UAP contact accounts, government disclosure analysis, and investigative research through AI-powered search and analysis.",
    type: "website",
    url: "https://projectprofound.org/uap",
  },
  alternates: {
    canonical: "https://projectprofound.org/uap",
  },
};

export const revalidate = 86400; // ISR: revalidate once per day

// Server-side data fetching with anon key (SSG-safe per LEARNINGS.md)
async function getUapStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [
    { count: totalVideos },
    { count: totalChannels },
    { count: analyzedVideos },
    { count: totalEncounters },
  ] = await Promise.all([
    supabase.from("uap_vids").select("*", { count: "exact", head: true }),
    supabase
      .from("uap_channels")
      .select("*", { count: "exact", head: true })
      .eq("hidden", false),
    supabase.from("uap_analysis").select("*", { count: "exact", head: true }),
    supabase.from("uap_encounters").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalVideos: totalVideos || 0,
    totalChannels: totalChannels || 0,
    analyzedVideos: analyzedVideos || 0,
    totalEncounters: totalEncounters || 0,
  };
}

export default async function UapLandingPage() {
  const stats = await getUapStats();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a1510] text-slate-900 dark:text-slate-200 uap-domain">
      {/* JSON-LD: WebPage + Organization for AI discoverability */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "UFO & UAP Encounters — AI-Powered Analysis",
            description: `AI-analyzed archive of ${stats.totalVideos.toLocaleString()} UFO and UAP encounter videos with ${stats.totalEncounters.toLocaleString()} individual encounters classified by Hynek type, credibility score, and contact depth.`,
            url: "https://projectprofound.org/uap",
            isPartOf: {
              "@type": "WebSite",
              name: "Project Profound",
              url: "https://projectprofound.org",
            },
            about: [
              { "@type": "Thing", name: "Unidentified Anomalous Phenomena" },
              { "@type": "Thing", name: "UFO Encounters" },
              { "@type": "Thing", name: "Government UAP Disclosure" },
              { "@type": "Thing", name: "Hynek Close Encounter Classification" },
            ],
          }),
        }}
      />
      <section className="relative overflow-hidden border-b border-green-900/40">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/80 to-slate-50 dark:from-[#0a1510]/0 dark:via-[#0a1510]/80 dark:to-[#0a1510]" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
              <Radio className="w-4 h-4 text-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">
                UFO & UAP Archive
              </span>
            </div>
            
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 leading-[1.1]"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              The Science of <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Disclosure.</span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl">
              Explore the world's most advanced AI-analyzed archive of UFO and UAP encounters and disclosure research. Discover credible witnesses, track government programs, and find exactly what you're looking for.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/uap/video-explore"
                className="group flex items-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)]"
              >
                Start Exploring
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#join"
                className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-medium rounded-xl border border-slate-200 dark:border-white/10 transition-colors"
              >
                Join for Free
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-20 pt-10 border-t border-slate-200 dark:border-green-900/40">
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.totalVideos.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Videos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.analyzedVideos.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">AI-Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.totalEncounters.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Encounters</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.totalChannels.toLocaleString()}</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Channels</div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">22</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dimensions</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT SECTIONS ─── */}
      <div className="max-w-7xl mx-auto px-6 py-20 space-y-32">

        {/* 1. DISCOVER SECTION */}
        <section id="discover">
          <div className="mb-12">
            <h2 className="text-sm font-bold text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Telescope className="w-4 h-4" /> Discover
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Three Ways to Search the Archive
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
              Whether you want to casually browse encounters or hunt for specific forensic details in transcripts, we have the tools you need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/uap/video-explore" className="group flex flex-col p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-green-500/40 hover:shadow-xl dark:hover:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:bg-green-500/20 group-hover:scale-110 transition-all duration-300">
                <LayoutGrid className="w-7 h-7 text-green-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Browse Videos</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 flex-grow">
                <strong>Fun Search:</strong> Look through UFO/UAP videos any way you want. Filter by broad topics (e.g., "Grey aliens while on vacation") or filter by entity type and encounter tier.
              </p>
              <span className="text-green-400 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                Browse Videos <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link href="/uap/search" className="group flex flex-col p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-emerald-500/40 hover:shadow-xl dark:hover:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                <Search className="w-7 h-7 text-emerald-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Search Transcripts</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 flex-grow">
                <strong>Deep Search:</strong> Find exact moments in video transcripts. Locate precise keywords across thousands of hours of footage (Example: "telepathic communication" [13:10]).
              </p>
              <span className="text-emerald-400 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                Search Transcripts <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link href="/uap/channels" className="group flex flex-col p-8 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-teal-500/40 hover:shadow-xl dark:hover:shadow-none hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 group-hover:bg-teal-500/20 group-hover:scale-110 transition-all duration-300">
                <Tv className="w-7 h-7 text-teal-400" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">By Channel</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 flex-grow">
                <strong>Curated Sources:</strong> Find videos from your favorite content creators or discover investigative journalists and researchers you've never heard of before.
              </p>
              <span className="text-teal-400 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                View Channels <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>

        {/* 2. DIRECTORY SECTION */}
        <section id="directory">
          <div className="mb-12">
            <h2 className="text-sm font-bold text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" /> The Directory
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Entities & Experiencers
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
              We extract and link the people, organizations, and events mentioned across the phenomenon to build a comprehensive map of disclosure.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-6">
            {/* Experiencers (Large Card) */}
            <div className="md:col-span-12 lg:col-span-8 p-8 md:p-10 rounded-3xl bg-white dark:bg-gradient-to-br dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 relative overflow-hidden group hover:shadow-xl dark:hover:shadow-none transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[80px] group-hover:bg-green-500/10 transition-colors" />
              
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white">Experiencers</h4>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 text-lg">
                    Find videos from your favorite experiencers — like Travis Walton — or discover highly credible witnesses you've never heard of before.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/uap/experiencer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white font-medium rounded-xl transition-colors">
                      View All Experiencers
                    </Link>
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Discover by Metrics</p>
                  <Link href="/uap/video-explore?tier=1&sort=veridical_score" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group/link border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover/link:text-emerald-600 dark:group-hover/link:text-emerald-400 transition-colors">Evidence Strength</div>
                      <div className="text-xs text-slate-500">Highly credible witnesses</div>
                    </div>
                  </Link>
                  <Link href="/uap/video-explore?tier=1&sort=greyson_score" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group/link border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                    <Brain className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors">Experience Depth</div>
                      <div className="text-xs text-slate-500">Profound encounters</div>
                    </div>
                  </Link>
                  <Link href="/uap/video-explore?tier=1&sort=transformation_score" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group/link border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover/link:text-rose-600 dark:group-hover/link:text-rose-400 transition-colors">Life Impact</div>
                      <div className="text-xs text-slate-500">Dramatically changed lives</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Sub-Entities Grid */}
            <div className="md:col-span-12 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <Link href="/uap/persons" className="group flex items-center p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-green-500/40 hover:shadow-xl dark:hover:shadow-none dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                <div className="p-3 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-4">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Persons of Interest</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">Key figures, whistleblowers, and researchers shaping disclosure.</p>
                </div>
              </Link>

              <Link href="/uap/events" className="group flex items-center p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-green-500/40 hover:shadow-xl dark:hover:shadow-none dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                <div className="p-3 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-4">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Events</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">The timeline of major milestones, sightings, and hearings.</p>
                </div>
              </Link>

              <Link href="/uap/organizations" className="group flex items-center p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-green-500/40 hover:shadow-xl dark:hover:shadow-none dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                <div className="p-3 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Organizations</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">Government task forces and private aerospace companies.</p>
                </div>
              </Link>

              <Link href="/uap/programs" className="group flex items-center p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-green-500/40 hover:shadow-xl dark:hover:shadow-none dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                <div className="p-3 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-colors mr-4">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Programs</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">Classified and unclassified government research projects.</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. RESEARCH & INTELLIGENCE */}
        <section id="research">
          <div className="mb-12">
            <h2 className="text-sm font-bold text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Analysis
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
              Research & Intelligence
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
              Go beyond the video. Interact with AI tools and view macro-level analytical dashboards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* AI Assistant */}
            <Link href="/uap/chat" className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 hover:shadow-xl dark:hover:shadow-none hover:border-green-500/50 transition-all duration-500">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                <MessageSquare className="w-32 h-32 text-green-400" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Fast Search
                </div>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Ask the Archive</h4>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-6 max-w-sm">
                  Chat with our AI researcher grounded in real UFO/UAP video content for near-instant, cited answers. Every claim is backed by a video timestamp.
                </p>
                <span className="inline-flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  Start Chatting <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>

            {/* Intelligence Dashboards */}
            <Link href="/uap/intelligence" className="group relative overflow-hidden p-8 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-200 dark:border-slate-700 hover:shadow-xl dark:hover:shadow-none hover:border-emerald-500/50 transition-all duration-500">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                <BarChart3 className="w-32 h-32 text-emerald-400" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
                  Data Dashboards
                </div>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Intelligence Reports</h4>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-6 max-w-sm">
                  Access data-driven insights mapping the entire phenomenon. View aggregate statistics on phenomenology, craft shapes, and historical timelines.
                </p>
                <span className="inline-flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  View Intelligence <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>

            {/* Cross-Domain */}
            <Link href="/research/cross-domain" className="group flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:shadow-xl dark:hover:shadow-none hover:border-violet-500/30 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
              <div className="p-5 rounded-2xl bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                <Link2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Cross-Domain Analyses</h4>
                <p className="text-slate-600 dark:text-slate-400">Explore the profound statistical and narrative links between Near-Death Experiences and UFO/UAP encounters.</p>
              </div>
            </Link>

            {/* Blog */}
            <Link href="/uap/blog" className="group flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:shadow-xl dark:hover:shadow-none hover:border-amber-500/30 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
              <div className="p-5 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Research Blog</h4>
                <p className="text-slate-600 dark:text-slate-400">Read in-depth articles, methodology breakdowns, and curated research highlights from the Project Profound team.</p>
              </div>
            </Link>
          </div>
        </section>

        {/* 4. JOIN SECTION & NEWSLETTER */}
        <section id="join" className="pt-10 border-t border-green-900/30">
          <div className="bg-white dark:bg-gradient-to-br dark:from-green-900/20 dark:to-emerald-900/10 border border-slate-200 dark:border-green-500/20 shadow-xl dark:shadow-none rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                <UserPlus className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                Join the Mission
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                Create a free account to save your favorite videos, compile research notes, track your watch history, and support the open-source archive.
              </p>
              
              <Link href="/join" className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 dark:bg-white text-white dark:text-slate-900 hover:bg-green-700 dark:hover:bg-slate-200 font-bold rounded-xl transition-colors shadow-xl">
                Create Free Account
              </Link>
              
              <div className="mt-6 text-sm text-slate-500">
                Already a member? <Link href="/login" className="text-green-400 hover:underline">Log in</Link>
              </div>
            </div>
          </div>

          {/* Newsletter Box */}
          <div className="mt-12 max-w-3xl mx-auto">
            <InlineNewsletterCTA domain="uap" />
          </div>
        </section>

      </div>
    </div>
  );
}
