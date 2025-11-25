"use client"

import Link from "next/link"
import { Sun, Brain, Heart, Lightbulb, ChevronDown, Menu, X, Mail, User as UserIcon, LogIn, LogOut } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
// No longer need useRouter
// import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false)
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false)

  const toolsRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)
  const supabase = createClient();
  // const router = useRouter(); // Removed this line

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false)
      }
      if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) {
        setAboutOpen(false)
      }
    }

    if (toolsOpen || aboutOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [toolsOpen, aboutOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false); // Close mobile menu on logout
    // Replace router.refresh() with a standard window reload
    window.location.reload();
  };


  return (
    <nav className="bg-white/70 backdrop-blur-md text-foreground sticky top-0 z-50 border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Icons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-orange-500" />
              <Brain className="w-5 h-5 text-blue-500" />
              <Heart className="w-5 h-5 text-red-500" />
              <Lightbulb className="w-5 h-5 text-yellow-500" />
            </div>
            <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
              Project Profound
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {/* Tools Dropdown */}
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => {
                  setToolsOpen(!toolsOpen)
                  setAboutOpen(false)
                }}
                className="flex items-center gap-1 hover:text-gray-600 transition-colors"
              >
                Tools
                <ChevronDown className={`w-4 h-4 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {toolsOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white text-foreground rounded-lg shadow-lg py-2 z-50">
                  <Link
                    href="/search2"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setToolsOpen(false)}
                  >
                    Search NDE Videos
                  </Link>
                  <Link
                    href="/chat"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setToolsOpen(false)}
                  >
                    NDE Compassionate Chat
                  </Link>
                  <Link
                    href="/chat-2"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setToolsOpen(false)}
                  >
                    NDE Research Chat
                  </Link>
                </div>
              )}
            </div>

            {/* About Dropdown */}
            <div className="relative flex items-center" ref={aboutRef}>
                <Link href="/about" className="hover:text-gray-600 transition-colors">
                    About
                </Link>
                <button
                    onClick={() => {
                    setAboutOpen(!aboutOpen)
                    setToolsOpen(false)
                    }}
                    className="flex items-center gap-1 hover:text-gray-600 transition-colors"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
                </button>
                {aboutOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white text-foreground rounded-lg shadow-lg py-2 z-50">
                    <Link
                        href="/about#projects"
                        className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                        onClick={() => setAboutOpen(false)}
                    >
                        Projects
                    </Link>
                    <Link
                        href="/about#connect"
                        className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                        onClick={() => setAboutOpen(false)}
                    >
                        Connect
                    </Link>
                    <a
                        href="https://blog.projectprofound.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                        onClick={() => setAboutOpen(false)}
                    >
                        Blog
                    </a>
                    <Link
                        href="/experiencers"
                        className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                        onClick={() => setAboutOpen(false)}
                    >
                        For Experiencers
                    </Link>
                    </div>
                )}
            </div>


            <a
              data-formkit-toggle="893453eeff"
              href="https://project-profound.kit.com/893453eeff"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Newsletter
            </a>
            <a
              href="https://www.gofundme.com/f/project-profound"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 transition-colors font-medium"
            >
              Contribute
            </a>
            
            {/* Auth Button */}
            <div className="flex items-center">
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
                      <DropdownMenuContent className="w-56" align="end" forceMount>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleLogout}>
                              Log out
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              ) : (
                  <Button asChild>
                      <Link href="/login">Login</Link>
                  </Button>
              )}
            </div>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm p-0">
              <div className="flex flex-col h-full">
                {/* Header with Close button */}
                <div className="flex items-center justify-between p-4 border-b">
                   <h2 className="text-lg font-semibold">Menu</h2>
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 px-6 py-4 space-y-6 overflow-y-auto">
                   {/* User Profile / Login */}
                   {user ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={user.user_metadata?.avatar_url} />
                                <AvatarFallback><UserIcon /></AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm">{user.user_metadata?.full_name || user.email}</span>
                                <Link href="/dashboard" className="text-xs text-primary hover:underline" onClick={() => setMobileMenuOpen(false)}>View Dashboard</Link>
                            </div>
                        </div>
                         <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                  ) : (
                    <Button asChild className="w-full">
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                            <LogIn className="w-4 h-4 mr-2" />
                            Login / Sign Up
                        </Link>
                    </Button>
                  )}
                  
                  <div className="w-full h-[1px] bg-gray-200" />

                  {/* Tools Section */}
                  <div>
                    <button
                      onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
                      className="flex items-center justify-between w-full text-xl font-semibold mb-4"
                    >
                      Tools
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {mobileToolsOpen && (
                      <div className="space-y-3 pl-4">
                        <Link
                          href="/search2"
                          className="block text-gray-600 hover:text-gray-900"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Search NDE Videos
                        </Link>
                        <Link
                          href="/chat"
                          className="block text-gray-600 hover:text-gray-900"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          NDE Compassionate Chat
                        </Link>
                        <Link
                          href="/chat-2"
                          className="block text-gray-600 hover:text-gray-900"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          NDE Research Chat
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* About Section */}
                  <div>
                    <div className="flex items-center justify-between w-full mb-4">
                      <Link href="/about" className="text-xl font-semibold" onClick={() => setMobileMenuOpen(false)}>
                        About
                      </Link>
                      <button onClick={() => setMobileAboutOpen(!mobileAboutOpen)}>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${mobileAboutOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {mobileAboutOpen && (
                      <div className="space-y-3 pl-4">
                          <Link
                            href="/about#projects"
                            className="block text-gray-900 hover:text-gray-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Projects
                          </Link>
                          <Link
                            href="/about#connect"
                            className="block text-gray-900 hover:text-gray-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Connect
                          </Link>
                          <a
                            href="https://blog.projectprofound.org"
                            className="block text-gray-900 hover:text-gray-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Blog
                          </a>
                          <Link
                            href="/experiencers"
                            className="block text-gray-900 hover:text-gray-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            For Experiencers
                          </Link>
                      </div>
                    )}
                  </div>


                  {/* Newsletter Link */}
                  <a
                    data-formkit-toggle="893453eeff"
                    href="https://project-profound.kit.com/893453eeff"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Mail className="w-5 h-5" />
                    Newsletter
                  </a>

                  {/* Contribute Link */}
                  <a
                    href="https://www.gofundme.com/f/project-profound"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-green-600 hover:text-green-700 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contribute
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
