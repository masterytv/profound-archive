import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";

/**
 * CompassionateChatCTA — warm-toned section promoting the AI chat companion.
 * Purely static, no data fetching required.
 */
export function CompassionateChatCTA() {
    return (
        <section className="container mx-auto px-4 py-10 max-w-4xl">
            <div className="relative rounded-2xl border border-blue-200/60 dark:border-blue-500/20 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-900/20 dark:via-slate-800/80 dark:to-indigo-900/20 p-8 md:p-10 text-center overflow-hidden">
                {/* Subtle dot pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #3B82F6 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                    }}
                />
                <div className="relative">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <MessageCircleHeart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <h2
                        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-3"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Have a question about death, grief, or what comes next?
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6 leading-relaxed">
                        Talk to our AI companion, grounded in 5,000+ real NDE accounts.
                        It won&apos;t replace professional support, but it can help you explore
                        what thousands of experiencers have reported.
                    </p>
                    <Link
                        href="/chat-compassionate"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 dark:bg-blue-500 text-white font-medium text-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
                    >
                        <MessageCircleHeart className="w-4 h-4" />
                        Start a Conversation
                    </Link>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                        Or use the chat icon in the bottom-right corner of any page.
                    </p>
                </div>
            </div>
        </section>
    );
}
