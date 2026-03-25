import { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Bookmark,
  FolderHeart,
  Users,
  Sparkles,
  Heart,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Join Project Profound — Free Account",
  description:
    "Create a free account to save searches, bookmark video moments, build collections, and join a growing community exploring Near-Death Experiences.",
};

const benefits = [
  {
    icon: Search,
    label: "Save searches",
  },
  {
    icon: Bookmark,
    label: "Save exact moments in videos",
  },
  {
    icon: FolderHeart,
    label: "Create collections",
  },
  {
    icon: Users,
    label: "Be part of a growing community",
  },
] as const;

export default function JoinPage() {
  return (
    <main className="h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-6 hero-gradient">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
        {/* ─── Left: Benefits (2/3) ──────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Badge + heading */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Free</span>
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Join for Free
            </h1>
            <p className="mt-2 text-base text-muted-foreground max-w-md leading-relaxed">
              Unlock tools to explore, save, and organize the world&apos;s
              largest NDE research archive.
            </p>
          </div>

          {/* Benefits list */}
          <ul className="space-y-3">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <li
                  key={b.label}
                  className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-3 transition-all duration-200 hover:shadow-md"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {b.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ─── Right: CTA Card (1/3) ─────────────────────── */}
        <div className="lg:col-span-2 flex justify-center">
          <div className="w-full max-w-xs bg-card rounded-2xl border border-border shadow-lg p-8 text-center space-y-6">
            {/* Join button */}
            <Link
              href="/login?view=sign_up"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              Join
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Secondary links */}
            <div className="space-y-3">
              <Link
                href="/video-explore"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Browse without joining →
              </Link>
              <a
                href="https://www.gofundme.com/f/project-profound"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
              >
                <Heart className="w-3.5 h-3.5" />
                Support by Contributing Here
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
