'use client';

import { useState } from 'react';
import { RefreshCw, Trash2, EyeOff, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RegenerateBarProps {
    slug: string;
    questionText: string;
    /** True for user-submitted questions — shows the Hide/Restore button */
    isUserQuestion?: boolean;
    /** Current visibility state of the user question */
    isActive?: boolean;
}

/**
 * Admin-only bar shown at the top of a question page.
 * - Regenerate: clears question_synthesis so Claude re-runs on next load.
 * - Hide/Restore (user questions only): sets is_active flag without deleting.
 */
export function RegenerateBar({ slug, questionText, isUserQuestion = false, isActive = true }: RegenerateBarProps) {
    const router = useRouter();

    // Regenerate state machine
    const [regenState, setRegenState] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle');
    const [regenMsg, setRegenMsg] = useState('');

    // Hide/restore state machine
    const [hideState, setHideState] = useState<'idle' | 'confirming' | 'loading' | 'done' | 'error'>('idle');
    const [hideMsg, setHideMsg] = useState('');
    const [currentlyActive, setCurrentlyActive] = useState(isActive);

    // ── Regenerate ────────────────────────────────────────────────────────────
    async function handleRegenerate() {
        if (regenState === 'idle') { setRegenState('confirming'); return; }
        if (regenState !== 'confirming') return;
        setRegenState('loading');
        try {
            const res = await fetch('/api/admin/questions/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            });
            const json = await res.json() as { ok?: boolean; message?: string; error?: string };
            if (!res.ok || !json.ok) { setRegenMsg(json.error ?? 'Unknown error'); setRegenState('error'); return; }
            setRegenState('done');
            setRegenMsg(json.message ?? 'Cache cleared.');
            setTimeout(() => router.refresh(), 1500);
        } catch (err) {
            setRegenMsg(err instanceof Error ? err.message : 'Request failed');
            setRegenState('error');
        }
    }

    // ── Hide / Restore ────────────────────────────────────────────────────────
    async function handleHide() {
        if (hideState === 'idle') { setHideState('confirming'); return; }
        if (hideState !== 'confirming') return;
        setHideState('loading');
        try {
            const res = await fetch('/api/admin/questions/hide-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, restore: !currentlyActive }),
            });
            const json = await res.json() as { ok?: boolean; message?: string; error?: string; is_active?: boolean };
            if (!res.ok || !json.ok) { setHideMsg(json.error ?? 'Unknown error'); setHideState('error'); return; }
            setHideState('done');
            setHideMsg(json.message ?? 'Done.');
            setCurrentlyActive(json.is_active ?? !currentlyActive);
            setTimeout(() => router.refresh(), 1200);
        } catch (err) {
            setHideMsg(err instanceof Error ? err.message : 'Request failed');
            setHideState('error');
        }
    }

    const barBg =
        regenState === 'error' || hideState === 'error' ? 'bg-red-950/90' :
        regenState === 'done'  || hideState === 'done'  ? 'bg-emerald-950/90' :
                                                           'bg-slate-900/90';

    const statusMsg = regenMsg || hideMsg;
    const isDone  = regenState === 'done'  || hideState === 'done';
    const isError = regenState === 'error' || hideState === 'error';

    return (
        <div className={`sticky top-0 z-50 flex items-center gap-3 px-4 py-2 text-xs backdrop-blur-sm border-b border-white/10 ${barBg} transition-colors`}>
            {/* Admin badge */}
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-400 font-semibold tracking-wide uppercase text-[10px]">
                Admin
            </span>

            <span className="text-slate-400 truncate flex-1 hidden sm:block">
                {questionText.length > 60 ? questionText.slice(0, 60) + '…' : questionText}
            </span>

            {/* Status messages */}
            {(isDone || isError) && (
                <span className={isDone ? 'text-emerald-400' : 'text-red-400'}>{statusMsg}</span>
            )}
            {(regenState === 'loading' || hideState === 'loading') && (
                <span className="flex items-center gap-1.5 text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Working…
                </span>
            )}
            {regenState === 'confirming' && (
                <span className="text-amber-400">Re-run Claude for this question?</span>
            )}
            {hideState === 'confirming' && (
                <span className="text-amber-400">
                    {currentlyActive ? 'Hide this question from all users?' : 'Restore this question?'}
                </span>
            )}

            <div className="flex items-center gap-2 ml-auto shrink-0">
                {/* Cancel buttons */}
                {regenState === 'confirming' && (
                    <button onClick={() => setRegenState('idle')} className="rounded px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        Cancel
                    </button>
                )}
                {hideState === 'confirming' && (
                    <button onClick={() => setHideState('idle')} className="rounded px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        Cancel
                    </button>
                )}

                {/* Hide / Restore — user questions only */}
                {isUserQuestion && (regenState === 'idle' || regenState === 'done') && (hideState === 'idle' || hideState === 'confirming' || hideState === 'done') && (
                    <button
                        onClick={handleHide}
                        className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors ${
                            hideState === 'confirming'
                                ? 'bg-red-500 hover:bg-red-400 text-white'
                                : currentlyActive
                                    ? 'bg-white/10 hover:bg-white/20 text-slate-200'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                    >
                        {currentlyActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {hideState === 'confirming'
                            ? (currentlyActive ? 'Yes, hide it' : 'Yes, restore it')
                            : (currentlyActive ? 'Hide question' : 'Restore question')}
                    </button>
                )}

                {/* Regenerate — always shown */}
                {(hideState === 'idle' || hideState === 'done') && (regenState === 'idle' || regenState === 'confirming') && (
                    <button
                        onClick={handleRegenerate}
                        className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors ${
                            regenState === 'confirming'
                                ? 'bg-red-500 hover:bg-red-400 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-slate-200'
                        }`}
                    >
                        <Trash2 className="w-3 h-3" />
                        {regenState === 'confirming' ? 'Yes, delete & regenerate' : 'Regenerate answer'}
                    </button>
                )}
            </div>
        </div>
    );
}
