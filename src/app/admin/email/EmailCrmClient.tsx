"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { 
  Mail, Users, BarChart2, Send, Check, X, RefreshCw, 
  ChevronDown, ChevronUp, Eye, AlertCircle
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  email: string;
  archetype: string;
  frequency: string;
  is_active: boolean;
  last_sent_at: string | null;
  send_count: number;
  next_send_at: string | null;
  created_at: string;
}

interface CrmStats {
  total: number;
  active: number;
  unsubscribed: number;
  sends_7d: number;
  sends_total: number;
  by_archetype: Record<string, number>;
  by_frequency: Record<string, number>;
}

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily", "3day": "3-day", weekly: "Weekly", monthly: "Monthly"
};

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: number | string; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function EmailCrmClient() {
  const supabase = createClient();

  const [stats, setStats]   = useState<CrmStats | null>(null);
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(0);
  const [filterArchetype, setFilterArchetype] = useState("all");
  const [filterActive, setFilterActive]       = useState<"all" | "active" | "unsub">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "last_sent_at" | "send_count">("created_at");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // Test send state
  const [testEmail, setTestEmail]   = useState("");
  const [testArch, setTestArch]     = useState("griever");
  const [testFreq, setTestFreq]     = useState("weekly");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const PAGE_SIZE = 25;

  // Use direct REST fetch to avoid GoTrue _acquireLock AbortErrors
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load stats via RPC (SECURITY DEFINER)
      const statsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_email_crm_stats`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load leads with filters
      const params = new URLSearchParams({
        select: "*",
        order: `${sortBy}.${sortDir}`,
        offset: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (filterArchetype !== "all") params.set("archetype", `eq.${filterArchetype}`);
      if (filterActive === "active") params.set("is_active", "eq.true");
      if (filterActive === "unsub") params.set("is_active", "eq.false");

      const leadsRes = await fetch(`${SUPABASE_URL}/rest/v1/quiz_leads?${params}`, {
        headers,
        cache: "no-store",
      });
      if (leadsRes.ok) {
        const data: Lead[] = await leadsRes.json();
        setLeads(data ?? []);
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.error("[email-crm] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortDir, page, filterArchetype, filterActive]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleActive(lead: Lead) {
    await supabase.from("quiz_leads").update({ is_active: !lead.is_active }).eq("id", lead.id);
    loadData();
  }

  async function handleTestSend() {
    if (!testEmail) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, archetype: testArch, frequency: testFreq }),
      });
      const data = await res.json();
      setTestResult(res.ok
        ? { ok: true,  msg: `Sent! Video: ${data.video}` }
        : { ok: false, msg: data.error ?? "Send failed" }
      );
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) });
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
          Email CRM
        </h1>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total subscribers"  value={stats.total}       icon={Users}   accent="bg-blue-50 dark:bg-blue-500/20 text-blue-600" />
          <StatCard label="Active"              value={stats.active}      icon={Mail}    accent="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600" />
          <StatCard label="Unsubscribed"        value={stats.unsubscribed} icon={X}      accent="bg-slate-100 dark:bg-slate-700 text-slate-500" />
          <StatCard label="Sends (7 days)"      value={stats.sends_7d}    icon={Send}    accent="bg-purple-50 dark:bg-purple-500/20 text-purple-600" />
        </div>
      )}

      {/* ── Archetype Breakdown ── */}
      {stats?.by_archetype && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Subscribers by archetype</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.by_archetype).sort((a,b) => b[1]-a[1]).map(([arch, cnt]) => {
              const a = ARCHETYPES[arch as keyof typeof ARCHETYPES];
              return (
                <div key={arch} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-base">{a?.icon ?? "✦"}</span>
                  <span className="text-sm text-foreground">{a?.label ?? arch}</span>
                  <span className="text-xs font-bold text-foreground ml-1">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Test Send ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-muted-foreground" />
          Test Send
        </h2>
        <p className="text-xs text-muted-foreground">Send a real email to any address to preview what subscribers receive.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:[color-scheme:dark]"
          />
          <select
            value={testArch}
            onChange={e => setTestArch(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none dark:[color-scheme:dark]"
          >
            {Object.entries(ARCHETYPES).map(([id, a]) => (
              <option key={id} value={id}>{a.icon} {a.label}</option>
            ))}
          </select>
          <select
            value={testFreq}
            onChange={e => setTestFreq(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none dark:[color-scheme:dark]"
          >
            {Object.entries(FREQ_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestSend}
            disabled={testLoading || !testEmail}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {testLoading ? "Sending…" : "Send test email →"}
          </button>
          {testResult && (
            <div className={`flex items-center gap-1.5 text-sm ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
              {testResult.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {testResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* ── Subscriber List ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-4 border-b border-border bg-muted/30">
          <select
            value={filterArchetype}
            onChange={e => { setFilterArchetype(e.target.value); setPage(0); }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground dark:[color-scheme:dark]"
          >
            <option value="all">All archetypes</option>
            {Object.entries(ARCHETYPES).map(([id, a]) => (
              <option key={id} value={id}>{a.label}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={e => { setFilterActive(e.target.value as typeof filterActive); setPage(0); }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground dark:[color-scheme:dark]"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="unsub">Unsubscribed</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground dark:[color-scheme:dark]"
          >
            <option value="created_at">Signed up</option>
            <option value="last_sent_at">Last sent</option>
            <option value="send_count">Send count</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground"
          >
            {sortDir === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No subscribers found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Freq</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Sends</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Last sent</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const arch = ARCHETYPES[lead.archetype as keyof typeof ARCHETYPES];
                  const isExpanded = expandedLead === lead.id;
                  return (
                    <>
                      <tr
                        key={lead.id}
                        className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${!lead.is_active ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-foreground max-w-[200px] truncate">
                          {lead.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs">
                            <span>{arch?.icon ?? "✦"}</span>
                            <span className="text-muted-foreground">{arch?.label ?? lead.archetype}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {FREQ_LABELS[lead.frequency] ?? lead.frequency}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground text-center">
                          {lead.send_count}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {lead.last_sent_at
                            ? new Date(lead.last_sent_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            lead.is_active
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                          }`}>
                            {lead.is_active ? "Active" : "Unsub"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              title={lead.is_active ? "Deactivate" : "Reactivate"}
                              onClick={() => toggleActive(lead)}
                              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              {lead.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              title="Send one story now"
                              onClick={async () => {
                                await fetch("/api/email/send", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ lead_id: lead.id }),
                                });
                                loadData();
                              }}
                              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Expand"
                              onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${lead.id}-exp`} className="bg-muted/20 border-b border-border/50">
                          <td colSpan={7} className="px-4 py-3 text-xs text-muted-foreground space-y-1">
                            <div><strong>ID:</strong> {lead.id}</div>
                            <div><strong>Signed up:</strong> {new Date(lead.created_at).toLocaleString()}</div>
                            <div><strong>Next send:</strong> {lead.next_send_at ? new Date(lead.next_send_at).toLocaleString() : "Not scheduled"}</div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10 text-sm text-muted-foreground">
          <span>{leads.length} shown</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              ← Prev
            </button>
            <span className="px-2 py-1">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={leads.length < PAGE_SIZE}
              className="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
