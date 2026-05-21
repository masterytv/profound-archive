'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, FileText, Cpu } from 'lucide-react';

interface UapQuestion {
    id: number;
    slug: string;
    consumer_question: string;
    category: string;
    ai_query: string;
    is_active: boolean;
    sort_order: number | null;
    created_at: string;
    has_article: boolean;
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CATEGORY_COLORS: Record<string, string> = {
    evidence:        'bg-blue-50 text-blue-600 border-blue-200',
    contact:         'bg-violet-50 text-violet-600 border-violet-200',
    disclosure:      'bg-amber-50 text-amber-600 border-amber-200',
    transformation:  'bg-emerald-50 text-emerald-600 border-emerald-200',
    physical:        'bg-rose-50 text-rose-600 border-rose-200',
    patterns:        'bg-indigo-50 text-indigo-600 border-indigo-200',
    science:         'bg-cyan-50 text-cyan-600 border-cyan-200',
    stigma:          'bg-orange-50 text-orange-600 border-orange-200',
};

export default function AdminUapQuestionsPage() {
    const [questions, setQuestions] = useState<UapQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'hidden'>('all');
    const [toggling, setToggling] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    async function load() {
        setLoading(true);
        const res = await fetch('/api/admin/uap/questions');
        const json = await res.json();
        setQuestions(json.questions ?? []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function toggle(slug: string, currentlyActive: boolean) {
        setToggling(slug);
        setMsg('');
        const res = await fetch('/api/admin/uap/questions/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, restore: !currentlyActive }),
        });
        const json = await res.json();
        if (json.ok) {
            setMsg(json.message);
            setQuestions(prev => prev.map(q => q.slug === slug ? { ...q, is_active: !currentlyActive } : q));
        } else {
            setMsg(json.error ?? 'Error');
        }
        setToggling(null);
    }

    const visible = questions.filter(q =>
        filter === 'all' ? true : filter === 'active' ? q.is_active : !q.is_active
    );

    const activeCount = questions.filter(q => q.is_active).length;
    const hiddenCount = questions.filter(q => !q.is_active).length;
    const withArticle = questions.filter(q => q.has_article).length;

    // Unique categories
    const categories = [...new Set(questions.map(q => q.category))].sort();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                        <Cpu className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                        <h1
                            className="text-xl font-bold text-slate-900"
                            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                        >
                            UAP Questions
                        </h1>
                        <p className="text-xs text-slate-500">
                            {questions.length} total · {activeCount} active · {hiddenCount} hidden · {withArticle} with articles
                        </p>
                    </div>
                </div>
                <Link
                    href="/admin/uap/blog"
                    className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                    ← UAP Blog
                </Link>
            </div>

            {/* Status message */}
            {msg && (
                <div className="px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                    {msg}
                </div>
            )}

            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                    const count = questions.filter(q => q.category === cat).length;
                    const colors = CATEGORY_COLORS[cat] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                    return (
                        <span key={cat} className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${colors}`}>
                            {cat} ({count})
                        </span>
                    );
                })}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-white/10 p-1 rounded-lg w-fit">
                {(['all', 'active', 'hidden'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                            filter === f
                                ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {f} {f === 'active' ? `(${activeCount})` : f === 'hidden' ? `(${hiddenCount})` : `(${questions.length})`}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-slate-400 text-sm py-10 text-center">Loading…</div>
            ) : visible.length === 0 ? (
                <div className="text-slate-400 text-sm py-10 text-center">No questions in this filter.</div>
            ) : (
                <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                <th className="px-4 py-3 w-8">Status</th>
                                <th className="px-4 py-3">Question</th>
                                <th className="px-4 py-3 hidden md:table-cell">Category</th>
                                <th className="px-4 py-3 hidden lg:table-cell">Article</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                            {visible.map(q => (
                                <tr
                                    key={q.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!q.is_active ? 'opacity-50' : ''}`}
                                >
                                    {/* Status icon */}
                                    <td className="px-4 py-3">
                                        {q.is_active
                                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            : <AlertCircle className="w-4 h-4 text-slate-300" />
                                        }
                                    </td>

                                    {/* Question text */}
                                    <td className="px-4 py-3 max-w-md">
                                        <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1" title={q.consumer_question}>
                                            {q.consumer_question}
                                        </p>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5">/uap/questions/{q.slug}</p>
                                    </td>

                                    {/* Category */}
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[q.category] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                            {q.category}
                                        </span>
                                    </td>

                                    {/* Article status */}
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        {q.has_article
                                            ? <span className="flex items-center gap-1 text-emerald-600 text-xs"><FileText className="w-3.5 h-3.5" /> Generated</span>
                                            : <span className="text-slate-400 text-xs">—</span>
                                        }
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <Link
                                                href={`/uap/questions/${q.slug}`}
                                                target="_blank"
                                                className="p-1.5 rounded text-slate-400 hover:text-green-700 dark:hover:text-green-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                title="View question page"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Link>
                                            <button
                                                onClick={() => toggle(q.slug, q.is_active)}
                                                disabled={toggling === q.slug}
                                                title={q.is_active ? 'Hide question' : 'Restore question'}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                                    q.is_active
                                                        ? 'bg-slate-100 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400'
                                                        : 'bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                                }`}
                                            >
                                                {toggling === q.slug
                                                    ? '…'
                                                    : q.is_active
                                                        ? <><EyeOff className="w-3 h-3" /> Hide</>
                                                        : <><Eye className="w-3 h-3" /> Restore</>
                                                }
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
