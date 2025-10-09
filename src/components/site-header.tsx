"use client"

import Link from "next/link"
import { Sun, Brain, Heart, Lightbulb, ChevronDown, Menu, X, Mail } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function SiteHeader() {
  const [aiToolsOpen, setAiToolsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileAiToolsOpen, setMobileAiToolsOpen] = useState(false)
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false)

  const aiToolsRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (aiToolsRef.current && !aiToolsRef.current.contains(event.target as Node)) {
        setAiToolsOpen(false)
      }
      if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) {
        setAboutOpen(false)
      }
    }

    if (aiToolsOpen || aboutOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [aiToolsOpen, aboutOpen])


  return (
    <nav className="bg-white/70 backdrop-blur-md text-foreground sticky top-0 z-50 border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Icons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-400" />
              <Brain className="w-5 h-5 text-purple-400" />
              <Heart className="w-5 h-5 text-pink-400" />
              <Lightbulb className="w-5 h-5 text-amber-400" />
            </div>
            <Link href="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
              Project Profound
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {/* AI Tools Dropdown */}
            <div className="relative" ref={aiToolsRef}>
              <button
                onClick={() => {
                  setAiToolsOpen(!aiToolsOpen)
                  setAboutOpen(false)
                }}
                className="flex items-center gap-1 hover:text-gray-600 transition-colors"
              >
                AI Tools
                <ChevronDown className={`w-4 h-4 transition-transform ${aiToolsOpen ? 'rotate-180' : ''}`} />
              </button>
              {aiToolsOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white text-foreground rounded-lg shadow-lg py-2 z-50">
                  <Link
                    href="/search"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setAiToolsOpen(false)}
                  >
                    Search NDE Videos
                  </Link>
                  <Link
                    href="/chat"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setAiToolsOpen(false)}
                  >
                    NDE Compassionate Chat
                  </Link>
                  <Link
                    href="/chat-2"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setAiToolsOpen(false)}
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
                  setAiToolsOpen(false)
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
                    href="/about#mission"
                    className="block px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setAboutOpen(false)}
                  >
                    Mission
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
                </div>
              )}
            </div>

            <a
              data-formkit-toggle="893453eeff"
              href="https://project-profound.kit.com/893453eeff"
              onClick={(e) => e.preventDefault()}
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
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Close button */}
                <div className="flex justify-end p-4">
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 px-6 py-4 space-y-6">
                  {/* AI Tools Section */}
                  <div>
                    <button
                      onClick={() => setMobileAiToolsOpen(!mobileAiToolsOpen)}
                      className="flex items-center justify-between w-full text-xl font-semibold mb-4"
                    >
                      AI Tools
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${mobileAiToolsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {mobileAiToolsOpen && (
                      <div className="space-y-3 pl-4">
                        <Link
                          href="/search"
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
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500 mb-2 pl-4">About Page Sections</div>
                        <div className="space-y-3 pl-8">
                          <Link
                            href="/about#projects"
                            className="block text-gray-900 hover:text-gray-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Projects
                          </Link>
                          <Link
                            href="/about#mission"
                            className="block text-gray-900 hover:text-gray-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Mission
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
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Newsletter Link */}
                  <a
                    data-formkit-toggle="893453eeff"
                    href="https://project-profound.kit.com/893453eeff"
                    onClick={(e) => {
                      e.preventDefault()
                      setMobileMenuOpen(false)
                    }}
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
