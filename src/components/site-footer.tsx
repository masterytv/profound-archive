"use client"

import Link from "next/link";
import Image from "next/image";

export default function SiteFooter() {
  const linkClass = "block text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors";

  return (
    <footer className="border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-start gap-2 mb-3">
              <Image
                src="/logo-new-dark.png"
                alt="Project Profound"
                width={150}
                height={35}
                className="h-7 w-auto dark:hidden"
              />
              <Image
                src="/logo-new-light.png"
                alt="Project Profound"
                width={150}
                height={35}
                className="h-7 w-auto hidden dark:block"
              />
              <span className="mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-slate-600/60 leading-none">
                BETA
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              Exploring consciousness through research and data analysis of first-person accounts of profound experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Quick Links
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/nde" className={linkClass}>
                NDE Home
              </Link>
              <Link href="/channels" className={linkClass}>
                NDE Channels
              </Link>
              <Link href="/video-explore" className={linkClass}>
                Browse NDE Videos
              </Link>
              <Link href="/uap" className={linkClass}>
                UFO/UAP Home
              </Link>
              <Link href="/uap/channels" className={linkClass}>
                UFO/UAP Channels
              </Link>
              <Link href="/uap/video-explore" className={linkClass}>
                Browse UFO/UAP Videos
              </Link>
            </div>
          </div>

          {/* Community & Research */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Community &amp; Research
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/research/cross-domain" className={linkClass}>
                Cross-Domain Research
              </Link>
              <Link href="/blog" className={linkClass}>
                NDE Blog
              </Link>
              <Link href="/chat" className={linkClass}>
                NDE Chat
              </Link>
              <Link href="/uap/blog" className={linkClass}>
                UFO/UAP Blog
              </Link>
              <Link href="/uap/chat" className={linkClass}>
                UFO/UAP Chat
              </Link>
              <Link href="/join" className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                Join for Free
              </Link>
            </div>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Legal &amp; Support
            </h4>
            <div className="space-y-2 text-sm">
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              <Link href="/terms" className={linkClass}>
                Terms of Service
              </Link>
              <Link href="/about#connect" className={linkClass}>
                Contact
              </Link>
              <a
                href="https://www.gofundme.com/f/project-profound"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                Contribute
              </a>
              <button
                onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
                className={linkClass}
              >
                Cookie Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Project Profound. Dive deep into the experience.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
            >
              Cookie Settings
            </button>
            <Link
              href="/unsubscribe"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Manage Newsletter Preferences
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
