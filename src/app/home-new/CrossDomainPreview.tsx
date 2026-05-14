import type { OverlapHighlight } from "./data";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CrossDomainPreview({ highlights }: { highlights: OverlapHighlight[] }) {
  return (
    <div className="py-16 md:py-20">
      <div className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-violet-500 to-green-500 bg-clip-text text-transparent">
        CROSS-DOMAIN RESEARCH
      </div>
      <h2 
        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mt-2"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
      >
        Where Two Worlds Meet
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mt-2">
        Shared phenomena discovered across Near-Death and UAP contact experiences
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {highlights.map((highlight, index) => {
          let sigClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
          if (highlight.significance >= 90) {
            sigClass = "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700";
          } else if (highlight.significance >= 80) {
            sigClass = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700";
          }

          return (
            <div 
              key={highlight.phenomenon} 
              className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  {highlight.phenomenon}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sigClass}`}>
                  {highlight.significance}% sig.
                </span>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {highlight.description}
              </p>

              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-violet-600 dark:text-violet-400 text-[10px] font-medium">NDE</span>
                  <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">UAP</span>
                </div>
                <div className="flex gap-[1px]">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="consciousness-bar-nde h-full" style={{ width: `${highlight.ndePct}%` }} />
                  </div>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="consciousness-bar-uap h-full" style={{ width: `${highlight.uapPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Link 
        href="/research/cross-domain"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
      >
        View Full Cross-Domain Research
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
