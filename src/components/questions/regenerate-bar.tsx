'use client';

import { useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RegenerateBarProps {
    slug: string;
    questionText: string;
}

/**
 * Admin-only bar shown at the top of a question page.
 * Clears the question_synthesis cache entry so the next full page load
 * re-runs Claude and writes a fresh synthesis + cited_video_ids.
 */
export function RegenerateBar({ slug, questionText }: RegenerateBarProps) {
    const router = useRouter();
    const [state, setState] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle');
    const [message, setMessage] = useState('');

    async function handleRegenerate() {
        if (state === 'idle') {
            setState('confirming');
            return;
        }
        if (state !== 'confirming') return;

        setState('loading');
        try {
            const res = await fetch('/api/admin/questions/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            });
            const json = await res.json() as { ok?: boolean; message?: string; error?: string };

            if (!res.ok || !json.ok) {
                setMessage(json.error ?? 'Unknown error');
                setState('error');
                return;
            }

            setState('done');
            setMessage(json.message ?? 'Cache cleared.');

            // Reload after short delay so Claude re-runs and the user sees fresh content
            setTimeout(() => router.refresh(), 1500);
        } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Request failed');
            setState('error');
        }
    }

    function handleCancel() {
        setState('idle');
    }

    const barBg = state === 'error' ? 'bg-red-950/90' :
                  state === 'done'  ? 'bg-emerald-950/90' :
                                      'bg-slate-900/90';

    return (
        <div className={`sticky top-0 z-50 flex items-center gap-3 px-4 py-2 text-xs backdrop-blur-sm border-b border-white/10 ${barBg} transition-colors`}>
            {/* Admin badge */}
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-400 font-semibold tracking-wide uppercase text-[10px]">
                Admin
            </span>

            <span className="text-slate-400 truncate flex-1 hidden sm:block">
                {questionText.length > 60 ? questionText.slice(0, 60) + '…' : questionText}
            </span>

            {/* Status message */}
            {(state === 'done' || state === 'error') && (
                <span className={state === 'done' ? 'text-emerald-400' : 'text-red-400'}>
                    {message}
                </span>
            )}

            {state === 'loading' && (
                <span className="flex items-center gap-1.5 text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Clearing cache…
                </span>
            )}

            {/* Confirm step */}
            {state === 'confirming' && (
                <span className="text-amber-400">
                    Re-run Claude for this question?
                </span>
            )}

            <div className="flex items-center gap-2 ml-auto shrink-0">
                {state === 'confirming' && (
                    <button
                        onClick={handleCancel}
                        className="rounded px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                )}

                {(state === 'idle' || state === 'confirming') && (
                    <button
                        onClick={handleRegenerate}
                        className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors ${
                            state === 'confirming'
                                ? 'bg-red-500 hover:bg-red-400 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-slate-200'
                        }`}
                    >
                        <Trash2 className="w-3 h-3" />
                        {state === 'confirming' ? 'Yes, delete & regenerate' : 'Regenerate answer'}
                    </button>
                )}
            </div>
        </div>
    );
}
