"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  Building2,
  Clock,
  Brain,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Claim {
  claim: string;
  confidence?: string;
  source_type?: string;
  context?: string;
}

interface Person {
  name: string;
  role?: string;
  affiliation?: string;
  context?: string;
}

interface Program {
  name: string;
  type?: string;
  era?: string;
  context?: string;
}

interface TimelineEvent {
  date?: string;
  year?: number;
  event: string;
  significance?: string;
}

interface ConsciousnessConnection {
  type: string;
  description: string;
  strength?: string;
}

export interface KnowledgeData {
  claims: Claim[] | null;
  people_mentioned: Person[] | null;
  programs_mentioned: Program[] | null;
  timeline_events: TimelineEvent[] | null;
  consciousness_connections: ConsciousnessConnection[] | null;
}

interface KnowledgePanelProps {
  data: KnowledgeData;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Safely parse JSONB that might be an array or null */
function safeArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ─── Expandable Section ─────────────────────────────────────────────────────

function KnowledgeSection({
  icon: Icon,
  title,
  count,
  accentBg,
  accentBorder,
  accentIcon,
  children,
  defaultOpen = false,
}: {
  icon: typeof FileText;
  title: string;
  count: number;
  accentBg: string;
  accentBorder: string;
  accentIcon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border ${accentBorder} ${accentBg} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accentIcon}`} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-black/20 text-slate-600 dark:text-slate-400">
            {count}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/40 dark:border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function KnowledgePanel({ data }: KnowledgePanelProps) {
  const claims = safeArray<Claim>(data.claims);
  const people = safeArray<Person>(data.people_mentioned);
  const programs = safeArray<Program>(data.programs_mentioned);
  const timeline = safeArray<TimelineEvent>(data.timeline_events);
  const consciousness = safeArray<ConsciousnessConnection>(data.consciousness_connections);

  const hasAny =
    claims.length > 0 ||
    people.length > 0 ||
    programs.length > 0 ||
    timeline.length > 0 ||
    consciousness.length > 0;

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm p-5">
      <h3
        className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif", letterSpacing: "0.05em" }}
      >
        Knowledge Extraction
      </h3>

      {!hasAny ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
          Knowledge extraction pending. Claims, entities, and timeline data will appear here once this video has been analyzed.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Claims */}
          {claims.length > 0 && (
            <KnowledgeSection
              icon={FileText}
              title="Claims"
              count={claims.length}
              accentBg="bg-amber-50 dark:bg-amber-900/20"
              accentBorder="border-amber-200 dark:border-amber-800"
              accentIcon="text-amber-600 dark:text-amber-400"
              defaultOpen
            >
              <div className="space-y-2 mt-3">
                {claims.map((claim, i) => (
                  <div
                    key={i}
                    className="bg-white/60 dark:bg-white/5 rounded-lg p-3 border border-white/40 dark:border-white/10"
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {claim.claim}
                    </p>
                    {(claim.confidence || claim.source_type) && (
                      <div className="flex gap-2 mt-1.5">
                        {claim.confidence && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300">
                            {claim.confidence}
                          </span>
                        )}
                        {claim.source_type && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {claim.source_type}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </KnowledgeSection>
          )}

          {/* People */}
          {people.length > 0 && (
            <KnowledgeSection
              icon={Users}
              title="People Mentioned"
              count={people.length}
              accentBg="bg-blue-50 dark:bg-blue-900/20"
              accentBorder="border-blue-200 dark:border-blue-800"
              accentIcon="text-blue-600 dark:text-blue-400"
            >
              <div className="grid grid-cols-1 gap-2 mt-3">
                {people.map((person, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 bg-white/60 dark:bg-white/5 rounded-lg p-2.5 border border-white/40 dark:border-white/10"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
                        {person.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {person.name}
                      </p>
                      {person.role && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {person.role}
                          {person.affiliation ? ` · ${person.affiliation}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </KnowledgeSection>
          )}

          {/* Programs */}
          {programs.length > 0 && (
            <KnowledgeSection
              icon={Building2}
              title="Programs & Organizations"
              count={programs.length}
              accentBg="bg-violet-50 dark:bg-violet-900/20"
              accentBorder="border-violet-200 dark:border-violet-800"
              accentIcon="text-violet-600 dark:text-violet-400"
            >
              <div className="space-y-2 mt-3">
                {programs.map((prog, i) => (
                  <div
                    key={i}
                    className="bg-white/60 dark:bg-white/5 rounded-lg p-2.5 border border-white/40 dark:border-white/10"
                  >
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {prog.name}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {prog.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-800/30 text-violet-700 dark:text-violet-300">
                          {prog.type}
                        </span>
                      )}
                      {prog.era && (
                        <span className="text-[10px] text-slate-400">
                          {prog.era}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </KnowledgeSection>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <KnowledgeSection
              icon={Clock}
              title="Timeline"
              count={timeline.length}
              accentBg="bg-green-50 dark:bg-green-900/20"
              accentBorder="border-green-200 dark:border-green-800"
              accentIcon="text-green-600 dark:text-green-400"
            >
              <div className="space-y-2 mt-3">
                {timeline
                  .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
                  .map((event, i) => (
                    <div
                      key={i}
                      className="flex gap-3 bg-white/60 dark:bg-white/5 rounded-lg p-2.5 border border-white/40 dark:border-white/10"
                    >
                      <div className="flex-shrink-0 w-16 text-right">
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                          {event.date || event.year || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {event.event}
                        </p>
                        {event.significance && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {event.significance}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </KnowledgeSection>
          )}

          {/* Consciousness Connections */}
          {consciousness.length > 0 && (
            <KnowledgeSection
              icon={Brain}
              title="Consciousness Connections"
              count={consciousness.length}
              accentBg="bg-indigo-50 dark:bg-indigo-900/20"
              accentBorder="border-indigo-200 dark:border-indigo-800"
              accentIcon="text-indigo-600 dark:text-indigo-400"
            >
              <div className="space-y-2 mt-3">
                {consciousness.map((conn, i) => (
                  <div
                    key={i}
                    className="bg-white/60 dark:bg-white/5 rounded-lg p-2.5 border border-white/40 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                        {conn.type}
                      </span>
                      {conn.strength && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300">
                          {conn.strength}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {conn.description}
                    </p>
                  </div>
                ))}
              </div>
            </KnowledgeSection>
          )}
        </div>
      )}
    </div>
  );
}
