import { createClient } from "@/lib/supabase/server";
import { Search, TrendingUp, Cpu, Compass, FlaskConical, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeroSearchBar } from "@/components/home/HeroSearchBar";
import { BigQuestionsGrid } from "@/components/home/BigQuestionsGrid";
import { StoryOfTheDay } from "@/components/home/StoryOfTheDay";
import { ChannelOfTheDay } from "@/components/home/ChannelOfTheDay";
import { ExperiencerCard, type ExperiencerProfile } from "@/components/experiencer/ExperiencerCard";
import { CompassionateChatCTA } from "@/components/home/CompassionateChatCTA";
import { BrowseSearchPanel } from "@/components/home/BrowseSearchPanel";
import { ArrowRight, Users, Plus, Heart } from "lucide-react";

// ISR: revalidate once per day (matches Story/Channel of the Day rotation)
export const revalidate = 86400;

// Seeded shuffle — deterministic within each time window
function seededShuffle<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let s = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        const j = s % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default async function HomeV2() {
    const supabase = await createClient();
    const ONE_DAY_MS = 86_400_000;
    const dailySeed = Math.floor(Date.now() / ONE_DAY_MS);

    // ── Fetch experiencers (top 50 by views, shuffle 4) ──
    const { data: experiencerPool } = await supabase
        .from("experiencer_profiles")
        .select("id, slug, full_name, summary, photo_url, avg_greyson_score, avg_transformation_score, avg_veridical_score, video_ids, total_views")
        .not("total_views", "is", null)
        .order("total_views", { ascending: false })
        .limit(50);
    const featuredExperiencers = seededShuffle(
        (experiencerPool || []) as ExperiencerProfile[],
        dailySeed + 20
    ).slice(0, 4);

    // ── Fetch "Just Added" (latest 5 clear_nde videos) ──
    const { data: justAddedVideos } = await supabase
        .from("nde_vids")
        .select("\"videoId\", title, \"thumbnailUrl\", \"channelName\", created_at, analysis_nde_summary")
        .eq("isNde", "clear_nde")
        .order("created_at", { ascending: false })
        .limit(5);

    const justAdded = (justAddedVideos || []) as Array<{
        videoId: string;
        title: string;
        thumbnailUrl: string | null;
        channelName: string | null;
        created_at: string;
        analysis_nde_summary: string | null;
    }>;

    return (
        <div className="min-h-screen">
            {/* ═══ Section 1: Hero (Single Column) ═══ */}
            <section className="relative overflow-hidden hero-gradient">
                {/* Decorative grid dots */}
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />

                <div className="relative container mx-auto px-4 pt-20 pb-12 max-w-5xl">
                    {/* ── Headline + Search ── */}
                    <div className="text-center mb-16 md:mb-20">
                        <h1
                            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-6 leading-[1.1]"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            What happens when we{" "}
                            <span
                                className="text-blue-600"
                                style={{ fontStyle: "italic" }}
                            >
                                die
                            </span>
                            ?
                        </h1>

                        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg md:text-xl mb-10 leading-relaxed">
                            5,000+ people came back to tell us. Search their accounts,
                            scored by three research scales.
                        </p>

                        {/* Search bar */}
                        <div className="max-w-2xl mx-auto mb-10">
                            <HeroSearchBar />
                        </div>

                        {/* Stats ribbon */}
                        <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Search className="w-4 h-4 text-blue-500" />
                                <span><strong className="text-slate-800 dark:text-slate-200 font-semibold">5,000+</strong> Accounts</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                <span><strong className="text-slate-800 dark:text-slate-200 font-semibold">3</strong> Research Scales</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Cpu className="w-4 h-4 text-violet-500" />
                                <span><strong className="text-slate-800 dark:text-slate-200 font-semibold">AI-Powered</strong> Analysis</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Compass CTA + Side Doors ── */}
                    <div className="max-w-3xl mx-auto">
                        {/* Primary CTA — NDE Compass */}
                        <Link
                            href="/compass"
                            className="group relative block rounded-2xl border-2 border-purple-200 dark:border-purple-500/30 bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-purple-900/20 dark:via-slate-800/80 dark:to-violet-900/20 p-6 md:p-8 text-center hover:border-purple-300 dark:hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 mb-4"
                        >
                            <div className="flex items-center justify-center gap-2.5 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Compass className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1.5">
                                Not sure where to start?
                            </p>
                            <h2
                                className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Take the 60-Second NDE Compass
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                                4 questions. No wrong answers. We&apos;ll find the experiences
                                that matter to you.
                            </p>
                            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 dark:bg-purple-500 text-white font-medium text-sm hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shadow-sm">
                                Find my starting point &rarr;
                            </span>
                        </Link>

                        {/* Three Side Doors */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Research Path */}
                            <Link
                                href="/explore"
                                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 p-4 text-center hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                    I&apos;m Researching
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Browse by evidence, depth, and impact scores.
                                </p>
                            </Link>

                            {/* Experiencer Path */}
                            <Link
                                href="/experiencers"
                                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 p-4 text-center hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                                    I&apos;m an Experiencer
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    See how your experience compares.
                                </p>
                            </Link>

                            {/* Join the Community */}
                            <Link
                                href="/join"
                                className="group flex flex-col items-center gap-2 rounded-2xl border border-blue-200/80 dark:border-blue-500/30 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-900/30 dark:via-slate-800/80 dark:to-indigo-900/20 p-4 text-center hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                            >
                                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Heart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                    Join the Community
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Free account. Save, collect, and explore.
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Section 3: Big Questions Grid ═══ */}
            <BigQuestionsGrid />

            {/* ═══ Section 4: Story of the Day ═══ */}
            <StoryOfTheDay />

            {/* ═══ Section 5: Just Added (Enhanced) ═══ */}
            {justAdded.length > 0 && (
                <section className="container mx-auto px-4 py-10 max-w-7xl">
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-2.5 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <h2
                                className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100"
                                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                            >
                                Just Added
                            </h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                            Recently imported experiences
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {justAdded.map((video) => {
                            // Tease first sentence of AI summary
                            const teaser = video.analysis_nde_summary
                                ? video.analysis_nde_summary.split(/(?<=[.!?])\s+/)[0]
                                : null;

                            return (
                                <Link
                                    key={video.videoId}
                                    href={`/video/${video.videoId}`}
                                    className="group bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 overflow-hidden hover:shadow-lg dark:hover:shadow-slate-900/40 transition-all duration-300"
                                >
                                    <div className="relative aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                        {video.thumbnailUrl && (
                                            <Image
                                                src={video.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                                alt={video.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                            />
                                        )}
                                        <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                            NEW
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                                            {video.title}
                                        </p>
                                        {teaser && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                                {teaser}
                                            </p>
                                        )}
                                        {video.channelName && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">{video.channelName}</p>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="text-center mt-8">
                        <Link
                            href="/video-explore"
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                        >
                            See All New Videos
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>
            )}

            {/* ═══ Section 6: Channel of the Day ═══ */}
            <ChannelOfTheDay />

            {/* ═══ Section 7: Explore by Experiencer ═══ */}
            <section className="container mx-auto px-4 py-10 max-w-7xl">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2.5 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                            <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h2
                            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Explore by Experiencer
                        </h2>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                        Meet the people behind the accounts, each profiled with research-backed scores.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {featuredExperiencers.map((profile) => (
                        <ExperiencerCard key={profile.id} profile={profile} />
                    ))}
                </div>

                <div className="text-center">
                    <Link
                        href="/experiencer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                    >
                        Browse All Experiencers
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* ═══ Section 8: Compassionate Chat CTA ═══ */}
            <CompassionateChatCTA />

            {/* ═══ Section 9: Browse & Search Panel ═══ */}
            <BrowseSearchPanel />

            {/* ═══ Section 10: Bottom CTA ═══ */}
            <section className="cta-gradient py-16 text-center">
                <h2
                    className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Ready to explore the{" "}
                    <span className="text-blue-600" style={{ fontStyle: "italic" }}>evidence</span>?
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                    Search across 5,000+ accounts using keywords or AI-powered concept matching.
                </p>
                <Link
                    href="/search3"
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                    <Search className="w-4 h-4" />
                    Start Searching
                </Link>
            </section>
        </div>
    );
}
