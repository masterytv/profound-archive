import React from 'react';
import { UapProgramIntelResult } from "@/lib/ai/uap-program-intel";
import { cn } from "@/lib/utils";
import { Users, Building2, FileText, Building, MapPin, Cpu, Brain, Scale, Lock, BarChart3 } from "lucide-react";

interface UapProgramIntelSummaryCardProps {
  data: UapProgramIntelResult;
}

function cleanText(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/_/g, " ");
}

export function UapProgramIntelSummaryCard({ data }: UapProgramIntelSummaryCardProps) {
  const counts = [
    { label: "Persons", count: data.persons?.length || 0, icon: Users, color: "bg-blue-500", id: "intel-persons" },
    { label: "Programs", count: data.programs?.length || 0, icon: Building2, color: "bg-violet-500", id: "intel-programs" },
    { label: "Claims", count: data.claims?.length || 0, icon: FileText, color: "bg-amber-500", id: "intel-claims" },
    { label: "Organizations", count: data.organizations?.length || 0, icon: Building, color: "bg-slate-500", id: "intel-organizations" },
    { label: "Locations", count: data.locations?.length || 0, icon: MapPin, color: "bg-emerald-500", id: "intel-locations" },
    { label: "Technology", count: data.technologies?.length || 0, icon: Cpu, color: "bg-cyan-500", id: "intel-technologies" },
    { label: "Psi / Conscious", count: data.psi_consciousness?.length || 0, icon: Brain, color: "bg-purple-500", id: "intel-psi" },
    { label: "Legislative", count: data.legislative_events?.length || 0, icon: Scale, color: "bg-green-500", id: "intel-legislative" },
    { label: "Secrecy", count: data.secrecy_mechanisms?.length || 0, icon: Lock, color: "bg-red-500", id: "intel-secrecy" },
  ];

  const maxCount = Math.max(1, ...counts.map(c => c.count));

  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/20">
        <BarChart3 className="w-4 h-4 text-green-500" />
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
          Analysis Summary
        </h3>
      </div>

      <div className="p-5 space-y-6 flex-1 flex flex-col">
        {/* Classification Badges */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Program Intel Profile
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 capitalize">
              {cleanText(data.video_type)}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 capitalize">
              Topic: {cleanText(data.primary_topic)}
            </span>
            {data.era_focus && data.era_focus.length > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                Era: {data.era_focus.map(cleanText).join(", ")}
              </span>
            )}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Intel Value: {data.intelligence_value}/10
            </span>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="space-y-3">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Extraction Volume
          </div>
          {counts.map((item, idx) => {
            const Icon = item.icon;
            // Add a small minimum width so the bar is visible even if count is 1 relative to a huge max
            const percentage = Math.max(2, (item.count / maxCount) * 100);
            return (
              <div key={idx} className="flex items-center gap-2">
                <a href={`#${item.id}`} className="w-[100px] shrink-0 flex items-center justify-between hover:opacity-80 transition-opacity cursor-pointer group">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Icon className="w-3 h-3 text-slate-400 shrink-0 group-hover:text-green-500 transition-colors" />
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate font-medium group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:underline transition-all">
                      {item.label}
                    </span>
                  </div>
                </a>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    {item.count > 0 && (
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", item.color)} 
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold w-4 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
