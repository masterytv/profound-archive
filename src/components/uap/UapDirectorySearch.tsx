'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useCallback } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Reusable client-side search input for UAP entity directory pages.
 * Updates URL query param `q` on submit, preserves sort/order state.
 */
export function UapDirectorySearch({ basePath }: { basePath: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [value, setValue] = useState(searchParams.get('q') ?? '');

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
            params.set('q', value.trim());
        } else {
            params.delete('q');
        }
        startTransition(() => {
            router.push(`${basePath}?${params.toString()}`);
        });
    }, [value, searchParams, router, basePath]);

    const handleClear = useCallback(() => {
        setValue('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        startTransition(() => {
            router.push(`${basePath}?${params.toString()}`);
        });
    }, [searchParams, router, basePath]);

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
                type="text"
                placeholder="Search by name..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-300 dark:focus:border-green-500/40 dark:[color-scheme:dark] transition-all ${isPending ? 'opacity-60' : ''}`}
            />
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </form>
    );
}
