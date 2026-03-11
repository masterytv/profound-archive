"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

/**
 * Three-way theme toggle: Light / System (Device) / Dark.
 * Uses next-themes's useTheme hook. The `mounted` guard prevents
 * a hydration mismatch — on the server we render a neutral placeholder,
 * on the client we render the real toggle.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Neutral skeleton so server and client HTML match
    return (
      <div className="w-[88px] h-8 rounded-lg bg-slate-100 animate-pulse" />
    )
  }

  return (
    <div
      className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5"
      role="group"
      aria-label="Theme selector"
    >
      <button
        onClick={() => setTheme("light")}
        title="Light mode"
        aria-pressed={theme === "light"}
        className={`flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ${
          theme === "light"
            ? "bg-white dark:bg-slate-600 shadow-sm text-amber-500"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme("system")}
        title="Use device setting"
        aria-pressed={theme === "system"}
        className={`flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ${
          theme === "system"
            ? "bg-white dark:bg-slate-600 shadow-sm text-blue-500"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme("dark")}
        title="Dark mode"
        aria-pressed={theme === "dark"}
        className={`flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ${
          theme === "dark"
            ? "bg-white dark:bg-slate-600 shadow-sm text-indigo-400"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
