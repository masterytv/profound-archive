'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DailyFact {
  fact_date: string;
  fact_text: string;
  fact_category: string;
  fact_emoji: string;
  sample_size: number;
  related_video_ids: string[];
}

/**
 * UapDailyFactCard
 * 
 * Displays the daily UAP fact with share functionality.
 * Fetches from /api/uap/daily-fact on mount.
 */
export function UapDailyFactCard() {
  const [fact, setFact] = useState<DailyFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/uap/daily-fact')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setFact(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleShare = async () => {
    if (!fact) return;

    const shareText = `${fact.fact_emoji} UAP Daily Fact\n\n${fact.fact_text}\n\n(N=${fact.sample_size}) — via Project Profound`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'UAP Daily Fact', text: shareText });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-4 bg-white/10 rounded w-full mb-2" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  if (!fact) return null;

  const categoryColors: Record<string, string> = {
    analysis: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    entity: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
    phenomenon: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
    quality: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
    evidence: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/30',
    contact: 'from-rose-500/20 to-pink-500/20 border-rose-500/30',
    classification: 'from-lime-500/20 to-green-500/20 border-lime-500/30',
    transformation: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/30',
    persons: 'from-slate-500/20 to-zinc-500/20 border-slate-500/30',
    general: 'from-gray-500/20 to-neutral-500/20 border-gray-500/30',
  };

  const colorClass = categoryColors[fact.fact_category] || categoryColors.general;

  return (
    <div className={`relative rounded-xl border bg-gradient-to-br ${colorClass} p-5 overflow-hidden group`}>
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{fact.fact_emoji}</span>
            <span className="text-xs font-medium uppercase tracking-wider text-white/50">
              Daily Fact
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/30">
              N={fact.sample_size}
            </span>
            <button
              onClick={handleShare}
              className="text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 flex items-center gap-1"
              title="Share this fact"
            >
              {copied ? (
                <>✓ Copied</>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fact text */}
        <p className="text-sm leading-relaxed text-white/85">{fact.fact_text}</p>

        {/* Related videos */}
        {fact.related_video_ids?.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[10px] text-white/30">Related:</span>
            {fact.related_video_ids.slice(0, 3).map(id => (
              <Link
                key={id}
                href={`/uap/video/${id}`}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/70 transition-colors font-mono"
              >
                {id.slice(0, 7)}…
              </Link>
            ))}
          </div>
        )}

        {/* Date + category */}
        <div className="mt-3 flex items-center gap-2 text-[10px] text-white/25">
          <span>{new Date(fact.fact_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span className="capitalize">{fact.fact_category}</span>
        </div>
      </div>
    </div>
  );
}
