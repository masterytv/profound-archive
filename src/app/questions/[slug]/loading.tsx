// loading.tsx — shown automatically by Next.js App Router while the server
// fetches question data. Matches the layout of the real answer page so the
// transition feels seamless (no jarring layout shift).
export default function QuestionLoading() {
    return (
        <div className="min-h-screen bg-background text-foreground animate-pulse">

            {/* Breadcrumb skeleton */}
            <div className="border-b border-border/60 bg-muted/30">
                <div className="container mx-auto px-4 max-w-5xl py-3">
                    <div className="h-4 w-28 rounded bg-slate-200" />
                </div>
            </div>

            {/* Hero skeleton */}
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 border-b border-slate-100">
                <div className="container mx-auto px-4 max-w-5xl py-10 md:py-14">
                    {/* Category badge */}
                    <div className="h-5 w-32 rounded-full bg-slate-200 mb-4" />
                    {/* Question heading */}
                    <div className="space-y-3 mb-6">
                        <div className="h-8 w-full max-w-2xl rounded-lg bg-slate-200" />
                        <div className="h-8 w-3/4 max-w-xl rounded-lg bg-slate-200" />
                    </div>
                    {/* Sub-line */}
                    <div className="h-4 w-56 rounded bg-slate-200" />
                </div>
            </div>

            {/* Main content area */}
            <div className="container mx-auto px-4 max-w-5xl py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left — Answer synthesis */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* "What NDEs reveal" heading */}
                        <div className="h-6 w-48 rounded bg-slate-200" />

                        {/* Searching indicator */}
                        <div className="flex items-center gap-3 py-5 px-4 rounded-xl border border-slate-100 bg-slate-50">
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-full border-2 border-emerald-200 border-t-emerald-500 animate-spin" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">
                                    Searching 5,000+ NDE accounts…
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Finding relevant experiences and synthesising an answer
                                </p>
                            </div>
                        </div>

                        {/* Answer paragraph skeletons */}
                        <div className="space-y-2.5">
                            <div className="h-4 w-full rounded bg-slate-200" />
                            <div className="h-4 w-[95%] rounded bg-slate-200" />
                            <div className="h-4 w-[88%] rounded bg-slate-200" />
                            <div className="h-4 w-full rounded bg-slate-200" />
                            <div className="h-4 w-[92%] rounded bg-slate-200" />
                            <div className="h-4 w-[75%] rounded bg-slate-200" />
                        </div>

                        {/* Video card skeletons */}
                        <div className="mt-8 space-y-3">
                            <div className="h-5 w-36 rounded bg-slate-200" />
                            {[0, 1, 2].map(i => (
                                <div key={i} className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                                    <div className="w-32 h-20 rounded-lg bg-slate-200 shrink-0" />
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-3.5 w-full rounded bg-slate-200" />
                                        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                                        <div className="h-3 w-24 rounded bg-slate-100 mt-2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right sidebar skeletons */}
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                            <div className="h-4 w-28 rounded bg-slate-200" />
                            {[0, 1, 2].map(i => (
                                <div key={i} className="h-3 rounded bg-slate-200" style={{ width: `${85 - i * 10}%` }} />
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
