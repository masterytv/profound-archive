import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { BarChart3, TrendingDown, MessageSquare, ArrowLeft } from "lucide-react"

// Admin analytics for CES (Customer Effort Score) responses.
// Uses service client to bypass RLS — this is an admin-only server component.
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

type DashboardRow = {
  total_complete: number
  total_partial: number
  total_responses: number
  avg_score: number | null
  score_1: number
  score_2: number
  score_3: number
  score_4: number
  score_5: number
  score_6: number
  score_7: number
}

type PathRow = {
  path: string
  responses: number
  avg_score: number | null
  min_score: number
  max_score: number
}

type FeedbackRow = {
  id: string
  created_at: string
  score: number
  reason: string | null
  path: string | null
  phase: string
}

export default async function CesDashboardPage() {
  const supabase = getServiceClient()

  const [
    { data: dashData },
    { data: pathData },
    { data: recent },
  ] = await Promise.all([
    supabase.from("ces_dashboard").select("*").single<DashboardRow>(),
    supabase.from("ces_path_breakdown").select("*").limit(10).returns<PathRow[]>(),
    supabase
      .from("ces_feedback")
      .select("id, created_at, score, reason, path, phase")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<FeedbackRow[]>(),
  ])

  const dashboard = dashData ?? {
    total_complete: 0, total_partial: 0, total_responses: 0,
    avg_score: null,
    score_1: 0, score_2: 0, score_3: 0, score_4: 0, score_5: 0, score_6: 0, score_7: 0,
  }

  const maxScoreCount = Math.max(
    dashboard.score_1, dashboard.score_2, dashboard.score_3, dashboard.score_4,
    dashboard.score_5, dashboard.score_6, dashboard.score_7, 1
  )

  const scoreBuckets = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    label: n,
    count: dashboard[`score_${n}` as keyof DashboardRow] as number,
  }))

  function scoreColor(score: number): string {
    if (score <= 2) return "bg-red-500"
    if (score <= 4) return "bg-amber-400"
    if (score <= 5) return "bg-yellow-400"
    return "bg-emerald-500"
  }

  function scoreTextColor(score: number): string {
    if (score <= 2) return "text-red-600"
    if (score <= 4) return "text-amber-600"
    if (score <= 5) return "text-yellow-600"
    return "text-emerald-600"
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            CES Feedback
          </h1>
          <p className="text-xs text-slate-400">Customer Effort Score — site-wide survey results</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Avg Score */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Average Score</p>
          <p className={`text-5xl font-bold ${dashboard.avg_score ? scoreTextColor(dashboard.avg_score) : "text-slate-300"}`}>
            {dashboard.avg_score != null ? dashboard.avg_score.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">out of 7 &nbsp;·&nbsp; 1 = Very Difficult, 7 = Very Easy</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Responses</p>
          <p className="text-4xl font-bold text-slate-900">{dashboard.total_responses}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Complete</p>
          <p className="text-4xl font-bold text-slate-900">{dashboard.total_complete}</p>
          <p className="text-xs text-slate-400 mt-1">{dashboard.total_partial} partial (score only)</p>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Score Distribution</h2>
        </div>

        <div className="flex items-end gap-3 h-32">
          {scoreBuckets.map(({ label, count }) => {
            const pct = Math.round((count / maxScoreCount) * 100)
            return (
              <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-xs font-medium text-slate-500">{count}</span>
                <div className="w-full rounded-t-lg relative" style={{ height: "80px" }}>
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-t-lg transition-all ${scoreColor(label)}`}
                    style={{ height: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-600">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-0.5">
          <span>Very Difficult</span>
          <span>Very Easy</span>
        </div>
      </div>

      {/* Bottom Grid: Friction Paths + Recent Responses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Top Friction Paths */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-slate-700">Top Friction Paths</h2>
            <span className="text-[10px] text-slate-400">(lowest avg score)</span>
          </div>

          {!pathData || pathData.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No data yet</p>
          ) : (
            <div className="space-y-2">
              {pathData.map((row) => (
                <div key={row.path} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-600 font-mono truncate max-w-[200px]">{row.path}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-400">{row.responses}×</span>
                    <span className={`text-sm font-bold ${row.avg_score != null ? scoreTextColor(row.avg_score) : "text-slate-300"}`}>
                      {row.avg_score != null ? row.avg_score.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Responses */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Recent Responses</h2>
          </div>

          {!recent || recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No responses yet</p>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {recent.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold flex-shrink-0 ${scoreColor(row.score)}`}
                      >
                        {row.score}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                        {row.path ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {row.phase === "score_only" && (
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">partial</span>
                      )}
                      <span className="text-[10px] text-slate-400">{formatDate(row.created_at)}</span>
                    </div>
                  </div>
                  {row.reason && (
                    <p className="text-xs text-slate-600 pl-9 leading-relaxed italic">
                      &ldquo;{row.reason}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
