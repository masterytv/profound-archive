"use client"

import Link from "next/link"
import Image from "next/image"
import {
  Brain, Heart, TrendingUp, ChevronDown, Menu, X, Mail, Compass, Link2,
  User as UserIcon, Users, LogIn, LogOut, Shield, Search, Tv,
  HelpCircle, BookOpen, LayoutGrid, Radio, BarChart3, Calendar,
  Globe, Building2, MessageCircle, Home,
  Network, Cpu, Waypoints, Orbit, Clock, Layers, FlaskConical,
} from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { getSharedSession } from "@/lib/supabase/session"
import type { User } from "@supabase/supabase-js"
import { useRouter, usePathname } from "next/navigation"
import { NewsletterModal } from "@/components/NewsletterModal"
import type { NewsletterDomain } from "@/components/NewsletterModal"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import logoNewDark from "../../public/logo-new-dark.png"
import logoNewLight from "../../public/logo-new-light.png"

/* ─────────────────────────────────────────────────────────────────────────────
 * UnifiedSiteHeader
 * A single header that always shows BOTH NDE and UAP mega menus, regardless
 * of the current route. No domain branching — both verticals are top-level.
 * ───────────────────────────────────────────────────────────────────────────── */

export default function UnifiedSiteHeader() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const loginHref = mounted ? `/login?returnTo=${encodeURIComponent(pathname)}` : "/login"

  // DEADLOCK RULE: onAuthStateChange callbacks must stay SYNCHRONOUS.
  // auth-js emits events while holding its exclusive navigator lock and
  // AWAITS these callbacks; any awaited supabase call in here needs that
  // same lock for its access token, so the client deadlocks itself —
  // every page spinner hangs and logout silently dies (2026-07-23).
  // The profiles role lookup therefore lives in its own effect below.
  useEffect(() => {
    let cancelled = false
    // Shared single-flight lookup with an 8s stall guard, instead of an
    // unbounded getSession() — a wedged client degrades to signed-out UI.
    getSharedSession().then((session) => {
      if (!cancelled) setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: import("@supabase/supabase-js").Session | null) => {
        setUser(session?.user ?? null)
      },
    )
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Role lookup kept OUT of the auth callback (see deadlock note above).
  useEffect(() => {
    if (!user) {
      setUserRole(null)
      return
    }
    let cancelled = false
    supabase
      .from("profiles").select("role").eq("id", user.id).single()
      .then(({ data: profile }: { data: { role: string | null } | null }) => {
        if (!cancelled) setUserRole(profile?.role ?? null)
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "global" })
    setMobileMenuOpen(false)
    router.push("/login")
  }

  // ── Dropdown state ────────────────────────────────────────────────────────
  const [ndeOpen, setNdeOpen] = useState(false)
  const [uapOpen, setUapOpen] = useState(false)
  const [vizOpen, setVizOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileNdeOpen, setMobileNdeOpen] = useState(false)
  const [mobileUapOpen, setMobileUapOpen] = useState(false)
  const [mobileVizOpen, setMobileVizOpen] = useState(false)
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false)
  const [newsletterOpen, setNewsletterOpen] = useState(false)

  const ndeRef = useRef<HTMLDivElement>(null)
  const uapRef = useRef<HTMLDivElement>(null)
  const vizRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)

  // Auto-detect newsletter domain from current path
  const newsletterDomain: NewsletterDomain = pathname.startsWith("/uap") ? "uap" : "nde"

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ndeRef.current && !ndeRef.current.contains(event.target as Node)) setNdeOpen(false)
      if (uapRef.current && !uapRef.current.contains(event.target as Node)) setUapOpen(false)
      if (vizRef.current && !vizRef.current.contains(event.target as Node)) setVizOpen(false)
      if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) setAboutOpen(false)
    }
    if (ndeOpen || uapOpen || vizOpen || aboutOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [ndeOpen, uapOpen, vizOpen, aboutOpen])

  const closeAll = () => { setNdeOpen(false); setUapOpen(false); setVizOpen(false); setAboutOpen(false) }
  const closeMobile = () => setMobileMenuOpen(false)

  // ── Shared link styling ───────────────────────────────────────────────────
  const megaLink = "flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
  const megaIcon = (color: string) => `w-4 h-4 text-${color}-600 flex-shrink-0`
  const megaTitle = "text-sm font-medium text-slate-800 dark:text-slate-100"
  const megaSub = "text-[11px] text-slate-400"
  const subLink = "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
  const colHeader = "px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
  const navBtn = "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all"

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <nav className="bg-white/80 backdrop-blur-xl text-foreground sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-700/60 dark:bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* ─── Logo ─── */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image src={logoNewDark} alt="Project Profound logo"
                width={180} height={42} className="h-8 w-auto dark:hidden" priority />
              <Image src={logoNewLight} alt="Project Profound logo"
                width={180} height={42} className="h-8 w-auto hidden dark:block" priority />
              <span className="self-start mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-slate-600/60 leading-none">
                BETA
              </span>
            </Link>

            {/* ─── Desktop Nav ─── */}
            <div className="hidden md:flex items-center gap-1">

              {/* ── Explore NDE ── */}
              <div className="relative" ref={ndeRef}>
                <button
                  onClick={() => { setNdeOpen(!ndeOpen); setUapOpen(false); setAboutOpen(false) }}
                  className={navBtn}
                >
                  Explore NDE
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ndeOpen ? "rotate-180" : ""}`} />
                </button>
                {ndeOpen && (
                  <div className="absolute top-full -left-20 mt-1.5 w-[640px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-3 px-2 z-50">
                    <div className="grid grid-cols-3 gap-1">

                      {/* Column 1: Discover */}
                      <div>
                        <p className={colHeader}>Discover</p>
                        <Link href="/nde" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Home className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>NDE Home</div>
                            <div className={megaSub}>Main NDE dashboard</div>
                          </div>
                        </Link>
                        <Link href="/search3" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Search className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Search NDE Transcripts</div>
                            <div className={megaSub}>Full-text NDE search</div>
                          </div>
                        </Link>
                        <Link href="/video-explore" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <LayoutGrid className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Browse NDE Videos</div>
                            <div className={megaSub}>Filter by topic & scores</div>
                          </div>
                        </Link>
                        <div className="pl-7 ml-2 border-l-2 border-violet-100 dark:border-violet-900/40 space-y-0.5">
                          <Link href="/video-explore" className={subLink} onClick={() => setNdeOpen(false)}>
                            <LayoutGrid className="w-3 h-3 text-violet-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Browse All</span>
                          </Link>
                          <Link href="/explore/greyson" className={subLink} onClick={() => setNdeOpen(false)}>
                            <Brain className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">By Experience Depth</span>
                          </Link>
                          <Link href="/explore/veridical" className={subLink} onClick={() => setNdeOpen(false)}>
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">By Evidence Strength</span>
                          </Link>
                          <Link href="/explore/transformation" className={subLink} onClick={() => setNdeOpen(false)}>
                            <Heart className="w-3 h-3 text-rose-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">By Life Impact</span>
                          </Link>
                        </div>
                      </div>

                      {/* Column 2: NDE Directory */}
                      <div className="border-l border-slate-100 dark:border-slate-700 pl-1">
                        <p className={colHeader}>NDE Directory</p>
                        <Link href="/experiencer" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Users className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>By NDE Experiencer</div>
                            <div className={megaSub}>Scored NDE profiles</div>
                          </div>
                        </Link>
                        <Link href="/channels" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Tv className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>By NDE Channel</div>
                            <div className={megaSub}>NDE video channels</div>
                          </div>
                        </Link>
                        <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
                        <p className={colHeader}>NDE Scores</p>
                        <Link href="/explore/greyson" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Brain className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Experience Depth</div>
                            <div className={megaSub}>Greyson NDE Scale</div>
                          </div>
                        </Link>
                        <Link href="/explore/veridical" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Evidence Strength</div>
                            <div className={megaSub}>Veridical Perception</div>
                          </div>
                        </Link>
                        <Link href="/explore/transformation" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Heart className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Life Impact</div>
                            <div className={megaSub}>Transformation Index</div>
                          </div>
                        </Link>
                      </div>

                      {/* Column 3: Research & Featured */}
                      <div className="border-l border-slate-100 dark:border-slate-700 pl-1">
                        <p className={colHeader}>Research</p>
                        <Link href="/compass" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Compass className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>NDE Compass</div>
                            <div className={megaSub}>Guided exploration</div>
                          </div>
                        </Link>
                        <Link href="/questions" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <HelpCircle className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>NDE Questions</div>
                            <div className={megaSub}>Core NDE inquiries</div>
                          </div>
                        </Link>
                        <Link href="/chat" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <MessageCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Compassionate Chat</div>
                            <div className={megaSub}>AI research assistant</div>
                          </div>
                        </Link>
                        <Link href="/blog" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <BookOpen className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>NDE Blog</div>
                            <div className={megaSub}>Articles & insights</div>
                          </div>
                        </Link>
                        <Link href="/research/cross-domain" className={megaLink} onClick={() => setNdeOpen(false)}>
                          <Link2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Cross-Domain</div>
                            <div className={megaSub}>NDE ↔ UAP links</div>
                          </div>
                        </Link>

                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Explore UFO & UAP ── */}
              <div className="relative" ref={uapRef}>
                <button
                  onClick={() => { setUapOpen(!uapOpen); setNdeOpen(false); setAboutOpen(false) }}
                  className={navBtn}
                >
                  Explore UFO &amp; UAP
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${uapOpen ? "rotate-180" : ""}`} />
                </button>
                {uapOpen && (
                  <div className="absolute top-full -left-20 mt-1.5 w-[640px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-3 px-2 z-50">
                    <div className="grid grid-cols-3 gap-1">

                      {/* Column 1: Discover */}
                      <div>
                        <p className={colHeader}>Discover</p>
                        <Link href="/uap" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Home className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>UFO/UAP Home</div>
                            <div className={megaSub}>Main UAP dashboard</div>
                          </div>
                        </Link>
                        <Link href="/uap/search" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Search className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Search UFO/UAP Transcripts</div>
                            <div className={megaSub}>Full-text transcripts</div>
                          </div>
                        </Link>
                        <Link href="/uap/video-explore" className={megaLink} onClick={() => setUapOpen(false)}>
                          <LayoutGrid className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Browse UFO/UAP Videos</div>
                            <div className={megaSub}>Filter by topic & type</div>
                          </div>
                        </Link>
                        <div className="pl-7 ml-2 border-l-2 border-green-100 dark:border-green-900/40 space-y-0.5">
                          <Link href="/uap/video-explore" className={subLink} onClick={() => setUapOpen(false)}>
                            <LayoutGrid className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Browse All</span>
                          </Link>
                          <Link href="/uap/video-explore?tier=1" className={subLink} onClick={() => setUapOpen(false)}>
                            <Radio className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Encounters</span>
                          </Link>
                          <Link href="/uap/video-explore?tier=2" className={subLink} onClick={() => setUapOpen(false)}>
                            <BookOpen className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Research</span>
                          </Link>
                        </div>
                      </div>

                      {/* Column 2: Directory */}
                      <div className="border-l border-slate-100 dark:border-slate-700 pl-1">
                        <p className={colHeader}>UFO/UAP Directory</p>
                        <Link href="/uap/channels" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Tv className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>UFO/UAP Channels</div>
                            <div className={megaSub}>Content creators</div>
                          </div>
                        </Link>
                        <Link href="/uap/experiencer" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Experiencers</div>
                            <div className={megaSub}>Contact profiles</div>
                          </div>
                        </Link>
                        <Link href="/uap/persons" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Globe className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Persons</div>
                            <div className={megaSub}>Key figures</div>
                          </div>
                        </Link>
                        <Link href="/uap/events" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Calendar className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Events</div>
                            <div className={megaSub}>Major milestones</div>
                          </div>
                        </Link>
                        <Link href="/uap/organizations" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Building2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Organizations</div>
                            <div className={megaSub}>Agencies & groups</div>
                          </div>
                        </Link>
                        <Link href="/uap/programs" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Programs</div>
                            <div className={megaSub}>Gov & research projects</div>
                          </div>
                        </Link>
                      </div>

                      {/* Column 3: Research */}
                      <div className="border-l border-slate-100 dark:border-slate-700 pl-1">
                        <p className={colHeader}>Research</p>
                        <Link href="/uap/intelligence" className={megaLink} onClick={() => setUapOpen(false)}>
                          <BarChart3 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>UFO/UAP Intelligence</div>
                            <div className={megaSub}>Analytics & insights</div>
                          </div>
                        </Link>
                        <Link href="/uap/chat" className={megaLink} onClick={() => setUapOpen(false)}>
                          <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>UFO/UAP Research Assistant</div>
                            <div className={megaSub}>AI-powered Q&A</div>
                          </div>
                        </Link>
                        <Link href="/uap/blog" className={megaLink} onClick={() => setUapOpen(false)}>
                          <BookOpen className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>UFO/UAP Blog</div>
                            <div className={megaSub}>Articles & insights</div>
                          </div>
                        </Link>
                        <Link href="/research/cross-domain" className={megaLink} onClick={() => setUapOpen(false)}>
                          <Link2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Cross-Domain</div>
                            <div className={megaSub}>NDE ↔ UAP links</div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Visualize ── */}
              <div className="relative" ref={vizRef}>
                <button
                  onClick={() => { setVizOpen(!vizOpen); setNdeOpen(false); setUapOpen(false); setAboutOpen(false) }}
                  className={navBtn}
                >
                  Visualize
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${vizOpen ? "rotate-180" : ""}`} />
                </button>
                {vizOpen && (
                  <div className="absolute top-full -left-20 mt-1.5 w-[540px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-3 px-2 z-50">
                    {/* Visualizations Home */}
                    <Link href="/visualize" className={`${megaLink} mb-1 bg-gradient-to-r from-purple-50/60 to-blue-50/60 dark:from-purple-900/20 dark:to-blue-900/20`} onClick={() => setVizOpen(false)}>
                      <Layers className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div>
                        <div className={megaTitle}>Visualizations Home</div>
                        <div className={megaSub}>All 3D interactive maps</div>
                      </div>
                    </Link>
                    <div className="mx-2 my-1.5 border-t border-slate-200/60 dark:border-slate-700" />
                    <div className="grid grid-cols-2 gap-1">
                      {/* Column 1: UFO/UAP */}
                      <div>
                        <p className={colHeader}>UFO / UAP</p>
                        <Link href="/visualize/uap-timeline" className={megaLink} onClick={() => setVizOpen(false)}>
                          <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Timeline Helix</div>
                            <div className={megaSub}>350+ years of encounters</div>
                          </div>
                        </Link>
                        <Link href="/visualize/geography" className={megaLink} onClick={() => setVizOpen(false)}>
                          <Globe className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Global Encounter Map</div>
                            <div className={megaSub}>3D globe hotspots</div>
                          </div>
                        </Link>
                        <Link href="/visualize/hynek-space" className={megaLink} onClick={() => setVizOpen(false)}>
                          <Orbit className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Hynek Space</div>
                            <div className={megaSub}>Classification in 3D</div>
                          </div>
                        </Link>
                        <Link href="/visualize/uap-phenomenology" className={megaLink} onClick={() => setVizOpen(false)}>
                          <Waypoints className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Phenomenology Network</div>
                            <div className={megaSub}>Entity & effect co-occurrence</div>
                          </div>
                        </Link>
                      </div>
                      {/* Column 2: UAP continued + NDE */}
                      <div className="border-l border-slate-100 dark:border-slate-700 pl-1">
                        <p className={colHeader}>UFO / UAP</p>
                        <Link href="/visualize/uap-intelligence" className={megaLink} onClick={() => setVizOpen(false)}>
                          <Cpu className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Intelligence Network</div>
                            <div className={megaSub}>People, orgs & programs</div>
                          </div>
                        </Link>
                        <Link href="/visualize/channel-constellation" className={megaLink} onClick={() => setVizOpen(false)}>
                          <Radio className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>Channel Constellation</div>
                            <div className={megaSub}>Channel quality in 3D</div>
                          </div>
                        </Link>
                        <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
                        <p className={colHeader}>NDE</p>
                        <Link href="/visualize/nde-elements" className={megaLink} onClick={() => setVizOpen(false)}>
                          <Network className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <div className={megaTitle}>NDE Element Network</div>
                            <div className={megaSub}>15 core elements linked</div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── About ── */}
              <div className="relative flex items-center" ref={aboutRef}>
                <Link href="/about" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all">
                  About
                </Link>
                <button
                  onClick={() => { setAboutOpen(!aboutOpen); setNdeOpen(false); setUapOpen(false) }}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors -ml-1"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aboutOpen ? "rotate-180" : ""}`} />
                </button>
                {aboutOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-2 z-50">
                    <Link href="/about#projects" className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setAboutOpen(false)}>
                      Project
                    </Link>
                    <Link href="/about#connect" className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setAboutOpen(false)}>
                      Connect
                    </Link>
                    <div className="mx-3 my-1.5 border-t border-slate-200/60 dark:border-slate-700" />
                    <p className="px-4 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Research</p>
                    <Link href="/research/methodology" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setAboutOpen(false)}>
                      <FlaskConical className="w-3.5 h-3.5 text-violet-500" /> Methodology
                    </Link>
                    <Link href="/research/cross-domain" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setAboutOpen(false)}>
                      <Link2 className="w-3.5 h-3.5 text-violet-500" /> Cross-Domain
                    </Link>
                  </div>
                )}
              </div>

              {/* ── Divider ── */}
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />

              {/* ── Theme Toggle ── */}
              <ThemeToggle />

              {/* ── Newsletter ── */}
              <button
                onClick={() => setNewsletterOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-50/60 dark:hover:bg-blue-500/20 transition-all"
              >
                <Mail className="w-3.5 h-3.5" />
                Newsletter
              </button>

              {/* ── Contribute ── */}
              <a
                href="https://www.gofundme.com/f/project-profound"
                target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-all"
              >
                Contribute
              </a>

              {/* ── Auth ── */}
              <div className="flex items-center ml-1">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                          <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || user.email}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild><Link href="/dashboard">Dashboard</Link></DropdownMenuItem>
                      <DropdownMenuItem asChild><Link href="/profile">Profile</Link></DropdownMenuItem>
                      {(userRole === "admin" || userRole === "super_admin") && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Link href="/join" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-all">
                      Join for Free
                    </Link>
                    <Button asChild size="sm" className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white ml-1.5">
                      <Link href={loginHref}>Login</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ─── Mobile Menu ─── */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-sm p-0">
                <div className="flex flex-col h-full">

                  {/* Sheet Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Image src={logoNewDark} alt="Project Profound logo"
                        width={140} height={33} className="h-7 w-auto dark:hidden" />
                      <Image src={logoNewLight} alt="Project Profound logo"
                        width={140} height={33} className="h-7 w-auto hidden dark:block" />
                      <span className="self-start mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-slate-600/60 leading-none">
                        BETA
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeMobile}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Menu Items */}
                  <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">

                    {/* User Section */}
                    {user ? (
                      <div className="flex flex-col gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.user_metadata?.avatar_url} />
                            <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">{user.user_metadata?.full_name || user.email}</span>
                            <Link href="/dashboard" className="text-xs text-blue-600 hover:underline" onClick={closeMobile}>View Dashboard</Link>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-lg">
                          <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                      </div>
                    ) : (
                      <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                        <Button asChild className="w-full rounded-lg bg-slate-900 hover:bg-slate-800">
                          <Link href={loginHref} onClick={closeMobile}>
                            <LogIn className="w-4 h-4 mr-2" /> Login / Sign Up
                          </Link>
                        </Button>
                      </div>
                    )}

                    {/* ── Explore NDE (accordion) ── */}
                    <div>
                      <button
                        onClick={() => setMobileNdeOpen(!mobileNdeOpen)}
                        className="flex items-center justify-between w-full text-base font-semibold text-slate-900 dark:text-white mb-3"
                      >
                        <span className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-violet-600" />
                          Explore NDE
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${mobileNdeOpen ? "rotate-180" : ""}`} />
                      </button>
                      {mobileNdeOpen && (
                        <div className="space-y-1 pl-1">
                          <Link href="/nde" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Home className="w-4 h-4 text-violet-600" /> NDE Home
                          </Link>
                          <Link href="/search3" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Search className="w-4 h-4 text-violet-600" /> Search NDE Transcripts
                          </Link>
                          <Link href="/video-explore" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <LayoutGrid className="w-4 h-4 text-violet-600" /> Browse NDE Videos
                          </Link>
                          <div className="pl-6 border-l-2 border-violet-200 dark:border-violet-900/40 ml-2 space-y-0.5">
                            <Link href="/video-explore" className="flex items-center gap-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                              <LayoutGrid className="w-3.5 h-3.5 text-violet-500" /> Browse All
                            </Link>
                            <Link href="/explore/greyson" className="flex items-center gap-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                              <Brain className="w-3.5 h-3.5 text-blue-500" /> By Experience Depth
                            </Link>
                            <Link href="/explore/veridical" className="flex items-center gap-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> By Evidence Strength
                            </Link>
                            <Link href="/explore/transformation" className="flex items-center gap-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                              <Heart className="w-3.5 h-3.5 text-rose-500" /> By Life Impact
                            </Link>
                          </div>
                          <Link href="/experiencer" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Users className="w-4 h-4 text-violet-600" /> By NDE Experiencer
                          </Link>
                          <Link href="/channels" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Tv className="w-4 h-4 text-violet-600" /> By NDE Channel
                          </Link>
                          {/* Divider */}
                          <div className="mx-1 my-1 border-t border-dashed border-slate-200 dark:border-white/10" />
                          <Link href="/compass" className="flex items-center gap-3 py-2.5 text-purple-700 dark:text-purple-300 font-semibold hover:text-purple-900 dark:hover:text-purple-200 transition-colors" onClick={closeMobile}>
                            <Compass className="w-4 h-4 text-purple-600" /> NDE Compass
                          </Link>
                          <Link href="/questions" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <HelpCircle className="w-4 h-4 text-violet-600" /> NDE Questions
                          </Link>
                          <Link href="/chat" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <MessageCircle className="w-4 h-4 text-blue-600" /> Compassionate Chat
                          </Link>
                          <Link href="/blog" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <BookOpen className="w-4 h-4 text-amber-600" /> NDE Blog
                          </Link>
                          <Link href="/research/cross-domain" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Link2 className="w-4 h-4 text-violet-600" /> Cross-Domain
                          </Link>

                        </div>
                      )}
                    </div>

                    {/* ── Explore UFO & UAP (accordion) ── */}
                    <div>
                      <button
                        onClick={() => setMobileUapOpen(!mobileUapOpen)}
                        className="flex items-center justify-between w-full text-base font-semibold text-slate-900 dark:text-white mb-3"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-green-600" />
                          Explore UFO &amp; UAP
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${mobileUapOpen ? "rotate-180" : ""}`} />
                      </button>
                      {mobileUapOpen && (
                        <div className="space-y-1 pl-1">
                          <Link href="/uap" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Home className="w-4 h-4 text-green-600" /> UFO/UAP Home
                          </Link>
                          <Link href="/uap/search" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Search className="w-4 h-4 text-green-600" /> Search UFO/UAP Transcripts
                          </Link>
                          <Link href="/uap/video-explore" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <LayoutGrid className="w-4 h-4 text-green-600" /> Browse UFO/UAP Videos
                          </Link>
                          <div className="pl-6 border-l-2 border-green-200 dark:border-green-900/40 ml-2 space-y-0.5">
                            <Link href="/uap/video-explore" className="flex items-center gap-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                              <LayoutGrid className="w-3.5 h-3.5 text-green-500" /> Browse All
                            </Link>
                            <Link href="/uap/video-explore?tier=1" className="flex items-center gap-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                              <Radio className="w-3.5 h-3.5 text-emerald-500" /> Encounters
                            </Link>
                            <Link href="/uap/video-explore?tier=2" className="flex items-center gap-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                              <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Research
                            </Link>
                          </div>
                          <Link href="/uap/channels" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Tv className="w-4 h-4 text-green-600" /> UFO/UAP Channels
                          </Link>
                          {/* Entity directories divider */}
                          <div className="mx-1 my-1 border-t border-dashed border-slate-200 dark:border-white/10" />
                          <Link href="/uap/experiencer" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Users className="w-4 h-4 text-green-600" /> Experiencers
                          </Link>
                          <Link href="/uap/persons" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Globe className="w-4 h-4 text-green-600" /> Persons of Interest
                          </Link>
                          <Link href="/uap/events" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Calendar className="w-4 h-4 text-green-600" /> Events
                          </Link>
                          <Link href="/uap/organizations" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Building2 className="w-4 h-4 text-green-600" /> Organizations
                          </Link>
                          <Link href="/uap/programs" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Shield className="w-4 h-4 text-green-600" /> Programs
                          </Link>
                          {/* Research divider */}
                          <div className="mx-1 my-1 border-t border-dashed border-slate-200 dark:border-white/10" />
                          <Link href="/uap/intelligence" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <BarChart3 className="w-4 h-4 text-green-600" /> UFO/UAP Intelligence
                          </Link>
                          <Link href="/uap/chat" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <MessageCircle className="w-4 h-4 text-green-600" /> UFO/UAP Research Assistant
                          </Link>
                          <Link href="/uap/blog" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <BookOpen className="w-4 h-4 text-amber-600" /> UFO/UAP Blog
                          </Link>
                          <Link href="/research/cross-domain" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Link2 className="w-4 h-4 text-violet-600" /> Cross-Domain
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* ── Visualize (accordion) ── */}
                    <div>
                      <button
                        onClick={() => setMobileVizOpen(!mobileVizOpen)}
                        className="flex items-center justify-between w-full text-base font-semibold text-slate-900 dark:text-white mb-3"
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-600" />
                          Visualize
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${mobileVizOpen ? "rotate-180" : ""}`} />
                      </button>
                      {mobileVizOpen && (
                        <div className="space-y-1 pl-1">
                          <Link href="/visualize" className="flex items-center gap-3 py-2.5 text-purple-700 dark:text-purple-300 font-semibold hover:text-purple-900 dark:hover:text-purple-200 transition-colors" onClick={closeMobile}>
                            <Layers className="w-4 h-4 text-purple-600" /> Visualizations Home
                          </Link>
                          <div className="mx-1 my-1 border-t border-dashed border-slate-200 dark:border-white/10" />
                          <Link href="/visualize/uap-timeline" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Clock className="w-4 h-4 text-green-600" /> Timeline Helix
                          </Link>
                          <Link href="/visualize/geography" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Globe className="w-4 h-4 text-green-600" /> Global Encounter Map
                          </Link>
                          <Link href="/visualize/hynek-space" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Orbit className="w-4 h-4 text-green-600" /> Hynek Space
                          </Link>
                          <Link href="/visualize/uap-phenomenology" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Waypoints className="w-4 h-4 text-green-600" /> Phenomenology Network
                          </Link>
                          <Link href="/visualize/uap-intelligence" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Cpu className="w-4 h-4 text-green-600" /> Intelligence Network
                          </Link>
                          <Link href="/visualize/channel-constellation" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Radio className="w-4 h-4 text-green-600" /> Channel Constellation
                          </Link>
                          <div className="mx-1 my-1 border-t border-dashed border-slate-200 dark:border-white/10" />
                          <Link href="/visualize/nde-elements" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Network className="w-4 h-4 text-blue-600" /> NDE Element Network
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* ── About (accordion) ── */}
                    <div>
                      <div className="flex items-center justify-between w-full mb-3">
                        <Link href="/about" className="text-base font-semibold text-slate-900 dark:text-white" onClick={closeMobile}>
                          About
                        </Link>
                        <button onClick={() => setMobileAboutOpen(!mobileAboutOpen)}>
                          <ChevronDown className={`w-4 h-4 transition-transform ${mobileAboutOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                      {mobileAboutOpen && (
                        <div className="space-y-1 pl-4">
                          <Link href="/about#projects" className="block py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            Project
                          </Link>
                          <Link href="/about#connect" className="block py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            Connect
                          </Link>
                          <div className="mx-1 my-1 border-t border-dashed border-slate-200 dark:border-white/10" />
                          <p className="pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Research</p>
                          <Link href="/research/methodology" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <FlaskConical className="w-4 h-4 text-violet-600" /> Methodology
                          </Link>
                          <Link href="/research/cross-domain" className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" onClick={closeMobile}>
                            <Link2 className="w-4 h-4 text-violet-600" /> Cross-Domain
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* ── Bottom Section ── */}
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
                      {/* Theme Toggle */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Theme</span>
                        <ThemeToggle />
                      </div>

                      {/* Newsletter */}
                      <button
                        onClick={() => { setNewsletterOpen(true); closeMobile() }}
                        className="flex items-center gap-2.5 font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200"
                      >
                        <Mail className="w-4 h-4" /> Newsletter
                      </button>

                      {/* Contribute */}
                      <a
                        href="https://www.gofundme.com/f/project-profound"
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-colors"
                        onClick={closeMobile}
                      >
                        Contribute
                      </a>

                      {/* Join for Free (if not logged in) */}
                      {!user && (
                        <Link
                          href="/join"
                          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors"
                          onClick={closeMobile}
                        >
                          Join for Free
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      {newsletterOpen && <NewsletterModal onClose={() => setNewsletterOpen(false)} domain={newsletterDomain} />}
    </>
  )
}
