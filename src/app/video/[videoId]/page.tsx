import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Users, ExternalLink, Brain, Sparkles, TrendingUp, MessageSquare, Search } from "lucide-react";

export const revalidate = 86400;

function formatCount(n: number | null): string {
    if (!n) return "–";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
}

function ScoreCard({
    label, value, max, description, color, bg,
}: {
    label: string; value: number | null; max: number; description: string; color: string; bg: string;
}) {
    return (
        <div className={`rounded-2xl p-5 ${bg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${color} opacity-70`}>{label}</p>
            <p className={`text-3xl font-bold ${color}`}>
                {value != null ? value.toFixed(1) : "–"}
                <span className="text-base font-normal opacity-50">/{max}</span>
            </p>
            <p className={`text-xs mt-1 ${color} opacity-60`}>{description}</p>
        </div>
    );
}

export default async function VideoDetailPage({ params }: { params: { videoId: string } }) {
    const supabase = await createClient();
    const { videoId } = params;

    // Fetch video metadata
    const { data: video } = await supabase
        .from("nde_vids")
        .select("*")
        .eq("videoId", videoId)
        .single();

    if (!video) notFound();

    // Return 404 for videos from hidden (defunct) channels
    const { data: channelHidden } = await supabase
        .from('channels')
        .select('hidden')
        .eq('channel_id', video.channelId)
        .single();
    if (channelHidden?.hidden) {
        notFound();
    }

    // Fetch analysis
    const { data: analysis } = await supabase
        .from("nde_analysis")
        .select("*")
        .eq("video_id", videoId)
        .single();

    // Fetch similar experiences
    const { data: similar } = video.fingerprint_embedding
        ? await supabase.rpc("find_similar_experiences", {
            query_embedding: video.fingerprint_embedding,
            match_count: 4,
            exclude_video_id: videoId,
        })
        : { data: null };

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return (
        <div className="min-h-screen" style={{ background: "linear-gradient(to bottom, #F8FAFC, #fff)" }}>
            <div className="container mx-auto px-4 py-10 max-w-5xl">

                {/* Back */}
                <Link
                    href="/search3"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Search
                </Link>

                {/* Video embed + meta */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                    {/* YouTube embed */}
                    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={video.title || "NDE Video"}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>

                    <div className="p-6 md:p-8">
                        <h1
                            className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 leading-snug"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            {video.title || "Untitled NDE"}
                        </h1>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mb-4">
                            {video.channelName && (
                                <Link
                                    href={`/channel/${video.channel_id}`}
                                    className="text-blue-500 hover:underline font-medium"
                                >
                                    {video.channelName}
                                </Link>
                            )}
                            {video.viewCount && (
                                <span className="flex items-center gap-1">
                                    <Eye className="w-3.5 h-3.5" />{formatCount(video.viewCount)} views
                                </span>
                            )}
                            <a
                                href={youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-red-500 hover:text-red-700"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                YouTube
                            </a>
                        </div>

                        {/* NDE Classification badge */}
                        {video.isNde && (
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                video.isNde === "clear_nde"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : video.isNde === "possible_nde"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-500"
                            }`}>
                                {video.isNde === "clear_nde" ? "✓ Clear NDE" : video.isNde === "possible_nde" ? "Possible NDE" : video.isNde}
                            </span>
                        )}
                    </div>
                </div>

                {/* Analysis Section */}
                {analysis && (
                    <section className="mb-8">
                        <h2
                            className="text-xl font-bold text-slate-900 mb-4"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            NDE Analysis
                        </h2>

                        {/* Score cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <ScoreCard
                                label="Greyson Scale"
                                value={analysis.total_greyson_score}
                                max={32}
                                description="Classic NDE depth score"
                                color="text-blue-800"
                                bg="bg-blue-50"
                            />
                            <ScoreCard
                                label="Transformation"
                                value={analysis.transformation_score}
                                max={50}
                                description="Life change intensity"
                                color="text-rose-800"
                                bg="bg-rose-50"
                            />
                            <ScoreCard
                                label="Veridical"
                                value={video.rvnde_total_score}
                                max={28}
                                description="Out-of-body evidence"
                                color="text-emerald-800"
                                bg="bg-emerald-50"
                            />
                        </div>

                        {/* Summary */}
                        {analysis.analysis_nde_summary && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Summary</h3>
                                <p className="text-slate-700 leading-relaxed">{analysis.analysis_nde_summary}</p>
                            </div>
                        )}

                        {/* Phenomenology */}
                        {(analysis.phenomenology_elements || analysis.core_elements) && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Key Elements</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(analysis.phenomenology_elements || []).map((el: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                                            {el}
                                        </span>
                                    ))}
                                    {(analysis.core_elements || []).map((el: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
                                            {el}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Entities */}
                        {analysis.entities_encountered && analysis.entities_encountered.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Entities Encountered</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.entities_encountered.map((entity: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                                            {entity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Journey narrative */}
                        {analysis.journey_narrative && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Journey Flow</h3>
                                <p className="text-slate-700 leading-relaxed text-sm">{analysis.journey_narrative}</p>
                            </div>
                        )}

                        {/* Transformation narrative */}
                        {analysis.transformation_narrative && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">After-Effects & Transformation</h3>
                                <p className="text-slate-700 leading-relaxed text-sm">{analysis.transformation_narrative}</p>
                            </div>
                        )}
                    </section>
                )}

                {/* Similar Experiences */}
                {similar && similar.length > 0 && (
                    <section className="mb-8">
                        <h2
                            className="text-xl font-bold text-slate-900 mb-4"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Similar Experiences
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {similar.map((s: any) => (
                                <Link
                                    key={s.video_id}
                                    href={`/video/${s.video_id}`}
                                    className="flex gap-3 bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-blue-200 transition-all group"
                                >
                                    <div className="w-20 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                        {s.thumbnailUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={s.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                                alt={s.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-800 line-clamp-2 group-hover:text-blue-700 transition-colors">
                                            {s.title}
                                        </p>
                                        {s.channelName && (
                                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.channelName}</p>
                                        )}
                                        {s.similarity != null && (
                                            <span className="text-[10px] text-indigo-500 font-medium">
                                                {Math.round(s.similarity * 100)}% similar
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Chat CTA */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 text-center">
                    <p
                        className="text-xl font-bold text-slate-900 mb-2"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Explore this account further
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                        Our AI chatbot can answer your questions about NDEs, drawing from thousands of first-person accounts.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link
                            href="/chat"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Chat with NDEs
                        </Link>
                        <Link
                            href="/search3"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors border border-slate-200"
                        >
                            <Search className="w-4 h-4" />
                            Search More
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
