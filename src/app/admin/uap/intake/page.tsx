'use client';

/**
 * UAP Video Intake Admin Page
 * 
 * Copy-Modify from /admin/intake (NDE).
 * Form to submit a YouTube URL for processing through the UAP intake pipeline.
 * Uses async job pattern: POST queues, then polls GET for progress.
 *
 * Route: /admin/uap/intake
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
    Radio,
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
    tier?: number;
    track?: string;
    content_type?: string;
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

// ─── Status Icon ─────────────────────────────────────────────────────────────

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
        default:
            return <Clock className="w-4.5 h-4.5 text-slate-300" />;
    }
}

// ─── Result Badge ────────────────────────────────────────────────────────────

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
    out_of_scope: {
        label: 'Out of Scope (Tier 3)',
        icon: <XCircle className="w-5 h-5 text-red-600" />,
        cardClass: 'bg-red-50 border-red-200',
        iconBgClass: 'bg-red-100',
    },
    drm_protected: {
        label: 'DRM Protected (YouTube Movies)',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        cardClass: 'bg-amber-50 border-amber-200',
        iconBgClass: 'bg-amber-100',
    },
    no_captions: {
        label: 'No Captions Available',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        cardClass: 'bg-amber-50 border-amber-200',
        iconBgClass: 'bg-amber-100',
    },
    is_short: {
        label: 'YouTube Short (Skipped)',
        icon: <SkipForward className="w-5 h-5 text-slate-600" />,
        cardClass: 'bg-slate-50 border-slate-200',
        iconBgClass: 'bg-slate-100',
    },
    failed: {
        label: 'Pipeline Error',
        icon: <XCircle className="w-5 h-5 text-red-600" />,
        cardClass: 'bg-red-50 border-red-200',
        iconBgClass: 'bg-red-100',
    },
    geo_restricted: {
        label: 'Geo-Restricted (Unavailable in Supadata Region)',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        cardClass: 'bg-amber-50 border-amber-200',
        iconBgClass: 'bg-amber-100',
    },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UapIntakePage() {
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [polling, setPolling] = useState(false);
    const [currentJob, setCurrentJob] = useState<JobRecord | null>(null);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const API_BASE = '/api/uap/intake';
    const PROCESS_URL = '/api/uap/intake/process';

    const cleanup = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        setPolling(false);
    }, []);

    useEffect(() => () => cleanup(), [cleanup]);

    const submit = async () => {
        if (!url.trim()) return;
        setError(null);
        setCurrentJob(null);
        setSubmitting(true);

        try {
            // Step 1: Queue the job
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });

            const data = await res.json();
            if (!res.ok || !data.jobId) {
                setError(data.error || 'Failed to queue job');
                setSubmitting(false);
                return;
            }

            const jobId = data.jobId;
            setCurrentJob({
                id: jobId,
                youtube_url: url.trim(),
                video_title: null,
                status: 'processing',
                error_message: null,
                result: null,
                video_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            // Step 2: Fire-and-forget the process request
            fetch(PROCESS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, url: url.trim() }),
            }).catch(() => { /* Expected: Cloudflare may 524 */ });

            // Step 3: Poll for status
            setPolling(true);
            setSubmitting(false);

            pollRef.current = setInterval(async () => {
                try {
                    const pollRes = await fetch(`${API_BASE}?jobId=${jobId}`);
                    const job: JobRecord = await pollRes.json();
                    setCurrentJob(job);

                    if (['complete', 'failed', 'already_exists', 'out_of_scope', 'no_captions', 'drm_protected', 'is_short', 'geo_restricted'].includes(job.status)) {
                        cleanup();
                    }
                } catch {
                    // Retry silently
                }
            }, 3000);

        } catch (err: any) {
            setError(err.message || 'Unexpected error');
            setSubmitting(false);
        }
    };

    const reset = () => {
        cleanup();
        setCurrentJob(null);
        setError(null);
        setUrl('');
    };

    const result = currentJob?.result;
    const badge = result?.status ? resultBadge[result.status] : null;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Radio className="w-4.5 h-4.5 text-violet-500" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">UAP Video Intake</h1>
                    <p className="text-sm text-muted-foreground">Submit a YouTube URL for automated UAP processing</p>
                </div>
            </div>

            {/* URL Input Form */}
            <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] mb-8">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="Paste YouTube URL here..."
                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50"
                        disabled={submitting || polling}
                    />
                    {currentJob ? (
                        <button
                            onClick={reset}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 text-sm font-medium"
                        >
                            <RotateCcw className="w-4 h-4" /> Reset
                        </button>
                    ) : (
                        <button
                            onClick={submit}
                            disabled={submitting || !url.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 text-sm font-medium"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            Process
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-8">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <XCircle className="w-4 h-4" />
                        {error}
                    </div>
                </div>
            )}

            {/* Processing Steps */}
            {currentJob && (
                <div className="mb-8">
                    {/* Status header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {polling && <Loader2 className="w-5 h-5 animate-spin text-violet-500" />}
                            <div>
                                <div className="text-sm font-medium text-foreground">
                                    {result?.title || currentJob.video_title || 'Processing...'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Job: {currentJob.id.slice(0, 8)}...
                                </div>
                            </div>
                        </div>
                        {result?.tier && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                result.tier === 1 ? 'bg-violet-500/10 text-violet-400' :
                                result.tier === 2 ? 'bg-indigo-500/10 text-indigo-400' :
                                'bg-slate-500/10 text-slate-400'
                            }`}>
                                Tier {result.tier} / {result.track}
                            </span>
                        )}
                    </div>

                    {/* Step list */}
                    {result?.steps && result.steps.length > 0 && (
                        <div className="space-y-1">
                            {result.steps.map((step, i) => (
                                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02]">
                                    <StepStatusIcon status={step.status} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-foreground">{step.name}</div>
                                        {step.message && (
                                            <div className="text-xs text-muted-foreground truncate">{step.message}</div>
                                        )}
                                    </div>
                                    {step.duration_ms !== undefined && (
                                        <div className="text-xs text-muted-foreground tabular-nums">
                                            {(step.duration_ms / 1000).toFixed(1)}s
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Final result badge */}
                    {badge && !polling && (
                        <div className={`mt-4 p-4 rounded-xl border ${badge.cardClass}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${badge.iconBgClass} flex items-center justify-center`}>
                                    {badge.icon}
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{badge.label}</div>
                                    {result?.error && (
                                        <div className="text-xs text-red-500 mt-1">{result.error}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
