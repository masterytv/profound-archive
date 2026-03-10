'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface UserQuestion {
    id: number;
    slug: string;
    question: string;
    is_active: boolean;
    created_at: string;
    question_synthesis: Array<{ id: number; short_answer: string; answered_at: string }> | null;
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUserQuestionsPage() {
    const [questions, setQuestions] = useState<UserQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'hidden'>('all');
    const [toggling, setToggling] = useState<string | null>(null);
    const [msg, setMsg] = useState('');

    async function load() {
        setLoading(true);
        const res = await fetch('/api/admin/user-questions');
        const json = await res.json();
        setQuestions(json.questions ?? []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function toggle(slug: string, currentlyActive: boolean) {
        setToggling(slug);
        setMsg('');
        const res = await fetch('/api/admin/questions/hide-user', {
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

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Questions</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {questions.length} total · {activeCount} active · {hiddenCount} hidden
                    </p>
                </div>
                <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    ← Admin home
                </Link>
            </div>

            {/* Status message */}
            {msg && (
                <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                    {msg}
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
                {(['all', 'active', 'hidden'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                            filter === f
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
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
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                <th className="px-4 py-3 w-8">Status</th>
                                <th className="px-4 py-3">Question</th>
                                <th className="px-4 py-3 hidden md:table-cell">Cached</th>
                                <th className="px-4 py-3 hidden md:table-cell">Submitted</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map(q => {
                                const synthesis = Array.isArray(q.question_synthesis) ? q.question_synthesis[0] : null;
                                return (
                                    <tr
                                        key={q.id}
                                        className={`hover:bg-slate-50 transition-colors ${!q.is_active ? 'opacity-50' : ''}`}
                                    >
                                        {/* Status icon */}
                                        <td className="px-4 py-3">
                                            {q.is_active
                                                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                : <AlertCircle className="w-4 h-4 text-slate-300" />
                                            }
                                        </td>

                                        {/* Question text */}
                                        <td className="px-4 py-3 max-w-xs">
                                            <p className="font-medium text-slate-800 truncate" title={q.question}>
                                                {q.question}
                                            </p>
                                            {synthesis && (
                                                <p className="text-xs text-slate-400 mt-0.5 truncate" title={synthesis.short_answer}>
                                                    {synthesis.short_answer}
                                                </p>
                                            )}
                                        </td>

                                        {/* Cached status */}
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {synthesis
                                                ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Yes</span>
                                                : <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3.5 h-3.5" /> Pending</span>
                                            }
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                                            {formatDate(q.created_at)}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-end">
                                                <Link
                                                    href={`/questions/${q.slug}`}
                                                    target="_blank"
                                                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                                                            ? 'bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700'
                                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
