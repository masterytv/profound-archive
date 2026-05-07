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
} from "lucide-react";

export const metadata: Metadata = {
  title: "UFO & UAP Encounters — AI-Powered Analysis | Project Profound",
  description:
    "Explore first-person UAP contact accounts, government disclosure analysis, and investigative research. AI-powered evidence scoring, semantic search, and researcher chat across 500+ analyzed encounters.",
  openGraph: {
    title: "UFO & UAP Encounters — AI-Powered Analysis | Project Profound",
    description:
      "Explore first-person UAP contact accounts, government disclosure analysis, and investigative research through AI-powered search and analysis.",
    type: "website",
    url: "https://projectprofound.org/uap",
  },
  alternates: {
    canonical: "https://projectprofound.org/uap",
  },
};

// Server-side data fetching with anon key (SSG-safe per LEARNINGS.md)
async function getUapStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ count: totalVideos }, { count: totalChannels }] = await Promise.all([
    supabase.from("uap_vids").select("*", { count: "exact", head: true }),
    supabase
      .from("uap_channels")
      .select("*", { count: "exact", head: true })
      .eq("hidden", false),
  ]);

  return {
    totalVideos: totalVideos || 0,
    totalChannels: totalChannels || 0,
  };
}

export default async function UapLandingPage() {
  const stats = await getUapStats();

  const ctaCards = [
    {
      title: "Explore Encounters",
      description:
        "Browse first-person UAP contact accounts analyzed with evidence scoring and transformation metrics.",
      icon: Telescope,
      href: "/uap/search",
      color: "green",
    },
    {
      title: "Search Archive",
      description:
        "Search across thousands of videos using keyword or AI-powered semantic search with timestamped results.",
      icon: Search,
      href: "/uap/search",
      color: "green",
    },
    {
      title: "Ask the Archive",
      description:
        "Chat with an AI researcher grounded in real UAP video content. Every answer cites its sources.",
      icon: MessageSquare,
      href: "/uap/chat",
      color: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/40 via-background to-emerald-950/30" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-2 mb-6">
            <Radio className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-green-400 uppercase tracking-wider">
              UFO & UAP Archive
            </span>
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            UFO & UAP
            <br />
            <span className="text-green-400">Encounters & Research</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            AI-analyzed archive of first-person contact accounts and disclosure
            research. Every video scored for evidence strength, contact depth,
            and personal transformation.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mb-10">
            <div>
              <div className="text-3xl font-bold text-foreground">
                {stats.totalVideos.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Videos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">
                {stats.totalChannels.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Channels</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">3</div>
              <div className="text-sm text-muted-foreground">Analysis Axes</div>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex gap-4">
            <Link
              href="/uap/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
            >
              <Search className="w-4 h-4" />
              Search Archive
            </Link>
            <Link
              href="/uap/chat"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-foreground font-medium rounded-xl border border-white/10 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Ask the Archive
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Cards */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {ctaCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 hover:border-green-500/30"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                <card.icon className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2
              className="text-2xl md:text-3xl font-bold text-foreground mb-4"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Two Tracks of Analysis
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Our archive separates first-person encounter accounts from
              investigative research, applying different analytical frameworks
              to each.
            </p>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-foreground">
                  Track 1: Encounters
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                First-person contact accounts scored for evidence strength,
                contact depth, and personal transformation using validated
                research scales.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-foreground">
                  Track 2: Program & Research
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Disclosure analysis, government programs, and investigative
                journalism with extracted claims, people, programs, and
                timeline events.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
