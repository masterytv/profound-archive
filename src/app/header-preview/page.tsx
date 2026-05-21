"use client"

import UnifiedSiteHeader from "@/components/unified-site-header"

/* ─────────────────────────────────────────────────
 * Header Preview Page
 * Hides the real SiteHeader and renders the new
 * UnifiedSiteHeader so you can test it live.
 * Visit: /header-preview
 * ───────────────────────────────────────────────── */

export default function HeaderPreviewPage() {
  return (
    <>
      {/* Hide the real site-header rendered by layout.tsx */}
      <style>{`
        body > div > nav:first-of-type { display: none !important; }
      `}</style>

      {/* Render the unified header */}
      <UnifiedSiteHeader />

      {/* Sample page content to see the header in context */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            🧪 Unified Header Preview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            This page renders the new unified header with both NDE and UAP mega menus.
            The real site header is hidden. Nothing on the live site has changed.
          </p>
        </div>

        {/* Visual checklist */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-3">
            <h2 className="font-bold text-slate-900 dark:text-white">Desktop Checklist</h2>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>☐ Logo links to <code>/home-new</code></li>
              <li>☐ &quot;Explore NDE&quot; opens violet mega menu</li>
              <li>☐ NDE menu has 3 columns: Discover, Scores, Research</li>
              <li>☐ &quot;Explore UFO &amp; UAP&quot; opens green mega menu</li>
              <li>☐ UAP menu has 3 columns: Discover, Directory, Research</li>
              <li>☐ About dropdown has Projects, Connect, Blog, For Experiencers</li>
              <li>☐ Theme toggle, Newsletter, Contribute, Join, Login all present</li>
              <li>☐ Only one mega menu open at a time</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-3">
            <h2 className="font-bold text-slate-900 dark:text-white">Mobile Checklist</h2>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>☐ Hamburger menu opens sheet</li>
              <li>☐ &quot;Explore NDE&quot; accordion expands (violet)</li>
              <li>☐ &quot;Explore UFO &amp; UAP&quot; accordion expands (green)</li>
              <li>☐ About accordion expands</li>
              <li>☐ NDE Compass link has special purple styling</li>
              <li>☐ Bottom section: Theme, Newsletter, Contribute</li>
              <li>☐ Login / Sign Up button if not logged in</li>
              <li>☐ All links close the sheet on click</li>
            </ul>
          </div>
        </div>

        {/* Filler content to see scroll behavior */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
            Scroll Test — Header should be sticky
          </h2>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
              <p className="text-slate-500 dark:text-slate-400">
                Sample content block {i + 1} — scroll to verify the header stays fixed at the top.
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
