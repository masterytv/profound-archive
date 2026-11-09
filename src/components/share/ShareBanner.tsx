'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Feather, X } from 'lucide-react';

/**
 * Site-wide "Share your experience" bar, above everything (and above the
 * music-video bar on NDE pages). Rendered only when SHARE_ENABLED is on (the
 * root layout decides). Hidden on the pages it would point to, on admin and
 * channel pages, and for 30 days after someone closes it.
 */
const HIDDEN_PREFIXES = ['/share', '/experiences', '/admin', '/channels/join', '/channels/directory', '/channels/conduct', '/login', '/auth'];
const STORAGE_KEY = 'pp-share-banner-dismissed-at';
const DISMISS_DAYS = 30;

export function shouldShowShareBanner(pathname: string): boolean {
    return !HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const CHANGE_EVENT = 'pp-share-banner-change';

/** 'show' or 'hide' (a string, so the snapshot is stable between calls). */
function readState(): 'show' | 'hide' {
    let dismissedAt = 0;
    try {
        dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    } catch {
        /* storage unavailable: just show it */
    }
    return Date.now() - dismissedAt > DISMISS_DAYS * 86_400_000 ? 'show' : 'hide';
}

function subscribe(onChange: () => void) {
    window.addEventListener('storage', onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
        window.removeEventListener('storage', onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
}

export default function ShareBanner() {
    const pathname = usePathname() ?? '';
    // On the server (and first paint) it is hidden, so a dismissed banner never flashes.
    const visible = useSyncExternalStore(subscribe, readState, () => 'hide') === 'show';

    if (!visible || !shouldShowShareBanner(pathname)) return null;

    function dismiss() {
        try {
            localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch {
            /* ignore */
        }
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }

    return (        <div className="bg-amber-50 text-amber-950 border-b border-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-500/20 text-sm">
            <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-3">
                <Feather className="hidden sm:block w-4 h-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <span className="hidden md:inline">Have you had a near-death, spiritual or contact experience? Share it in your own words.</span>
                <span className="md:hidden">Had a profound experience?</span>
                <Link
                    href="/share"
                    className="inline-flex items-center rounded-full bg-amber-900 text-amber-50 hover:bg-amber-800 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200 font-semibold px-3 py-1 shrink-0 transition-colors"
                >
                    Share your experience
                </Link>
                <Link href="/experiences" className="hidden sm:inline underline underline-offset-2 shrink-0">
                    Read others&apos;
                </Link>
                <button type="button" onClick={dismiss} aria-label="Close this banner" className="ml-1 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-500/20 shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
