"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  FileText,
  Building,
  MapPin,
  Cpu,
  Brain,
  Scale,
  Lock,
} from "lucide-react";
import type {
  UapProgramIntelResult,
  PersonMention,
  OrganizationMention,
  ProgramMention,
  LocationMention,
  TechnologyMention,
  PsiConsciousnessMention,
  SecrecyMechanism,
  ClaimExtraction,
  LegislativeEvent,
} from "@/lib/ai/uap-program-intel";
import { TimestampLink } from "@/components/video/TimestampLink";
import { formatTimestamp } from "@/lib/ai/format-timestamped-transcript";

// ─── Display Helper ─────────────────────────────────────────────────────────
function cleanText(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/_/g, " ");
}

// ─── Collapsible Section ────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  id,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="border border-slate-100 dark:border-white/10 rounded-xl overflow-hidden scroll-mt-24">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-green-500" />}
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {title}
          </h4>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

// ─── Domain Sub-Components ──────────────────────────────────────────────────

function EmptySectionMessage() {
  return (
    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
      The analysis found no relevant content for this section.
    </div>
  );
}

function PersonsSection({ persons }: { persons: PersonMention[] }) {
  if (!persons || persons.length === 0) return <EmptySectionMessage />;

  return (
    <div className="space-y-3">
      {persons.map((person, i) => (
        <div key={i} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            {/* Avatar Circle */}
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase">
                {person.name.charAt(0)}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {person.name}
                </h5>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 capitalize">
                    {cleanText(person.role)}
                  </span>
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize",
                    person.stance === 'pro_disclosure' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" :
                    person.stance === 'anti_disclosure' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" :
                    "bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  )}>
                    {cleanText(person.stance)}
                  </span>
                </div>
              </div>
              
              {person.affiliation && person.affiliation.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {person.affiliation.map((aff, idx) => (
                    <span key={idx} className="text-[10px] text-blue-600 dark:text-blue-400">
                      {idx > 0 && " • "}{cleanText(aff)}
                    </span>
                  ))}
                </div>
              )}

              {person.credibility_indicators && person.credibility_indicators.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {person.credibility_indicators.map((ind, idx) => (
                    <span key={idx} className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                      🛡️ {cleanText(ind)}
                    </span>
                  ))}
                </div>
              )}

              {person.quote && (
                <div className="flex items-start gap-1.5 mt-2">
                  <p className="text-[11px] italic text-blue-700 dark:text-blue-300 border-l-2 border-blue-300 dark:border-blue-600 pl-2">
                    &ldquo;{cleanText(person.quote)}&rdquo;
                  </p>
                  {person.quote_timestamp_seconds != null && (
                    <TimestampLink
                      seconds={person.quote_timestamp_seconds}
                      label={`[${formatTimestamp(person.quote_timestamp_seconds)}]`}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgramsSection({ programs }: { programs: ProgramMention[] }) {
  if (!programs || programs.length === 0) return <EmptySectionMessage />;

  return (
    <div className="space-y-2">
      {programs.map((program, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-violet-400 dark:bg-violet-600 shrink-0 mt-1" />
            {i < programs.length - 1 && (
              <div className="w-px flex-1 bg-violet-200 dark:bg-violet-800/50 mt-1" />
            )}
          </div>
          <div className="pb-3 min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                {program.name}
              </span>
              <span className="text-[10px] text-violet-500 dark:text-violet-400">
                {cleanText(program.era)} {program.start_date ? `(${program.start_date}${program.end_date ? ` to ${program.end_date}` : ''})` : ''}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ml-auto",
                program.status === 'confirmed' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" :
                program.status === 'debunked' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" :
                "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              )}>
                {program.status}
              </span>
            </div>
            {program.managing_org && (
              <p className="text-[11px] font-medium text-violet-600 dark:text-violet-300 mt-0.5">
                Managed by: {cleanText(program.managing_org)}
              </p>
            )}
            <p className="text-xs text-violet-700 dark:text-violet-300 mt-1 leading-relaxed">
              {cleanText(program.purpose)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaimsSection({ claims }: { claims: ClaimExtraction[] }) {
  if (!claims || claims.length === 0) return <EmptySectionMessage />;

  return (
    <div className="space-y-3">
      {claims.map((claim, i) => (
        <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 capitalize">
                {cleanText(claim.category)}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 capitalize">
                {cleanText(claim.specificity)}
              </span>
              {claim.under_oath && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                  ⚖️ Under Oath
                </span>
              )}
            </div>
            {claim.corroboration_mentioned && claim.corroboration_mentioned.length > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 shrink-0">
                +{claim.corroboration_mentioned.length} Corroborators
              </span>
            )}
          </div>
          
          <div className="flex items-start gap-1.5">
            <p className="text-xs text-amber-900 dark:text-amber-100 font-medium mb-1">
              {cleanText(claim.claim_text)}
            </p>
            {claim.timestamp_seconds != null && (
              <TimestampLink
                seconds={claim.timestamp_seconds}
                label={`[${formatTimestamp(claim.timestamp_seconds)}]`}
              />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-amber-700 dark:text-amber-400 mt-2">
            <span className="font-semibold">Source: {cleanText(claim.source_person)}</span>
            {(claim.event_date || claim.date_of_claim) && (
              <span className="opacity-75">
                • {claim.event_date && `Event: ${claim.event_date}`}
                {claim.event_date && claim.date_of_claim && ` | `}
                {claim.date_of_claim && `Claimed: ${claim.date_of_claim}`}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrganizationsSection({ orgs }: { orgs: OrganizationMention[] }) {
  if (!orgs || orgs.length === 0) return <EmptySectionMessage />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {orgs.map((org, i) => (
        <div key={i} className="bg-slate-100 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
          <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {org.name}
          </h5>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-slate-200 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 capitalize">
              {cleanText(org.type)}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-slate-200 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 capitalize">
              {cleanText(org.sector)}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {cleanText(org.alleged_role)}
          </p>
          {(org.connected_persons.length > 0 || org.connected_programs.length > 0) && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
              {[...org.connected_persons, ...org.connected_programs].slice(0, 3).map((conn, idx) => (
                <span key={idx} className="text-[9px] text-slate-500 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/30 px-1.5 py-0.5 rounded">
                  {cleanText(conn)}
                </span>
              ))}
              {org.connected_persons.length + org.connected_programs.length > 3 && (
                <span className="text-[9px] text-slate-500 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/30 px-1.5 py-0.5 rounded">
                  +{org.connected_persons.length + org.connected_programs.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LocationsSection({ locations }: { locations: LocationMention[] }) {
  if (!locations || locations.length === 0) return <EmptySectionMessage />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {locations.map((loc, i) => (
        <div key={i} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h5 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {loc.name}
            </h5>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 capitalize shrink-0">
              {cleanText(loc.type)}
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mb-2">
            {cleanText(loc.country)}
          </p>
          {loc.alleged_activity && loc.alleged_activity.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {loc.alleged_activity.map((act, idx) => (
                <span key={idx} className="text-[10px] text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-800/30 px-1.5 py-0.5 rounded">
                  {cleanText(act)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TechnologySection({ technologies }: { technologies: TechnologyMention[] }) {
  if (!technologies || technologies.length === 0) return <EmptySectionMessage />;

  return (
    <div className="space-y-3">
      {technologies.map((tech, i) => (
        <div key={i} className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800">
          <div className="flex justify-between items-start gap-2 mb-2">
            <h5 className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
              {tech.name}
            </h5>
            <div className="flex flex-wrap gap-1.5 justify-end">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-cyan-100 dark:bg-cyan-800/50 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700 capitalize">
                {cleanText(tech.category)}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-cyan-100 dark:bg-cyan-800/50 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700 capitalize">
                {cleanText(tech.evidence_type)}
              </span>
            </div>
          </div>
          <p className="text-xs text-cyan-800 dark:text-cyan-200 mb-2">
            {cleanText(tech.description)}
          </p>
          <div className="text-[10px] text-cyan-700 dark:text-cyan-400">
            <span className="font-medium">Source:</span> {cleanText(tech.source_attribution)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PsiSection({ psi }: { psi: PsiConsciousnessMention[] }) {
  if (!psi || psi.length === 0) return <EmptySectionMessage />;

  return (
    <div className="space-y-3">
      {psi.map((item, i) => (
        <div key={i} className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-purple-100 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700 capitalize">
              {cleanText(item.category)}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-purple-100 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700 capitalize">
              {cleanText(item.evidence_type)}
            </span>
          </div>
          <p className="text-xs text-purple-900 dark:text-purple-100 mb-2">
            {cleanText(item.description)}
          </p>
          {(item.connected_persons.length > 0 || item.connected_programs.length > 0) && (
            <div className="text-[10px] text-purple-700 dark:text-purple-400">
              <span className="font-medium">Connected:</span> {[...item.connected_persons, ...item.connected_programs].join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LegislativeSection({ events }: { events: LegislativeEvent[] }) {
  if (!events || events.length === 0) return <EmptySectionMessage />;

  // Sort events by date if available, otherwise preserve order
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div className="space-y-2">
      {sortedEvents.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-600 shrink-0 mt-1" />
            {i < sortedEvents.length - 1 && (
              <div className="w-px flex-1 bg-green-200 dark:bg-green-800/50 mt-1" />
            )}
          </div>
          <div className="pb-3 min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                {event.name}
              </span>
              {event.date && (
                <span className="text-[10px] text-green-600 dark:text-green-400">
                  {event.date}
                </span>
              )}
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 capitalize ml-auto">
                {cleanText(event.event_type)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-green-600 dark:text-green-400">Significance:</span>
              <div className="flex-1 h-1.5 rounded-full bg-green-200 dark:bg-green-900/30 overflow-hidden max-w-[100px]">
                <div
                  className="h-full rounded-full bg-green-500 dark:bg-green-400"
                  style={{ width: `${(event.significance / 10) * 100}%` }}
                />
              </div>
            </div>

            {event.key_outcomes && event.key_outcomes.length > 0 && (
              <ul className="text-xs text-green-800 dark:text-green-200 list-disc list-inside mb-2">
                {event.key_outcomes.map((outcome, idx) => (
                  <li key={idx}>{cleanText(outcome)}</li>
                ))}
              </ul>
            )}

            {event.quote && (
              <div className="flex items-start gap-1.5">
                <p className="text-[11px] italic text-green-700 dark:text-green-300 border-l-2 border-green-400 dark:border-green-600 pl-2">
                  &ldquo;{cleanText(event.quote)}&rdquo;
                </p>
                {event.quote_timestamp_seconds != null && (
                  <TimestampLink
                    seconds={event.quote_timestamp_seconds}
                    label={`[${formatTimestamp(event.quote_timestamp_seconds)}]`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SecrecySection({ mechanisms }: { mechanisms: SecrecyMechanism[] }) {
  if (!mechanisms || mechanisms.length === 0) return <EmptySectionMessage />;

  return (
    <div className="space-y-3">
      {mechanisms.map((mech, i) => (
        <div key={i} className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700 capitalize">
              {cleanText(mech.mechanism)}
            </span>
            {mech.legal_basis && (
              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                Basis: {cleanText(mech.legal_basis)}
              </span>
            )}
          </div>
          <p className="text-xs text-red-900 dark:text-red-100 mb-2">
            {cleanText(mech.description)}
          </p>
          <div className="flex flex-col gap-1 text-[10px] text-red-700 dark:text-red-400">
            {mech.cited_examples && mech.cited_examples.length > 0 && (
              <div><span className="font-semibold">Examples:</span> {mech.cited_examples.map(cleanText).join(", ")}</div>
            )}
            {mech.alleged_abusers && mech.alleged_abusers.length > 0 && (
              <div><span className="font-semibold">Alleged Abusers:</span> {mech.alleged_abusers.map(cleanText).join(", ")}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function UapProgramIntelCard({
  data,
  className,
}: {
  data?: UapProgramIntelResult | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-green-500" />
        <h2
          className="text-lg font-bold text-slate-900 dark:text-slate-100"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          Program Intelligence Analysis
        </h2>
      </div>

      {/* Sections */}
      <div className="px-6 py-6 space-y-3">
        {/* Executive Summary & Primary Revelation */}
        {(data?.executive_summary || data?.primary_revelation) && (
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-xl p-4 border border-slate-200 dark:border-slate-800 mb-4">
            {data?.executive_summary && (
              <div className="mb-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Executive Summary
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {cleanText(data.executive_summary)}
                </p>
              </div>
            )}
            {data?.primary_revelation && (
              <div>
                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider block mb-1">
                  Primary Revelation
                </span>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed border-l-2 border-green-500 pl-3">
                  {cleanText(data.primary_revelation)}
                </p>
              </div>
            )}
          </div>
        )}

        <Section id="intel-persons" title={`Named Persons (${data?.persons?.length || 0})`} icon={Users} defaultOpen={(data?.persons?.length || 0) > 0}>
          <PersonsSection persons={data?.persons || []} />
        </Section>

        <Section id="intel-programs" title={`Programs & Operations (${data?.programs?.length || 0})`} icon={Building2} defaultOpen={(data?.programs?.length || 0) > 0}>
          <ProgramsSection programs={data?.programs || []} />
        </Section>

        <Section id="intel-claims" title={`Claims & Evidence (${data?.claims?.length || 0})`} icon={FileText} defaultOpen={(data?.claims?.length || 0) > 0}>
          <ClaimsSection claims={data?.claims || []} />
        </Section>

        <Section id="intel-organizations" title={`Organizations (${data?.organizations?.length || 0})`} icon={Building} defaultOpen={false}>
          <OrganizationsSection orgs={data?.organizations || []} />
        </Section>

        <Section id="intel-locations" title={`Locations & Facilities (${data?.locations?.length || 0})`} icon={MapPin} defaultOpen={false}>
          <LocationsSection locations={data?.locations || []} />
        </Section>

        <Section id="intel-technologies" title={`Technology & Materials (${data?.technologies?.length || 0})`} icon={Cpu} defaultOpen={false}>
          <TechnologySection technologies={data?.technologies || []} />
        </Section>

        <Section id="intel-psi" title={`Psi & Consciousness (${data?.psi_consciousness?.length || 0})`} icon={Brain} defaultOpen={false}>
          <PsiSection psi={data?.psi_consciousness || []} />
        </Section>

        <Section id="intel-legislative" title={`Legislative & Disclosure (${data?.legislative_events?.length || 0})`} icon={Scale} defaultOpen={false}>
          <LegislativeSection events={data?.legislative_events || []} />
        </Section>

        <Section id="intel-secrecy" title={`Secrecy Mechanisms (${data?.secrecy_mechanisms?.length || 0})`} icon={Lock} defaultOpen={false}>
          <SecrecySection mechanisms={data?.secrecy_mechanisms || []} />
        </Section>

        {/* AI disclaimer */}
        <div className="border-t border-slate-50 dark:border-white/5 pt-2 mt-4">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            ✦ AI-extracted program intelligence — verify against source testimony
          </span>
        </div>
      </div>
    </div>
  );
}
