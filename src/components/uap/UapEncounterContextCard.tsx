"use client";

import { cn } from "@/lib/utils";
import {
  MapPin,
  Calendar,
  Shield,
  Link2,
  Users,
  FileWarning,
} from "lucide-react";
import type {
  UapEncounterContextResult,
  LocationContext,
  MilitaryContext,
  ConnectedCase,
} from "@/lib/ai/uap-encounter-context";

// ─── Display Helper ─────────────────────────────────────────────────────────
function cleanText(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/_/g, " ");
}

function isStated(val: string | undefined | null): boolean {
  if (!val) return false;
  const lower = val.toLowerCase().trim();
  return lower !== "not stated" && lower !== "not_stated" && lower !== "unknown" && lower !== "";
}

// ─── Location Card ──────────────────────────────────────────────────────────

function LocationCard({ location }: { location: LocationContext }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
            {cleanText(location.description)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {[location.nearest_city, location.state_province, location.country]
              .filter(isStated)
              .join(", ")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pl-6">
        {isStated(location.setting) && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 capitalize">
            {cleanText(location.setting)}
          </span>
        )}
        {isStated(location.geographic_features) && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
            {cleanText(location.geographic_features)}
          </span>
        )}
      </div>

      {location.nearby_facilities.length > 0 && (
        <div className="pl-6">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Nearby Facilities
          </span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {location.nearby_facilities.map((f) => (
              <span
                key={f}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              >
                {cleanText(f)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Military Context Card ──────────────────────────────────────────────────

function MilitaryCard({ military }: { military: MilitaryContext }) {
  if (!military.is_military_witness) return null;

  const details = [
    { label: "Branch", value: military.branch },
    { label: "Rank", value: military.rank },
    { label: "Base", value: military.base_assignment },
    { label: "Duty", value: military.duty_context },
    { label: "Service", value: military.years_of_service },
  ].filter((d) => isStated(d.value));

  return (
    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-800/30">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Military Witness
        </span>
        {military.clearance_mentioned && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
            Clearance Held
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        {details.map((d) => (
          <div key={d.label} className="contents">
            <span className="text-slate-400">{d.label}</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {cleanText(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Connected Cases ────────────────────────────────────────────────────────

function ConnectedCasesList({ cases }: { cases: ConnectedCase[] }) {
  if (cases.length === 0) return null;

  return (
    <div className="space-y-1">
      {cases.map((c, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-white/10"
        >
          <Link2 className="w-3 h-3 text-green-500 shrink-0" />
          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
            {cleanText(c.event_name)}
          </span>
          {isStated(c.date_mentioned) && (
            <span className="text-[10px] text-slate-400 ml-auto">
              {cleanText(c.date_mentioned)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface UapEncounterContextCardProps {
  data: UapEncounterContextResult;
  className?: string;
}

export function UapEncounterContextCard({ data, className }: UapEncounterContextCardProps) {
  const hasDate = isStated(data.event_date);
  const hasLocation = isStated(data.location?.description);
  const hasMilitary = data.military_context?.is_military_witness;
  const hasCases = data.connected_cases?.length > 0;
  const hasWitnesses = data.total_witnesses_mentioned > 1 || data.named_witnesses?.length > 0;
  const hasAuthority = data.reported_to_authorities;

  // Don't render if there's nothing meaningful
  if (!hasDate && !hasLocation && !hasMilitary && !hasCases) return null;

  return (
    <div
      className={cn(
        "bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-green-500" />
        <h2
          className="text-lg font-bold text-slate-900 dark:text-slate-100"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          Encounter Context
        </h2>
        <span className="text-[10px] text-slate-400 ml-auto">
          Factual Details
        </span>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Date/Time row */}
        {(hasDate || isStated(data.event_time)) && (
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-green-500" />
            {hasDate && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                {cleanText(data.event_date)}
              </span>
            )}
            {isStated(data.event_time) && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                {cleanText(data.event_time)}
              </span>
            )}
            {data.event_year && (
              <span className="text-[10px] text-slate-400 ml-1">
                Year: {data.event_year}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {hasLocation && <LocationCard location={data.location} />}

        {/* Military Context */}
        {hasMilitary && <MilitaryCard military={data.military_context} />}

        {/* Additional Witnesses */}
        {hasWitnesses && (
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[11px] text-slate-600 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-300">
                {data.total_witnesses_mentioned}
              </strong>{" "}
              {data.total_witnesses_mentioned === 1 ? "witness" : "witnesses"} mentioned
            </span>
            {data.named_witnesses?.filter(isStated).map((name) => (
              <span
                key={name}
                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
              >
                {cleanText(name)}
              </span>
            ))}
          </div>
        )}

        {/* Authority Reporting */}
        {hasAuthority && (
          <div className="flex items-start gap-2">
            <FileWarning className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Reported to authorities
              </span>
              {isStated(data.authority_response) && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {cleanText(data.authority_response)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Connected Cases */}
        {hasCases && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Connected Events
              </span>
            </div>
            <ConnectedCasesList cases={data.connected_cases} />
          </div>
        )}
      </div>
    </div>
  );
}
