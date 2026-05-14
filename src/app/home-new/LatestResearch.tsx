import type { BlogPostPreview } from "./data";
import Link from "next/link";

export function LatestResearch({ posts }: { posts: BlogPostPreview[] }) {
  return (
    <div className="py-16 md:py-20">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
        LATEST RESEARCH
      </div>
      <h2 
        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 mt-2"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
      >
        From the Research Desk
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mt-2">
        Recent articles across both NDE and UAP research domains
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
        {posts.map((post) => {
          const href = post.domain === 'nde' 
            ? `/blog/${post.slug}` 
            : `/uap/blog/${post.slug}`;

          const domainBadgeClass = post.domain === 'nde'
            ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 w-fit"
            : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 w-fit";
            
          const domainBadgeText = post.domain === 'nde' ? "NDE" : "UAP";

          const dateStr = new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <Link 
              key={`${post.domain}-${post.slug}`}
              href={href}
              className="group flex flex-col rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 hover:shadow-md transition-shadow"
            >
              <div className={domainBadgeClass}>
                {domainBadgeText}
              </div>
              <h3 
                className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                {post.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2 flex-1">
                {post.lead_paragraph || "Read more about this research."}
              </p>
              
              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <span>{dateStr}</span>
                {post.read_time_mins && (
                  <span>&middot; {post.read_time_mins} min read</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <Link 
        href="/blog"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        View All Articles
      </Link>
    </div>
  );
}
