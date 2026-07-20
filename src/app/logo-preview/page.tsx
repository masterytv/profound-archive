"use client"

import Image from "next/image"
import Link from "next/link"
import { Brain, Heart, TrendingUp, ChevronDown, Menu, Mail, Search, Tv, HelpCircle, BookOpen, LayoutGrid, Users } from "lucide-react"

/* ─────────────────────────────────────────────────
 * Logo Reference Page (internal)
 * Shows the current logo assets — wordmarks, emblem,
 * favicon — and how they appear in the header and
 * footer, in both light and dark mode.
 * ───────────────────────────────────────────────── */

function PreviewHeader({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark"
  return (
    <nav
      className={`rounded-xl border shadow-sm ${
        isDark
          ? "bg-slate-900/95 border-slate-700/60 text-white"
          : "bg-white/90 border-slate-200/60 text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ─── New Logo ─── */}
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <Image
              src={isDark ? "/logo-new-light.png" : "/logo-new-dark.png"}
              alt="Project Profound logo"
              width={180}
              height={42}
              className="h-8 w-auto"
              priority
            />
            <span
              className={`self-start mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase leading-none border ${
                isDark
                  ? "bg-slate-700 text-slate-400 border-slate-600/60"
                  : "bg-slate-200/80 text-slate-500 border-slate-300/60"
              }`}
            >
              BETA
            </span>
          </div>

          {/* ─── Simulated Nav Items ─── */}
          <div className="hidden md:flex items-center gap-1">
            <span
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                isDark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Big Questions
            </span>
            <span
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
                isDark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Explore
              <ChevronDown className="w-3.5 h-3.5" />
            </span>
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                isDark
                  ? "text-purple-300 bg-purple-500/15"
                  : "text-purple-700 bg-purple-50/70"
              }`}
            >
              ✦ NDE Compass
            </span>
            <span
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                isDark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              About
            </span>
            <div
              className={`w-px h-5 mx-1 ${
                isDark ? "bg-slate-600" : "bg-slate-200"
              }`}
            />
            <span
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                isDark
                  ? "text-blue-300"
                  : "text-blue-600"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Newsletter
            </span>
            <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50">
              Contribute
            </span>
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                isDark
                  ? "text-blue-300 bg-blue-500/20"
                  : "text-blue-600 bg-blue-50"
              }`}
            >
              Join for Free
            </span>
            <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-slate-900 ml-1.5">
              Login
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}

function PreviewMobileHeader({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark"
  return (
    <nav
      className={`rounded-xl border shadow-sm ${
        isDark
          ? "bg-slate-900/95 border-slate-700/60 text-white"
          : "bg-white/90 border-slate-200/60 text-slate-900"
      }`}
      style={{ maxWidth: 390 }}
    >
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 group cursor-pointer">
            <Image
              src={isDark ? "/logo-new-light.png" : "/logo-new-dark.png"}
              alt="Project Profound logo"
              width={140}
              height={33}
              className="h-7 w-auto"
            />
            <span
              className={`self-start mt-0.5 px-1 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase leading-none border ${
                isDark
                  ? "bg-slate-700 text-slate-400 border-slate-600/60"
                  : "bg-slate-200/80 text-slate-500 border-slate-300/60"
              }`}
            >
              BETA
            </span>
          </div>
          <Menu
            className={`h-6 w-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}
          />
        </div>
      </div>
    </nav>
  )
}

function PreviewMobileSheet({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark"
  return (
    <div
      className={`rounded-xl border shadow-lg overflow-hidden ${
        isDark
          ? "bg-slate-900 border-slate-700/60 text-white"
          : "bg-white border-slate-200/60 text-slate-900"
      }`}
      style={{ maxWidth: 340 }}
    >
      {/* Sheet header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          isDark ? "border-slate-700" : "border-slate-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <Image
            src={isDark ? "/logo-new-light.png" : "/logo-new-dark.png"}
            alt="Project Profound logo"
            width={120}
            height={28}
            className="h-6 w-auto"
          />
          <span
            className={`self-start mt-0.5 px-1 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase leading-none border ${
              isDark
                ? "bg-slate-700 text-slate-400 border-slate-600/60"
                : "bg-slate-200/80 text-slate-500 border-slate-300/60"
            }`}
          >
            BETA
          </span>
        </div>
        <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>✕</span>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Big Questions</div>
        <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Explore</div>
        <div className={`text-sm font-semibold text-purple-600 ${isDark ? "text-purple-300" : ""}`}>✦ NDE Compass</div>
        <div className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>About</div>
      </div>
    </div>
  )
}

function PreviewFooter({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark"
  return (
    <footer
      className={`rounded-xl border shadow-sm ${
        isDark
          ? "bg-slate-900/80 border-slate-700/60"
          : "bg-slate-50 border-slate-200/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand column — new logo */}
          <div>
            <div className="flex items-start gap-2 mb-2">
              <Image
                src={isDark ? "/logo-new-light.png" : "/logo-new-dark.png"}
                alt="Project Profound"
                width={150}
                height={35}
                className="h-7 w-auto"
              />
              <span
                className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase leading-none border ${
                  isDark
                    ? "bg-slate-700 text-slate-400 border-slate-600/60"
                    : "bg-slate-200/80 text-slate-500 border-slate-300/60"
                }`}
              >
                BETA
              </span>
            </div>
            <p
              className={`text-sm leading-relaxed max-w-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Exploring Near-Death Experiences through research, data analysis,
              and compassionate AI.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Quick Links
            </h4>
            <div className="space-y-2 text-sm">
              {["Search NDEs", "Veridical Perception", "Greyson Scale", "Transformation Index", "Blog"].map(
                (t) => (
                  <p
                    key={t}
                    className={`${isDark ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {t}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Community */}
          <div>
            <h4
              className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Community & Research
            </h4>
            <div className="space-y-2 text-sm">
              {["Academic Literature ↗", "Evidence-Based Q&A ↗", "NDERF Archive ↗", "All Resources"].map(
                (t) => (
                  <p
                    key={t}
                    className={`${isDark ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {t}
                  </p>
                )
              )}
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4
              className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Legal & Support
            </h4>
            <div className="space-y-2 text-sm">
              {["Privacy Policy", "Terms of Service", "Contact"].map((t) => (
                <p
                  key={t}
                  className={`${isDark ? "text-slate-300" : "text-slate-600"}`}
                >
                  {t}
                </p>
              ))}
              <p className="text-emerald-600 font-medium">Contribute</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          className={`mt-8 pt-6 border-t flex items-center justify-between ${
            isDark ? "border-slate-700/60" : "border-slate-200/60"
          }`}
        >
          <p className="text-xs text-slate-400">
            © 2026 Project Profound. Dive deep into the experience.
          </p>
          <span className="text-xs text-blue-600 font-medium">
            Manage Newsletter Preferences
          </span>
        </div>
      </div>
    </footer>
  )
}

export default function LogoPreviewPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Page title */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Logo Reference — Internal Only
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          The current Project Profound logo assets, and how they appear in the
          header and footer in light and dark mode.
        </p>
      </div>

      {/* ── SECTION: Desktop Header ─────────────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
          Desktop Header
        </h2>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Light Mode
          </p>
          <PreviewHeader mode="light" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-4">
            Dark Mode
          </p>
          <div className="bg-slate-950 p-4 rounded-2xl">
            <PreviewHeader mode="dark" />
          </div>
        </div>
      </section>

      {/* ── SECTION: Mobile Header ──────────────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
          Mobile Header
        </h2>
        <div className="flex flex-wrap gap-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Light
            </p>
            <PreviewMobileHeader mode="light" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dark
            </p>
            <div className="bg-slate-950 p-4 rounded-2xl">
              <PreviewMobileHeader mode="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: Mobile Slide-out Sheet ─────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
          Mobile Slide-Out Menu
        </h2>
        <div className="flex flex-wrap gap-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Light
            </p>
            <PreviewMobileSheet mode="light" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dark
            </p>
            <div className="bg-slate-950 p-4 rounded-2xl">
              <PreviewMobileSheet mode="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: Footer ─────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
          Footer
        </h2>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Light Mode
          </p>
          <PreviewFooter mode="light" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-4">
            Dark Mode
          </p>
          <div className="bg-slate-950 p-4 rounded-2xl">
            <PreviewFooter mode="dark" />
          </div>
        </div>
      </section>

      {/* ── SECTION: Current logo assets ────────────── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-700">
          Logo Assets — Current
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wordmark, dark variant */}
          <div className="space-y-3 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Wordmark — dark · /logo-new-dark.png · 1024×240
            </p>
            <Image
              src="/logo-new-dark.png"
              alt="Project Profound wordmark, dark variant"
              width={200}
              height={47}
              className="h-9 w-auto"
            />
            <p className="text-xs text-slate-500">Light backgrounds: header/footer light mode, emails.</p>
          </div>
          {/* Wordmark, light variant */}
          <div className="space-y-3 p-6 rounded-xl border border-slate-700 bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Wordmark — light · /logo-new-light.png · 1024×239
            </p>
            <Image
              src="/logo-new-light.png"
              alt="Project Profound wordmark, light variant"
              width={200}
              height={47}
              className="h-9 w-auto"
            />
            <p className="text-xs text-slate-500">Dark backgrounds: header/footer dark mode, OG/social images.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Favicon */}
          <div className="space-y-3 p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Favicon — &quot;O&quot; mark · src/app/icon.png · 100×100
            </p>
            <Image
              src="/icon.png"
              alt="Project Profound favicon"
              width={48}
              height={48}
              className="w-12 h-12"
            />
            <p className="text-xs text-slate-500">Browser tab / app icon, served automatically at /icon.png.</p>
          </div>
        </div>
      </section>

      {/* Notes for reviewer */}
      <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-6 space-y-2">
        <h3 className="font-semibold text-amber-800 dark:text-amber-300">
          Asset Notes
        </h3>
        <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
          <li>
            Wordmarks are 1024×240 (~4.27:1). Always size width/height in that ratio — e.g. 192×45, 200×47.
          </li>
          <li>
            Dark wordmark on light backgrounds, light wordmark on dark backgrounds — the header swaps them with the theme.
          </li>
          <li>
            Email templates use the dark wordmark at 192×45 on the cream (#FDFAF6) background.
          </li>
          <li>
            The original star-in-circle logo (solid and transparent variants) and the white dome emblem were retired in July 2026 and removed from the repo.
          </li>
        </ul>
      </section>
    </div>
  )
}
