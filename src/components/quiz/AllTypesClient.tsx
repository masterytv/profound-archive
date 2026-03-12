"use client";

import { useState } from "react";
import Link from "next/link";
import { ARCHETYPES, type Archetype, type ArchetypeId, type Frequency } from "@/lib/quiz/archetypes";
import { Check, ChevronDown } from "lucide-react";

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "daily",   label: "Daily" },
  { id: "3day",    label: "Every 3 days" },
  { id: "weekly",  label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const accentMap: Record<string, string> = {
  blue:    "border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/30",
  purple:  "border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/30",
  amber:   "border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/30",
  emerald: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30",
  sky:     "border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/30",
  rose:    "border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/30",
};
const labelMap: Record<string, string> = {
  blue:    "text-blue-700 dark:text-blue-300",
  purple:  "text-purple-700 dark:text-purple-300",
  amber:   "text-amber-700 dark:text-amber-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  sky:     "text-sky-700 dark:text-sky-300",
  rose:    "text-rose-700 dark:text-rose-300",
};

function ArchetypeCard({ archetype }: { archetype: Archetype }) {
  const [open, setOpen]       = useState(false);
  const [email, setEmail]     = useState("");
  const [freq, setFreq]       = useState<Frequency>("weekly");
  const [submitted, setSubmit]= useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const accent = accentMap[archetype.color] ?? accentMap.blue;
  const label  = labelMap[archetype.color]  ?? labelMap.blue;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, archetype: archetype.id, frequency: freq }),
      });
      if (!res.ok) throw new Error();
      setSubmit(true);
    } catch {
      setError("Couldn't save — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-2xl border px-6 py-6 ${accent} transition-all duration-200`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{archetype.icon}</span>
          <div>
            <h2
              className={`text-xl font-bold ${label}`}
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              {archetype.destinationLabel}
            </h2>
            <p className="text-sm text-muted-foreground italic mt-0.5">
              &ldquo;{archetype.tagline}&rdquo;
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="mt-5 space-y-5">
          <p className="text-[15px] text-foreground leading-relaxed">
            {archetype.description}
          </p>

          {/* Subscribe form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="pt-1 space-y-3 border-t border-black/5 dark:border-white/10">
              <p className="text-sm font-medium text-foreground pt-2">
                Subscribe to {archetype.destinationLabel}
              </p>
              <div className="flex gap-2 flex-wrap">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFreq(f.id)}
                    className={`
                      text-[12px] px-3 py-1.5 rounded-full border transition-all
                      ${freq === f.id
                        ? "border-primary bg-primary/10 text-foreground font-medium"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"}
                    `}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="
                    flex-1 rounded-xl border border-border bg-background px-4 py-2.5
                    text-[14px] text-foreground placeholder:text-muted-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary
                    dark:[color-scheme:dark]
                  "
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-primary text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
                >
                  {loading ? "Saving…" : "Subscribe →"}
                </button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </form>
          ) : (
            <div className="flex items-center gap-2.5 pt-2 border-t border-black/5 dark:border-white/10">
              <Check className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">You&apos;re subscribed to {archetype.destinationLabel}.</p>
                <a href="/unsubscribe" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
                  Unsubscribe any time.
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The 5 active compass destinations in priority display order
const COMPASS_ARCHETYPES: ArchetypeId[] = ["griever", "seeker", "experiencer", "skeptic", "curious"];

export function AllTypesClient() {
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground mb-8">
        Not sure which fits? Read through the five destinations and choose yours.
      </p>

      {COMPASS_ARCHETYPES.map((id) => (
        <ArchetypeCard key={id} archetype={ARCHETYPES[id]} />
      ))}

      {/* 988 anchor */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed pt-2">
        If you&apos;re in a dark place right now, you&apos;re still welcome here.{" "}
        <a href="tel:988" className="underline underline-offset-2 hover:text-foreground transition-colors">
          988 Suicide &amp; Crisis Lifeline — call or text 988
        </a>{" "}
        is available anytime.
      </p>

      <div className="pt-2 text-center">
        <Link
          href="/compass"
          className="text-sm text-primary hover:underline font-medium"
        >
          Take the NDE Compass →
        </Link>
      </div>
    </div>
  );
}
