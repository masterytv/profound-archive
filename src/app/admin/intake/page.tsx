'use client';

/**
 * Video Intake Admin Page
 * 
 * Form to submit a YouTube URL for processing through the intake pipeline.
 * Uses async job pattern: POST queues, then polls GET for progress.
 * 
 * Route: /admin/intake
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Upload,
    CheckCircle2,
    XCircle,
    SkipForward,
    Loader2,
    Clock,
    ArrowRight,
    RotateCcw,
    ExternalLink,
    AlertTriangle,
    Cpu,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntakeStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'skipped' | 'failed';
    message?: string;
    duration_ms?: number;
}

interface IntakeResult {
    status: string;
    videoId: string;
    title?: string;
    classification?: {
        is_profound: boolean;
        experience_type: string;
        confidence: number;
        justification: string;
        isNde_value: string;
    } | null;
    analysisSummary?: string;
    error?: string;
    steps: IntakeStep[];
}

interface JobRecord {
    id: string;
    youtube_url: string;
    video_title: string | null;
    status: string;
    error_message: string | null;
    result: IntakeResult | null;
    video_id: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Status Icon Components ─────────────────────────────────────────────────

function StepStatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'success':
            return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />;
        case 'failed':
            return <XCircle className="w-4.5 h-4.5 text-red-500" />;
        case 'skipped':
            return <SkipForward className="w-4.5 h-4.5 text-slate-400" />;
        case 'running':
            return <Loader2 className="w-4.5 h-4.5 text-blue-500 animate-spin" />;
        case 'pending':
        default:
            return <Clock className="w-4.5 h-4.5 text-slate-300" />;
    }
}

// ─── Result Badge Configs ───────────────────────────────────────────────────

const resultBadge: Record<string, {
    label: string;
    icon: React.ReactNode;
    cardClass: string;
    iconBgClass: string;
}> = {
    complete: {
        label: 'Processed Successfully',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        cardClass: 'bg-emerald-50 border-emerald-200',
        iconBgClass: 'bg-emerald-100',
    },
    already_exists: {
        label: 'Already in Database',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        cardClass: 'bg-amber-50 border-amber-200',
        iconBgClass: 'bg-amber-100',
    },
    not_profound: {
        label: 'Not a Profound Experience',
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        cardClass: 'bg-red-50 border-red-200',
        iconBgClass: 'bg-red-100',
    },
    no_captions: {
        label: 'No Captions Available',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        cardClass: 'bg-amber-50 border-amber-200',
        iconBgClass: 'bg-amber-100',
    },
    failed: {
        label: 'Processing Failed',
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        cardClass: 'bg-red-50 border-red-200',
        iconBgClass: 'bg-red-100',
    },
    is_short: {
        label: 'YouTube Short — Skipped',
        icon: <SkipForward className="w-5 h-5 text-violet-500" />,
        cardClass: 'bg-violet-50 border-violet-200',
        iconBgClass: 'bg-violet-100',
    },
};

// Terminal statuses that stop polling
const TERMINAL_STATUSES = new Set([
    'complete', 'failed', 'not_profound', 'no_captions', 'already_exists', 'is_short'
]);

// ─── Component ───────────────────────────────────────────────────────────────

export default function IntakePage() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<IntakeResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Clean up intervals on unmount
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const pollForStatus = useCallback((id: string) => {
        // Start elapsed timer
        const startTime = Date.now();
        timerRef.current = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        // Poll every 3 seconds
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/intake?jobId=${id}`);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({ error: 'Poll failed' }));
                    console.error('[Intake Poll] Error:', errData);
                    return; // Keep polling — might be a transient error
                }

                const job: JobRecord = await res.json();

                if (TERMINAL_STATUSES.has(job.status)) {
                    stopPolling();
                    setIsLoading(false);

                    if (job.result) {
                        // Full pipeline result available
                        setResult(job.result);
                    } else {
                        // No result JSONB yet — construct a minimal display
                        if (job.status === 'failed') {
                            setError(job.error_message || 'Pipeline failed without details');
                        } else {
                            setResult({
                                status: job.status,
                                videoId: job.video_id || '',
                                title: job.video_title || undefined,
                                steps: [],
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('[Intake Poll] Network error:', err);
                // Keep polling through transient errors
            }
        }, 3000);
    }, [stopPolling]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim() || isLoading) return;

        setIsLoading(true);
        setResult(null);
        setError(null);
        setJobId(null);
        setElapsedSeconds(0);

        try {
            // Step 1: Queue the job (returns immediately with jobId)
            const response = await fetch('/api/intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });

            // Guard against non-JSON responses from infrastructure
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                setError(`Server returned an unexpected response (HTTP ${response.status}).`);
                setIsLoading(false);
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Unknown error');
                setIsLoading(false);
                return;
            }

            if (!data.jobId) {
                setError('No job ID returned');
                setIsLoading(false);
                return;
            }

            setJobId(data.jobId);

            // Step 2: Fire-and-forget the processing from the browser.
            // Cloudflare will kill this fetch with a 524 after ~100s, but that's OK.
            // The server-side Cloud Run container keeps running for up to 300s.
            // We don't read the response — the GET poller detects completion.
            fetch('/api/intake/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: data.jobId, url: data.url }),
            }).catch(() => {
                // Expected: Cloudflare 524 timeout or network error
                // The pipeline continues server-side regardless
                console.log('[Intake] Process fetch ended (expected — pipeline continues server-side)');
            });

            // Step 3: Start polling for completion
            pollForStatus(data.jobId);

        } catch (err: any) {
            setError(err.message || 'Network error');
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        stopPolling();
        setUrl('');
        setResult(null);
        setError(null);
        setJobId(null);
        setElapsedSeconds(0);
        setIsLoading(false);
    };

    const badge = result ? resultBadge[result.status] : null;

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-blue-600" />
                    </div>
                    <h1
                        className="text-2xl font-bold text-slate-900 dark:text-slate-100"
                        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                        Video Intake Pipeline
                    </h1>
                </div>
                <p className="text-slate-500 text-sm ml-[52px]">
                    Submit a YouTube URL to scrape, classify, and analyze a potential NDE video.
                </p>
            </div>

            {/* URL Form Card */}
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 p-6 shadow-sm">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        YouTube URL
                    </label>
                    <div className="flex gap-3">
                        <input
                            id="youtube-url"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !url.trim()}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Cpu className="w-4 h-4" />
                                    Process Video
                                </span>
                            )}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                        Supports youtube.com, youtu.be, and YouTube Shorts URLs
                    </p>
                </form>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                        <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <p className="text-red-800 font-medium text-sm">Error</p>
                        <p className="text-red-600 text-sm mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Processing State */}
            {isLoading && !result && (
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 font-medium">Processing video through the intake pipeline...</p>
                    <p className="text-slate-400 text-sm mt-1">
                        {elapsedSeconds > 0
                            ? `${elapsedSeconds}s elapsed — This typically takes 60–120 seconds`
                            : 'This typically takes 60–120 seconds'}
                    </p>
                    {jobId && (
                        <p className="text-slate-300 dark:text-slate-500 text-xs mt-3 font-mono">
                            Job ID: {jobId}
                        </p>
                    )}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* Result Badge Card */}
                    {badge && (
                        <div className={`p-5 border rounded-2xl ${badge.cardClass}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-xl ${badge.iconBgClass} flex items-center justify-center shrink-0`}>
                                        {badge.icon}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{badge.label}</p>
                                        {result.title && (
                                            <p className="text-sm text-slate-600 mt-0.5">{result.title}</p>
                                        )}
                                    </div>
                                </div>
                                {result.videoId && (result.status === 'complete' || result.status === 'already_exists') && (
                                    <a
                                        href={`/video/${result.videoId}`}
                                        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors shrink-0 cursor-pointer"
                                    >
                                        View Analysis
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}
                            </div>

                            {/* Classification Details */}
                            {result.classification && (
                                <div className="mt-4 pt-4 border-t border-current/10">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white/60 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Type</p>
                                            <p className="text-sm font-semibold text-slate-900 mt-0.5">
                                                {result.classification.experience_type.toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="bg-white/60 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Confidence</p>
                                            <p className="text-sm font-semibold text-slate-900 mt-0.5">
                                                {result.classification.confidence}%
                                            </p>
                                        </div>
                                        <div className="bg-white/60 rounded-xl px-3 py-2">
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Classification</p>
                                            <p className="text-sm font-semibold text-slate-900 mt-0.5">
                                                {result.classification.isNde_value}
                                            </p>
                                        </div>
                                    </div>
                                    {result.classification.justification && (
                                        <p className="mt-3 text-sm text-slate-600 italic leading-relaxed">
                                            &ldquo;{result.classification.justification}&rdquo;
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Analysis Summary */}
                            {result.analysisSummary && (
                                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                                    {result.analysisSummary}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Processing Steps Card */}
                    {result.steps.length > 0 && (
                        <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/10">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Processing Steps
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {result.steps.map((step, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <span className="shrink-0">
                                            <StepStatusIcon status={step.status} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <span className={`font-medium ${step.status === 'failed' ? 'text-red-600'
                                                : step.status === 'success' ? 'text-slate-900'
                                                    : step.status === 'skipped' ? 'text-slate-400'
                                                        : step.status === 'running' ? 'text-blue-600'
                                                            : 'text-slate-500'
                                                }`}>
                                                {step.name}
                                            </span>
                                            {step.message && (
                                                <span className="text-slate-400 ml-2">— {step.message}</span>
                                            )}
                                        </div>
                                        {step.duration_ms !== undefined && (
                                            <span className="text-slate-300 text-xs font-mono shrink-0">
                                                {step.duration_ms < 1000
                                                    ? `${step.duration_ms}ms`
                                                    : `${(step.duration_ms / 1000).toFixed(1)}s`
                                                }
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {result.status === 'complete' && result.videoId && (
                        <div className="flex gap-3">
                            <a
                                href={`/video/${result.videoId}`}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md cursor-pointer"
                            >
                                View on Site
                                <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/20 hover:border-slate-300 transition-all cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Process Another
                            </button>
                        </div>
                    )}

                    {/* Reset for non-complete states */}
                    {result.status !== 'complete' && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/20 hover:border-slate-300 transition-all cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Try Another
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
