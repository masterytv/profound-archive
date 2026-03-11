"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

export interface SimilarExperience {
    video_id: string;
    title: string;
    thumbnailUrl: string;
    experience_type: string | null;
    tone: string | null;
    intensity_rating: number | null;
    similarity: number;
}

interface SimilarExperiencesProps {
    /** Pre-fetched similar experiences data (fetched server-side) */
    results: SimilarExperience[];
}

// Badge color for experience types
const typeColors: Record<string, string> = {
    nde: "bg-purple-100 text-purple-700",
    obe: "bg-blue-100 text-blue-700",
    sde: "bg-rose-100 text-rose-700",
    adc: "bg-amber-100 text-amber-700",
    ste: "bg-teal-100 text-teal-700",
};

// Format similarity as percentage
const formatSimilarity = (sim: number) => `${Math.round(sim * 100)}%`;

/**
 * SimilarExperiences — displays related NDEs based on pgvector cosine
 * similarity of experience fingerprints.
 *
 * Data is fetched server-side and passed as props to avoid client-side
 * AbortError issues with React strict mode and singleton Supabase client.
 *
 * Renders a horizontal scrollable grid of thumbnail cards.
 */
export function SimilarExperiences({ results }: SimilarExperiencesProps) {
    // Don't render anything if no results
    if (!results || results.length === 0) return null;

    return (
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h2
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Similar Experiences
                </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {results.map((exp) => (
                        <Link
                            key={exp.video_id}
                            href={`/video/${exp.video_id}`}
                            className="group block rounded-xl overflow-hidden border border-slate-100 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200"
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                                {exp.thumbnailUrl ? (
                                    <Image
                                        src={exp.thumbnailUrl.replace("maxresdefault", "hqdefault")}
                                        alt={exp.title || "Similar experience"}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 33vw"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-300 text-xs">
                                        No thumbnail
                                    </div>
                                )}

                                {/* Similarity badge */}
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                    {formatSimilarity(exp.similarity)} match
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {exp.title || "Untitled"}
                                </p>

                                {/* Type + tone badges */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {exp.experience_type && (
                                        <span
                                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${typeColors[exp.experience_type] || "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {exp.experience_type}
                                        </span>
                                    )}
                                    {exp.tone && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 capitalize">
                                            {exp.tone.replace("_", " ")}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
