import Link from "next/link";
import { Compass, FlaskConical, Zap } from "lucide-react";

/**
 * PathwaySection — "One Hero + Two Side Doors"
 *
 * One dominant CTA (NDE Compass quiz) with two subordinate paths
 * (Research, Experiencer) to avoid Paradox of Choice while still
 * serving all three audience segments above the fold.
 */
export function PathwaySection() {
    return (
        <section className="container mx-auto px-4 py-10 max-w-4xl">
            {/* Primary CTA — NDE Compass */}
            <Link
                href="/compass"
                className="group relative block rounded-2xl border-2 border-purple-200 dark:border-purple-500/30 bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-purple-900/20 dark:via-slate-800/80 dark:to-violet-900/20 p-8 md:p-10 text-center hover:border-purple-300 dark:hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 mb-4"
            >
                <div className="flex items-center justify-center gap-2.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Compass className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                </div>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">
                    Not sure where to start?
                </p>
                <h2
                    className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-3"
                    style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                >
                    Take the 60-Second NDE Compass
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6">
                    4 questions. No wrong answers. We&apos;ll find the experiences
                    that matter to you.
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 dark:bg-purple-500 text-white font-medium text-sm hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shadow-sm">
                    Find my starting point &rarr;
                </span>
            </Link>

            {/* Two Side Doors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Research Path */}
                <Link
                    href="/explore"
                    className="group flex items-start gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 p-6 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            I&apos;m Researching
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Browse 5,000+ accounts by evidence, depth, and impact scores.
                        </p>
                    </div>
                </Link>

                {/* Experiencer Path */}
                <Link
                    href="/experiencers"
                    className="group flex items-start gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-white/5 p-6 hover:border-amber-300 dark:hover:border-amber-500/40 hover:shadow-lg transition-all duration-300"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                            I&apos;m an Experiencer
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            See how your experience compares. Explore your profile.
                        </p>
                    </div>
                </Link>
            </div>
        </section>
    );
}
