import Link from "next/link";
import { LayoutGrid, Search, ArrowRight } from "lucide-react";

/**
 * BrowseSearchPanel — two-card panel replacing Explore by Score.
 * Offers two clear paths: browsing the video grid and searching transcripts.
 */
export function BrowseSearchPanel() {
    return (
        <section className="container mx-auto px-4 py-10 max-w-4xl">
            <div className="text-center mb-8">
                <h2
                    className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Dive Deeper
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                    Two ways to explore the full archive.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Browse Videos */}
                <Link
                    href="/video-explore"
                    className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 p-7 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-xl transition-all duration-300"
                >
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <LayoutGrid className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3
                            className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Browse Videos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Filter 5,000+ NDE videos by topic, experience type, and research scores. Visual grid with smart tags.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:gap-2.5 transition-all">
                        Explore videos <ArrowRight className="w-4 h-4" />
                    </span>
                </Link>

                {/* Search Transcripts */}
                <Link
                    href="/search3"
                    className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 p-7 hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-xl transition-all duration-300"
                >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3
                            className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            Search Transcripts
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Search across every word of 5,000+ NDE accounts using keywords or AI-powered concept matching.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:gap-2.5 transition-all">
                        Start searching <ArrowRight className="w-4 h-4" />
                    </span>
                </Link>
            </div>
        </section>
    );
}
