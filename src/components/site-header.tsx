"use client"

import Link from "next/link"
import Image from "next/image"
import { Brain, Sparkles, TrendingUp, ChevronDown, Menu, X, Mail, User as UserIcon, LogIn, LogOut, Shield, Search, Tv, HelpCircle } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { NewsletterModal } from "@/components/NewsletterModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false)
  const [newsletterOpen, setNewsletterOpen] = useState(false)
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false)
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false)

  const exploreRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)
  // Stable singleton: creating a new client on every render causes GoTrueClient to
  // fight over the same navigator.lock in dev Strict Mode, producing AbortErrors.
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    // Fetch initial session and role
    async function fetchUserAndRole() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role ?? null);
      }
    }
    fetchUserAndRole();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: import('@supabase/supabase-js').Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role ?? null);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // supabase is stable (useMemo) — empty dep array is correct here


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setExploreOpen(false)
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false)
      }
      if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) {
        setAboutOpen(false)
      }
    }

    if (exploreOpen || toolsOpen || aboutOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [exploreOpen, toolsOpen, aboutOpen])

  const handleLogout = async () => {
    // scope: 'global' invalidates the token on Supabase's servers, preventing
    // middleware from re-hydrating the session from a stale cookie on next request.
    await supabase.auth.signOut({ scope: 'global' });
    setMobileMenuOpen(false);
    router.push('/login');
  };

  const closeAll = () => {
    setExploreOpen(false)
    setToolsOpen(false)
    setAboutOpen(false)
  }


  return (
    <>
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-foreground sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ─── Logo ─── */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo-transparent.png"
              alt="Project Profound logo"
              width={36}
              height={36}
              className="w-9 h-9"
              priority
            />
            <span
              className="text-xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Project Profound
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Big Questions — direct top-level link */}
            <Link
              href="/questions"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all"
            >
              Big Questions
            </Link>

            {/* Browse Dropdown */}
            <div className="relative" ref={exploreRef}>
              <button
                onClick={() => {
                  setExploreOpen(!exploreOpen)
                  setToolsOpen(false)
                  setAboutOpen(false)
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all"
              >
                Browse
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exploreOpen ? 'rotate-180' : ''}`} />
              </button>
              {exploreOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-2 z-50">
                  <Link
                    href="/channels"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setExploreOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center">
                      <Tv className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">By Channel</div>
                      <div className="text-xs text-slate-400">Browse by NDE video channel</div>
                    </div>
                  </Link>
                  <Link
                    href="/explore/veridical"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setExploreOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">By Evidence Strength</div>
                      <div className="text-xs text-slate-400">Veridical out-of-body accounts</div>
                    </div>
                  </Link>
                  <Link
                    href="/explore/greyson"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setExploreOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">By Experience Depth</div>
                      <div className="text-xs text-slate-400">Greyson scale NDE depth</div>
                    </div>
                  </Link>
                  <Link
                    href="/explore/transformation"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setExploreOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">By Life Impact</div>
                      <div className="text-xs text-slate-400">Transformation index scores</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Search Link */}
            <Link
              href="/search3"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </Link>

            {/* Quiz Link — admin only during soft launch */}
            {(userRole === 'admin' || userRole === 'super_admin') && (
              <Link
                href="/quiz"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-500/15 hover:bg-purple-100/80 dark:hover:bg-purple-500/25 transition-all"
              >
                ✦ What's Your NDE Type?
              </Link>
            )}

            {/* Chat Dropdown */}
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => {
                  setToolsOpen(!toolsOpen)
                  setExploreOpen(false)
                  setAboutOpen(false)
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all"
              >
                Chat
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {toolsOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-2 z-50">
                  <Link
                    href="/chat-compassionate"
                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setToolsOpen(false)}
                  >
                    Compassionate Chat
                  </Link>
                  <Link
                    href="/chat-2"
                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setToolsOpen(false)}
                  >
                    Research Chat
                  </Link>
                </div>
              )}
            </div>

            {/* About Dropdown */}
            <div className="relative flex items-center" ref={aboutRef}>
              <Link
                href="/about"
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all"
              >
                About
              </Link>
              <button
                onClick={() => {
                  setAboutOpen(!aboutOpen)
                  setExploreOpen(false)
                  setToolsOpen(false)
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors -ml-1"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
              </button>
              {aboutOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 py-2 z-50">
                  <Link
                    href="/about#projects"
                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setAboutOpen(false)}
                  >
                    Projects
                  </Link>
                  <Link
                    href="/about#connect"
                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setAboutOpen(false)}
                  >
                    Connect
                  </Link>
                  <a
                    href="https://blog.projectprofound.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setAboutOpen(false)}
                  >
                    Blog
                  </a>
                  <Link
                    href="/experiencers"
                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setAboutOpen(false)}
                  >
                    For Experiencers
                  </Link>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Newsletter */}
            <button
              onClick={() => setNewsletterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-50/60 dark:hover:bg-blue-500/20 transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              Newsletter
            </button>

            {/* Contribute */}
            <a
              href="https://www.gofundme.com/f/project-profound"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-all"
            >
              Contribute
            </a>

            {/* Auth Button */}
            <div className="flex items-center ml-1">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                        <AvatarFallback>
                          <UserIcon className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || user.email}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white">
                  <Link href="/login">Login</Link>
                </Button>
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
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Image
                      src="/logo-transparent.png"
                      alt="Project Profound logo"
                      width={32}
                      height={32}
                      className="w-8 h-8"
                    />
                    <span
                      className="text-lg font-bold text-slate-900 dark:text-white"
                      style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
                    >
                      Project Profound
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
                  {/* User Profile / Login */}
                  {user ? (
                    <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">{user.user_metadata?.full_name || user.email}</span>
                          <Link href="/dashboard" className="text-xs text-blue-600 hover:underline" onClick={() => setMobileMenuOpen(false)}>View Dashboard</Link>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-lg">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="pb-4 border-b border-slate-100">
                      <Button asChild className="w-full rounded-lg bg-slate-900 hover:bg-slate-800">
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                          <LogIn className="w-4 h-4 mr-2" />
                          Login / Sign Up
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Big Questions — direct link */}
                  <Link
                    href="/questions"
                    className="flex items-center gap-3 text-base font-semibold text-slate-900 dark:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HelpCircle className="w-4 h-4 text-violet-600" />
                    Big Questions
                  </Link>

                  {/* Browse Section */}
                  <div>
                    <button
                      onClick={() => setMobileExploreOpen(!mobileExploreOpen)}
                      className="flex items-center justify-between w-full text-base font-semibold text-slate-900 dark:text-white mb-3"
                    >
                      Browse
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${mobileExploreOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {mobileExploreOpen && (
                      <div className="space-y-1 pl-1">
                        <Link
                          href="/channels"
                          className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Tv className="w-4 h-4 text-indigo-600" />
                          By Channel
                        </Link>
                        <Link
                          href="/explore/veridical"
                          className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          By Evidence Strength
                        </Link>
                        <Link
                          href="/explore/greyson"
                          className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Brain className="w-4 h-4 text-blue-600" />
                          By Experience Depth
                        </Link>
                        <Link
                          href="/explore/transformation"
                          className="flex items-center gap-3 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Sparkles className="w-4 h-4 text-rose-600" />
                          By Life Impact
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <Link
                    href="/search3"
                    className="flex items-center gap-3 text-base font-semibold text-slate-900 dark:text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Search className="w-4 h-4 text-slate-500" />
                    Search
                  </Link>

                  {/* Quiz — admin only during soft launch */}
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <Link
                      href="/quiz"
                      className="flex items-center gap-3 text-base font-semibold text-purple-700 dark:text-purple-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-base">✦</span>
                      What's Your NDE Type?
                    </Link>
                  )}

                  {/* Chat Section */}
                  <div>
                    <button
                      onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
                      className="flex items-center justify-between w-full text-base font-semibold text-slate-900 mb-3"
                    >
                      Chat
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {mobileToolsOpen && (
                      <div className="space-y-1 pl-4">
                        <Link
                          href="/chat-compassionate"
                          className="block py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Compassionate Chat
                        </Link>
                        <Link
                          href="/chat-2"
                          className="block py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Research Chat
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* About Section */}
                  <div>
                    <div className="flex items-center justify-between w-full mb-3">
                      <Link href="/about" className="text-base font-semibold text-slate-900" onClick={() => setMobileMenuOpen(false)}>
                        About
                      </Link>
                      <button onClick={() => setMobileAboutOpen(!mobileAboutOpen)}>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${mobileAboutOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {mobileAboutOpen && (
                      <div className="space-y-1 pl-4">
                        <Link
                          href="/about#projects"
                          className="block py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Projects
                        </Link>
                        <Link
                          href="/about#connect"
                          className="block py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Connect
                        </Link>
                        <a
                          href="https://blog.projectprofound.org"
                          className="block py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Blog
                        </a>
                        <Link
                          href="/experiencers"
                          className="block py-2.5 text-slate-600 hover:text-slate-900 transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          For Experiencers
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
                    {/* Theme Toggle */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Theme</span>
                      <ThemeToggle />
                    </div>

                    {/* Newsletter */}
                    <button
                      onClick={() => { setNewsletterOpen(true); setMobileMenuOpen(false); }}
                      className="flex items-center gap-2.5 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      Newsletter
                    </button>

                    {/* Contribute */}
                    <a
                      href="https://www.gofundme.com/f/project-profound"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Contribute
                    </a>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
    {newsletterOpen && <NewsletterModal onClose={() => setNewsletterOpen(false)} />}
  </>
  )
}
