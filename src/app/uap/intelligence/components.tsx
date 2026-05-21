'use client';

/**
 * UAP Research Intelligence Dashboard — Client Components
 *
 * Beautiful, animated Recharts-based visualizations styled for UAP green domain.
 * Each widget is self-contained and responsive.
 */

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  Film, Users, ClipboardList, Brain, AlertTriangle, Shield, Share2,
  ChevronDown, ChevronUp, Lightbulb, TrendingUp, Fingerprint, Atom,
} from 'lucide-react';

// ─── Color Palette ──────────────────────────────────────────────────────────

const GREENS = [
  '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0',
  '#15803d', '#166534', '#059669', '#10b981', '#34d399',
];

const TONE_COLORS: Record<string, string> = {
  investigative: '#16a34a',
  experiential: '#22c55e',
  conspiratorial: '#f59e0b',
  academic: '#3b82f6',
  advocacy: '#8b5cf6',
  sensational: '#ef4444',
  skeptical: '#6b7280',
  neutral: '#059669',  // Emerald-600 — visible against both light and dark backgrounds
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface HeroStatsData {
  total_videos: number;
  total_persons: number;
  total_claims: number;
  total_programs: number;
  psi_percent: number;
  crash_retrieval_percent: number;
  biologics_percent: number;
  under_oath_percent: number;
}

// ─── Hero Stats Strip ───────────────────────────────────────────────────────

export function HeroStats({ data }: { data: HeroStatsData }) {
  const cards = [
    { label: 'Videos Analyzed', value: data.total_videos, icon: Film, color: '#16a34a' },
    { label: 'Persons Extracted', value: data.total_persons, icon: Users, color: '#22c55e' },
    { label: 'Claims Mapped', value: data.total_claims, icon: ClipboardList, color: '#4ade80' },
    { label: 'PSI Content', value: `${data.psi_percent}%`, icon: Brain, color: '#8b5cf6' },
    { label: 'Crash Retrieval', value: `${data.crash_retrieval_percent}%`, icon: AlertTriangle, color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 sm:p-5
                       hover:shadow-lg hover:border-[var(--domain-accent)]/30 transition-all duration-300"
          >
            {/* Subtle gradient glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle at 30% 30%, ${card.color}08, transparent 70%)` }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground font-serif tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Daily Fact Card ────────────────────────────────────────────────────────

export function DailyFactCard({ fact }: { fact: { text: string; category: string } | null }) {
  const [copied, setCopied] = useState(false);

  if (!fact) return null;

  const handleShare = async () => {
    const shareText = `UAP Research Fact: ${fact.text}\n\nExplore more at projectprofound.org/uap/intelligence`;
    if (navigator.share) {
      await navigator.share({ text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--domain-accent)]/30 bg-card p-5 sm:p-6">
      {/* Animated gradient border effect */}
      <div className="absolute inset-0 opacity-20"
        style={{
          background: 'linear-gradient(135deg, #16a34a10, #22c55e08, transparent 60%)',
        }}
      />
      <div className="relative flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-[var(--domain-accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--domain-accent)] uppercase tracking-wider mb-1.5">
            Today&apos;s UAP Fact
          </p>
          <p className="text-base sm:text-lg text-foreground leading-relaxed font-medium">
            {fact.text}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="shrink-0 w-9 h-9 rounded-xl border border-border/60 flex items-center justify-center
                     hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700/40
                     transition-all duration-200"
          aria-label="Share this fact"
        >
          {copied ? (
            <span className="text-xs text-[var(--domain-accent)]">✓</span>
          ) : (
            <Share2 className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Claim Category Bar Chart ───────────────────────────────────────────────

export function ClaimDistribution({ data }: { data: { category: string; count: number }[] }) {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 10).map(d => ({
    ...d,
    label: d.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }));

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <ClipboardList className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Claim Categories</h3>
          <p className="text-xs text-muted-foreground">Distribution across all analyzed videos</p>
        </div>
      </div>
      <div className="h-[300px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
            <YAxis
              dataKey="label"
              type="category"
              width={160}
              tick={{ fontSize: 11, fill: 'var(--foreground)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '13px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={1200}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={GREENS[index % GREENS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Video Tone Donut Chart ─────────────────────────────────────────────────

const RADIAN = Math.PI / 180;
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.08) return null; // Don't label tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function ToneDistribution({ data }: { data: { id: string; label: string; value: number }[] }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map(d => ({
    ...d,
    name: d.label.replace(/\b\w/g, c => c.toUpperCase()),
  }));

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <Atom className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Video Tone</h3>
          <p className="text-xs text-muted-foreground">Editorial perspective distribution</p>
        </div>
      </div>
      <div className="h-[300px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              animationDuration={1200}
            >
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={TONE_COLORS[entry.id] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '13px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', color: 'var(--muted-foreground)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Person Leaderboard ─────────────────────────────────────────────────────

export function PersonLeaderboard({ data }: { data: { name: string; appearances: number; avg_credibility: number | null; roles: string[] }[] }) {
  if (!data || data.length === 0) return null;

  const getCredibilityColor = (score: number | null) => {
    if (score === null) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    if (score >= 70) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
    if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
    return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <Users className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Most Connected Persons</h3>
          <p className="text-xs text-muted-foreground">Ranked by cross-video appearances</p>
        </div>
      </div>
      {/* Column headers */}
      <div className="flex items-center gap-3 px-2.5 pb-1 border-b border-border/40 mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-5 text-right shrink-0">#</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">Person</span>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Credibility</span>
      </div>
      <div className="space-y-1">
        {data.slice(0, 10).map((person, i) => (
          <div
            key={person.name}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
          >
            <span className="text-sm font-bold text-muted-foreground w-5 text-right shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
              <p className="text-xs text-muted-foreground">
                {person.appearances} video{person.appearances !== 1 ? 's' : ''}
                {person.roles.length > 0 && ` · ${person.roles[0].replace(/_/g, ' ')}`}
              </p>
            </div>
            {person.avg_credibility !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0 ${getCredibilityColor(person.avg_credibility)}`}>
                {person.avg_credibility}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Person ↔ Claim Heatmap ─────────────────────────────────────────────────

export function PersonClaimHeatmap({ data, categories }: {
  data: Record<string, any>[];
  categories: string[];
}) {
  if (!data || data.length === 0 || categories.length === 0) return null;

  const maxVal = Math.max(...data.flatMap(row => categories.map(cat => row[cat] || 0)));

  // Inline styles for heatmap cells — Tailwind opacity modifiers don't work
  // on CSS variable colors like var(--domain-accent), so we use explicit rgba.
  const getCellStyle = (value: number): React.CSSProperties => {
    if (value === 0) return {};
    const intensity = maxVal > 0 ? value / maxVal : 0;
    if (intensity >= 0.8) return { backgroundColor: '#16a34a', color: '#ffffff' };
    if (intensity >= 0.5) return { backgroundColor: 'rgba(22, 163, 74, 0.7)', color: '#ffffff' };
    if (intensity >= 0.25) return { backgroundColor: 'rgba(22, 163, 74, 0.35)', color: 'inherit' };
    return { backgroundColor: 'rgba(22, 163, 74, 0.18)', color: 'inherit' };
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
          <Fingerprint className="w-4.5 h-4.5 text-green-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Person ↔ Claim Correlations</h3>
          <p className="text-xs text-muted-foreground">Co-occurrence intensity across videos</p>
        </div>
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-1 text-muted-foreground font-medium sticky left-0 bg-card z-10">Person</th>
              {categories.map(cat => (
                <th key={cat} className="py-2 px-1 text-muted-foreground font-medium text-center min-w-[60px]">
                  <span className="block truncate max-w-[70px]" title={cat.replace(/_/g, ' ')}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).split(' ')[0]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.person} className="group">
                <td className="py-1.5 px-1 font-medium text-foreground whitespace-nowrap sticky left-0 bg-card group-hover:bg-muted/30 z-10">
                  {row.person.split(' ').slice(0, 2).join(' ')}
                </td>
                {categories.map(cat => {
                  const val = row[cat] || 0;
                  return (
                    <td key={cat} className="py-1.5 px-1 text-center">
                      <div
                        className={`w-full h-7 rounded-md flex items-center justify-center text-[11px] font-bold transition-all
                          ${val === 0 ? 'bg-slate-100 dark:bg-slate-800/50' : ''}`}
                        style={getCellStyle(val)}
                        title={`${row.person} + ${cat.replace(/_/g, ' ')}: ${val} videos`}
                      >
                        {val > 0 ? val : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Encounter Stats Section ────────────────────────────────────────────────

export function EncounterStats({ data, entities }: {
  data: { total_encounters: number; avg_evidence_score: number; avg_contact_depth_score: number; avg_transformation_score: number; consciousness_alteration_rate: number };
  entities: { id: string; label: string; value: number }[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (data.total_encounters === 0) return null;

  const scoreCards = [
    { label: 'Avg Evidence', value: data.avg_evidence_score, max: 28, color: '#10b981' },
    { label: 'Avg Contact Depth', value: data.avg_contact_depth_score, max: 32, color: '#3b82f6' },
    { label: 'Avg Transformation', value: data.avg_transformation_score, max: 60, color: '#f43f5e' },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-foreground">
              Encounter Analysis · {data.total_encounters} encounters
            </h3>
            <p className="text-xs text-muted-foreground">
              {data.consciousness_alteration_rate}% report consciousness alteration
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 animate-in slide-in-from-top-2 duration-300">
          {/* Score bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scoreCards.map((card) => {
              const pct = card.max > 0 ? (card.value / card.max) * 100 : 0;
              return (
                <div key={card.label} className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <p className="text-lg font-bold text-foreground">{card.value}<span className="text-xs font-normal text-muted-foreground">/{card.max}</span></p>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: card.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Entity breakdown */}
          {entities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Dominant Entity Types
              </p>
              <div className="flex flex-wrap gap-2">
                {entities.map((entity) => (
                  <span
                    key={entity.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                               bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700/40"
                  >
                    {entity.label.replace(/\b\w/g, c => c.toUpperCase())}
                    <span className="text-[10px] opacity-70">({entity.value})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Secondary Stats Pills ──────────────────────────────────────────────────

export function SecondaryStats({ data }: { data: HeroStatsData }) {
  const pills = [
    { label: 'Biologics Claims', value: `${data.biologics_percent}%`, icon: TrendingUp },
    { label: 'Under Oath', value: `${data.under_oath_percent}%`, icon: Shield },
    { label: 'Programs Referenced', value: data.total_programs, icon: Fingerprint },
  ];

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {pills.map((pill) => {
        const Icon = pill.icon;
        return (
          <div
            key={pill.label}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/60 bg-card
                       hover:border-[var(--domain-accent)]/30 transition-all text-sm"
          >
            <Icon className="w-3.5 h-3.5 text-[var(--domain-accent)]" />
            <span className="font-bold text-foreground">{pill.value}</span>
            <span className="text-muted-foreground text-xs">{pill.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Hynek Classification Breakdown ──────────────────────────────────────────

const HYNEK_COLORS: Record<string, string> = {
  CE1: '#22c55e', CE2: '#16a34a', CE3: '#15803d', CE4: '#166534', CE5: '#052e16',
  DD: '#3b82f6', NL: '#f59e0b', ND: '#f97316', RV: '#8b5cf6',
};

const HYNEK_LABELS: Record<string, string> = {
  CE1: 'Close Encounter 1st Kind',
  CE2: 'Close Encounter 2nd Kind',
  CE3: 'Close Encounter 3rd Kind',
  CE4: 'Close Encounter 4th Kind',
  CE5: 'Close Encounter 5th Kind',
  DD: 'Daylight Disc',
  NL: 'Nocturnal Light',
  ND: 'Nocturnal Disc',
  RV: 'Radar-Visual',
};

export function HynekBreakdown({ data }: { data: { id: string; label: string; value: number }[] }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map(d => ({
    ...d,
    name: HYNEK_LABELS[d.id] || d.id,
    shortName: d.id,
  }));

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <Fingerprint className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Hynek Classification</h3>
          <p className="text-xs text-muted-foreground">Encounter types by scientific taxonomy</p>
        </div>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="shortName" tick={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '13px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, _: any, props: any) => [value, props.payload.name]}
              labelFormatter={(label) => HYNEK_LABELS[label] || label}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1200}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={HYNEK_COLORS[entry.id] || '#16a34a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Physical Effects Breakdown ──────────────────────────────────────────────

const EFFECT_ICONS: Record<string, string> = {
  missing_time: '⧗', paralysis: '▣', dehydration: '○', bruises: '◎',
  compass_deviation: '◎', nausea: '◇', burns: '↑', electromagnetic_interference: '◉',
  headaches: '◆', rash: '↑', power_outage: '●', engine_failure: '▢',
};

export function PhysicalEffects({ data }: { data: { id: string; label: string; value: number }[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <AlertTriangle className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Physical Effects Reported</h3>
          <p className="text-xs text-muted-foreground">Physiological, temporal, & environmental effects</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.map((effect) => (
          <div
            key={effect.id}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                       bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20
                       border border-green-200 dark:border-green-700/40 text-green-800 dark:text-green-300
                       hover:shadow-md hover:scale-105 transition-all duration-200"
          >
            <span className="text-base">{EFFECT_ICONS[effect.id] || '◎'}</span>
            <span className="capitalize">{effect.label}</span>
            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800/40 px-1.5 py-0.5 rounded-md">
              {effect.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Primary Topic Distribution ──────────────────────────────────────────────

export function PrimaryTopics({ data }: { data: { id: string; label: string; value: number }[] }) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const chartData = data.slice(0, 8);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <TrendingUp className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Primary Topics</h3>
          <p className="text-xs text-muted-foreground">Dominant subject matter across analyzed videos</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {chartData.map((topic, i) => {
          const pct = maxValue > 0 ? (topic.value / maxValue) * 100 : 0;
          return (
            <div key={topic.id} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground capitalize truncate">
                  {topic.label.replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-xs font-bold text-muted-foreground shrink-0 ml-2">
                  {topic.value}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: GREENS[i % GREENS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top Credible Sources ────────────────────────────────────────────────────

export function TopCredibleSources({ data, avgCredibility }: {
  data: { name: string; appearances: number; avg_credibility: number; roles: string[] }[];
  avgCredibility: number | null;
}) {
  if (!data || data.length === 0) return null;

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
    if (score >= 60) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
    if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
    return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <Shield className="w-4.5 h-4.5 text-[var(--domain-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Most Credible Sources</h3>
          <p className="text-xs text-muted-foreground">Ranked by average credibility score</p>
        </div>
      </div>

      {/* Average credibility stat */}
      {avgCredibility !== null && (
        <div className="flex items-center gap-2 mb-4 mt-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/40">
          <span className="text-xs text-muted-foreground">Dataset Avg Credibility:</span>
          <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${getCredibilityColor(avgCredibility)}`}>
            {avgCredibility}/100
          </span>
        </div>
      )}

      <div className="space-y-1">
        {data.map((person, i) => (
          <div
            key={person.name}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-bold text-muted-foreground w-5 text-right shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
              <p className="text-xs text-muted-foreground">
                {person.appearances} video{person.appearances !== 1 ? 's' : ''}
                {person.roles.length > 0 && ` · ${person.roles[0].replace(/_/g, ' ')}`}
              </p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0 ${getCredibilityColor(person.avg_credibility)}`}>
              {person.avg_credibility}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
