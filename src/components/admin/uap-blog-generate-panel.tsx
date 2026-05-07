"use client";

import { useState, useRef } from "react";
import { Sparkles, CheckCircle2, XCircle, Clock3, Loader2, ChevronDown } from "lucide-react";

type StepStatus = "pending" | "running" | "success" | "failed" | "skipped";

interface PipelineStep {
    name: string;
    status: StepStatus;
    message?: string;
    duration_ms?: number;
}

interface GenerateResult {
    status: string;
    articleSlug?: string;
    articleId?: number;
    wordCount?: number;
    error?: string;
}

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
    pending:  <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />,
    running:  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />,
    success:  <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    failed:   <XCircle className="w-4 h-4 text-red-500" />,
    skipped:  <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-slate-100" />,
};

type QuestionOption = { slug: string; question: string };

/**
 * UAP Blog Generate Panel — Copy-Modify from BlogGeneratePanel.
 * Points to /api/admin/uap/blog/generate instead of /api/admin/blog/generate.
 * Uses green accent colors matching UAP domain identity.
 */
export function UapBlogGeneratePanel({ questions }: { questions: QuestionOption[] }) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<string>(questions[0]?.slug ?? "");
    const [steps, setSteps] = useState<PipelineStep[]>([]);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    function reset() { setSteps([]); setResult(null); setError(null); }

    async function handleGenerate() {
        if (!selected) return;
        reset();
        setRunning(true);
        abortRef.current = new AbortController();

        try {
            const res = await fetch("/api/admin/uap/blog/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionSlug: selected }),
                signal: abortRef.current.signal,
            });

            if (!res.ok || !res.body) {
                const text = await res.text().catch(() => "Unknown error");
                setError(`Server error ${res.status}: ${text}`);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

                for (const line of lines) {
                    try {
                        const msg = JSON.parse(line.slice(6));
                        if (msg.type === "step") {
                            setSteps((prev) => {
                                const idx = prev.findIndex((s) => s.name === msg.step.name);
                                if (idx === -1) return [...prev, msg.step];
                                const next = [...prev]; next[idx] = msg.step; return next;
                            });
                        } else if (msg.type === "complete") setResult(msg.result);
                        else if (msg.type === "error") setError(msg.error);
                    } catch { /* malformed SSE line */ }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== "AbortError") setError(String(err));
        } finally {
            setRunning(false);
        }
    }

    const selectedQuestion = questions.find((q) => q.slug === selected);

    return (
        <div className="rounded-2xl border border-green-200/60 bg-green-50/40 dark:bg-green-500/5 dark:border-green-500/20 overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-green-50/60 dark:hover:bg-green-500/10 transition-colors"
            >
                <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-green-700 dark:text-green-300">Generate UAP Article</p>
                    <p className="text-xs text-green-500 dark:text-green-400">AI pipeline: Context → Research → Draft → Verify → Publish (domain: UAP)</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-green-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-green-200/40 dark:border-green-500/20 pt-4">
                    <div className="mb-3">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                            Select UAP question
                        </label>
                        <select
                            value={selected}
                            onChange={(e) => { setSelected(e.target.value); reset(); }}
                            disabled={running}
                            className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        >
                            {questions.map((q) => (
                                <option key={q.slug} value={q.slug}>{q.question}</option>
                            ))}
                        </select>
                        {selectedQuestion && (
                            <p className="text-xs text-slate-400 font-mono mt-1">/uap/questions/{selected}</p>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={running || !selected}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {running
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                            : <><Sparkles className="w-3.5 h-3.5" /> Generate Article</>
                        }
                    </button>

                    {/* Pipeline progress */}
                    {steps.length > 0 && (
                        <div className="mt-5 space-y-2">
                            {steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="mt-0.5 flex-shrink-0">{STATUS_ICON[step.status]}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {step.name}
                                            </span>
                                            {step.duration_ms && (
                                                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                                    <Clock3 className="w-2.5 h-2.5" />
                                                    {(step.duration_ms / 1000).toFixed(1)}s
                                                </span>
                                            )}
                                        </div>
                                        {step.message && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                {step.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {result && result.status === "complete" && (
                        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> Article published
                            </p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                {result.wordCount?.toLocaleString()} words · <a href={`/blog/${result.articleSlug}`} target="_blank" className="underline hover:no-underline" rel="noreferrer">/blog/{result.articleSlug}</a>
                            </p>
                        </div>
                    )}

                    {result && result.status === "already_exists" && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Already generated</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                Article exists at <a href={`/blog/${result.articleSlug}`} target="_blank" className="underline" rel="noreferrer">/blog/{result.articleSlug}</a>
                            </p>
                        </div>
                    )}

                    {(error || (result && result.status === "failed")) && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                                <XCircle className="w-4 h-4" /> Generation failed
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-mono break-all">
                                {error ?? result?.error}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
