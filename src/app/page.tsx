import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Sparkles, Brain, ArrowRight, Search, Cpu, Tv, Plus } from "lucide-react";
import Image from "next/image";
import {
    CuratedVideoColumn,
    type CuratedVideo,
} from "@/components/home/CuratedVideoColumn";
import { HeroSearchBar } from "@/components/home/HeroSearchBar";
import { ChannelCard } from "@/components/channels/ChannelCard";
import Link from "next/link";

// --- ISR: revalidate every 3 hours (10800 seconds) ---
export const revalidate = 10800;

// --- Seeded shuffle: deterministic within each 6-hour window ---
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

async function fetchCuratedVideos(
    supabase: Awaited<ReturnType<typeof createClient>>,
    seed: number,
    poolSize: number = 50,
    displayCount: number = 6
) {
    const { data: veridicalPool } = await supabase
        .from("nde_vids")
        .select("videoId, title, thumbnailUrl, channelName, rvnde_total_score, rvnde_level")
        .eq("isNde", "clear_nde")
        .not("rvnde_total_score", "is", null)
        .order("rvnde_total_score", { ascending: false })
        .limit(poolSize);

    const { data: transformationPool } = await supabase
        .from("nde_analysis")
        .select("video_id, transformation_score, transformation_classification")
        .not("transformation_score", "is", null)
        .gt("transformation_score", 0)
        .order("transformation_score", { ascending: false })
        .limit(poolSize);

    const { data: greysonPool } = await supabase
        .from("nde_analysis")
        .select("video_id, total_greyson_score, scale_agreement")
        .not("total_greyson_score", "is", null)
        .gt("total_greyson_score", 0)
        .order("total_greyson_score", { ascending: false })
        .limit(poolSize);

    const analysisVideoIds = [
        ...(transformationPool || []).map((v) => v.video_id),
        ...(greysonPool || []).map((v) => v.video_id),
    ];

    const uniqueIds = [...new Set(analysisVideoIds)];
    const { data: videoMeta } = uniqueIds.length
        ? await supabase
            .from("nde_vids")
            .select("videoId, title, thumbnailUrl, channelName")
            .in("videoId", uniqueIds)
        : { data: [] };

    const metaMap = new Map(
        (videoMeta || []).map((v) => [v.videoId, v])
    );

    const veridicalVideos: CuratedVideo[] = (veridicalPool || []).map((v) => ({
        videoId: v.videoId,
        title: v.title || "Untitled",
        thumbnailUrl: v.thumbnailUrl,
        channelName: v.channelName,
        score: v.rvnde_total_score,
        scoreLabel: v.rvnde_level,
    }));

    const transformationVideos: CuratedVideo[] = (transformationPool || [])
        .map((v) => {
            const meta = metaMap.get(v.video_id);
            if (!meta) return null;
            return {
                videoId: v.video_id,
                title: meta.title || "Untitled",
                thumbnailUrl: meta.thumbnailUrl,
                channelName: meta.channelName,
                score: v.transformation_score,
                scoreLabel: v.transformation_classification,
            };
        })
        .filter(Boolean) as CuratedVideo[];

    const greysonVideos: CuratedVideo[] = (greysonPool || [])
        .map((v) => {
            const meta = metaMap.get(v.video_id);
            if (!meta) return null;
            return {
                videoId: v.video_id,
                title: meta.title || "Untitled",
                thumbnailUrl: meta.thumbnailUrl,
                channelName: meta.channelName,
                score: v.total_greyson_score,
                scoreLabel: v.scale_agreement,
            };
        })
        .filter(Boolean) as CuratedVideo[];

    return {
        veridical: seededShuffle(veridicalVideos, seed).slice(0, displayCount),
        transformation: seededShuffle(transformationVideos, seed + 1).slice(0, displayCount),
        greyson: seededShuffle(greysonVideos, seed + 2).slice(0, displayCount),
    };
}

export default async function HomeAlt1() {
    const supabase = await createClient();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const seed = Math.floor(Date.now() / THREE_HOURS_MS);
    const { veridical, transformation, greyson } = await fetchCuratedVideos(supabase, seed);

    // Fetch channels for "Explore by Channel" section
    const { data: allChannels } = await supabase.rpc('get_channel_stats');
    const channelPool = (allChannels || []) as Array<{
        channel_id: string;
        channel_name: string;
        channel_url: string | null;
        video_count: number;
        total_views: number;
        subscriber_count: number;
        sample_thumbnail: string | null;
    }>;
    const featuredChannels = seededShuffle(channelPool, seed + 10).slice(0, 4);

    // Fetch "Just Added" — latest 5 clear_nde videos by created_at
    const { data: justAddedVideos } = await supabase
        .from('nde_vids')
        .select('"videoId", title, "thumbnailUrl", "channelName", created_at')
        .eq('isNde', 'clear_nde')
        .order('created_at', { ascending: false })
        .limit(5);

    const justAdded = (justAddedVideos || []) as Array<{
        videoId: string;
        title: string;
        thumbnailUrl: string | null;
        channelName: string | null;
        created_at: string;
    }>;

    return (
        <div className="min-h-screen">
            {/* ─── Hero Section ─── */}
            <section className="relative overflow-hidden hero-gradient">

                {/* Decorative grid dots */}
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #2563EB 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
                />

                <div className="relative container mx-auto px-4 pt-20 pb-8 max-w-5xl text-center">

                    {/* Main heading — serif with italic emphasis */}
                    <h1
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-6 leading-[1.1]"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Archive of the{" "}
                        <span
                            className="text-blue-600"
                            style={{ fontStyle: "italic" }}
                        >
                            Extraordinary
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-lg md:text-xl mb-10 leading-relaxed">
                        Search 5,000+ first-person accounts of Near-Death Experiences.
                        Explore by scientific scales. Discover patterns across the veil.
                    </p>

                    {/* Search bar */}
                    <div className="max-w-2xl mx-auto mb-12">
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
            </section>

            {/* ─── Just Added ─── */}
            {justAdded.length > 0 && (
                <section className="container mx-auto px-4 pt-6 pb-4 max-w-7xl">
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
                        {justAdded.map((video) => (
                            <Link
                                key={video.videoId}
                                href={`/video/${video.videoId}`}
                                className="group bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 overflow-hidden hover:shadow-lg dark:hover:shadow-slate-900/40 transition-all duration-300"
                            >
                                <div className="relative aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                    {video.thumbnailUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={video.thumbnailUrl.replace('maxresdefault', 'hqdefault')}
                                            alt={video.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                                    {video.channelName && (
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">{video.channelName}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="text-center mt-8">
                        <Link
                            href="/search3?q=*&sort=date:desc"
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                        >
                            See All New Videos
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>
            )}

            {/* ─── Explore by Channel ─── */}
            <section className="container mx-auto px-4 pt-6 pb-12 max-w-7xl">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2.5 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Tv className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2
                            className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Explore by Channel
                        </h2>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                        Discover NDE channels sharing first-person accounts.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {featuredChannels.map((channel) => (
                        <ChannelCard key={channel.channel_id} channel={channel} />
                    ))}
                </div>

                <div className="text-center">
                    <Link
                        href="/channels"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                        Browse All Channels
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* ─── Explore by Score ─── */}
            <section className="container mx-auto px-4 pt-6 pb-20 max-w-7xl">
                <div className="text-center mb-12">
                    <h2
                        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Explore by Score
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                        Curated selections from our highest-scoring accounts, refreshed every 6 hours.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {/* Column 1: Veridical Perception */}
                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg dark:hover:shadow-slate-900/40 transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Veridical Perception</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Verified out-of-body evidence</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {veridical.map((video) => (
                                <Link
                                    key={video.videoId}
                                    href={`/video/${video.videoId}`}
                                    className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group cursor-pointer"
                                >
                                    {/* Mini thumbnail */}
                                    <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 relative">
                                        {video.thumbnailUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={video.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                                alt={video.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        )}
                                        {video.score !== null && (
                                            <span className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[9px] font-mono px-1 py-0.5 rounded backdrop-blur-sm">
                                                {video.score}/28
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                                            {video.title}
                                        </p>
                                        {video.channelName && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{video.channelName}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <Link
                            href="/explore/veridical"
                            className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                        >
                            Explore All
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Column 2: Transformation */}
                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg dark:hover:shadow-slate-900/40 transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Transformation</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Profound life changes</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {transformation.map((video) => (
                                <Link
                                    key={video.videoId}
                                    href={`/video/${video.videoId}`}
                                    className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group cursor-pointer"
                                >
                                    <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 relative">
                                        {video.thumbnailUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={video.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                                alt={video.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        )}
                                        {video.score !== null && (
                                            <span className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[9px] font-mono px-1 py-0.5 rounded backdrop-blur-sm">
                                                {video.score}/50
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                                            {video.title}
                                        </p>
                                        {video.channelName && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{video.channelName}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <Link
                            href="/explore/transformation"
                            className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-sm font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                        >
                            Explore All
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Column 3: Greyson Scale */}
                    <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg dark:hover:shadow-slate-900/40 transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>Greyson Scale</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Classic NDE depth measurement</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {greyson.map((video) => (
                                <Link
                                    key={video.videoId}
                                    href={`/video/${video.videoId}`}
                                    className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group cursor-pointer"
                                >
                                    <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 relative">
                                        {video.thumbnailUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={video.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                                alt={video.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        )}
                                        {video.score !== null && (
                                            <span className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[9px] font-mono px-1 py-0.5 rounded backdrop-blur-sm">
                                                {video.score}/32
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                                            {video.title}
                                        </p>
                                        {video.channelName && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{video.channelName}</p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <Link
                            href="/explore/greyson"
                            className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                        >
                            Explore All
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── Explore the Ecosystem ─── */}
            <section className="container mx-auto px-4 pt-6 pb-16 max-w-7xl">
                <div className="text-center mb-10">
                    <h2
                        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Explore the NDE Ecosystem
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                        Discover the organizations and researchers advancing our understanding of near-death experiences.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card 1: NoeticMap Academic Literature */}
                    <a
                        href="https://noeticmap.com/research/literature"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-700/60 transition-all duration-300"
                    >
                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mb-4 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 transition-colors">
                            <span className="text-lg">📚</span>
                        </div>
                        <h3
                            className="font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Academic Literature
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            Search 1,100+ AI-analyzed peer-reviewed papers on consciousness research, with 9,000+ extracted findings.
                        </p>
                        <span className="text-xs font-medium text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                            NoeticMap.com ↗
                        </span>
                    </a>

                    {/* Card 2: NDERF Archive */}
                    <a
                        href="https://www.nderf.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700/60 transition-all duration-300"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-4 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
                            <span className="text-lg">🌍</span>
                        </div>
                        <h3
                            className="font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            World&apos;s Largest NDE Archive
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            5,300+ documented near-death experiences collected since 1998 by Dr. Jeffrey Long, available in 37 languages.
                        </p>
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                            NDERF.org ↗
                        </span>
                    </a>

                    {/* Card 3: NoeticMap Q&A */}
                    <a
                        href="https://noeticmap.com/answers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg hover:border-teal-200 dark:hover:border-teal-700/60 transition-all duration-300"
                    >
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
                            <span className="text-lg">❓</span>
                        </div>
                        <h3
                            className="font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Your Questions, Answered
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            30+ evidence-based answers to questions like &quot;Are NDEs real?&quot; and &quot;What happens when we die?&quot;
                        </p>
                        <span className="text-xs font-medium text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                            NoeticMap.com ↗
                        </span>
                    </a>
                </div>

                <div className="text-center">
                    <Link
                        href="/resources"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        View All Resources
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* ─── Bottom CTA ─── */}
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
