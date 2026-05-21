"use client";

import { useState, useRef } from "react";
import { Cpu, CheckCircle2, XCircle, Clock3, Loader2, ChevronDown, BookOpen, User } from "lucide-react";

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
    running:  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    success:  <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    failed:   <XCircle className="w-4 h-4 text-red-500" />,
    skipped:  <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-slate-100" />,
};

// ─── Predefined Pillar Topics ─────────────────────────────────────────────────

const PILLAR_TOPICS = [
    { title: "What Is a Near-Death Experience?", targetQuery: "near death experience", author: "Tom Wood" },
    { title: "What Happens When You Die? What NDEs Tell Us", targetQuery: "what happens when you die", author: "Dr. Micul Love" },
    { title: "Is There Proof of the Afterlife? The Science of NDEs", targetQuery: "proof of afterlife", author: "Pamela Harris" },
    { title: "What Really Happens During a Near-Death Experience", targetQuery: "what happens during near death experience", author: "Tom Wood" },
    { title: "Near-Death Experiences That Were Verified: Real Cases", targetQuery: "verified near death experience", author: "Dr. Micul Love" },
    { title: "How Near-Death Experiences Change People Forever", targetQuery: "life after near death experience", author: "Pamela Harris" },
    { title: "Near-Death Experiences Around the World", targetQuery: "near death experience different cultures", author: "Tom Wood" },
    { title: "Finding Support After a Near-Death Experience", targetQuery: "near death experience support", author: "Dr. Micul Love" },
];

const AUTHORS = ["Tom Wood", "Dr. Micul Love", "Pamela Harris"];

// ─── Shared Pipeline Progress Display ─────────────────────────────────────────

function PipelineProgress({ steps, result, error }: {
    steps: PipelineStep[];
    result: GenerateResult | null;
    error: string | null;
}) {
    return (
        <>
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
                        <CheckCircle2 className="w-4 h-4" /> Article saved as draft
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        {result.wordCount?.toLocaleString()} words · <a href={`/blog/${result.articleSlug}`} target="_blank" className="underline hover:no-underline" rel="noreferrer">/blog/{result.articleSlug}</a>
                    </p>
                    <p className="text-xs text-emerald-500 mt-1">Publish via the table below when approved.</p>
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
        </>
    );
}

// ─── SSE Stream Runner ────────────────────────────────────────────────────────

async function runSSEGeneration(
    body: Record<string, unknown>,
    signal: AbortSignal,
    callbacks: {
        onStep: (step: PipelineStep) => void;
        onResult: (result: GenerateResult) => void;
        onError: (error: string) => void;
    }
) {
    const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
    });

    if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "Unknown error");
        callbacks.onError(`Server error ${res.status}: ${text}`);
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
                if (msg.type === "step") callbacks.onStep(msg.step);
                else if (msg.type === "complete") callbacks.onResult(msg.result);
                else if (msg.type === "error") callbacks.onError(msg.error);
            } catch {
                // malformed SSE line
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Question-Based Article Panel
// ═════════════════════════════════════════════════════════════════════════════

type QuestionOption = { slug: string; question: string };

export function BlogGeneratePanel({ questions }: { questions: QuestionOption[] }) {
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
            await runSSEGeneration(
                { questionSlug: selected },
                abortRef.current.signal,
                {
                    onStep: (step) => setSteps((prev) => {
                        const idx = prev.findIndex((s) => s.name === step.name);
                        if (idx === -1) return [...prev, step];
                        const next = [...prev]; next[idx] = step; return next;
                    }),
                    onResult: setResult,
                    onError: setError,
                }
            );
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== "AbortError") setError(String(err));
        } finally {
            setRunning(false);
        }
    }

    const selectedQuestion = questions.find((q) => q.slug === selected);

    return (
        <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 dark:bg-blue-500/5 dark:border-blue-500/20 overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-colors"
            >
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Cpu className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Generate from Questions</p>
                    <p className="text-xs text-blue-500 dark:text-blue-400">AI pipeline: Context → Research → Draft → Voice → Save as draft</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-blue-200/40 dark:border-blue-500/20 pt-4">
                    <div className="mb-3">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                            Select question
                        </label>
                        <select
                            value={selected}
                            onChange={(e) => { setSelected(e.target.value); reset(); }}
                            disabled={running}
                            className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {questions.map((q) => (
                                <option key={q.slug} value={q.slug}>{q.question}</option>
                            ))}
                        </select>
                        {selectedQuestion && (
                            <p className="text-xs text-slate-400 font-mono mt-1">/questions/{selected}</p>
                        )}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={running || !selected}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {running
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                            : <><Cpu className="w-3.5 h-3.5" /> Generate Article</>
                        }
                    </button>

                    <PipelineProgress steps={steps} result={result} error={error} />
                </div>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Guide (Pillar Page) Generation Panel
// ═════════════════════════════════════════════════════════════════════════════

export function GuideGeneratePanel() {
    const [open, setOpen] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [authorOverride, setAuthorOverride] = useState("");
    const [steps, setSteps] = useState<PipelineStep[]>([]);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    function reset() { setSteps([]); setResult(null); setError(null); }

    const topic = PILLAR_TOPICS[selectedIdx];
    const effectiveAuthor = authorOverride || topic.author;

    async function handleGenerate() {
        if (!topic) return;
        reset();
        setRunning(true);
        abortRef.current = new AbortController();

        try {
            await runSSEGeneration(
                {
                    type: "guide",
                    pillarTitle: topic.title,
                    targetQuery: topic.targetQuery,
                    authorName: effectiveAuthor,
                },
                abortRef.current.signal,
                {
                    onStep: (step) => setSteps((prev) => {
                        const idx = prev.findIndex((s) => s.name === step.name);
                        if (idx === -1) return [...prev, step];
                        const next = [...prev]; next[idx] = step; return next;
                    }),
                    onResult: setResult,
                    onError: setError,
                }
            );
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== "AbortError") setError(String(err));
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/40 dark:bg-indigo-500/5 dark:border-indigo-500/20 overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition-colors"
            >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Generate Pillar Guide</p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400">Comprehensive 3,000-5,000 word guide targeting high-volume NDE queries</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-indigo-200/40 dark:border-indigo-500/20 pt-4">
                    {/* Topic selector */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                            Select pillar topic
                        </label>
                        <select
                            value={selectedIdx}
                            onChange={(e) => { setSelectedIdx(Number(e.target.value)); reset(); }}
                            disabled={running}
                            className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {PILLAR_TOPICS.map((t, i) => (
                                <option key={i} value={i}>
                                    {t.title}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                            Target: &quot;{topic.targetQuery}&quot; · Default author: {topic.author}
                        </p>
                    </div>

                    {/* Author override */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                            Author (override)
                        </label>
                        <select
                            value={authorOverride}
                            onChange={(e) => setAuthorOverride(e.target.value)}
                            disabled={running}
                            className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <option value="">Use default ({topic.author})</option>
                            {AUTHORS.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={running}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {running
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Guide...</>
                            : <><BookOpen className="w-3.5 h-3.5" /> Generate Guide</>
                        }
                    </button>

                    <PipelineProgress steps={steps} result={result} error={error} />
                </div>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Story (Experiencer Narrative) Generation Panel
// ═════════════════════════════════════════════════════════════════════════════

export function StoryGeneratePanel() {
    const [open, setOpen] = useState(false);
    const [slug, setSlug] = useState("");
    const [steps, setSteps] = useState<PipelineStep[]>([]);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    function reset() { setSteps([]); setResult(null); setError(null); }

    async function handleGenerate() {
        reset();
        setRunning(true);
        abortRef.current = new AbortController();

        try {
            await runSSEGeneration(
                {
                    type: "story",
                    ...(slug.trim() ? { experiencerSlug: slug.trim() } : {}),
                },
                abortRef.current.signal,
                {
                    onStep: (step) => setSteps((prev) => {
                        const idx = prev.findIndex((s) => s.name === step.name);
                        if (idx === -1) return [...prev, step];
                        const next = [...prev]; next[idx] = step; return next;
                    }),
                    onResult: setResult,
                    onError: setError,
                }
            );
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== "AbortError") setError(String(err));
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-500/5 dark:border-amber-500/20 overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-amber-50/60 dark:hover:bg-amber-500/10 transition-colors"
            >
                <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Generate Experiencer Story</p>
                    <p className="text-xs text-amber-500 dark:text-amber-400">Long-form narrative from transcripts · 6 stages: Select → Context → Draft → Voice → Images → Publish</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-amber-200/40 dark:border-amber-500/20 pt-4">
                    {/* Experiencer slug input */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                            Experiencer slug (optional)
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => { setSlug(e.target.value); reset(); }}
                            disabled={running}
                            placeholder="e.g. betty-guadagno — leave empty for auto-select (highest views)"
                            className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            {slug.trim()
                                ? <span className="font-mono">/experiencer/{slug.trim()}</span>
                                : "Auto-selects the highest-view experiencer not yet covered"
                            }
                        </p>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={running}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {running
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Story...</>
                            : <><User className="w-3.5 h-3.5" /> Generate Story</>
                        }
                    </button>

                    <PipelineProgress steps={steps} result={result} error={error} />
                </div>
            )}
        </div>
    );
}

